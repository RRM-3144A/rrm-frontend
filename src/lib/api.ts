import {apiUrl} from '@/lib/config';
import {ApiError} from '@/lib/errors';
import {clearSession, readSession} from '@/lib/session';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** True on public endpoints (e.g. /auth/google, /health) where 401 is handled locally. */
  skipAuthRedirect?: boolean;
}

const defaultStatusMessages: Record<number, string> = {
  401: 'Sesiunea a expirat sau nu ești autentificat. Conectează-te din nou.',
  403: 'Nu ai permisiunea de a efectua această acțiune.',
  409: 'Operațiunea intră în conflict cu starea curentă a resursei.',
  422: 'Datele trimise nu sunt valide.',
};

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  const base = apiUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Romanian text for the backend's (English) error details; first match wins. */
const translations: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/^Slot is already full \(maximum (\d+)/, (m) =>
    `Intervalul ales nu mai are locuri libere (maximum ${m[1]} ${m[1] === '1' ? 'echipă' : 'echipe'} simultan). Alege alt interval.`],
  [/overlapping this slot/, 'Ai deja o rezervare (tu sau echipa ta) care se suprapune cu acest interval.'],
  [/scheduled for maintenance during this slot: (.*)$/, (m) =>
    `Intervalul se suprapune cu o perioadă de mentenanță (${m[1]}).`],
  [/under maintenance and cannot be reserved/, 'Resursa este în mentenanță și nu poate fi rezervată acum.'],
  [/overlaps a maintenance window/, 'Intervalul se suprapune cu o perioadă de mentenanță.'],
  [/outside the resource operating schedule|same day within operating hours/,
    'Intervalul ales este în afara programului de funcționare.'],
  [/(exceeds maximum duration of) (\d+) minutes/, (m) =>
    `Durata maximă pentru această resursă este de ${Number(m[2]) / 60} ore.`],
  [/multiple of 30 minutes|aligned to 30-minute slots/,
    'Intervalul trebuie să fie format din sloturi întregi de 30 de minute.'],
  [/in the past|must start in the future/i, 'Nu poți rezerva un interval din trecut.'],
  [/has already been cancelled/, 'Solicitantul a anulat între timp cererea.'],
  [/^Cannot (approve|reject) reservation in status/, 'Cererea a fost deja procesată.'],
  [/to AWAITING_TRAINING/, 'Instruirea se poate cere doar pentru o cerere în așteptare.'],
  [/^Cannot complete training/, 'Cererea nu așteaptă o instruire.'],
  [/^Cannot approve reservation while resource is/, 'Resursa nu este activă; cererea nu poate fi aprobată acum.'],
  [/Rejection reason is required/, 'Scrie motivul respingerii.'],
  [/Resource is not active/, 'Resursa nu este activă.'],
  [/administrators can change it|not an administrator of this resource/,
    'Doar administratorii acestei resurse pot face modificarea.'],
  [/Administrator role required/, 'Doar administratorii pot face această acțiune.'],
  [/^Only @(.+) accounts can sign in/, (m) => `Doar conturile @${m[1]} se pot conecta.`],
  [/category with this name already exists/, 'Există deja o categorie cu acest nume.'],
  [/category still has resources/,
    'Categoria are încă resurse și nu poate fi ștearsă. Mută-le întâi în altă categorie.'],
  [/^Resource not found/, 'Resursa nu mai există.'],
  [/^Reservation not found/, 'Rezervarea nu mai există.'],
  [/^Maintenance window not found/, 'Perioada de mentenanță nu mai există.'],
  [/^Category not found/, 'Categoria nu mai există.'],
  [/^Overlaps the maintenance from (\S+ \S+) to (\S+ \S+)/, (m) =>
    `Se suprapune cu mentenanța din ${m[1]} – ${m[2]}. Ajustează intervalul.`],
  [/only cancel a reservation before its start/, 'Poți anula o rezervare doar înainte de începerea ei.'],
  [/^Illegal reservation status transition/, 'Rezervarea nu mai poate fi modificată în acest fel.'],
  [/^Team not found/, 'Echipa nu mai există.'],
  [/Each interval must end after it starts/, 'Fiecare interval trebuie să se termine după ce începe.'],
  [/:00 or :30 boundary/, 'Intervalele încep și se termină la :00 sau :30.'],
  [/same day must not overlap/, 'Intervalele din aceeași zi nu se pot suprapune.'],
  [/^(Not authenticated|Invalid or expired session)/, 'Sesiunea a expirat. Conectează-te din nou.'],
  [/can only cancel|only the owner/i, 'Poți anula doar rezervările tale.'],
  [/Cannot cancel|cannot be cancelled/i, 'Rezervarea nu mai poate fi anulată.'],
];

function translate(detail: string): string {
  for (const [pattern, text] of translations) {
    const match = detail.match(pattern);
    if (match) {
      return typeof text === 'string' ? text : text(match);
    }
  }
  return detail;
}

function extractErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as {detail?: unknown}).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return translate(detail);
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (first && typeof first === 'object' && 'msg' in first) {
        const msg = (first as {msg?: unknown}).msg;
        if (typeof msg === 'string' && msg.trim()) {
          return msg;
        }
      }
    }
  }
  return defaultStatusMessages[status] ?? 'A apărut o eroare de comunicare cu serverul.';
}

function handleUnauthorized(skipAuthRedirect?: boolean): void {
  if (skipAuthRedirect) {
    return;
  }
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/conectare') {
    window.location.replace(new URL('/conectare', window.location.origin).toString());
  }
}

/**
 * Single HTTP client for all FastAPI calls:
 * - prefixes requests with NEXT_PUBLIC_API_URL
 * - attaches Authorization: Bearer <token> from the active session
 * - normalizes 401/403/409/422 errors into ApiError
 * - clears session and redirects to /conectare on 401
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {method = 'GET', query, body, headers = {}, signal, skipAuthRedirect} = options;
  const session = typeof window !== 'undefined' ? readSession() : null;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (session?.token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${session.token}`;
  }

  let serializedBody: string | undefined;
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    serializedBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: serializedBody,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'Nu s-a putut contacta serverul backend.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized(skipAuthRedirect);
    }
    throw new ApiError(response.status, extractErrorMessage(response.status, payload));
  }

  return payload as T;
}

export const apiClient = {
  request: apiRequest,
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, {...options, method: 'GET'}),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, {...options, method: 'POST', body}),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, {...options, method: 'PUT', body}),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, {...options, method: 'PATCH', body}),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, {...options, method: 'DELETE'}),
};
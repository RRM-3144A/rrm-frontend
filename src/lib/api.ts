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

function extractErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as {detail?: unknown}).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
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
import {apiClient} from '@/lib/api';
import {ApiError} from '@/lib/errors';
import type {DemoAccount} from '@/lib/mock/accounts';
import {clearSession, readSession, saveSession} from '@/lib/session';
import {resetCache} from '@/lib/store';
import type {Role, SessionUser} from '@/lib/types';

/** Same rule as the backend (ALLOWED_EMAIL_DOMAIN). */
export const allowedEmailDomain =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? 'student.usv.ro';

/** OAuth Client ID of the Google Cloud project (NEXT_PUBLIC_GOOGLE_CLIENT_ID); empty = demo mode. */
export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export type AuthErrorReason = 'domain' | 'failed';

export class AuthError extends Error {
  constructor(readonly reason: AuthErrorReason) {
    super(reason);
    this.name = 'AuthError';
  }
}

interface BackendUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

interface BackendTokenResponse {
  access_token: string;
  user: BackendUser;
}

function mapBackendUser(raw: BackendUser): SessionUser {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    email: raw.email,
    role: raw.role,
  };
}

export function isInstitutionalEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${allowedEmailDomain}`);
}

/** Where each role lands after sign-in. */
export function homePathFor(role: Role): string {
  return role === 'ADMIN' ? '/admin/cereri' : '/sali';
}

/** Authenticates against FastAPI POST /auth/google with a Google ID token. */
export async function signInWithGoogleToken(idToken: string): Promise<SessionUser> {
  try {
    const data = await apiClient.post<BackendTokenResponse>(
      '/auth/google',
      {id_token: idToken},
      {skipAuthRedirect: true},
    );
    const user = mapBackendUser(data.user);
    resetCache();
    saveSession({token: data.access_token, user});
    return user;
  } catch (error) {
    // 401 "Only @student.usv.ro accounts can sign in" (translated in api.ts).
    if (error instanceof ApiError && error.status === 401 && error.message.includes(allowedEmailDomain)) {
      throw new AuthError('domain');
    }
    throw new AuthError('failed');
  }
}

/** Validates the active token via GET /auth/me and refreshes the stored user profile. */
export async function fetchCurrentUser(): Promise<SessionUser | null> {
  const session = readSession();
  if (!session) {
    return null;
  }
  const raw = await apiClient.get<BackendUser>('/auth/me');
  const user = mapBackendUser(raw);
  saveSession({token: session.token, user});
  return user;
}

/**
 * Demo sign-in (no Google OAuth client configured): POST /auth/demo with the chosen
 * seeded account; the backend applies the same domain rule and returns a real JWT.
 * Requires DEMO_LOGIN=true in the backend's .env.
 */
export async function signInWithGoogle(account: DemoAccount): Promise<SessionUser> {
  if (!isInstitutionalEmail(account.email) || account.role === null) {
    throw new AuthError('domain');
  }
  try {
    const data = await apiClient.post<BackendTokenResponse>(
      '/auth/demo',
      {email: account.email},
      {skipAuthRedirect: true},
    );
    const user = mapBackendUser(data.user);
    resetCache();
    saveSession({token: data.access_token, user});
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new AuthError('domain');
    }
    throw new AuthError('failed');
  }
}

export function signOut(): void {
  resetCache();
  clearSession();
}

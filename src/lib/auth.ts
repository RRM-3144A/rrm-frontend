import {apiClient} from '@/lib/api';
import {ApiError} from '@/lib/errors';
import type {DemoAccount} from '@/lib/mock/accounts';
import {clearSession, readSession, saveSession} from '@/lib/session';
import type {Role, SessionUser} from '@/lib/types';

/** Same rule as the backend (ALLOWED_EMAIL_DOMAIN). */
export const allowedEmailDomain =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? 'student.usv.ro';

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
    saveSession({token: data.access_token, user});
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
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
 * Demo sign-in fallback when Google OAuth widget credentials are not configured:
 * applies the backend's domain rule to the chosen account.
 */
export async function signInWithGoogle(account: DemoAccount): Promise<SessionUser> {
  if (!isInstitutionalEmail(account.email) || account.role === null) {
    throw new AuthError('domain');
  }
  const user: SessionUser = {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    role: account.role,
  };
  saveSession({token: 'demo', user});
  return user;
}

export function signOut(): void {
  clearSession();
}
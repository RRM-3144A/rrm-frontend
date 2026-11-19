import type {DemoAccount} from '@/lib/mock/accounts';
import {clearSession, saveSession} from '@/lib/session';
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

export function isInstitutionalEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${allowedEmailDomain}`);
}

/** Where each role lands after sign-in. */
export function homePathFor(role: Role): string {
  return role === 'ADMIN' ? '/admin/cereri' : '/sali';
}

/**
 * Demo sign-in: applies the backend's domain rule to the chosen account.
 * With the API client (E1-41) this becomes POST /auth/google with the Google ID token,
 * and the backend's 401 for other domains maps to AuthError('domain').
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

import type {SessionUser} from '@/lib/types';

/** What the browser keeps after sign-in: the backend JWT and the user. */
export interface Session {
  token: string;
  user: SessionUser;
}

const storageKey = 'rrm.session';

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear.
  }
}

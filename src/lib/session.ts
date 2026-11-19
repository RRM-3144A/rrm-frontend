import {useMemo, useSyncExternalStore} from 'react';

import type {SessionUser} from '@/lib/types';

/** What the browser keeps after sign-in: the backend JWT and the user. */
export interface Session {
  token: string;
  user: SessionUser;
}

const storageKey = 'rrm.session';
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Session | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function readSession(): Session | null {
  return parse(readRaw());
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
  notify();
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear.
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Sign-in or sign-out in another tab.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * The current session; `undefined` while it is not known yet (server render and
 * hydration), `null` when nobody is signed in.
 */
export function useSession(): Session | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    readRaw,
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parse(raw)), [raw]);
}

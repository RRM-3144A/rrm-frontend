// A small client-side cache for backend reads (GET requests), so the hooks in
// src/lib/<area>.ts keep their simple shape (`undefined` while loading).
//
// - Every query has a string key; components that use the same key share one request.
// - After a change (POST / PUT / PATCH / DELETE) the data functions call `invalidate()`,
//   which refetches what is on screen; the old data stays visible meanwhile (no flicker).
// - While a page is open the data is refreshed every few seconds and when the tab gets
//   focus, so the student and the admin see each other's changes (two tabs in the demo).

import {useEffect, useRef, useSyncExternalStore} from 'react';

interface Entry {
  data?: unknown;
  error?: unknown;
  loading?: Promise<void>;
  stale: boolean;
}

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;
const refreshMs = 8_000;
let timer: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function onFocus(): void {
  invalidate();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        invalidate();
      }
    }, refreshMs);
    window.addEventListener('focus', onFocus);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener('focus', onFocus);
    }
  };
}

function load<T>(key: string, fetcher: () => Promise<T>): void {
  let entry = cache.get(key);
  if (!entry) {
    entry = {stale: true};
    cache.set(key, entry);
  }
  if (entry.loading || !entry.stale) {
    return;
  }
  const current = entry;
  // Cleared now, so an invalidate() while this request runs triggers another one.
  current.stale = false;
  current.loading = fetcher()
    .then((data) => {
      current.data = data;
      current.error = undefined;
    })
    .catch((error: unknown) => {
      current.error = error;
      console.error(`[rrm] ${key}:`, error);
    })
    .finally(() => {
      current.loading = undefined;
      emit();
    });
}

/**
 * Data for `key`, loaded with `fetcher`; `undefined` while it is loading (or when the
 * key is null). The fetcher can change between renders; the key identifies the data.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): T | undefined {
  const current = useSyncExternalStore(subscribe, () => version, () => 0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  useEffect(() => {
    if (key !== null) {
      load(key, () => fetcherRef.current());
    }
  }, [key, current]);
  return key === null ? undefined : (cache.get(key)?.data as T | undefined);
}

/** Marks cached data as out of date (all of it, or the keys starting with `prefix`). */
export function invalidate(prefix = ''): void {
  for (const [key, entry] of cache) {
    if (key.startsWith(prefix)) {
      entry.stale = true;
    }
  }
  emit();
}

/** Forgets everything (sign-in / sign-out: the data belongs to another user). */
export function resetCache(): void {
  cache.clear();
  emit();
}

/** Runs a change against the backend, then refreshes the data on screen. */
export async function mutate<T>(change: () => Promise<T>): Promise<T> {
  try {
    return await change();
  } finally {
    invalidate();
  }
}

// Client-side access to resources (GET /resources/{id}); backed by the mock database.
// Server pages keep using src/lib/catalog.ts.

import {useMockDb} from '@/lib/mock/db';
import type {Resource} from '@/lib/types';

/**
 * The current version of a resource (opening hours, status and capacity can change
 * while the page is open); `fallback` until the data is loaded.
 */
export function useResource(fallback: Resource): Resource {
  const db = useMockDb();
  return db?.resources.find((r) => r.id === fallback.id) ?? fallback;
}

// Client-side access to resources (GET /resources, GET /resources/{id}); backed by the
// mock database. Server pages keep using src/lib/catalog.ts.

import {useMemo} from 'react';

import {useMockDb} from '@/lib/mock/db';
import {useSession} from '@/lib/session';
import type {Resource} from '@/lib/types';

/**
 * The current version of a resource (opening hours, status and capacity can change
 * while the page is open); `fallback` until the data is loaded.
 */
export function useResource(fallback: Resource): Resource {
  const db = useMockDb();
  return db?.resources.find((r) => r.id === fallback.id) ?? fallback;
}

/**
 * Resources the signed-in admin manages (backend ensure_resource_admin), without the
 * deactivated ones, by name; `undefined` while loading.
 */
export function useManagedResources(): Resource[] | undefined {
  const db = useMockDb();
  const session = useSession();
  return useMemo(() => {
    if (!db || !session) {
      return undefined;
    }
    return db.resources
      .filter((r) => r.status !== 'INACTIVE' && r.admins.some((a) => a.id === session.user.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [db, session]);
}

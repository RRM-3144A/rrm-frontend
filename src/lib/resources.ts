// Client-side access to resources (GET /resources, GET /resources/{id}).

import {useMemo} from 'react';

import {fetchResource, fetchResources} from '@/lib/backend';
import {useSession} from '@/lib/session';
import {useQuery} from '@/lib/store';
import type {Resource} from '@/lib/types';

/**
 * The current version of a resource (opening hours, status and capacity can change
 * while the page is open); `fallback` until the data is loaded.
 */
export function useResource(fallback: Resource): Resource {
  return useQuery(`resource:${fallback.id}`, () => fetchResource(fallback.id)) ?? fallback;
}

/** All resources, deactivated ones included (admins only); `undefined` while loading. */
export function useAllResourcesQuery(): Resource[] | undefined {
  return useQuery('resources:all', () => fetchResources(true));
}

/**
 * Resources the signed-in admin manages (backend ensure_resource_admin), without the
 * deactivated ones, by name; `undefined` while loading.
 */
export function useManagedResources(): Resource[] | undefined {
  const resources = useAllResourcesQuery();
  const session = useSession();
  return useMemo(() => {
    if (!resources || !session) {
      return undefined;
    }
    return resources.filter(
      (r) => r.status !== 'INACTIVE' && r.admins.some((a) => a.id === session.user.id),
    );
  }, [resources, session]);
}

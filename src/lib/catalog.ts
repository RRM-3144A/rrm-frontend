// The catalog shown to students: GET /resources plus today's availability of each
// resource (GET /resources/{id}/availability). Client-only: use it from client components.

import {fetchAvailability, fetchResource, fetchResources} from '@/lib/backend';
import {formatTime, startOfDay} from '@/lib/dates';
import {useQuery} from '@/lib/store';
import type {AvailabilitySlot, CatalogEntry, Resource, TodayAvailability} from '@/lib/types';

/** Rooms are the resources with seats; everything else is equipment. */
export type CatalogKind = 'rooms' | 'equipment';

export function kindOf(resource: Resource): CatalogKind {
  return resource.seats !== null ? 'rooms' : 'equipment';
}

/** Whether it is taken right now and the free intervals left today (from now on). */
function todayOf(slots: AvailabilitySlot[], now: Date): TodayAvailability {
  const reservedNow = slots.some(
    (s) => new Date(s.startAt) <= now && now < new Date(s.endAt) && s.status === 'APPROVED',
  );
  const freeIntervals: [string, string][] = [];
  for (const slot of slots) {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    if (end <= now || slot.status !== 'FREE') {
      continue;
    }
    const last = freeIntervals.at(-1);
    if (last && last[1] === formatTime(start)) {
      last[1] = formatTime(end);
    } else {
      freeIntervals.push([formatTime(start > now ? start : now), formatTime(end)]);
    }
  }
  return {reservedNow, freeIntervals};
}

async function entryOf(resource: Resource): Promise<CatalogEntry> {
  const now = new Date();
  const today = startOfDay(now);
  let slots: AvailabilitySlot[] = [];
  try {
    slots = await fetchAvailability(resource.id, today, today);
  } catch {
    // The catalog still lists the resource if its availability cannot be read.
  }
  return {resource, today: todayOf(slots, now)};
}

async function fetchCatalog(): Promise<CatalogEntry[]> {
  const resources = await fetchResources();
  return Promise.all(resources.filter((r) => r.status !== 'INACTIVE').map(entryOf));
}

/** Resources of one kind shown in the catalog; `undefined` while loading. */
export function useCatalog(kind: CatalogKind): CatalogEntry[] | undefined {
  const entries = useQuery('catalog', fetchCatalog);
  return entries?.filter(({resource}) => kindOf(resource) === kind);
}

/** One catalog entry; `null` if it does not exist (or is deactivated), `undefined` while loading. */
export function useCatalogEntry(id: number): CatalogEntry | null | undefined {
  return useQuery(`catalog:${id}`, async () => {
    const resource = await fetchResource(id);
    return resource && resource.status !== 'INACTIVE' ? entryOf(resource) : null;
  });
}

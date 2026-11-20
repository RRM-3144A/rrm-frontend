// The catalog shown to students (GET /resources + today's availability), read from
// the mock database, so resources the admin adds, edits or deactivates ("Resurse",
// E1-18) show up right away. Client-only: use it from client components.

import {useMemo} from 'react';

import {addDays, formatTime, startOfDay} from '@/lib/dates';
import {mockAvailability} from '@/lib/mock/availability';
import {approvedStatuses, overlaps, useMockDb} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import type {CatalogEntry, Resource, TodayAvailability} from '@/lib/types';

/** Rooms are the resources with seats; everything else is equipment. */
export type CatalogKind = 'rooms' | 'equipment';

export function kindOf(resource: Resource): CatalogKind {
  return resource.seats !== null ? 'rooms' : 'equipment';
}

/** Whether it is taken right now and the free intervals left today (from now on). */
function todayOf(db: MockDb, resource: Resource, now: Date): TodayAvailability {
  const nowIso = now.toISOString();
  const reservedNow = db.reservations.some(
    (r) =>
      r.resourceId === resource.id &&
      approvedStatuses.includes(r.status) &&
      overlaps(r.startAt, r.endAt, nowIso, new Date(now.getTime() + 1).toISOString()),
  );
  const freeIntervals: [string, string][] = [];
  const today = startOfDay(now);
  const slots = mockAvailability(db, resource.id, today, addDays(today, 1));
  for (const slot of slots) {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    if (end <= now || start >= addDays(today, 1) || slot.status !== 'FREE') {
      continue;
    }
    const from = formatTime(start > now ? start : now);
    const last = freeIntervals.at(-1);
    if (last && last[1] === formatTime(start)) {
      last[1] = formatTime(end);
    } else {
      freeIntervals.push([from, formatTime(end)]);
    }
  }
  return {reservedNow, freeIntervals};
}

function entriesOf(db: MockDb, now: Date): CatalogEntry[] {
  return db.resources
    // Deactivated resources are hidden from students.
    .filter((resource) => resource.status !== 'INACTIVE')
    .map((resource) => ({resource, today: todayOf(db, resource, now)}));
}

/** Resources of one kind shown in the catalog; `undefined` while loading. */
export function useCatalog(kind: CatalogKind): CatalogEntry[] | undefined {
  const db = useMockDb();
  return useMemo(
    () => (db ? entriesOf(db, new Date()).filter(({resource}) => kindOf(resource) === kind) : undefined),
    [db, kind],
  );
}

/** One catalog entry; `null` if it does not exist (or is deactivated), `undefined` while loading. */
export function useCatalogEntry(id: number): CatalogEntry | null | undefined {
  const db = useMockDb();
  return useMemo(() => {
    if (!db) {
      return undefined;
    }
    const resource = db.resources.find((r) => r.id === id && r.status !== 'INACTIVE');
    return resource ? {resource, today: todayOf(db, resource, new Date())} : null;
  }, [db, id]);
}

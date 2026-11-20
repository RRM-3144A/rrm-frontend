import {useMemo} from 'react';

import {mockAvailability} from '@/lib/mock/availability';
import {useMockDb} from '@/lib/mock/db';
import type {AvailabilitySlot} from '@/lib/types';

/**
 * Slots of a resource between two days (inclusive), like
 * GET /resources/{id}/availability; empty until the data is loaded.
 * `from` and `to` should be stable (memoised) dates.
 */
export function useAvailability(resourceId: number, from: Date, to: Date): AvailabilitySlot[] {
  const db = useMockDb();
  return useMemo(
    () => (db ? mockAvailability(db, resourceId, from, to) : []),
    [db, resourceId, from, to],
  );
}

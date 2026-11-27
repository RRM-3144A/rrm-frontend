import {fetchAvailability, toDateParam} from '@/lib/backend';
import {useQuery} from '@/lib/store';
import type {AvailabilitySlot} from '@/lib/types';

const noSlots: AvailabilitySlot[] = [];

/**
 * Slots of a resource between two days (inclusive), from
 * GET /resources/{id}/availability; empty until the data is loaded.
 */
export function useAvailability(resourceId: number, from: Date, to: Date): AvailabilitySlot[] {
  const key = `availability:${resourceId}:${toDateParam(from)}:${toDateParam(to)}`;
  return useQuery(key, () => fetchAvailability(resourceId, from, to)) ?? noSlots;
}

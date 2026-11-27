// Maintenance windows of a resource: GET / POST /resources/{id}/maintenance and
// DELETE /resources/{id}/maintenance/{mid}. Approved reservations that overlap a new
// window are flagged for review by the backend (they appear as "Reanalizare" in
// "Cereri primite").

import {useMemo} from 'react';

import {apiClient} from '@/lib/api';
import {mapMaintenance} from '@/lib/backend';
import type {RawMaintenance, RawReservation} from '@/lib/backend';
import {useAvailability} from '@/lib/availability';
import {addDays} from '@/lib/dates';
import {mutate, useQuery} from '@/lib/store';
import type {MaintenanceWindow} from '@/lib/types';

export interface MaintenanceCreate {
  startAt: string;
  endAt: string;
  reason: string;
}

/** Active windows of a resource that have not ended yet, by start; `undefined` while loading. */
export function useMaintenanceWindows(resourceId: number): MaintenanceWindow[] | undefined {
  const windows = useQuery(`maintenance:${resourceId}`, async () =>
    (await apiClient.get<RawMaintenance[]>(`/resources/${resourceId}/maintenance`)).map(
      mapMaintenance,
    ),
  );
  return useMemo(() => {
    if (!windows) {
      return undefined;
    }
    const now = new Date();
    return windows
      .filter((m) => !m.cancelledAt && new Date(m.endAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [windows]);
}

const far = new Date(0);

/**
 * Estimate of how many approved reservations of a resource overlap an interval (they
 * get flagged for review if a maintenance window is added there), from the runs of
 * fully booked slots in GET /resources/{id}/availability.
 */
export function useAffectedReservations(resourceId: number, startAt: string, endAt: string): number {
  const start = useMemo(() => (startAt ? new Date(startAt) : far), [startAt]);
  const end = useMemo(() => {
    if (!endAt) {
      return far;
    }
    // The availability endpoint accepts at most 31 days.
    const limit = addDays(start, 30);
    const date = new Date(endAt);
    return date > limit ? limit : date;
  }, [endAt, start]);
  const slots = useAvailability(resourceId, start, end);
  return useMemo(() => {
    if (!startAt || !endAt) {
      return 0;
    }
    // Consecutive approved slots inside the interval ≈ one reservation each.
    let runs = 0;
    let previousApproved = false;
    for (const slot of slots) {
      const inside = new Date(slot.startAt) < new Date(endAt) && new Date(startAt) < new Date(slot.endAt);
      const approved = inside && slot.status === 'APPROVED';
      if (approved && !previousApproved) {
        runs += 1;
      }
      previousApproved = approved;
    }
    return runs;
  }, [slots, startAt, endAt]);
}

async function reviewCount(resourceId: number): Promise<number> {
  const raw = await apiClient.get<RawReservation[]>('/reservations/needs-review', {
    query: {resource_id: resourceId},
  });
  return raw.length;
}

/** POST /resources/{id}/maintenance; `flagged` = approved reservations now under review. */
export async function addMaintenance(
  resourceId: number,
  input: MaintenanceCreate,
): Promise<{window: MaintenanceWindow; flagged: number}> {
  const before = await reviewCount(resourceId).catch(() => 0);
  const raw = await mutate(() =>
    apiClient.post<RawMaintenance>(`/resources/${resourceId}/maintenance`, {
      start_at: new Date(input.startAt).toISOString(),
      end_at: new Date(input.endAt).toISOString(),
      reason: input.reason.trim(),
    }),
  );
  const after = await reviewCount(resourceId).catch(() => before);
  return {window: mapMaintenance(raw), flagged: Math.max(after - before, 0)};
}

/** DELETE /resources/{id}/maintenance/{mid}: cancels the window. */
export async function cancelMaintenance(resourceId: number, maintenanceId: number): Promise<void> {
  await mutate(() => apiClient.delete<void>(`/resources/${resourceId}/maintenance/${maintenanceId}`));
}

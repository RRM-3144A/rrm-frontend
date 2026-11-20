// Maintenance windows of a resource: GET / POST /resources/{id}/maintenance and
// DELETE /resources/{id}/maintenance/{mid}. Backed by the mock database; the rules
// follow rrm-backend (app/services/maintenance.py): only the resource's admins,
// no overlapping windows (409), and approved reservations that overlap a new window
// are flagged for review (they appear as "Reanalizare" in "Cereri primite").

import {useMemo} from 'react';

import {ApiError} from '@/lib/errors';
import {newId, overlaps, updateDb, useMockDb} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import {readSession} from '@/lib/session';
import type {MaintenanceWindow} from '@/lib/types';

export interface MaintenanceCreate {
  startAt: string;
  endAt: string;
  reason: string;
}

/** Active windows of a resource that have not ended yet, by start; `undefined` while loading. */
export function useMaintenanceWindows(resourceId: number): MaintenanceWindow[] | undefined {
  const db = useMockDb();
  return useMemo(() => {
    if (!db) {
      return undefined;
    }
    const now = new Date();
    return db.maintenance
      .filter((m) => m.resourceId === resourceId && !m.cancelledAt && new Date(m.endAt) > now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [db, resourceId]);
}

/**
 * How many approved reservations of a resource overlap an interval: they get flagged
 * for review if a maintenance window is added there.
 */
export function useAffectedReservations(resourceId: number, startAt: string, endAt: string): number {
  const db = useMockDb();
  return useMemo(
    () =>
      db?.reservations.filter(
        (r) =>
          r.resourceId === resourceId &&
          r.status === 'APPROVED' &&
          overlaps(r.startAt, r.endAt, startAt, endAt),
      ).length ?? 0,
    [db, resourceId, startAt, endAt],
  );
}

function asResourceAdmin<T>(resourceId: number, change: (db: MockDb, adminId: number) => T): T {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, 'Sesiunea a expirat. Conectează-te din nou.');
  }
  return updateDb((db) => {
    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resursa nu mai există.');
    }
    if (!resource.admins.some((a) => a.id === session.user.id)) {
      throw new ApiError(403, 'Doar administratorii resursei pot programa mentenanța.');
    }
    return change(db, session.user.id);
  });
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** POST /resources/{id}/maintenance */
export async function addMaintenance(
  resourceId: number,
  input: MaintenanceCreate,
): Promise<{window: MaintenanceWindow; flagged: number}> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new ApiError(422, 'Scrie motivul mentenanței.');
  }
  if (new Date(input.endAt) <= new Date(input.startAt)) {
    throw new ApiError(422, 'Sfârșitul trebuie să fie după început.');
  }
  return asResourceAdmin(resourceId, (db, adminId) => {
    const existing = db.maintenance.find(
      (m) =>
        m.resourceId === resourceId &&
        !m.cancelledAt &&
        overlaps(input.startAt, input.endAt, m.startAt, m.endAt),
    );
    if (existing) {
      throw new ApiError(
        409,
        `Se suprapune cu mentenanța din ${formatWhen(existing.startAt)} – ${formatWhen(existing.endAt)}. Ajustează intervalul.`,
      );
    }
    const period: MaintenanceWindow = {
      id: newId(db),
      resourceId,
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
      reason,
      createdBy: adminId,
      cancelledAt: null,
    };
    db.maintenance.push(period);
    let flagged = 0;
    for (const r of db.reservations) {
      if (
        r.resourceId === resourceId &&
        r.status === 'APPROVED' &&
        overlaps(r.startAt, r.endAt, period.startAt, period.endAt)
      ) {
        r.needsReview = true;
        flagged += 1;
      }
    }
    return {window: period, flagged};
  });
}

/** DELETE /resources/{id}/maintenance/{mid}: cancels the window and clears resolved review flags. */
export async function cancelMaintenance(resourceId: number, maintenanceId: number): Promise<void> {
  asResourceAdmin(resourceId, (db) => {
    const period = db.maintenance.find((m) => m.id === maintenanceId && m.resourceId === resourceId);
    if (!period || period.cancelledAt) {
      throw new ApiError(404, 'Perioada de mentenanță nu mai există.');
    }
    period.cancelledAt = new Date().toISOString();
    const active = db.maintenance.filter((m) => m.resourceId === resourceId && !m.cancelledAt);
    for (const r of db.reservations) {
      if (
        r.resourceId === resourceId &&
        r.needsReview &&
        !active.some((m) => overlaps(r.startAt, r.endAt, m.startAt, m.endAt))
      ) {
        r.needsReview = false;
      }
    }
  });
}

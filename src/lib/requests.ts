// Requests received by a resource administrator ("Cereri primite"):
// GET /reservations/pending, GET /reservations/needs-review and the decisions
// POST /reservations/{id}/approve | reject | awaiting-training | complete-training | cancel.
// Backed by the mock database; checks and HTTP statuses follow rrm-backend
// (app/services/admin_decisions.py, app/services/reservations.py).

import {useMemo} from 'react';

import {ApiError} from '@/lib/errors';
import {approvedStatuses, overlaps, updateDb, useMockDb} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import {readSession, useSession} from '@/lib/session';
import type {PendingReservation, Reservation, ReservationStatus} from '@/lib/types';

/** Statuses the admin still has to decide on (backend APPROVABLE_STATUSES). */
const approvableStatuses: ReservationStatus[] = ['PENDING', 'AWAITING_TRAINING'];

function toPending(db: MockDb, reservation: Reservation): PendingReservation | null {
  const resource = db.resources.find((r) => r.id === reservation.resourceId);
  const user = db.users.find((u) => u.id === reservation.userId);
  if (!resource || !user) {
    return null;
  }
  const firstId = Math.min(
    ...db.reservations
      .filter((r) => r.userId === user.id && r.resourceId === resource.id)
      .map((r) => r.id),
  );
  const {teamId, ...userFields} = user;
  return {
    ...reservation,
    resource,
    user: {...userFields, team: db.teams.find((t) => t.id === teamId) ?? null},
    team: db.teams.find((t) => t.id === reservation.teamId) ?? null,
    isFirstReservation: firstId === reservation.id,
    hasCompletedTraining: db.trainings.some(
      (t) => t.userId === user.id && t.resourceId === resource.id,
    ),
  };
}

/**
 * Requests for the resources the signed-in admin manages: waiting for a decision
 * (PENDING, AWAITING_TRAINING) or approved but overlapping a new maintenance window
 * (needs review). Sorted by start time; `undefined` while loading.
 */
export function useReceivedRequests(): PendingReservation[] | undefined {
  const db = useMockDb();
  const session = useSession();
  return useMemo(() => {
    if (!db || !session) {
      return undefined;
    }
    const managed = new Set(
      db.resources
        .filter((r) => r.admins.some((a) => a.id === session.user.id))
        .map((r) => r.id),
    );
    return db.reservations
      .filter(
        (r) =>
          managed.has(r.resourceId) &&
          (approvableStatuses.includes(r.status) || (r.status === 'APPROVED' && r.needsReview)),
      )
      .map((r) => toPending(db, r))
      .filter((r): r is PendingReservation => r !== null)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [db, session]);
}

/** Runs a decision on a reservation of a resource the signed-in admin manages. */
function decide(id: number, change: (db: MockDb, reservation: Reservation, adminId: number) => void) {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, 'Sesiunea a expirat. Conectează-te din nou.');
  }
  if (session.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Doar administratorii pot decide asupra cererilor.');
  }
  return updateDb((db) => {
    const reservation = db.reservations.find((r) => r.id === id);
    const resource = db.resources.find((r) => r.id === reservation?.resourceId);
    if (!reservation || !resource) {
      throw new ApiError(404, 'Cererea nu mai există.');
    }
    if (!resource.admins.some((a) => a.id === session.user.id)) {
      throw new ApiError(403, 'Nu administrezi această resursă.');
    }
    if (reservation.status === 'CANCELLED') {
      throw new ApiError(409, 'Solicitantul a anulat între timp cererea.');
    }
    change(db, reservation, session.user.id);
    return reservation;
  });
}

function record(reservation: Reservation, status: ReservationStatus, adminId: number): void {
  reservation.status = status;
  reservation.decidedBy = adminId;
  reservation.decidedAt = new Date().toISOString();
}

/** POST /reservations/{id}/approve */
export async function approveRequest(id: number): Promise<Reservation> {
  return decide(id, (db, reservation, adminId) => {
    if (!approvableStatuses.includes(reservation.status)) {
      throw new ApiError(409, 'Cererea a fost deja procesată.');
    }
    const resource = db.resources.find((r) => r.id === reservation.resourceId);
    const inMaintenance = db.maintenance.some(
      (m) =>
        m.resourceId === reservation.resourceId &&
        !m.cancelledAt &&
        overlaps(reservation.startAt, reservation.endAt, m.startAt, m.endAt),
    );
    if (inMaintenance) {
      throw new ApiError(409, 'Intervalul se suprapune cu o perioadă de mentenanță.');
    }
    const approved = db.reservations.filter(
      (r) =>
        r.id !== reservation.id &&
        r.resourceId === reservation.resourceId &&
        approvedStatuses.includes(r.status) &&
        overlaps(reservation.startAt, reservation.endAt, r.startAt, r.endAt),
    ).length;
    if (resource && approved >= resource.maxConcurrentTeams) {
      throw new ApiError(
        409,
        `Intervalul are deja ${approved} ${approved === 1 ? 'rezervare aprobată' : 'rezervări aprobate'}; resursa acceptă ${resource.maxConcurrentTeams}.`,
      );
    }
    record(reservation, 'APPROVED', adminId);
  });
}

/** POST /reservations/{id}/reject; the reason is required and sent to the student. */
export async function rejectRequest(id: number, reason: string): Promise<Reservation> {
  if (!reason.trim()) {
    throw new ApiError(422, 'Scrie motivul respingerii.');
  }
  return decide(id, (_db, reservation, adminId) => {
    if (!approvableStatuses.includes(reservation.status)) {
      throw new ApiError(409, 'Cererea a fost deja procesată.');
    }
    record(reservation, 'REJECTED', adminId);
    reservation.rejectionReason = reason.trim();
  });
}

/** POST /reservations/{id}/awaiting-training */
export async function requireTraining(id: number): Promise<Reservation> {
  return decide(id, (_db, reservation, adminId) => {
    if (reservation.status !== 'PENDING') {
      throw new ApiError(409, 'Instruirea se poate cere doar pentru o cerere în așteptare.');
    }
    record(reservation, 'AWAITING_TRAINING', adminId);
  });
}

/**
 * POST /reservations/{id}/complete-training (E1-45): records the training and puts the
 * request back to PENDING, so the admin can approve it.
 */
export async function completeTraining(id: number): Promise<Reservation> {
  return decide(id, (db, reservation, adminId) => {
    if (reservation.status !== 'AWAITING_TRAINING') {
      throw new ApiError(409, 'Cererea nu așteaptă o instruire.');
    }
    if (!db.trainings.some((t) => t.userId === reservation.userId && t.resourceId === reservation.resourceId)) {
      db.trainings.push({userId: reservation.userId, resourceId: reservation.resourceId});
    }
    record(reservation, 'PENDING', adminId);
  });
}

/** POST /reservations/{id}/cancel by the resource admin (e.g. for a maintenance overlap). */
export async function cancelRequest(id: number): Promise<Reservation> {
  return decide(id, (_db, reservation) => {
    if (!['PENDING', 'AWAITING_TRAINING', 'APPROVED'].includes(reservation.status)) {
      throw new ApiError(422, 'Rezervarea nu mai poate fi anulată.');
    }
    reservation.status = 'CANCELLED';
    reservation.needsReview = false;
  });
}

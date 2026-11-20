// Reservations of the signed-in user: POST /reservations, POST /reservations/{id}/cancel
// and the list for "Rezervările mele". Backed by the mock database; the checks and
// the HTTP statuses follow rrm-backend (app/services/reservations.py), so the pages
// already handle the errors the API will return.

import {useMemo} from 'react';

import {addMinutes, parseTime, slotMinutes, weekdayIndex} from '@/lib/dates';
import {ApiError} from '@/lib/errors';
import {blockingStatuses, newId, overlaps, updateDb, useMockDb} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import {readSession, useSession} from '@/lib/session';
import type {Reservation, ReservationCreate, ReservationStatus, Resource, SessionUser, Team} from '@/lib/types';

/** A reservation with what the list shows about it. */
export interface ReservationDetails extends Reservation {
  resource: Resource;
  team: Team | null;
}

/** Statuses a reservation can still be cancelled from (backend ALLOWED_TRANSITIONS). */
const cancellableStatuses: ReservationStatus[] = ['PENDING', 'AWAITING_TRAINING', 'APPROVED'];

/** The student can cancel before the start; the backend answers 422 afterwards. */
export function canCancel(reservation: Reservation, now = new Date()): boolean {
  return cancellableStatuses.includes(reservation.status) && new Date(reservation.startAt) > now;
}

function withDetails(db: MockDb, reservation: Reservation): ReservationDetails | null {
  const resource = db.resources.find((r) => r.id === reservation.resourceId);
  if (!resource) {
    return null;
  }
  return {...reservation, resource, team: db.teams.find((t) => t.id === reservation.teamId) ?? null};
}

/** The signed-in user's reservations, newest first; `undefined` while loading. */
export function useMyReservations(): ReservationDetails[] | undefined {
  const db = useMockDb();
  const session = useSession();
  return useMemo(() => {
    if (!db || !session) {
      return undefined;
    }
    return db.reservations
      .filter((r) => r.userId === session.user.id)
      .map((r) => withDetails(db, r))
      .filter((r): r is ReservationDetails => r !== null)
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
  }, [db, session]);
}

/** The signed-in user's team (backend UserOut.team); `undefined` while loading. */
export function useMyTeam(): Team | null | undefined {
  const db = useMockDb();
  const session = useSession();
  if (!db || !session) {
    return undefined;
  }
  const teamId = db.users.find((u) => u.id === session.user.id)?.teamId;
  return db.teams.find((t) => t.id === teamId) ?? null;
}

/** True when the signed-in user has never booked this resource before. */
export function useIsFirstReservation(resourceId: number): boolean {
  const db = useMockDb();
  const session = useSession();
  if (!db || !session) {
    return false;
  }
  return !db.reservations.some((r) => r.userId === session.user.id && r.resourceId === resourceId);
}

function currentUser(): SessionUser {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, 'Sesiunea a expirat. Conectează-te din nou.');
  }
  return session.user;
}

/** Same checks as the backend's _validate_slot_interval and _validate_operating_schedule. */
function validateInterval(resource: Resource, start: Date, end: Date): void {
  const minutes = (end.getTime() - start.getTime()) / 60_000;
  if (minutes <= 0 || minutes % slotMinutes !== 0 || start.getMinutes() % slotMinutes !== 0) {
    throw new ApiError(422, 'Intervalul trebuie să fie format din sloturi întregi de 30 de minute.');
  }
  if (start <= new Date()) {
    throw new ApiError(422, 'Nu poți rezerva un interval din trecut.');
  }
  if (resource.maxDurationMin !== null && minutes > resource.maxDurationMin) {
    throw new ApiError(
      422,
      `Durata maximă pentru această resursă este de ${resource.maxDurationMin / 60} ore.`,
    );
  }
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = startMinutes + minutes;
  const inSchedule = resource.schedule.some(
    (s) =>
      s.weekday === weekdayIndex(start) &&
      parseTime(s.startTime) <= startMinutes &&
      endMinutes <= parseTime(s.endTime),
  );
  if (!inSchedule) {
    throw new ApiError(422, 'Intervalul ales este în afara programului de funcționare.');
  }
}

/** POST /reservations: a new request, PENDING until the resource's admin decides. */
export async function createReservation(input: ReservationCreate): Promise<Reservation> {
  const user = currentUser();
  return updateDb((db) => {
    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource || resource.status === 'INACTIVE') {
      throw new ApiError(404, 'Resursa nu mai există.');
    }
    if (resource.status === 'MAINTENANCE') {
      throw new ApiError(409, 'Resursa este în mentenanță și nu poate fi rezervată acum.');
    }
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    validateInterval(resource, start, end);

    const inMaintenance = db.maintenance.some(
      (m) =>
        m.resourceId === resource.id &&
        !m.cancelledAt &&
        overlaps(input.startAt, input.endAt, m.startAt, m.endAt),
    );
    if (inMaintenance) {
      throw new ApiError(409, 'Intervalul se suprapune cu o perioadă de mentenanță.');
    }

    // At most `maxConcurrentTeams` pending or approved bookings in every slot.
    const bookings = db.reservations.filter(
      (r) => r.resourceId === resource.id && blockingStatuses.includes(r.status),
    );
    for (let slot = start; slot < end; slot = addMinutes(slot, slotMinutes)) {
      const slotStart = slot.toISOString();
      const slotEnd = addMinutes(slot, slotMinutes).toISOString();
      const taken = bookings.filter((b) => overlaps(slotStart, slotEnd, b.startAt, b.endAt)).length;
      if (taken >= resource.maxConcurrentTeams) {
        throw new ApiError(409, 'Intervalul ales nu mai are locuri libere. Alege alt interval.');
      }
    }

    const reservation: Reservation = {
      id: newId(db),
      userId: user.id,
      resourceId: resource.id,
      teamId: input.teamId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      purpose: input.purpose,
      status: 'PENDING',
      rejectionReason: null,
      needsReview: false,
      decidedBy: null,
      decidedAt: null,
      createdAt: new Date().toISOString(),
    };
    db.reservations.push(reservation);
    return reservation;
  });
}

/** POST /reservations/{id}/cancel by the student who made it. */
export async function cancelReservation(id: number): Promise<Reservation> {
  const user = currentUser();
  return updateDb((db) => {
    const reservation = db.reservations.find((r) => r.id === id);
    if (!reservation) {
      throw new ApiError(404, 'Rezervarea nu mai există.');
    }
    if (reservation.userId !== user.id) {
      throw new ApiError(403, 'Poți anula doar rezervările tale.');
    }
    if (!cancellableStatuses.includes(reservation.status)) {
      throw new ApiError(422, 'Rezervarea nu mai poate fi anulată.');
    }
    if (new Date(reservation.startAt) <= new Date()) {
      throw new ApiError(422, 'Poți anula o rezervare doar înainte de începerea ei.');
    }
    reservation.status = 'CANCELLED';
    reservation.needsReview = false;
    return reservation;
  });
}

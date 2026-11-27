// Reservations of the signed-in user: POST /reservations, POST /reservations/{id}/cancel
// and GET /reservations/me for "Rezervările mele".

import {useMemo} from 'react';

import {apiClient} from '@/lib/api';
import {
  fetchMe,
  fetchResources,
  mapReservation,
  mapTeam,
  resourceFromSummary,
} from '@/lib/backend';
import type {RawReservation, RawResourceSummary, RawTeam} from '@/lib/backend';
import {mutate, useQuery} from '@/lib/store';
import type {Reservation, ReservationCreate, ReservationStatus, Resource, Team} from '@/lib/types';

/** A reservation with what the list shows about it. */
export interface ReservationDetails extends Reservation {
  resource: Resource;
  team: Team | null;
}

interface RawMyReservation extends RawReservation {
  resource: RawResourceSummary;
  team: RawTeam | null;
}

/** Statuses a reservation can still be cancelled from (backend ALLOWED_TRANSITIONS). */
const cancellableStatuses: ReservationStatus[] = ['PENDING', 'AWAITING_TRAINING', 'APPROVED'];

/** The student can cancel before the start; the backend answers 422 afterwards. */
export function canCancel(reservation: Reservation, now = new Date()): boolean {
  return cancellableStatuses.includes(reservation.status) && new Date(reservation.startAt) > now;
}

async function fetchMyReservations(): Promise<ReservationDetails[]> {
  const [raw, resources] = await Promise.all([
    apiClient.get<RawMyReservation[]>('/reservations/me'),
    fetchResources(),
  ]);
  const byId = new Map(resources.map((r) => [r.id, r]));
  return raw
    .map((r) => ({
      ...mapReservation(r),
      resource: byId.get(r.resource_id) ?? resourceFromSummary(r.resource),
      team: mapTeam(r.team),
    }))
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

/** The signed-in user's reservations, newest first; `undefined` while loading. */
export function useMyReservations(): ReservationDetails[] | undefined {
  return useQuery('reservations:me', fetchMyReservations);
}

/** The signed-in user's team (backend UserOut.team); `undefined` while loading. */
export function useMyTeam(): Team | null | undefined {
  const me = useQuery('me', fetchMe);
  return me === undefined ? undefined : me.team;
}

/** True when the signed-in user has never booked this resource before. */
export function useIsFirstReservation(resourceId: number): boolean {
  const mine = useMyReservations();
  return useMemo(
    () => mine !== undefined && !mine.some((r) => r.resourceId === resourceId),
    [mine, resourceId],
  );
}

/** POST /reservations: a new request, PENDING until the resource's admin decides. */
export async function createReservation(input: ReservationCreate): Promise<Reservation> {
  const raw = await mutate(() =>
    apiClient.post<RawReservation>('/reservations', {
      resource_id: input.resourceId,
      start_at: new Date(input.startAt).toISOString(),
      end_at: new Date(input.endAt).toISOString(),
      purpose: input.purpose,
      team_id: input.teamId,
    }),
  );
  return mapReservation(raw);
}

/** POST /reservations/{id}/cancel by the student who made it. */
export async function cancelReservation(id: number): Promise<Reservation> {
  const raw = await mutate(() => apiClient.post<RawReservation>(`/reservations/${id}/cancel`));
  return mapReservation(raw);
}

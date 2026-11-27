// Requests received by a resource administrator ("Cereri primite"):
// GET /reservations/pending, GET /reservations/needs-review and the decisions
// POST /reservations/{id}/approve | reject | awaiting-training | complete-training | cancel.

import {apiClient} from '@/lib/api';
import {
  fetchResources,
  mapReservation,
  mapTeam,
  mapUser,
  resourceFromSummary,
} from '@/lib/backend';
import type {RawReservation, RawResourceSummary, RawTeam, RawUser} from '@/lib/backend';
import {ApiError} from '@/lib/errors';
import {mutate, useQuery} from '@/lib/store';
import type {PendingReservation, Reservation} from '@/lib/types';

interface RawPending extends RawReservation {
  user: RawUser;
  resource: RawResourceSummary;
  team: RawTeam | null;
  is_first_reservation: boolean;
  has_completed_training: boolean;
}

async function fetchReceivedRequests(): Promise<PendingReservation[]> {
  const [pending, review, resources, users, teams] = await Promise.all([
    apiClient.get<RawPending[]>('/reservations/pending'),
    apiClient.get<RawReservation[]>('/reservations/needs-review'),
    fetchResources(true),
    apiClient.get<RawUser[]>('/users'),
    apiClient.get<RawTeam[]>('/teams'),
  ]);
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const userById = new Map(users.map((u) => [u.id, mapUser(u)]));
  const teamById = new Map(teams.map((t) => [t.id, mapTeam(t)]));

  const requests: PendingReservation[] = pending.map((r) => ({
    ...mapReservation(r),
    user: mapUser(r.user),
    resource: resourceById.get(r.resource_id) ?? resourceFromSummary(r.resource),
    team: mapTeam(r.team),
    isFirstReservation: r.is_first_reservation,
    hasCompletedTraining: r.has_completed_training,
  }));

  const seen = new Set(requests.map((r) => r.id));
  for (const r of review) {
    const user = userById.get(r.user_id);
    const resource = resourceById.get(r.resource_id);
    if (seen.has(r.id) || !user || !resource) {
      continue;
    }
    requests.push({
      ...mapReservation(r),
      user,
      resource,
      team: r.team_id !== null ? (teamById.get(r.team_id) ?? null) : null,
      isFirstReservation: false,
      hasCompletedTraining: true,
    });
  }
  return requests.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

/**
 * Requests for the resources the signed-in admin manages: waiting for a decision
 * (PENDING, AWAITING_TRAINING) or approved but overlapping a new maintenance window
 * (needs review). Sorted by start time; `undefined` while loading.
 */
export function useReceivedRequests(): PendingReservation[] | undefined {
  return useQuery('requests', fetchReceivedRequests);
}

async function decide(id: number, action: string, body?: unknown): Promise<Reservation> {
  const raw = await mutate(() =>
    apiClient.post<RawReservation>(`/reservations/${id}/${action}`, body),
  );
  return mapReservation(raw);
}

/** POST /reservations/{id}/approve */
export async function approveRequest(id: number): Promise<Reservation> {
  return decide(id, 'approve');
}

/** POST /reservations/{id}/reject; the reason is required and sent to the student. */
export async function rejectRequest(id: number, reason: string): Promise<Reservation> {
  if (!reason.trim()) {
    throw new ApiError(422, 'Scrie motivul respingerii.');
  }
  return decide(id, 'reject', {reason: reason.trim()});
}

/** POST /reservations/{id}/awaiting-training */
export async function requireTraining(id: number): Promise<Reservation> {
  return decide(id, 'awaiting-training');
}

/**
 * POST /reservations/{id}/complete-training (E1-45): records the training and puts the
 * request back to PENDING, so the admin can approve it.
 */
export async function completeTraining(id: number): Promise<Reservation> {
  return decide(id, 'complete-training');
}

/** POST /reservations/{id}/cancel by the resource admin (e.g. for a maintenance overlap). */
export async function cancelRequest(id: number): Promise<Reservation> {
  return decide(id, 'cancel');
}

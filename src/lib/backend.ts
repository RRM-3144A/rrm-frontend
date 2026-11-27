// Backend response shapes (snake_case, rrm-backend app/schemas.py) and their mapping
// to the frontend types (camelCase, src/lib/types.ts), plus the shared reads.

import {apiClient} from '@/lib/api';
import {ApiError} from '@/lib/errors';
import type {
  AdminSummary,
  AvailabilitySlot,
  CategoryDetails,
  MaintenanceWindow,
  Reservation,
  Resource,
  ScheduleInterval,
  SlotStatus,
  Team,
  UserSummary,
} from '@/lib/types';

export interface RawTeam {
  id: number;
  name: string;
}

export interface RawUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'STUDENT' | 'ADMIN';
  team?: RawTeam | null;
}

export interface RawSchedule {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface RawResource {
  id: number;
  name: string;
  description: string | null;
  status: Resource['status'];
  max_concurrent_teams: number;
  location: string | null;
  floor: number | null;
  seats: number | null;
  equipment: string | null;
  model: string | null;
  max_duration_min: number | null;
  requires_training: boolean;
  category_id: number;
  category: {name: string};
  admins: {id: number; first_name: string; last_name: string; email: string}[];
  schedules?: RawSchedule[];
}

export interface RawResourceSummary {
  id: number;
  name: string;
  location: string | null;
  requires_training: boolean;
  max_concurrent_teams: number;
}

export interface RawReservation {
  id: number;
  user_id: number;
  resource_id: number;
  team_id: number | null;
  start_at: string;
  end_at: string;
  purpose: string | null;
  status: Reservation['status'];
  rejection_reason?: string | null;
  needs_review: boolean;
  decided_by?: number | null;
  decided_at?: string | null;
  created_at: string | null;
}

export interface RawSlot {
  start_at: string;
  end_at: string;
  status: SlotStatus;
  free_places: number;
}

export interface RawMaintenance {
  id: number;
  resource_id: number;
  start_at: string;
  end_at: string;
  reason: string;
  created_by: number | null;
  cancelled_at: string | null;
}

export interface RawCategory {
  id: number;
  name: string;
  description: string | null;
  resource_count: number;
}

/** "08:00:00" → "08:00" */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** Local calendar day as "YYYY-MM-DD" (the backend's start_date / end_date). */
export function toDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function mapTeam(raw: RawTeam | null | undefined): Team | null {
  return raw ? {id: raw.id, name: raw.name} : null;
}

export function mapUser(raw: RawUser): UserSummary {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
    role: raw.role,
    team: mapTeam(raw.team),
  };
}

export function mapAdmin(raw: RawResource['admins'][number] | RawUser): AdminSummary {
  return {id: raw.id, firstName: raw.first_name, lastName: raw.last_name, email: raw.email};
}

export function mapSchedule(raw: RawSchedule): ScheduleInterval {
  return {weekday: raw.weekday, startTime: hhmm(raw.start_time), endTime: hhmm(raw.end_time)};
}

export function mapResource(raw: RawResource): Resource {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    maxConcurrentTeams: raw.max_concurrent_teams,
    location: raw.location,
    floor: raw.floor,
    seats: raw.seats,
    equipment: raw.equipment,
    model: raw.model,
    maxDurationMin: raw.max_duration_min,
    requiresTraining: raw.requires_training,
    category: {id: raw.category_id, name: raw.category.name},
    admins: raw.admins.map(mapAdmin),
    schedule: (raw.schedules ?? [])
      .map(mapSchedule)
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
  };
}

/** A resource known only from a reservation summary (e.g. deactivated since). */
export function resourceFromSummary(raw: RawResourceSummary): Resource {
  return {
    id: raw.id,
    name: raw.name,
    description: null,
    status: 'ACTIVE',
    maxConcurrentTeams: raw.max_concurrent_teams,
    location: raw.location,
    floor: null,
    seats: null,
    equipment: null,
    model: null,
    maxDurationMin: null,
    requiresTraining: raw.requires_training,
    category: {id: 0, name: ''},
    admins: [],
    schedule: [],
  };
}

export function mapReservation(raw: RawReservation): Reservation {
  return {
    id: raw.id,
    userId: raw.user_id,
    resourceId: raw.resource_id,
    teamId: raw.team_id,
    startAt: raw.start_at,
    endAt: raw.end_at,
    purpose: raw.purpose,
    status: raw.status,
    rejectionReason: raw.rejection_reason ?? null,
    needsReview: raw.needs_review,
    decidedBy: raw.decided_by ?? null,
    decidedAt: raw.decided_at ?? null,
    createdAt: raw.created_at ?? raw.start_at,
  };
}

export function mapSlot(raw: RawSlot): AvailabilitySlot {
  return {startAt: raw.start_at, endAt: raw.end_at, status: raw.status, freePlaces: raw.free_places};
}

export function mapMaintenance(raw: RawMaintenance): MaintenanceWindow {
  return {
    id: raw.id,
    resourceId: raw.resource_id,
    startAt: raw.start_at,
    endAt: raw.end_at,
    reason: raw.reason,
    createdBy: raw.created_by,
    cancelledAt: raw.cancelled_at,
  };
}

export function mapCategory(raw: RawCategory): CategoryDetails {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    resourceCount: raw.resource_count,
  };
}

// ---------------------------------------------------------------------------
// Shared reads

/** GET /resources (admins can include the deactivated ones). */
export async function fetchResources(includeInactive = false): Promise<Resource[]> {
  const raw = await apiClient.get<RawResource[]>('/resources', {
    query: includeInactive ? {include_inactive: true} : undefined,
  });
  return raw.map(mapResource).sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

/** GET /resources/{id}; null when it does not exist. */
export async function fetchResource(id: number): Promise<Resource | null> {
  try {
    return mapResource(await apiClient.get<RawResource>(`/resources/${id}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** GET /resources/{id}/availability for the days `from`..`to` (inclusive). */
export async function fetchAvailability(
  resourceId: number,
  from: Date,
  to: Date,
): Promise<AvailabilitySlot[]> {
  const raw = await apiClient.get<RawSlot[]>(`/resources/${resourceId}/availability`, {
    query: {start_date: toDateParam(from), end_date: toDateParam(to)},
  });
  return raw.map(mapSlot);
}

/** GET /auth/me with the user's team. */
export async function fetchMe(): Promise<UserSummary> {
  return mapUser(await apiClient.get<RawUser>('/auth/me'));
}

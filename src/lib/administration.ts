// Administration of resources and categories ("Resurse", "Categorii"):
// POST / PATCH / DELETE /resources and /categories. ADMIN role only;
// DELETE /resources/{id} only deactivates, a category with resources cannot be
// deleted (409), category names are unique (409).

import {useMemo} from 'react';

import {apiClient} from '@/lib/api';
import {mapAdmin, mapCategory, mapResource} from '@/lib/backend';
import type {RawCategory, RawResource, RawUser} from '@/lib/backend';
import {slotMinutes} from '@/lib/dates';
import {ApiError} from '@/lib/errors';
import {useAllResourcesQuery} from '@/lib/resources';
import {mutate, useQuery} from '@/lib/store';
import type {AdminSummary, CategoryDetails, Resource, ResourceStatus} from '@/lib/types';

/** Body of POST /resources and PATCH /resources/{id} (all fields sent). */
export interface ResourceInput {
  name: string;
  categoryId: number;
  description: string | null;
  status: Exclude<ResourceStatus, 'INACTIVE'>;
  maxConcurrentTeams: number;
  location: string | null;
  floor: number | null;
  seats: number | null;
  equipment: string | null;
  model: string | null;
  maxDurationMin: number | null;
  requiresTraining: boolean;
  adminIds: number[];
}

export interface CategoryInput {
  name: string;
  description: string | null;
}

/** All resources, deactivated ones included, by name; `undefined` while loading. */
export function useAllResources(): Resource[] | undefined {
  return useAllResourcesQuery();
}

/** GET /categories with the number of resources in each; `undefined` while loading. */
export function useCategories(): CategoryDetails[] | undefined {
  return useQuery('categories', async () =>
    (await apiClient.get<RawCategory[]>('/categories'))
      .map(mapCategory)
      .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
  );
}

const noAdmins: AdminSummary[] = [];

/** Users with the ADMIN role, who can be made administrators of a resource. */
export function useAdmins(): AdminSummary[] {
  const users = useQuery('users', () => apiClient.get<RawUser[]>('/users'));
  return useMemo(
    () => (users ? users.filter((u) => u.role === 'ADMIN').map(mapAdmin) : noAdmins),
    [users],
  );
}

/**
 * Upcoming pending or approved reservations of a resource (shown before deactivating).
 * The API has no endpoint for this count, so the dialog does not show it.
 */
export function useUpcomingReservationCount(resourceId: number): number {
  void resourceId;
  return 0;
}

/** Same checks as the backend's ResourceFields / ResourceCreate, with Romanian messages. */
function validate(input: ResourceInput): void {
  if (!input.name.trim()) {
    throw new ApiError(422, 'Scrie numele resursei.');
  }
  if (!input.categoryId) {
    throw new ApiError(422, 'Alege o categorie.');
  }
  if (input.maxConcurrentTeams < 1 || input.maxConcurrentTeams > 2) {
    throw new ApiError(422, 'O resursă poate fi folosită de 1 sau 2 echipe simultan.');
  }
  if (input.seats !== null && input.seats < 0) {
    throw new ApiError(422, 'Numărul de locuri nu poate fi negativ.');
  }
  if (
    input.maxDurationMin !== null &&
    (input.maxDurationMin <= 0 || input.maxDurationMin % slotMinutes !== 0)
  ) {
    throw new ApiError(422, 'Durata maximă trebuie să fie un multiplu de 30 de minute.');
  }
}

function bodyOf(input: ResourceInput) {
  const trim = (value: string | null) => value?.trim() || null;
  return {
    name: input.name.trim(),
    category_id: input.categoryId,
    description: trim(input.description),
    status: input.status,
    max_concurrent_teams: input.maxConcurrentTeams,
    location: trim(input.location),
    floor: input.floor,
    seats: input.seats,
    equipment: trim(input.equipment),
    model: trim(input.model),
    max_duration_min: input.maxDurationMin,
    requires_training: input.requiresTraining,
    admin_ids: input.adminIds,
  };
}

/** POST /resources. Like the backend, a new resource has no opening hours yet. */
export async function createResource(input: ResourceInput): Promise<Resource> {
  validate(input);
  return mapResource(await mutate(() => apiClient.post<RawResource>('/resources', bodyOf(input))));
}

/** PATCH /resources/{id} (also reactivates a deactivated resource). */
export async function updateResource(id: number, input: ResourceInput): Promise<Resource> {
  validate(input);
  return mapResource(
    await mutate(() => apiClient.patch<RawResource>(`/resources/${id}`, bodyOf(input))),
  );
}

/** DELETE /resources/{id}: marks it INACTIVE; it disappears from the catalog. */
export async function deactivateResource(id: number): Promise<void> {
  await mutate(() => apiClient.delete<void>(`/resources/${id}`));
}

function categoryBody(input: CategoryInput) {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError(422, 'Scrie numele categoriei.');
  }
  return {name, description: input.description?.trim() || null};
}

/** POST /categories */
export async function createCategory(input: CategoryInput): Promise<void> {
  const body = categoryBody(input);
  await mutate(() => apiClient.post('/categories', body));
}

/** PATCH /categories/{id}; the resources show the new name. */
export async function updateCategory(id: number, input: CategoryInput): Promise<void> {
  const body = categoryBody(input);
  await mutate(() => apiClient.patch(`/categories/${id}`, body));
}

/** DELETE /categories/{id}; 409 while it still has resources. */
export async function deleteCategory(id: number): Promise<void> {
  await mutate(() => apiClient.delete(`/categories/${id}`));
}

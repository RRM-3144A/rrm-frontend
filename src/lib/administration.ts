// Administration of resources and categories ("Resurse", "Categorii"):
// POST / PATCH / DELETE /resources and /categories. Backed by the mock database;
// the rules follow rrm-backend (app/routers/resources.py, categories.py, schemas.py):
// ADMIN role only, DELETE /resources/{id} only deactivates, a category with
// resources cannot be deleted, category names are unique.

import {useMemo} from 'react';

import {slotMinutes} from '@/lib/dates';
import {ApiError} from '@/lib/errors';
import {blockingStatuses, newId, updateDb, useMockDb} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import {readSession} from '@/lib/session';
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
  const db = useMockDb();
  return useMemo(
    () => db && [...db.resources].sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [db],
  );
}

/** GET /categories with the number of resources in each; `undefined` while loading. */
export function useCategories(): CategoryDetails[] | undefined {
  const db = useMockDb();
  return useMemo(
    () =>
      db &&
      db.categories
        .map((c) => ({...c, resourceCount: db.resources.filter((r) => r.category.id === c.id).length}))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [db],
  );
}

/** Users with the ADMIN role, who can be made administrators of a resource. */
export function useAdmins(): AdminSummary[] {
  const db = useMockDb();
  return useMemo(
    () =>
      (db?.users ?? [])
        .filter((u) => u.role === 'ADMIN')
        .map(({id, firstName, lastName, email}) => ({id, firstName, lastName, email})),
    [db],
  );
}

/** Upcoming pending or approved reservations of a resource (shown before deactivating). */
export function useUpcomingReservationCount(resourceId: number): number {
  const db = useMockDb();
  return useMemo(() => {
    const now = new Date();
    return (
      db?.reservations.filter(
        (r) =>
          r.resourceId === resourceId &&
          blockingStatuses.includes(r.status) &&
          new Date(r.endAt) > now,
      ).length ?? 0
    );
  }, [db, resourceId]);
}

function asAdmin<T>(change: (db: MockDb) => T): T {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, 'Sesiunea a expirat. Conectează-te din nou.');
  }
  if (session.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Doar administratorii pot gestiona resursele.');
  }
  return updateDb(change);
}

/** Same checks as the backend's ResourceFields / ResourceCreate. */
function validate(db: MockDb, input: ResourceInput): void {
  if (!input.name.trim()) {
    throw new ApiError(422, 'Scrie numele resursei.');
  }
  if (!db.categories.some((c) => c.id === input.categoryId)) {
    throw new ApiError(422, 'Alege o categorie.');
  }
  if (input.maxConcurrentTeams < 1 || input.maxConcurrentTeams > 2) {
    throw new ApiError(422, 'O resursă poate fi folosită de 1 sau 2 echipe simultan.');
  }
  if (input.seats !== null && input.seats < 0) {
    throw new ApiError(422, 'Numărul de locuri nu poate fi negativ.');
  }
  if (input.maxDurationMin !== null && (input.maxDurationMin <= 0 || input.maxDurationMin % slotMinutes !== 0)) {
    throw new ApiError(422, 'Durata maximă trebuie să fie un multiplu de 30 de minute.');
  }
  if (input.adminIds.some((id) => db.users.find((u) => u.id === id)?.role !== 'ADMIN')) {
    throw new ApiError(422, 'Administratorii resursei trebuie să aibă rolul de administrator.');
  }
}

/** The resource fields an input sets (everything except id and schedule). */
function fieldsFrom(db: MockDb, input: ResourceInput): Omit<Resource, 'id' | 'schedule'> {
  const category = db.categories.find((c) => c.id === input.categoryId)!;
  const trim = (value: string | null) => value?.trim() || null;
  return {
    name: input.name.trim(),
    category: {id: category.id, name: category.name},
    description: trim(input.description),
    status: input.status,
    maxConcurrentTeams: input.maxConcurrentTeams,
    location: trim(input.location),
    floor: input.floor,
    seats: input.seats,
    equipment: trim(input.equipment),
    model: trim(input.model),
    maxDurationMin: input.maxDurationMin,
    requiresTraining: input.requiresTraining,
    admins: db.users
      .filter((u) => input.adminIds.includes(u.id))
      .map(({id, firstName, lastName, email}) => ({id, firstName, lastName, email})),
  };
}

/** POST /resources. Like the backend, a new resource has no opening hours yet. */
export async function createResource(input: ResourceInput): Promise<Resource> {
  return asAdmin((db) => {
    validate(db, input);
    const resource: Resource = {id: newId(db), schedule: [], ...fieldsFrom(db, input)};
    db.resources.push(resource);
    return resource;
  });
}

/** PATCH /resources/{id} (also reactivates a deactivated resource). */
export async function updateResource(id: number, input: ResourceInput): Promise<Resource> {
  return asAdmin((db) => {
    const resource = db.resources.find((r) => r.id === id);
    if (!resource) {
      throw new ApiError(404, 'Resursa nu mai există.');
    }
    validate(db, input);
    Object.assign(resource, fieldsFrom(db, input));
    return resource;
  });
}

/** DELETE /resources/{id}: marks it INACTIVE; it disappears from the catalog. */
export async function deactivateResource(id: number): Promise<void> {
  asAdmin((db) => {
    const resource = db.resources.find((r) => r.id === id);
    if (!resource) {
      throw new ApiError(404, 'Resursa nu mai există.');
    }
    resource.status = 'INACTIVE';
  });
}

function checkCategory(db: MockDb, input: CategoryInput, id?: number): string {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError(422, 'Scrie numele categoriei.');
  }
  const taken = db.categories.some(
    (c) => c.id !== id && c.name.toLocaleLowerCase('ro') === name.toLocaleLowerCase('ro'),
  );
  if (taken) {
    throw new ApiError(409, 'Există deja o categorie cu acest nume.');
  }
  return name;
}

/** POST /categories */
export async function createCategory(input: CategoryInput): Promise<void> {
  asAdmin((db) => {
    const name = checkCategory(db, input);
    db.categories.push({id: newId(db), name, description: input.description?.trim() || null});
  });
}

/** PATCH /categories/{id}; the resources show the new name. */
export async function updateCategory(id: number, input: CategoryInput): Promise<void> {
  asAdmin((db) => {
    const category = db.categories.find((c) => c.id === id);
    if (!category) {
      throw new ApiError(404, 'Categoria nu mai există.');
    }
    category.name = checkCategory(db, input, id);
    category.description = input.description?.trim() || null;
    for (const resource of db.resources.filter((r) => r.category.id === id)) {
      resource.category = {id, name: category.name};
    }
  });
}

/** DELETE /categories/{id}; 409 while it still has resources. */
export async function deleteCategory(id: number): Promise<void> {
  asAdmin((db) => {
    if (db.resources.some((r) => r.category.id === id)) {
      throw new ApiError(409, 'Categoria are încă resurse și nu poate fi ștearsă. Mută-le întâi în altă categorie.');
    }
    db.categories = db.categories.filter((c) => c.id !== id);
  });
}

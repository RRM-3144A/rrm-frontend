// Types that mirror the backend schemas (rrm-backend, app/schemas.py).

export type ResourceStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Category {
  id: number;
  name: string;
}

export interface AdminSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

/** One opening interval; weekday 0 = Monday, times as "HH:MM". */
export interface ScheduleInterval {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface Resource {
  id: number;
  name: string;
  description: string | null;
  status: ResourceStatus;
  maxConcurrentTeams: number;
  location: string | null;
  floor: number | null;
  seats: number | null;
  equipment: string | null;
  model: string | null;
  maxDurationMin: number | null;
  requiresTraining: boolean;
  category: Category;
  admins: AdminSummary[];
  schedule: ScheduleInterval[];
}

/** Today's situation of a resource, as shown in the catalog. */
export interface TodayAvailability {
  /** True if a reservation occupies the resource right now. */
  reservedNow: boolean;
  /** Free intervals left today, e.g. ["08:00", "10:00"]. */
  freeIntervals: [string, string][];
}

export interface CatalogEntry {
  resource: Resource;
  today: TodayAvailability;
}

export type Role = 'STUDENT' | 'ADMIN';

/** The signed-in user (backend UserOut). */
export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

/** Backend SlotStatus (GET /resources/{id}/availability). */
export type SlotStatus = 'FREE' | 'PENDING' | 'APPROVED' | 'MAINTENANCE';

/** One 30-minute slot (backend AvailabilitySlot); times as ISO strings. */
export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  status: SlotStatus;
  freePlaces: number;
}

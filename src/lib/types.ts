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

/** Backend ReservationStatus. */
export type ReservationStatus =
  | 'PENDING'
  | 'AWAITING_TRAINING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Team {
  id: number;
  name: string;
}

/** A user as returned in reservation lists (backend UserOut with its team). */
export interface UserSummary extends SessionUser {
  team: Team | null;
}

/** Backend ReservationOut; times as ISO strings. */
export interface Reservation {
  id: number;
  userId: number;
  resourceId: number;
  teamId: number | null;
  startAt: string;
  endAt: string;
  purpose: string | null;
  status: ReservationStatus;
  rejectionReason: string | null;
  /** Set when a maintenance window now overlaps an approved reservation (E1-30). */
  needsReview: boolean;
  decidedBy: number | null;
  decidedAt: string | null;
  createdAt: string;
}

/** Body of POST /reservations. */
export interface ReservationCreate {
  resourceId: number;
  startAt: string;
  endAt: string;
  purpose: string | null;
  teamId: number | null;
}

/** A request in the admin's list (backend PendingReservationOut). */
export interface PendingReservation extends Reservation {
  user: UserSummary;
  resource: Resource;
  team: Team | null;
  isFirstReservation: boolean;
  hasCompletedTraining: boolean;
}

/** Backend MaintenanceOut. */
export interface MaintenanceWindow {
  id: number;
  resourceId: number;
  startAt: string;
  endAt: string;
  reason: string;
  createdBy: number | null;
  cancelledAt: string | null;
}

/** Backend CategoryOut. */
export interface CategoryDetails extends Category {
  description: string | null;
  resourceCount: number;
}

import type {ReservationStatus, Resource, ScheduleInterval} from '@/lib/types';

const weekdayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export function formatFloor(floor: number): string {
  return floor === 0 ? 'Parter' : `Etaj ${floor}`;
}

/** "C202, Etaj 2", "Lab. Chimie B015, Parter" or just the location. */
export function formatLocation(resource: Resource): string {
  const parts = [resource.location, resource.floor === null ? null : formatFloor(resource.floor)];
  return parts.filter(Boolean).join(', ') || '—';
}

export function formatTeams(count: number): string {
  return count === 1 ? '1 echipă simultan' : `${count} echipe simultan`;
}

/** Second line of a catalog row, as in the Figma screens. */
export function resourceSubtitle(resource: Resource): string {
  if (resource.seats !== null) {
    const floor = resource.floor === null ? null : formatFloor(resource.floor);
    return [resource.description, floor, `${resource.seats} locuri`].filter(Boolean).join(', ');
  }
  return [resource.category.name, formatLocation(resource), formatTeams(resource.maxConcurrentTeams)]
    .join(' · ');
}

/**
 * "Luni – Vineri, 08:00 – 22:00" when consecutive days share the same hours;
 * otherwise one group per set of hours, separated by "; ".
 */
export function formatSchedule(schedule: ScheduleInterval[]): string {
  if (schedule.length === 0) {
    return 'Fără program';
  }
  const byHours = new Map<string, number[]>();
  for (const {weekday, startTime, endTime} of schedule) {
    const key = `${startTime} – ${endTime}`;
    byHours.set(key, [...(byHours.get(key) ?? []), weekday]);
  }
  return [...byHours.entries()]
    .map(([hours, days]) => {
      const sorted = [...new Set(days)].sort((a, b) => a - b);
      const consecutive = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
      const first = weekdayNames[sorted[0]];
      const last = weekdayNames[sorted[sorted.length - 1]];
      const label =
        sorted.length === 1
          ? first
          : consecutive
            ? `${first} – ${last}`
            : sorted.map((day) => weekdayNames[day]).join(', ');
      return `${label}, ${hours}`;
    })
    .join('; ');
}

export function adminNames(resource: Resource): string {
  return resource.admins.map((a) => `${a.firstName} ${a.lastName}`).join(', ') || '—';
}

/** Labels and colour tone of each reservation status (Figma "RRM/Stare"). */
export const reservationStatusInfo: Record<
  ReservationStatus,
  {label: string; tone: 'pending' | 'training' | 'approved' | 'rejected' | 'muted'}
> = {
  PENDING: {label: 'În așteptare', tone: 'pending'},
  AWAITING_TRAINING: {label: 'Necesită instruire', tone: 'training'},
  APPROVED: {label: 'Aprobată', tone: 'approved'},
  REJECTED: {label: 'Respinsă', tone: 'rejected'},
  CANCELLED: {label: 'Anulată', tone: 'muted'},
  COMPLETED: {label: 'Finalizată', tone: 'muted'},
};

export function formatSlots(count: number): string {
  return count === 1 ? '1 slot' : `${count} sloturi`;
}

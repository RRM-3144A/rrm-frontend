// Mock of GET /resources/{id}/availability, computed from the mock database the same
// way as the backend (rrm-backend, app/services/availability.py): 30-minute slots
// inside the opening hours, MAINTENANCE first, then APPROVED when approved bookings
// fill the capacity, PENDING when approved + pending ones fill it, otherwise FREE.
// Replaced by the API client in E1-41.

import {addDays, addMinutes, atMinutes, parseTime, slotMinutes, startOfDay, weekdayIndex} from '@/lib/dates';
import {approvedStatuses, blockingStatuses, overlaps} from '@/lib/mock/db';
import type {MockDb} from '@/lib/mock/db';
import type {AvailabilitySlot, SlotStatus} from '@/lib/types';

export function mockAvailability(
  db: MockDb,
  resourceId: number,
  from: Date,
  to: Date,
): AvailabilitySlot[] {
  const resource = db.resources.find((r) => r.id === resourceId);
  if (!resource || resource.status === 'INACTIVE') {
    return [];
  }
  const bookings = db.reservations.filter(
    (r) => r.resourceId === resourceId && blockingStatuses.includes(r.status),
  );
  const windows = db.maintenance.filter((m) => m.resourceId === resourceId && !m.cancelledAt);
  const capacity = resource.maxConcurrentTeams;

  const slots: AvailabilitySlot[] = [];
  for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
    const weekday = weekdayIndex(day);
    const intervals = resource.schedule
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    for (const interval of intervals) {
      const end = parseTime(interval.endTime);
      for (let start = parseTime(interval.startTime); start + slotMinutes <= end; start += slotMinutes) {
        const startAt = atMinutes(day, start).toISOString();
        const endAt = addMinutes(atMinutes(day, start), slotMinutes).toISOString();
        let status: SlotStatus;
        let freePlaces: number;
        if (
          resource.status === 'MAINTENANCE' ||
          windows.some((w) => overlaps(startAt, endAt, w.startAt, w.endAt))
        ) {
          status = 'MAINTENANCE';
          freePlaces = 0;
        } else {
          const overlapping = bookings.filter((b) => overlaps(startAt, endAt, b.startAt, b.endAt));
          const approved = overlapping.filter((b) => approvedStatuses.includes(b.status)).length;
          status = approved >= capacity ? 'APPROVED' : overlapping.length >= capacity ? 'PENDING' : 'FREE';
          freePlaces = Math.max(capacity - overlapping.length, 0);
        }
        slots.push({startAt, endAt, status, freePlaces});
      }
    }
  }
  return slots;
}

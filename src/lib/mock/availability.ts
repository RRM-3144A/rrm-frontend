// Mock of GET /resources/{id}/availability: builds the 30-minute slots of the
// resource's schedule and marks a few bookings in every week, so the calendar
// shows all four states. Replaced by the API client in E1-41.

import {addDays, addMinutes, atMinutes, parseTime, slotMinutes, startOfDay, weekdayIndex} from '@/lib/dates';
import type {AvailabilitySlot, Resource, SlotStatus} from '@/lib/types';

interface MockBooking {
  weekday: number;
  start: string;
  end: string;
  /** APPROVED takes a place; PENDING marks the slot as waiting for approval. */
  kind: 'APPROVED' | 'PENDING' | 'MAINTENANCE';
}

/** The same weekly pattern for every resource, shifted a little by its id. */
function bookingsFor(resource: Resource): MockBooking[] {
  const shift = (resource.id % 3) * 60;
  const time = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return [
    {weekday: 1, start: time(540 + shift), end: time(660 + shift), kind: 'APPROVED'},
    {weekday: 2, start: time(780), end: time(870), kind: 'PENDING'},
    {weekday: 3, start: time(720 - shift), end: time(840 - shift), kind: 'APPROVED'},
    {weekday: 4, start: time(900), end: time(1020), kind: 'MAINTENANCE'},
  ];
}

export function mockAvailability(resource: Resource, from: Date, to: Date): AvailabilitySlot[] {
  const bookings = bookingsFor(resource);
  const slots: AvailabilitySlot[] = [];
  for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
    const weekday = weekdayIndex(day);
    for (const interval of resource.schedule.filter((s) => s.weekday === weekday)) {
      const end = parseTime(interval.endTime);
      for (let start = parseTime(interval.startTime); start + slotMinutes <= end; start += slotMinutes) {
        const covering = bookings.filter(
          (b) => b.weekday === weekday && parseTime(b.start) <= start && start < parseTime(b.end),
        );
        let status: SlotStatus = 'FREE';
        let freePlaces = resource.maxConcurrentTeams;
        if (resource.status === 'MAINTENANCE' || covering.some((b) => b.kind === 'MAINTENANCE')) {
          status = 'MAINTENANCE';
          freePlaces = 0;
        } else if (covering.some((b) => b.kind === 'PENDING')) {
          status = 'PENDING';
          freePlaces = 0;
        } else if (covering.length > 0) {
          freePlaces -= covering.length;
          status = freePlaces > 0 ? 'FREE' : 'APPROVED';
        }
        const startAt = atMinutes(day, start);
        slots.push({
          startAt: startAt.toISOString(),
          endAt: addMinutes(startAt, slotMinutes).toISOString(),
          status,
          freePlaces,
        });
      }
    }
  }
  return slots;
}

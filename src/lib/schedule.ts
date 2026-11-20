// Opening hours of a resource: PUT /resources/{id}/schedule (GET is part of the
// resource). Backed by the mock database; the rules follow rrm-backend
// (app/services/schedule.py): intervals on :00/:30, end after start, no overlaps on
// the same day, resource admins only. The calendar uses the new hours right away.

import {parseTime, slotMinutes} from '@/lib/dates';
import {ApiError} from '@/lib/errors';
import {updateDb} from '@/lib/mock/db';
import {readSession} from '@/lib/session';
import type {ScheduleInterval} from '@/lib/types';

const weekdayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/** The first problem of a schedule, as the backend's ScheduleError (null if valid). */
export function scheduleProblem(intervals: ScheduleInterval[]): string | null {
  for (const {weekday, startTime, endTime} of intervals) {
    const day = weekdayNames[weekday];
    if (parseTime(endTime) <= parseTime(startTime)) {
      return `${day}: fiecare interval trebuie să se termine după ce începe.`;
    }
    if (parseTime(startTime) % slotMinutes !== 0 || parseTime(endTime) % slotMinutes !== 0) {
      return `${day}: intervalele încep și se termină la :00 sau :30.`;
    }
  }
  for (let weekday = 0; weekday < 7; weekday++) {
    const day = intervals
      .filter((i) => i.weekday === weekday)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    for (let i = 1; i < day.length; i++) {
      if (parseTime(day[i].startTime) < parseTime(day[i - 1].endTime)) {
        return `${weekdayNames[weekday]}: intervalele din aceeași zi nu se pot suprapune.`;
      }
    }
  }
  return null;
}

/** PUT /resources/{id}/schedule: replaces all the opening intervals. */
export async function saveSchedule(
  resourceId: number,
  intervals: ScheduleInterval[],
): Promise<ScheduleInterval[]> {
  const problem = scheduleProblem(intervals);
  if (problem) {
    throw new ApiError(422, problem);
  }
  const session = readSession();
  if (!session) {
    throw new ApiError(401, 'Sesiunea a expirat. Conectează-te din nou.');
  }
  return updateDb((db) => {
    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resursa nu mai există.');
    }
    if (!resource.admins.some((a) => a.id === session.user.id)) {
      throw new ApiError(403, 'Doar administratorii resursei pot schimba programul.');
    }
    resource.schedule = [...intervals].sort(
      (a, b) => a.weekday - b.weekday || parseTime(a.startTime) - parseTime(b.startTime),
    );
    return resource.schedule;
  });
}

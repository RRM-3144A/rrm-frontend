// Opening hours of a resource: PUT /resources/{id}/schedule (GET is part of the
// resource). The rules follow rrm-backend (app/services/schedule.py): intervals on
// :00/:30, end after start, no overlaps on the same day, resource admins only.

import {apiClient} from '@/lib/api';
import {mapSchedule} from '@/lib/backend';
import type {RawSchedule} from '@/lib/backend';
import {parseTime, slotMinutes} from '@/lib/dates';
import {ApiError} from '@/lib/errors';
import {mutate} from '@/lib/store';
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
  const raw = await mutate(() =>
    apiClient.put<RawSchedule[]>(`/resources/${resourceId}/schedule`, {
      intervals: intervals.map((i) => ({
        weekday: i.weekday,
        start_time: i.startTime,
        end_time: i.endTime,
      })),
    }),
  );
  return raw.map(mapSchedule);
}

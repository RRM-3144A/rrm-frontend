// Small date helpers; dates are handled in the browser's local time (Romania).

export const slotMinutes = 30;

const dayMonthYear = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Minutes since midnight for "HH:MM". */
export function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
}

/** "9 noiembrie 2026" */
export function formatDayMonthYear(date: Date): string {
  return dayMonthYear.format(date);
}

/** "08:30" */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Monday = 0 … Sunday = 6, like the backend's weekday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

const longDate = new Intl.DateTimeFormat('ro-RO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthName = new Intl.DateTimeFormat('ro-RO', {month: 'long'});

/** "Miercuri, 11 noiembrie 2026" */
export function formatLongDate(date: Date): string {
  const text = longDate.format(date);
  return text.charAt(0).toLocaleUpperCase('ro') + text.slice(1);
}

/** "noiembrie" */
export function formatMonth(date: Date): string {
  return monthName.format(date);
}

/** "20.11.2026", the format users type in the search boxes. */
export function formatNumericDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

/** "08:00 – 10:00" for two ISO times. */
export function formatInterval(startAt: string, endAt: string): string {
  return `${formatTime(new Date(startAt))} – ${formatTime(new Date(endAt))}`;
}

/** "00:00", "00:30", … "23:30": the times a slot can start or end at. */
export const halfHourTimes = Array.from(
  {length: (24 * 60) / slotMinutes},
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
);

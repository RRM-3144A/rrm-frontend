// In-browser stand-in for the backend database, so the demo flows work end to end
// before the API client (E1-41): a student's request appears in the admin's
// "Cereri primite", the admin's decision appears in "Rezervările mele", and
// maintenance windows and opening hours appear in the calendar.
//
// The data lives in localStorage (key `rrm.mockDb`) and is seeded on first use with
// dates relative to today. Only src/lib/<area>.ts use this file, so switching to the
// real API changes those files, not the components.

import {useMemo, useSyncExternalStore} from 'react';

import {addDays, atMinutes, parseTime, startOfDay, startOfWeek, weekdayIndex} from '@/lib/dates';
import {mockCatalog} from '@/lib/mock/catalog';
import type {
  MaintenanceWindow,
  Reservation,
  ReservationStatus,
  Resource,
  SessionUser,
  Team,
} from '@/lib/types';

export interface MockUser extends SessionUser {
  teamId: number | null;
}

export interface MockCategory {
  id: number;
  name: string;
  description: string | null;
}

/** A completed training (backend ResourceTraining). */
export interface MockTraining {
  userId: number;
  resourceId: number;
}

export interface MockDb {
  version: number;
  nextId: number;
  users: MockUser[];
  teams: Team[];
  categories: MockCategory[];
  resources: Resource[];
  reservations: Reservation[];
  maintenance: MaintenanceWindow[];
  trainings: MockTraining[];
}

const storageKey = 'rrm.mockDb';
/** Bump when the seed changes, so browsers drop their old copy. */
const dbVersion = 1;
const listeners = new Set<() => void>();

/** Statuses that take a place in a slot (backend PENDING_STATUSES | APPROVED_STATUSES). */
export const blockingStatuses: ReservationStatus[] = [
  'PENDING',
  'AWAITING_TRAINING',
  'APPROVED',
  'COMPLETED',
];

export const approvedStatuses: ReservationStatus[] = ['APPROVED', 'COMPLETED'];

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

// ---------------------------------------------------------------------------
// Seed

const teams: Team[] = [
  {id: 1, name: 'Echipa Robotică'},
  {id: 2, name: 'Echipa Web'},
  {id: 3, name: 'Echipa Moleculă'},
  {id: 4, name: 'Echipa Drone'},
  {id: 5, name: 'Echipa AI'},
  {id: 6, name: 'Echipa Electronică'},
];

function user(
  id: number,
  firstName: string,
  lastName: string,
  role: MockUser['role'],
  teamId: number | null,
): MockUser {
  const email = `${firstName}.${lastName}@student.usv.ro`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return {id, firstName, lastName, email, role, teamId};
}

/** Ids 1 and 5 are the demo accounts (src/lib/mock/accounts.ts). */
const users: MockUser[] = [
  user(1, 'Elena', 'Munteanu', 'ADMIN', null),
  user(2, 'Andrei', 'Popescu', 'ADMIN', null),
  user(5, 'Maria', 'Lungu', 'STUDENT', 1),
  user(10, 'Gabriel', 'Robu', 'STUDENT', 1),
  user(11, 'Damaris', 'Polocoșer', 'STUDENT', 2),
  user(12, 'Antonie', 'Prigoreanu', 'STUDENT', 3),
  user(13, 'Ioana', 'Rusu', 'STUDENT', 4),
  user(14, 'Mihai', 'Ilie', 'STUDENT', 5),
  user(15, 'Vlad', 'Ciobanu', 'STUDENT', 6),
];

const categoryDescriptions: Record<string, string> = {
  'Săli și laboratoare': 'Săli de curs, seminar și laboratoare.',
  'Imprimante 3D': 'Imprimante FDM pentru prototipare.',
  'Roboți': 'Brațe robotice și platforme mobile.',
  'Aparate de măsură': 'Osciloscoape, spectrometre și alte aparate.',
  'Imprimante': 'Imprimante laser și multifuncționale.',
  'Microscoape': 'Microscoape optice cu cameră.',
};

/** The n-th working day from today (n > 0 forward, n < 0 back), at "HH:MM". */
function workday(n: number, time: string): string {
  let day = startOfDay(new Date());
  let left = Math.abs(n);
  while (left > 0) {
    day = addDays(day, Math.sign(n));
    if (weekdayIndex(day) < 5) {
      left -= 1;
    }
  }
  return atMinutes(day, parseTime(time)).toISOString();
}

/** A weekday (0 = Monday) of the week `week` weeks from now, at "HH:MM". */
function weekday(week: number, day: number, time: string): string {
  return atMinutes(addDays(startOfWeek(new Date()), week * 7 + day), parseTime(time)).toISOString();
}

function seed(): MockDb {
  const now = new Date().toISOString();
  const resources = mockCatalog.map(({resource}) => resource);
  const categories = [...new Map(resources.map((r) => [r.category.id, r.category])).values()]
    .map((c) => ({...c, description: categoryDescriptions[c.name] ?? null}));

  let nextId = 1;
  const reservations: Reservation[] = [];
  const reserve = (
    fields: Pick<Reservation, 'userId' | 'resourceId' | 'startAt' | 'endAt' | 'status'> &
      Partial<Reservation>,
  ) => {
    const owner = users.find((u) => u.id === fields.userId);
    const decided = fields.status !== 'PENDING';
    reservations.push({
      id: nextId++,
      teamId: owner?.teamId ?? null,
      purpose: null,
      rejectionReason: null,
      needsReview: false,
      decidedBy: decided ? 1 : null,
      decidedAt: decided ? now : null,
      createdAt: now,
      ...fields,
    });
  };

  // Approved bookings of another team, so every calendar shows busy slots
  // (this week and the next three).
  for (let week = 0; week < 4; week++) {
    for (const resource of resources.filter((r) => r.status === 'ACTIVE')) {
      const shift = (resource.id % 3) * 30;
      const at = (minutes: number) =>
        `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      // Two hours ending a little before Tuesday's closing time.
      const closing = Math.max(...resource.schedule.filter((s) => s.weekday === 1).map((s) => parseTime(s.endTime)));
      reserve({
        userId: 15, resourceId: resource.id, status: 'APPROVED', purpose: 'Lucrări de laborator',
        startAt: weekday(week, 1, at(closing - shift - 120)), endAt: weekday(week, 1, at(closing - shift)),
      });
      reserve({
        userId: 15, resourceId: resource.id, status: 'APPROVED', purpose: 'Măsurători',
        startAt: weekday(week, 3, '13:00'), endAt: weekday(week, 3, '14:30'),
      });
    }
  }

  // Requests waiting in the admin's "Cereri primite" (Elena Munteanu, id 1).
  reserve({
    userId: 10, resourceId: 7, status: 'PENDING',
    startAt: workday(1, '10:00'), endAt: workday(1, '12:00'),
    purpose: 'Testarea brațului robotic pentru proiectul de licență.',
  });
  reserve({
    userId: 11, resourceId: 4, status: 'COMPLETED',
    startAt: workday(-5, '10:00'), endAt: workday(-5, '12:00'), purpose: 'Prezentare de proiect.',
  });
  reserve({
    userId: 11, resourceId: 4, status: 'PENDING',
    startAt: workday(2, '08:00'), endAt: workday(2, '09:30'), purpose: 'Întâlnire de echipă.',
  });
  reserve({
    userId: 12, resourceId: 6, status: 'AWAITING_TRAINING',
    startAt: workday(3, '08:00'), endAt: workday(3, '10:00'),
    purpose: 'Printarea carcasei pentru senzorul de gaz.',
  });
  reserve({
    userId: 13, resourceId: 6, status: 'PENDING',
    startAt: workday(4, '08:00'), endAt: workday(4, '11:00'),
    purpose: 'Piese pentru cadrul dronei.',
  });
  reserve({
    userId: 14, resourceId: 1, status: 'APPROVED', needsReview: true,
    startAt: workday(2, '15:00'), endAt: workday(2, '16:00'), purpose: 'Prezentare demo.',
  });

  // The demo student's own reservations (Maria Lungu, id 5).
  reserve({
    userId: 5, resourceId: 9, status: 'PENDING',
    startAt: workday(3, '09:00'), endAt: workday(3, '11:00'), purpose: 'Analiza probelor de polimer.',
  });
  reserve({
    userId: 5, resourceId: 1, status: 'PENDING',
    startAt: workday(1, '09:00'), endAt: workday(1, '11:00'), purpose: 'Repetiție pentru prezentare.',
  });
  reserve({
    userId: 5, resourceId: 8, status: 'APPROVED',
    startAt: workday(2, '10:00'), endAt: workday(2, '12:00'), purpose: 'Testarea plăcii de achiziție.',
  });
  reserve({
    userId: 5, resourceId: 7, status: 'APPROVED',
    startAt: workday(5, '08:00'), endAt: workday(5, '10:00'), purpose: 'Programarea traiectoriei.',
  });
  reserve({
    userId: 5, resourceId: 4, status: 'COMPLETED',
    startAt: workday(-3, '12:00'), endAt: workday(-3, '14:00'), purpose: 'Asamblarea robotului.',
  });
  reserve({
    userId: 5, resourceId: 5, status: 'REJECTED',
    startAt: workday(-5, '10:00'), endAt: workday(-5, '12:00'), purpose: 'Ședință de echipă.',
    rejectionReason: 'Sala este rezervată pentru examene în acest interval.', decidedBy: 2,
  });

  const maintenance: MaintenanceWindow[] = [
    {
      id: nextId++, resourceId: 1, startAt: workday(2, '14:30'), endAt: workday(2, '16:00'),
      reason: 'Revizia videoproiectorului.', createdBy: 1, cancelledAt: null,
    },
    {
      id: nextId++, resourceId: 7, startAt: weekday(1, 2, '13:00'), endAt: weekday(1, 2, '17:00'),
      reason: 'Calibrarea brațului robotic.', createdBy: 1, cancelledAt: null,
    },
  ];

  return {
    version: dbVersion,
    nextId,
    users,
    teams,
    categories,
    resources,
    reservations,
    maintenance,
    trainings: [{userId: 5, resourceId: 7}],
  };
}

// ---------------------------------------------------------------------------
// Storage

/** Last snapshot, so useSyncExternalStore gets the same string when nothing changed. */
let cachedRaw: string | null = null;

function readRaw(): string {
  if (cachedRaw !== null) {
    return cachedRaw;
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    // Storage unavailable (private mode): keep the data in memory.
  }
  const parsed = raw ? parse(raw) : null;
  if (!parsed || parsed.version !== dbVersion) {
    raw = JSON.stringify(seed());
    persist(raw);
  }
  cachedRaw = raw;
  return raw as string;
}

function parse(raw: string): MockDb | null {
  try {
    return JSON.parse(raw) as MockDb;
  } catch {
    return null;
  }
}

function persist(raw: string): void {
  try {
    window.localStorage.setItem(storageKey, raw);
  } catch {
    // See readRaw.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // Changes made in another tab (e.g. student and admin side by side).
    if (event.key === storageKey) {
      cachedRaw = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** A copy of the current data; use it in the mock "endpoints". */
export function readDb(): MockDb {
  return parse(readRaw()) as MockDb;
}

/** Applies a change and notifies every component that uses the data. */
export function updateDb<T>(change: (db: MockDb) => T): T {
  const db = readDb();
  const result = change(db);
  cachedRaw = JSON.stringify(db);
  persist(cachedRaw);
  listeners.forEach((listener) => listener());
  return result;
}

export function newId(db: MockDb): number {
  return db.nextId++;
}

/**
 * The current data; `undefined` during the server render and hydration
 * (localStorage only exists in the browser).
 */
export function useMockDb(): MockDb | undefined {
  const raw = useSyncExternalStore<string | undefined>(subscribe, readRaw, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : (parse(raw) ?? undefined)), [raw]);
}

/** Deletes the demo data; the next read seeds it again. */
export function resetDb(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to remove.
  }
  cachedRaw = null;
  listeners.forEach((listener) => listener());
}

// Mock data for the catalog, taken from the Figma screens "Săli" and "Echipamente".
// The pages read it through src/lib/catalog.ts, so switching to the real API
// (E1-41) only changes that file.

import type {AdminSummary, CatalogEntry, Category, Resource, ScheduleInterval} from '@/lib/types';

const categories = {
  rooms: {id: 1, name: 'Săli și laboratoare'},
  printers3d: {id: 2, name: 'Imprimante 3D'},
  robots: {id: 3, name: 'Roboți'},
  measuring: {id: 4, name: 'Aparate de măsură'},
  printers: {id: 5, name: 'Imprimante'},
  microscopes: {id: 6, name: 'Microscoape'},
} satisfies Record<string, Category>;

const admins = {
  maria: {id: 1, firstName: 'Maria', lastName: 'Ionescu', email: 'maria.ionescu@student.usv.ro'},
  andrei: {id: 2, firstName: 'Andrei', lastName: 'Popescu', email: 'andrei.popescu@student.usv.ro'},
} satisfies Record<string, AdminSummary>;

function weekdays(startTime: string, endTime: string): ScheduleInterval[] {
  return [0, 1, 2, 3, 4].map((weekday) => ({weekday, startTime, endTime}));
}

function resource(fields: Partial<Resource> & Pick<Resource, 'id' | 'name' | 'category'>): Resource {
  return {
    description: null,
    status: 'ACTIVE',
    maxConcurrentTeams: 1,
    location: null,
    floor: null,
    seats: null,
    equipment: null,
    model: null,
    maxDurationMin: null,
    requiresTraining: false,
    admins: [admins.maria],
    schedule: weekdays('08:00', '20:00'),
    ...fields,
  };
}

const freeToday: [string, string][] = [
  ['08:00', '10:00'],
  ['14:00', '22:00'],
];

export const mockCatalog: CatalogEntry[] = [
  // Rooms (they have seats).
  {
    resource: resource({
      id: 1, name: 'B110', category: categories.rooms, description: 'Sală de conferințe',
      location: 'B110', floor: 1, seats: 60, equipment: 'Videoproiector, sistem audio',
      schedule: weekdays('08:00', '22:00'),
    }),
    today: {reservedNow: false, freeIntervals: freeToday},
  },
  {
    resource: resource({
      id: 2, name: 'B204', category: categories.rooms, description: 'Sală de studiu',
      location: 'B204', floor: 2, seats: 12, schedule: weekdays('08:00', '22:00'),
    }),
    today: {reservedNow: false, freeIntervals: [['10:00', '16:00']]},
  },
  {
    resource: resource({
      id: 3, name: 'C102', category: categories.rooms, description: 'Laborator electronică',
      location: 'C102', floor: 1, seats: 20, equipment: 'Stații de lipit, surse de laborator',
    }),
    today: {reservedNow: true, freeIntervals: [['16:00', '20:00']]},
  },
  {
    resource: resource({
      id: 4, name: 'C202', category: categories.rooms, description: 'Laborator robotică',
      location: 'C202', floor: 2, seats: 16, equipment: 'Proiector, tablă interactivă',
      maxConcurrentTeams: 2, schedule: weekdays('08:00', '22:00'),
    }),
    today: {reservedNow: false, freeIntervals: freeToday},
  },
  {
    resource: resource({
      id: 5, name: 'D205', category: categories.rooms, description: 'Sală de seminar',
      location: 'D205', floor: 2, seats: 24, admins: [admins.andrei],
    }),
    today: {reservedNow: false, freeIntervals: [['08:00', '12:00']]},
  },
  // Equipment.
  {
    resource: resource({
      id: 6, name: 'Imprimantă 3D Prusa MK4', category: categories.printers3d,
      location: 'Lab. C102', floor: 1, model: 'Prusa MK4', equipment: 'PLA, PETG',
      requiresTraining: true, maxDurationMin: 240,
    }),
    today: {reservedNow: false, freeIntervals: [['09:00', '13:00']]},
  },
  {
    resource: resource({
      id: 7, name: 'Robot UR5e', category: categories.robots, location: 'Lab. Robotică D110',
      maxConcurrentTeams: 2, equipment: 'Gripper Robotiq, pupitru de programare',
      requiresTraining: true,
    }),
    today: {reservedNow: false, freeIntervals: freeToday},
  },
  {
    resource: resource({
      id: 8, name: 'Osciloscop Rigol DS1104', category: categories.measuring,
      location: 'C202', floor: 2, equipment: 'Sonde 10x, cabluri BNC',
    }),
    today: {reservedNow: true, freeIntervals: [['15:00', '20:00']]},
  },
  {
    resource: resource({
      id: 9, name: 'Spectrometru FTIR', category: categories.measuring,
      location: 'Lab. Chimie B015', floor: 0, equipment: 'Software OPUS, accesoriu ATR',
      admins: [admins.andrei], schedule: weekdays('09:00', '17:00'),
    }),
    today: {reservedNow: false, freeIntervals: [['09:00', '11:00'], ['14:00', '17:00']]},
  },
  {
    resource: resource({
      id: 10, name: 'Imprimantă laser HP M507', category: categories.printers,
      location: 'Secretariat FIESC', maxConcurrentTeams: 2,
    }),
    today: {reservedNow: false, freeIntervals: [['08:00', '20:00']]},
  },
  {
    resource: resource({
      id: 11, name: 'Microscop Zeiss Axio', category: categories.microscopes,
      location: 'Lab. Biologie A105', floor: 1, status: 'MAINTENANCE',
      equipment: 'Cameră digitală', admins: [admins.andrei],
    }),
    today: {reservedNow: false, freeIntervals: []},
  },
];

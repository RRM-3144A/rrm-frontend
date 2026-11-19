import type {SessionUser} from '@/lib/types';

/**
 * Google accounts offered in demo mode, instead of the real Google account chooser.
 * The names match the backend test data (python -m app.seed).
 */
export interface DemoAccount extends Omit<SessionUser, 'role'> {
  /** The role the backend would assign; non-institutional accounts get none. */
  role: SessionUser['role'] | null;
  label: string;
}

export const demoAccounts: DemoAccount[] = [
  {
    id: 5, firstName: 'Maria', lastName: 'Lungu', email: 'maria.lungu@student.usv.ro',
    role: 'STUDENT', label: 'Student',
  },
  {
    id: 1, firstName: 'Elena', lastName: 'Munteanu', email: 'elena.munteanu@student.usv.ro',
    role: 'ADMIN', label: 'Administrator',
  },
  {
    id: 0, firstName: 'Ion', lastName: 'Popescu', email: 'ion.popescu@gmail.com',
    role: null, label: 'Cont personal',
  },
];

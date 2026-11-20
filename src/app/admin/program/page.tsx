import type {Metadata} from 'next';

import {ScheduleEditor} from '@/components/admin/ScheduleEditor';

export const metadata: Metadata = {title: 'Program de funcționare · RRM'};

/** Figma "Admin / Program de funcționare". */
export default function ProgramPage() {
  return <ScheduleEditor />;
}

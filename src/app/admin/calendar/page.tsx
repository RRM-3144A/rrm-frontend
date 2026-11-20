import type {Metadata} from 'next';

import {MaintenancePlanner} from '@/components/admin/MaintenancePlanner';

export const metadata: Metadata = {title: 'Calendar și mentenanță · RRM'};

/** Figma "Admin / Calendar și mentenanță". */
export default function CalendarPage() {
  return <MaintenancePlanner />;
}

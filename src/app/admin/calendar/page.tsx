import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Calendar și mentenanță · RRM'};

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar și mentenanță"
        subtitle="Calendarul resurselor tale și perioadele de mentenanță."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

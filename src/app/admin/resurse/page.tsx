import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Resurse · RRM'};

export default function ResursePage() {
  return (
    <>
      <PageHeader
        title="Resurse"
        subtitle="Sălile și echipamentele pe care le administrezi."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

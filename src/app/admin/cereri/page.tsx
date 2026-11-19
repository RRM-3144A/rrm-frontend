import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Cereri primite · RRM'};

export default function CereriPage() {
  return (
    <>
      <PageHeader
        title="Cereri primite"
        subtitle="Aprobă, respinge sau condiționează de instruire cererile pentru resursele tale."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

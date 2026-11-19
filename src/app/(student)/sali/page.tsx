import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Săli · RRM'};

export default function SaliPage() {
  return (
    <>
      <PageHeader
        title="Săli"
        subtitle="Alege o sală și rezervă un interval disponibil."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

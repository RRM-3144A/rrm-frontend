import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Rezervările mele · RRM'};

export default function RezervariPage() {
  return (
    <>
      <PageHeader
        title="Rezervările mele"
        subtitle="Urmărește statusul și gestionează rezervările tale."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

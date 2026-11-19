import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Lista de așteptare · RRM'};

export default function ListaAsteptarePage() {
  return (
    <>
      <PageHeader
        title="Lista de așteptare"
        subtitle="Sloturile ocupate pentru care primești un email când se eliberează."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Utilizare pe echipe · RRM'};

export default function UtilizarePage() {
  return (
    <>
      <PageHeader
        title="Utilizare pe echipe"
        subtitle="Rezervări aprobate sau finalizate pe intervalul ales. Informația e orientativă; sistemul nu impune limite."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

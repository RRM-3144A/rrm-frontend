import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Echipamente · RRM'};

export default function EchipamentePage() {
  return (
    <>
      <PageHeader
        title="Echipamente"
        subtitle="Imprimante 3D, roboți și aparate de măsură. Alege un echipament și rezervă un interval."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

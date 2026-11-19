import type {Metadata} from 'next';

import {ResourceCatalog} from '@/components/catalog/ResourceCatalog';
import {getCatalog} from '@/lib/catalog';

export const metadata: Metadata = {title: 'Echipamente · RRM'};

export default function EchipamentePage() {
  return (
    <ResourceCatalog
      title="Echipamente"
      subtitle="Imprimante 3D, roboți și aparate de măsură. Alege un echipament și rezervă un interval."
      searchPlaceholder="Caută după nume, tip sau laborator…"
      countNoun={{one: 'echipament', many: 'echipamente'}}
      entries={getCatalog('equipment')}
    />
  );
}

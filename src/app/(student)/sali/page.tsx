import type {Metadata} from 'next';

import {ResourceCatalog} from '@/components/catalog/ResourceCatalog';
import {getCatalog} from '@/lib/catalog';

export const metadata: Metadata = {title: 'Săli · RRM'};

export default function SaliPage() {
  return (
    <ResourceCatalog
      title="Săli"
      subtitle="Alege o sală și rezervă un interval disponibil."
      searchPlaceholder="Caută după nume, tip sau locație…"
      countNoun={{one: 'sală', many: 'săli'}}
      entries={getCatalog('rooms')}
    />
  );
}

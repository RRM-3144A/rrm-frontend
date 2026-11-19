import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Categorii · RRM'};

export default function CategoriiPage() {
  return (
    <>
      <PageHeader
        title="Categorii"
        subtitle="Grupează resursele din catalog. O categorie cu resurse nu poate fi ștearsă."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

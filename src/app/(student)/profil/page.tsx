import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Profil · RRM'};

export default function ProfilPage() {
  return (
    <>
      <PageHeader
        title="Profil"
        subtitle="Datele contului instituțional și preferințele de notificare."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Profil · RRM'};

export default function ProfilAdminPage() {
  return (
    <>
      <PageHeader
        title="Profil"
        subtitle="Contul de administrator și notificările primite."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

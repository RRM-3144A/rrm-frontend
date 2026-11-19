import type {Metadata} from 'next';

import {EmptyPanel} from '@/components/EmptyPanel';
import {PageHeader} from '@/components/PageHeader';

export const metadata: Metadata = {title: 'Program de funcționare · RRM'};

export default function ProgramPage() {
  return (
    <>
      <PageHeader
        title="Program de funcționare"
        subtitle="Intervalele în care resursa poate fi rezervată, pe zilele săptămânii."
      />
      <EmptyPanel>Conținutul acestei pagini urmează.</EmptyPanel>
    </>
  );
}

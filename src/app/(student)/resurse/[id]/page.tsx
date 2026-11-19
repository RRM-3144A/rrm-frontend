import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {EmptyPanel} from '@/components/EmptyPanel';
import {Icon} from '@/components/icons/Icon';
import {PageHeader} from '@/components/PageHeader';
import {getCatalogEntry} from '@/lib/catalog';
import {resourceSubtitle} from '@/lib/format';

import styles from './page.module.css';

interface ResourcePageProps {
  params: Promise<{id: string}>;
}

export const metadata: Metadata = {title: 'Calendar resursă · RRM'};

/** Resource page opened from the catalog; the weekly calendar comes in E1-21. */
export default async function ResourcePage({params}: ResourcePageProps) {
  const {id} = await params;
  const entry = getCatalogEntry(Number(id));
  if (!entry) {
    notFound();
  }
  const {resource} = entry;
  const backHref = resource.seats !== null ? '/sali' : '/echipamente';

  return (
    <>
      <Link href={backHref} className={styles.back}>
        <Icon name="left" />
        {resource.seats !== null ? 'Înapoi la săli' : 'Înapoi la echipamente'}
      </Link>
      <PageHeader title={resource.name} subtitle={resourceSubtitle(resource)} />
      <EmptyPanel>Calendarul săptămânal al resursei urmează.</EmptyPanel>
    </>
  );
}

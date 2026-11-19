import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {ResourceCalendar} from '@/components/calendar/ResourceCalendar';
import {Icon} from '@/components/icons/Icon';
import {PageHeader} from '@/components/PageHeader';
import {getCatalogEntry} from '@/lib/catalog';
import {resourceSubtitle} from '@/lib/format';

import styles from './page.module.css';

interface ResourcePageProps {
  params: Promise<{id: string}>;
}

export const metadata: Metadata = {title: 'Calendar resursă · RRM'};

/** Figma "Utilizator / 05 · Calendar resursă". */
export default async function ResourcePage({params}: ResourcePageProps) {
  const {id} = await params;
  const entry = getCatalogEntry(Number(id));
  if (!entry) {
    notFound();
  }
  const {resource, today} = entry;
  const isRoom = resource.seats !== null;
  const status =
    resource.status === 'MAINTENANCE'
      ? {label: 'În mentenanță', className: styles.maintenance}
      : today.reservedNow
        ? {label: 'Rezervată', className: styles.reserved}
        : {label: 'Liberă', className: styles.free};

  return (
    <>
      <Link href={isRoom ? '/sali' : '/echipamente'} className={styles.back}>
        <Icon name="left" />
        {isRoom ? 'Înapoi la săli' : 'Înapoi la echipamente'}
      </Link>
      <PageHeader
        title={resource.name}
        subtitle={resourceSubtitle(resource)}
        aside={<span className={`${styles.status} ${status.className}`}>{status.label}</span>}
      />
      <ResourceCalendar resource={resource} />
    </>
  );
}

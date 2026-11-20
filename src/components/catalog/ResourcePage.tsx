'use client';

import Link from 'next/link';

import {EmptyPanel} from '@/components/EmptyPanel';
import {Icon} from '@/components/icons/Icon';
import {PageHeader} from '@/components/PageHeader';
import {ResourceBooking} from '@/components/reservations/ResourceBooking';
import {kindOf, useCatalogEntry} from '@/lib/catalog';
import {resourceSubtitle} from '@/lib/format';

import styles from './ResourcePage.module.css';

/**
 * Figma "Utilizator / 05 · Calendar resursă". Looked up on the client, so resources
 * added by an admin open too; deactivated ones show "Resursa nu mai există".
 */
export function ResourcePage({id}: {id: number}) {
  const entry = useCatalogEntry(id);
  if (entry === undefined) {
    return null;
  }
  if (entry === null) {
    return (
      <>
        <Link href="/sali" className={styles.back}>
          <Icon name="left" />
          Înapoi la săli
        </Link>
        <PageHeader title="Resursa nu mai există" />
        <EmptyPanel>Resursa a fost dezactivată sau ștearsă. Alege alta din catalog.</EmptyPanel>
      </>
    );
  }

  const {resource, today} = entry;
  const isRoom = kindOf(resource) === 'rooms';
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
      <ResourceBooking resource={resource} />
    </>
  );
}

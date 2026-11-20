'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';

import {Icon} from '@/components/icons/Icon';
import {PageHeader} from '@/components/PageHeader';
import {useCatalog} from '@/lib/catalog';
import type {CatalogKind} from '@/lib/catalog';
import {adminNames, formatLocation, formatSchedule, resourceSubtitle} from '@/lib/format';
import type {CatalogEntry} from '@/lib/types';

import styles from './ResourceCatalog.module.css';

type Filter = 'all' | 'free' | 'reserved';
type RowStatus = 'free' | 'reserved' | 'maintenance';

const filterLabels: Record<Filter, string> = {
  all: 'Toate',
  free: 'Libere',
  reserved: 'Rezervate',
};

const statusLabels: Record<RowStatus, string> = {
  free: 'Liberă',
  reserved: 'Rezervată',
  maintenance: 'În mentenanță',
};

function rowStatus({resource, today}: CatalogEntry): RowStatus {
  if (resource.status === 'MAINTENANCE') {
    return 'maintenance';
  }
  return today.reservedNow ? 'reserved' : 'free';
}

interface ResourceCatalogProps {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  /** Noun for the counter on the right, e.g. {one: 'sală', many: 'săli'}. */
  countNoun: {one: string; many: string};
  kind: CatalogKind;
}

/** Searchable, filterable list of resources ("Săli" / "Echipamente" in Figma). */
export function ResourceCatalog({
  title,
  subtitle,
  searchPlaceholder,
  countNoun,
  kind,
}: ResourceCatalogProps) {
  const loaded = useCatalog(kind);
  const entries = useMemo(() => loaded ?? [], [loaded]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const byId = new Map(entries.map(({resource}) => [resource.category.id, resource.category]));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [entries]);

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('ro');
    return entries.filter((entry) => {
      const {resource} = entry;
      const status = rowStatus(entry);
      const haystack = [resource.name, resource.description, resource.location, resource.category.name]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ro');
      return (
        (text === '' || haystack.includes(text)) &&
        (categoryId === 'all' || resource.category.id === categoryId) &&
        (filter === 'all' || status === filter)
      );
    });
  }, [entries, query, categoryId, filter]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} aside={`${visible.length} ${visible.length === 1 ? countNoun.one : countNoun.many}`} />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Caută"
          />
        </label>
        <div className={styles.select}>
          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value === 'all' ? 'all' : Number(event.target.value))
            }
            aria-label="Categorie"
          >
            <option value="all">Toate categoriile</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Icon name="chevron" />
        </div>
        <div className={styles.filters} role="group" aria-label="Disponibilitate">
          {(Object.keys(filterLabels) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? `${styles.filter} ${styles.filterActive}` : styles.filter}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {loaded === undefined ? null : visible.length === 0 ? (
        <p className={styles.empty}>Nicio resursă nu corespunde căutării.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((entry) => (
            <ResourceRow
              key={entry.resource.id}
              entry={entry}
              expanded={expandedId === entry.resource.id}
              onToggle={() =>
                setExpandedId(expandedId === entry.resource.id ? null : entry.resource.id)
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

interface ResourceRowProps {
  entry: CatalogEntry;
  expanded: boolean;
  onToggle: () => void;
}

function ResourceRow({entry, expanded, onToggle}: ResourceRowProps) {
  const {resource, today} = entry;
  const status = rowStatus(entry);
  const detailsId = `resource-${resource.id}-details`;

  return (
    <li className={styles.item}>
      <div className={styles.row}>
        <div className={styles.rowText}>
          <p className={styles.name}>{resource.name}</p>
          <p className={styles.subtitle}>{resourceSubtitle(resource)}</p>
        </div>
        <p className={`${styles.status} ${styles[status]}`}>{statusLabels[status]}</p>
        <Link
          href={`/resurse/${resource.id}`}
          className={status === 'free' ? styles.primary : styles.secondary}
        >
          {status === 'free' ? 'Rezervă' : 'Vezi orar'}
        </Link>
        <button
          type="button"
          className={expanded ? `${styles.toggle} ${styles.toggleOpen}` : styles.toggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={expanded ? 'Ascunde detaliile' : 'Arată detaliile'}
          onClick={onToggle}
        >
          <Icon name="chevron" />
        </button>
      </div>

      {expanded && (
        <div id={detailsId} className={styles.details}>
          <dl className={styles.grid}>
            <Detail label="Categorie" value={resource.category.name} />
            <Detail label="Locație" value={formatLocation(resource)} />
            <Detail label="Responsabil" value={adminNames(resource)} />
            <Detail label="Echipare" value={resource.equipment ?? '—'} />
            <Detail label="Echipe simultan" value={String(resource.maxConcurrentTeams)} />
            <Detail label="Program" value={formatSchedule(resource.schedule)} />
          </dl>
          <div className={styles.today}>
            <p className={styles.label}>Intervale disponibile azi</p>
            {today.freeIntervals.length === 0 ? (
              <p className={styles.value}>Niciun interval liber azi.</p>
            ) : (
              <ul className={styles.chips}>
                {today.freeIntervals.map(([start, end]) => (
                  <li key={start} className={styles.chip}>
                    <Icon name="clock" />
                    {start} – {end}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({label, value}: {label: string; value: string}) {
  return (
    <div className={styles.detail}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}

import {mockCatalog} from '@/lib/mock/catalog';
import type {CatalogEntry} from '@/lib/types';

/** Rooms are the resources with seats; everything else is equipment. */
export type CatalogKind = 'rooms' | 'equipment';

/** Resources shown in the catalog (inactive ones are hidden from students). */
export function getCatalog(kind: CatalogKind): CatalogEntry[] {
  return mockCatalog.filter(
    ({resource}) =>
      resource.status !== 'INACTIVE' && (resource.seats !== null) === (kind === 'rooms'),
  );
}

export function getCatalogEntry(id: number): CatalogEntry | undefined {
  return mockCatalog.find(({resource}) => resource.id === id && resource.status !== 'INACTIVE');
}

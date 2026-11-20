import type {Metadata} from 'next';

import {ResourceAdmin} from '@/components/admin/ResourceAdmin';

export const metadata: Metadata = {title: 'Resurse · RRM'};

/** Figma "Admin / Resurse". */
export default function ResursePage() {
  return <ResourceAdmin />;
}

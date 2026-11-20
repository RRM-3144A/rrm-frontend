import type {Metadata} from 'next';

import {CategoryAdmin} from '@/components/admin/CategoryAdmin';

export const metadata: Metadata = {title: 'Categorii · RRM'};

/** Figma "Admin / Categorii". */
export default function CategoriiPage() {
  return <CategoryAdmin />;
}

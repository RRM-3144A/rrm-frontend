import type {Metadata} from 'next';

import {ResourcePage} from '@/components/catalog/ResourcePage';

interface ResourcePageProps {
  params: Promise<{id: string}>;
}

export const metadata: Metadata = {title: 'Calendar resursă · RRM'};

/** Figma "Utilizator / 05 · Calendar resursă". */
export default async function ResourceRoute({params}: ResourcePageProps) {
  const {id} = await params;
  return <ResourcePage id={Number(id)} />;
}

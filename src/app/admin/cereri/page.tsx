import type {Metadata} from 'next';

import {ReceivedRequests} from '@/components/requests/ReceivedRequests';

export const metadata: Metadata = {title: 'Cereri primite · RRM'};

/** Figma "Admin / Cereri primite". */
export default function CereriPage() {
  return <ReceivedRequests />;
}

import type {Metadata} from 'next';

import {MyReservations} from '@/components/reservations/MyReservations';

export const metadata: Metadata = {title: 'Rezervările mele · RRM'};

/** Figma "Utilizator / Rezervările mele". */
export default function RezervariPage() {
  return <MyReservations />;
}

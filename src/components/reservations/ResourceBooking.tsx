'use client';

import {useState} from 'react';

import {ResourceCalendar} from '@/components/calendar/ResourceCalendar';
import {ReservationDialog} from '@/components/reservations/ReservationDialog';
import type {Resource} from '@/lib/types';

/** The resource calendar plus the "Adaugă rezervare" dialog opened by "Continuă". */
export function ResourceBooking({resource}: {resource: Resource}) {
  const [chosen, setChosen] = useState<{start: Date; end: Date} | null>(null);

  return (
    <>
      <ResourceCalendar resource={resource} onContinue={(start, end) => setChosen({start, end})} />
      {chosen && (
        <ReservationDialog
          resource={resource}
          start={chosen.start}
          end={chosen.end}
          onClose={() => setChosen(null)}
        />
      )}
    </>
  );
}

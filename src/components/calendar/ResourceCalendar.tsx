'use client';

import {useMemo, useState} from 'react';

import {Icon} from '@/components/icons/Icon';
import {getAvailability} from '@/lib/availability';
import {
  addDays,
  atMinutes,
  formatDayMonthYear,
  formatTime,
  parseTime,
  slotMinutes,
  startOfWeek,
} from '@/lib/dates';
import type {AvailabilitySlot, Resource} from '@/lib/types';

import styles from './ResourceCalendar.module.css';

const dayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/** Visual state of a cell, as in the Figma legend. */
type CellState = 'closed' | 'free' | 'partial' | 'busy' | 'maintenance';

const legend: {state: Exclude<CellState, 'closed'>; label: string}[] = [
  {state: 'free', label: 'Liber'},
  {state: 'partial', label: 'Parțial ocupat'},
  {state: 'busy', label: 'Ocupat'},
  {state: 'maintenance', label: 'Mentenanță'},
];

const stateLabels: Record<CellState, string> = {
  closed: 'închis',
  free: 'liber',
  partial: 'parțial ocupat',
  busy: 'ocupat',
  maintenance: 'mentenanță',
};

interface Cell {
  start: Date;
  end: Date;
  state: CellState;
  /** A team can still book it (free place, not in the past). */
  selectable: boolean;
}

interface Selection {
  day: number;
  first: number;
  last: number;
}

function cellState(slot: AvailabilitySlot | undefined, capacity: number): CellState {
  if (!slot) {
    return 'closed';
  }
  switch (slot.status) {
    case 'MAINTENANCE':
      return 'maintenance';
    case 'APPROVED':
      return 'busy';
    case 'PENDING':
      return 'partial';
    default:
      return slot.freePlaces < capacity ? 'partial' : 'free';
  }
}

/** Grid hours: from the earliest opening to the latest closing in the schedule. */
function gridRange(resource: Resource): [number, number] {
  if (resource.schedule.length === 0) {
    return [8 * 60, 20 * 60];
  }
  const starts = resource.schedule.map((s) => parseTime(s.startTime));
  const ends = resource.schedule.map((s) => parseTime(s.endTime));
  return [Math.min(...starts), Math.max(...ends)];
}

interface ResourceCalendarProps {
  resource: Resource;
  /** Called with the chosen interval; the reservation dialog comes in E1-25. */
  onContinue?: (start: Date, end: Date) => void;
}

/** Weekly calendar with 30-minute slots (Figma "Utilizator / 05 · Calendar resursă"). */
export function ResourceCalendar({resource, onContinue}: ResourceCalendarProps) {
  const [now] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now));
  const [selection, setSelection] = useState<Selection | null>(null);

  const days = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i)), [weekStart]);
  const [gridStart, gridEnd] = gridRange(resource);
  const rowCount = (gridEnd - gridStart) / slotMinutes;

  const cells: Cell[][] = useMemo(() => {
    const slots = getAvailability(resource, days[0], days[6]);
    const byStart = new Map(slots.map((slot) => [new Date(slot.startAt).getTime(), slot]));
    return days.map((day) =>
      Array.from({length: rowCount}, (_, row) => {
        const start = atMinutes(day, gridStart + row * slotMinutes);
        const end = atMinutes(day, gridStart + (row + 1) * slotMinutes);
        const slot = byStart.get(start.getTime());
        const state = cellState(slot, resource.maxConcurrentTeams);
        const selectable =
          slot !== undefined && slot.status === 'FREE' && slot.freePlaces > 0 && start > now;
        return {start, end, state, selectable};
      }),
    );
  }, [resource, days, rowCount, gridStart, now]);

  const maxSlots = resource.maxDurationMin ? resource.maxDurationMin / slotMinutes : Infinity;

  function changeWeek(weeks: number) {
    setWeekStart(addDays(weekStart, weeks * 7));
    setSelection(null);
  }

  /** Click starts a selection; a later click on the same day extends it if every slot is free. */
  function clickCell(day: number, row: number) {
    if (!cells[day][row].selectable) {
      return;
    }
    if (selection && selection.day === day && (row > selection.last || row < selection.first)) {
      const first = Math.min(selection.first, row);
      const last = Math.max(selection.last, row);
      const allFree = cells[day].slice(first, last + 1).every((cell) => cell.selectable);
      if (allFree && last - first + 1 <= maxSlots) {
        setSelection({day, first, last});
        return;
      }
    }
    setSelection({day, first: row, last: row});
  }

  const isSelected = (day: number, row: number) =>
    selection !== null && selection.day === day && row >= selection.first && row <= selection.last;

  const selectedStart = selection && cells[selection.day][selection.first].start;
  const selectedEnd = selection && cells[selection.day][selection.last].end;

  return (
    <section className={styles.calendar} aria-label={`Calendar ${resource.name}`}>
      <div className={styles.week}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => changeWeek(-1)}
          aria-label="Săptămâna anterioară"
        >
          <Icon name="left" />
        </button>
        <h2 className={styles.range}>
          {formatDayMonthYear(days[0])} – {formatDayMonthYear(days[6])}
        </h2>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => changeWeek(1)}
          aria-label="Săptămâna următoare"
        >
          <Icon name="right" />
        </button>
        <ul className={styles.legend}>
          {legend.map(({state, label}) => (
            <li key={state}>
              <span className={`${styles.swatch} ${styles[state]}`} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.grid} style={{gridTemplateRows: `43px repeat(${rowCount}, 22px)`}}>
        <div className={styles.corner} />
        {Array.from({length: rowCount}, (_, row) => {
          const minutes = gridStart + row * slotMinutes;
          return (
            <div key={`h${row}`} className={styles.hour} style={{gridColumn: 1, gridRow: row + 2}}>
              {minutes % 60 === 0 ? formatTime(atMinutes(days[0], minutes)) : ''}
            </div>
          );
        })}

        {days.map((day, dayIndex) => (
          <div
            key={day.toISOString()}
            className={styles.dayHeader}
            style={{gridColumn: dayIndex + 2, gridRow: 1}}
          >
            <span className={styles.dayName}>{dayNames[dayIndex]}</span>
            <span className={styles.dayNumber}>{day.getDate()}</span>
          </div>
        ))}

        {cells.map((column, dayIndex) =>
          column.map((cell, row) => {
            const selected = isSelected(dayIndex, row);
            const classes = [
              styles.slot,
              styles[cell.state],
              selected ? styles.selected : '',
              selected && row === selection?.first ? styles.selectedFirst : '',
              selected && row === selection?.last ? styles.selectedLast : '',
              cell.selectable ? styles.selectable : '',
            ].join(' ');
            return (
              <button
                key={`${dayIndex}-${row}`}
                type="button"
                className={classes}
                style={{gridColumn: dayIndex + 2, gridRow: row + 2}}
                disabled={!cell.selectable}
                aria-pressed={selected}
                aria-label={`${dayNames[dayIndex]} ${shortDate(cell.start)}, ${formatTime(cell.start)} – ${formatTime(cell.end)}, ${stateLabels[cell.state]}`}
                onClick={() => clickCell(dayIndex, row)}
              >
                {selected && row === selection?.first ? formatTime(cell.start) : ''}
              </button>
            );
          }),
        )}
      </div>

      <div className={styles.selection}>
        <p className={styles.selectionText}>
          {selectedStart && selectedEnd
            ? `${formatDayMonthYear(selectedStart)}, ${formatTime(selectedStart)} – ${formatTime(selectedEnd)}`
            : 'Alege un interval liber: apasă pe primul slot, apoi pe ultimul.'}
        </p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setSelection(null)}
          disabled={!selection}
        >
          Renunță
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={!selectedStart || !selectedEnd || !onContinue}
          onClick={() => selectedStart && selectedEnd && onContinue?.(selectedStart, selectedEnd)}
        >
          Continuă
        </button>
      </div>
    </section>
  );
}

/** "23.11" */
function shortDate(date: Date): string {
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

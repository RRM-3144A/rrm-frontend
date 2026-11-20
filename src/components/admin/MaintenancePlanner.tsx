'use client';

import {useState} from 'react';

import {ResourcePicker} from '@/components/admin/ResourcePicker';
import {ResourceCalendar} from '@/components/calendar/ResourceCalendar';
import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {addMinutes, formatLongDate, formatMonth, formatTime, slotMinutes} from '@/lib/dates';
import {errorMessage} from '@/lib/errors';
import {
  addMaintenance,
  cancelMaintenance,
  useAffectedReservations,
  useMaintenanceWindows,
} from '@/lib/maintenance';
import {useManagedResources} from '@/lib/resources';
import type {MaintenanceWindow, Resource} from '@/lib/types';

import styles from './MaintenancePlanner.module.css';

/** "00:00", "00:30", … "23:30" */
const times = Array.from({length: 48}, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
);

/** "2026-11-20" for <input type="date">, in local time. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromInputs(day: string, time: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hours, minutes);
}

function sameDay(a: Date, b: Date): boolean {
  return toDateInput(a) === toDateInput(b);
}

/** "14:30 – 16:00" on one day, otherwise "20 noiembrie 14:30 – 21 noiembrie 08:00". */
function formatWindow(period: MaintenanceWindow): string {
  const start = new Date(period.startAt);
  const end = new Date(period.endAt);
  if (sameDay(start, end)) {
    return `${formatTime(start)} – ${formatTime(end)}`;
  }
  const day = (d: Date) => `${d.getDate()} ${formatMonth(d)}`;
  return `${day(start)} ${formatTime(start)} – ${day(end)} ${formatTime(end)}`;
}

/** Figma "Admin / Calendar și mentenanță". */
export function MaintenancePlanner() {
  const resources = useManagedResources();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{start: Date; end: Date} | null>(null);
  const [toCancel, setToCancel] = useState<MaintenanceWindow | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resource = resources?.find((r) => r.id === pickedId) ?? resources?.[0];

  function newDraft() {
    // Next half hour, two hours long.
    const now = new Date();
    const start = addMinutes(now, slotMinutes - (now.getMinutes() % slotMinutes));
    start.setSeconds(0, 0);
    setDraft({start, end: addMinutes(start, 120)});
  }

  return (
    <>
      <PageHeader
        title="Calendar și mentenanță"
        subtitle="Vezi ocuparea resurselor tale și marchează perioadele de mentenanță. În mentenanță nu se pot face rezervări."
        aside={
          resources &&
          resource && (
            <ResourcePicker
              resources={resources}
              value={resource.id}
              onChange={(id) => {
                setPickedId(id);
                setFeedback(null);
              }}
            />
          )
        }
      />

      {resources?.length === 0 && (
        <p className={`${list.list} ${list.empty}`}>Nu administrezi încă nicio resursă.</p>
      )}

      {resource && (
        <>
          {feedback && (
            <p className={list.feedback} role="status">
              <Icon name="check" />
              {feedback}
            </p>
          )}
          <ResourceCalendar
            key={resource.id}
            resource={resource}
            continueLabel="Marchează mentenanță"
            onContinue={(start, end) => setDraft({start, end})}
          />
          <MaintenanceList resource={resource} onAdd={newDraft} onCancel={setToCancel} />
        </>
      )}

      {resource && draft && (
        <MaintenanceDialog
          resource={resource}
          initial={draft}
          onClose={() => setDraft(null)}
          onAdded={(flagged) => {
            setDraft(null);
            setFeedback(
              `Mentenanța pentru ${resource.name} a fost programată.` +
                (flagged > 0
                  ? ` ${flagged === 1 ? 'O rezervare aprobată a fost marcată' : `${flagged} rezervări aprobate au fost marcate`} pentru reanalizare în „Cereri primite”.`
                  : ''),
            );
          }}
        />
      )}
      {resource && toCancel && (
        <CancelMaintenanceDialog
          resource={resource}
          period={toCancel}
          onClose={() => setToCancel(null)}
          onCancelled={() => {
            setToCancel(null);
            setFeedback(`Mentenanța pentru ${resource.name} a fost anulată. Intervalul se poate rezerva din nou.`);
          }}
        />
      )}
    </>
  );
}

interface MaintenanceListProps {
  resource: Resource;
  onAdd: () => void;
  onCancel: (period: MaintenanceWindow) => void;
}

function MaintenanceList({resource, onAdd, onCancel}: MaintenanceListProps) {
  const windows = useMaintenanceWindows(resource.id);
  return (
    <section className={styles.section} aria-labelledby="maintenance-title">
      <div className={styles.sectionHeader}>
        <h2 id="maintenance-title" className={styles.sectionTitle}>
          Perioade de mentenanță programate
        </h2>
        <button type="button" className={controls.primary} onClick={onAdd}>
          <Icon name="plus" />
          Adaugă mentenanță
        </button>
      </div>
      {resource.status === 'MAINTENANCE' && (
        <p className={controls.error}>
          <Icon name="alert" />
          Resursa este marcată „În mentenanță” pe termen nedefinit; nu se poate rezerva deloc.
          Schimbă starea din pagina „Resurse”.
        </p>
      )}
      {windows === undefined ? null : windows.length === 0 ? (
        <p className={`${list.list} ${list.empty}`}>Nicio mentenanță programată pentru {resource.name}.</p>
      ) : (
        <ul className={list.list}>
          {windows.map((period) => {
            const start = new Date(period.startAt);
            return (
              <li key={period.id} className={list.row}>
                <div className={list.date}>
                  <span className={list.day}>{start.getDate()}</span>
                  <span className={list.month}>{formatMonth(start)}</span>
                </div>
                <div className={list.text}>
                  <p className={list.name}>{period.reason}</p>
                  <p className={list.subtitle}>{formatWindow(period)}</p>
                </div>
                <p className={`${list.status} ${list.rejected}`}>Mentenanță</p>
                <div className={list.actions}>
                  <button type="button" className={controls.danger} onClick={() => onCancel(period)}>
                    Anulează
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface MaintenanceDialogProps {
  resource: Resource;
  initial: {start: Date; end: Date};
  onClose: () => void;
  onAdded: (flagged: number) => void;
}

/** "Marchează mentenanță": interval (30-minute steps) and reason. */
function MaintenanceDialog({resource, initial, onClose, onAdded}: MaintenanceDialogProps) {
  const [startDay, setStartDay] = useState(toDateInput(initial.start));
  const [startTime, setStartTime] = useState(formatTime(initial.start));
  const [endDay, setEndDay] = useState(toDateInput(initial.end));
  const [endTime, setEndTime] = useState(formatTime(initial.end));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = fromInputs(startDay, startTime);
  const end = fromInputs(endDay, endTime);
  const valid = end > start;
  const affected = useAffectedReservations(
    resource.id,
    valid ? start.toISOString() : '',
    valid ? end.toISOString() : '',
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const {flagged} = await addMaintenance(resource.id, {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reason,
      });
      onAdded(flagged);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Marchează mentenanță"
      icon="alert"
      tone="danger"
      description={`${resource.name}. În intervalul ales nu se mai pot face rezervări.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="submit"
            form="maintenance-form"
            className={controls.dangerSolid}
            disabled={busy || !valid || !reason.trim()}
          >
            Marchează mentenanța
          </button>
        </>
      }
    >
      <form
        id="maintenance-form"
        className={controls.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className={controls.field}>
          <span className={controls.label}>Început – data</span>
          <input
            type="date"
            className={controls.input}
            value={startDay}
            onChange={(event) => setStartDay(event.target.value)}
            required
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Început – ora</span>
          <select className={controls.select} value={startTime} onChange={(event) => setStartTime(event.target.value)}>
            {times.map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Sfârșit – data</span>
          <input
            type="date"
            className={controls.input}
            value={endDay}
            min={startDay}
            onChange={(event) => setEndDay(event.target.value)}
            required
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Sfârșit – ora</span>
          <select className={controls.select} value={endTime} onChange={(event) => setEndTime(event.target.value)}>
            {times.map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
        </label>
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Motivul mentenanței</span>
          <textarea
            className={controls.textarea}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="De exemplu: revizia anuală a echipamentului."
            maxLength={1000}
            required
          />
        </label>
      </form>
      {!valid && (
        <p className={controls.error}>
          <Icon name="alert" />
          Sfârșitul trebuie să fie după început.
        </p>
      )}
      {valid && (
        <p className={controls.notice}>
          <Icon name="calendar" />
          {formatLongDate(start)}, {formatTime(start)} –{' '}
          {sameDay(start, end) ? '' : `${formatLongDate(end).toLocaleLowerCase('ro')}, `}
          {formatTime(end)}
        </p>
      )}
      {affected > 0 && (
        <p className={controls.warning}>
          <Icon name="alert" />
          {affected === 1
            ? 'O rezervare aprobată se suprapune cu intervalul. Va apărea'
            : `${affected} rezervări aprobate se suprapun cu intervalul. Vor apărea`}{' '}
          la „Reanalizare” în „Cereri primite”, ca să le reprogramezi sau anulezi.
        </p>
      )}
      {error && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </Dialog>
  );
}

interface CancelMaintenanceDialogProps {
  resource: Resource;
  period: MaintenanceWindow;
  onClose: () => void;
  onCancelled: () => void;
}

function CancelMaintenanceDialog({resource, period, onClose, onCancelled}: CancelMaintenanceDialogProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      title="Anulezi mentenanța?"
      icon="calendar"
      description={`${resource.name}: ${period.reason} (${formatLongDate(new Date(period.startAt)).toLocaleLowerCase('ro')}, ${formatWindow(period)}). Intervalul se poate rezerva din nou.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="button"
            className={controls.dangerSolid}
            onClick={async () => {
              try {
                await cancelMaintenance(resource.id, period.id);
                onCancelled();
              } catch (caught) {
                setError(errorMessage(caught));
              }
            }}
          >
            Anulează mentenanța
          </button>
        </>
      }
    >
      {error && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </Dialog>
  );
}

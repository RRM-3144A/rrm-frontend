'use client';

import Link from 'next/link';
import {useState} from 'react';

import {ResourcePicker} from '@/components/admin/ResourcePicker';
import controls from '@/components/controls.module.css';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {halfHourTimes} from '@/lib/dates';
import {errorMessage} from '@/lib/errors';
import {formatSchedule} from '@/lib/format';
import {useManagedResources} from '@/lib/resources';
import {saveSchedule, scheduleProblem} from '@/lib/schedule';
import type {Resource, ScheduleInterval} from '@/lib/types';

import styles from './ScheduleEditor.module.css';

const weekdayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/** Figma "Admin / Program de funcționare". */
export function ScheduleEditor() {
  const resources = useManagedResources();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const resource = resources?.find((r) => r.id === pickedId) ?? resources?.[0];

  return (
    <>
      <PageHeader
        title="Program de funcționare"
        subtitle="Stabilește intervalele în care resursa poate fi rezervată, pe zile ale săptămânii."
        aside={
          resources &&
          resource && <ResourcePicker resources={resources} value={resource.id} onChange={setPickedId} />
        }
      />
      {resources?.length === 0 && (
        <p className={`${list.list} ${list.empty}`}>Nu administrezi încă nicio resursă.</p>
      )}
      {/* A new form (and draft) for every resource. */}
      {resource && <WeekForm key={resource.id} resource={resource} />}
    </>
  );
}

function WeekForm({resource}: {resource: Resource}) {
  const [draft, setDraft] = useState<ScheduleInterval[]>(resource.schedule);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const problem = scheduleProblem(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(resource.schedule);

  function edit(next: ScheduleInterval[]) {
    setDraft(next);
    setSaved(false);
    setError(null);
  }

  function dayIntervals(weekday: number) {
    return draft
      .map((interval, index) => ({interval, index}))
      .filter(({interval}) => interval.weekday === weekday);
  }

  function addInterval(weekday: number) {
    const last = dayIntervals(weekday).at(-1)?.interval;
    // After the previous interval, or a usual 08:00 – 16:00 day.
    const startTime = last ? last.endTime : '08:00';
    const startIndex = halfHourTimes.indexOf(startTime);
    const endTime = last ? halfHourTimes[Math.min(startIndex + 4, halfHourTimes.length - 1)] : '16:00';
    edit([...draft, {weekday, startTime, endTime}]);
  }

  function copyMondayToWorkdays() {
    const monday = draft.filter((i) => i.weekday === 0);
    edit([
      ...monday,
      ...[1, 2, 3, 4].flatMap((weekday) => monday.map((i) => ({...i, weekday}))),
      ...draft.filter((i) => i.weekday >= 5),
    ]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      setDraft(await saveSchedule(resource.id, draft));
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.panel}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <ul className={styles.days}>
        {weekdayNames.map((name, weekday) => {
          const intervals = dayIntervals(weekday);
          const open = intervals.length > 0;
          return (
            <li key={name} className={styles.day}>
              <label className={styles.dayName}>
                <input
                  type="checkbox"
                  checked={open}
                  onChange={() =>
                    open ? edit(draft.filter((i) => i.weekday !== weekday)) : addInterval(weekday)
                  }
                />
                {name}
              </label>
              <div className={styles.intervals}>
                {!open && <span className={styles.closed}>Închis</span>}
                {intervals.map(({interval, index}) => (
                  <div key={index} className={styles.interval}>
                    <TimeSelect
                      label={`${name}, început`}
                      value={interval.startTime}
                      onChange={(startTime) =>
                        edit(draft.map((d, i) => (i === index ? {...d, startTime} : d)))
                      }
                    />
                    <span aria-hidden>–</span>
                    <TimeSelect
                      label={`${name}, sfârșit`}
                      value={interval.endTime}
                      onChange={(endTime) =>
                        edit(draft.map((d, i) => (i === index ? {...d, endTime} : d)))
                      }
                    />
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Șterge intervalul ${interval.startTime} – ${interval.endTime}`}
                      onClick={() => edit(draft.filter((_, i) => i !== index))}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
                {open && (
                  <button type="button" className={styles.add} onClick={() => addInterval(weekday)}>
                    <Icon name="plus" />
                    Interval
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className={controls.notice}>
        <Icon name="clock" />
        {formatSchedule(draft)}
      </p>
      {problem && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {problem}
        </p>
      )}
      {error && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      {saved && !changed && (
        <p className={list.feedback} role="status">
          <Icon name="check" />
          Programul pentru {resource.name} a fost salvat. Calendarul resursei folosește deja noul
          program.{' '}
          <Link href={`/resurse/${resource.id}`} className={styles.link}>
            Vezi calendarul
          </Link>
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={controls.secondary}
          onClick={copyMondayToWorkdays}
          disabled={!draft.some((i) => i.weekday === 0)}
        >
          Copiază programul de luni pe zilele lucrătoare
        </button>
        <span className={styles.spacer} />
        <button
          type="button"
          className={controls.secondary}
          onClick={() => edit(resource.schedule)}
          disabled={!changed}
        >
          Renunță la modificări
        </button>
        <button type="submit" className={controls.primary} disabled={!changed || !!problem || saving}>
          {saving ? 'Se salvează…' : 'Salvează programul'}
        </button>
      </div>
    </form>
  );
}

interface TimeSelectProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
}

function TimeSelect({label, value, onChange}: TimeSelectProps) {
  return (
    <select
      className={`${controls.select} ${styles.time}`}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    >
      {halfHourTimes.map((time) => (
        <option key={time}>{time}</option>
      ))}
    </select>
  );
}

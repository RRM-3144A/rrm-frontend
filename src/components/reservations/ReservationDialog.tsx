'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';

import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import {useAvailability} from '@/lib/availability';
import {formatLongDate, formatTime, slotMinutes, startOfDay} from '@/lib/dates';
import {errorMessage} from '@/lib/errors';
import {formatSlots, resourceSubtitle} from '@/lib/format';
import {createReservation, useIsFirstReservation, useMyTeam} from '@/lib/reservations';
import type {Resource} from '@/lib/types';

interface ReservationDialogProps {
  resource: Resource;
  start: Date;
  end: Date;
  onClose: () => void;
}

/**
 * Figma "Utilizator / Adaugă rezervare" and, after sending, "Cerere trimisă".
 *
 * The Figma form also has "Număr de participanți"; the backend's ReservationCreate
 * has no such field, so it is left out (we follow the backend).
 */
export function ReservationDialog({resource, start, end, onClose}: ReservationDialogProps) {
  const team = useMyTeam();
  const isFirst = useIsFirstReservation(resource.id);
  const [teamChoice, setTeamChoice] = useState<'team' | 'none'>('team');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const day = useMemo(() => startOfDay(start), [start]);
  const slots = useAvailability(resource.id, day, day);
  const slotCount = (end.getTime() - start.getTime()) / (slotMinutes * 60_000);
  const freePlaces = useMemo(() => {
    const chosen = slots.filter((s) => new Date(s.startAt) >= start && new Date(s.endAt) <= end);
    return chosen.length === 0 ? 0 : Math.min(...chosen.map((s) => s.freePlaces));
  }, [slots, start, end]);

  const interval = `${formatTime(start)} – ${formatTime(end)}`;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createReservation({
        resourceId: resource.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        purpose: purpose.trim() || null,
        teamId: team && teamChoice === 'team' ? team.id : null,
      });
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Dialog
        title="Cerere trimisă"
        icon="check"
        tone="success"
        description={
          <>
            Cererea pentru <strong>{resource.name}</strong>, {formatLongDate(start).toLocaleLowerCase('ro')},{' '}
            {interval}, a ajuns la administratorul resursei. Primești un e-mail când este aprobată sau
            respinsă.
          </>
        }
        onClose={onClose}
        footer={
          <>
            <button type="button" className={controls.secondary} onClick={onClose}>
              Închide
            </button>
            <Link href="/rezervari" className={controls.primary}>
              Vezi rezervările mele
            </Link>
          </>
        }
      />
    );
  }

  return (
    <Dialog
      title="Adaugă rezervare"
      icon="calendar"
      description={`${resource.name} · ${resourceSubtitle(resource)}. Cererea ajunge la administrator pentru aprobare.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="submit"
            form="reservation-form"
            className={controls.primary}
            disabled={submitting}
          >
            {submitting ? 'Se trimite…' : 'Trimite cererea'}
          </button>
        </>
      }
    >
      <form
        id="reservation-form"
        className={controls.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className={controls.field}>
          <span className={controls.label}>Data</span>
          <input className={controls.input} value={formatLongDate(start)} readOnly />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Interval (sloturi de 30 de minute)</span>
          <input
            className={controls.input}
            value={`${interval} · ${formatSlots(slotCount)}`}
            readOnly
          />
        </label>
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Echipa</span>
          <select
            className={controls.select}
            value={team ? teamChoice : 'none'}
            onChange={(event) => setTeamChoice(event.target.value as 'team' | 'none')}
          >
            {team && <option value="team">{team.name}</option>}
            <option value="none">Individual (fără echipă)</option>
          </select>
        </label>
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Scopul rezervării</span>
          <textarea
            className={controls.textarea}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="De exemplu: testarea prototipului pentru proiectul de licență."
            maxLength={1000}
          />
        </label>
      </form>

      {resource.maxConcurrentTeams > 1 && (
        <p className={controls.notice}>
          <Icon name="users" />
          Resursa acceptă maximum {resource.maxConcurrentTeams} echipe simultan.{' '}
          {freePlaces === 1
            ? 'În intervalul ales mai este 1 loc liber.'
            : `În intervalul ales mai sunt ${freePlaces} locuri libere.`}
        </p>
      )}
      {isFirst && (
        <p className={controls.warning}>
          <Icon name="alert" />
          Este prima ta rezervare pe această resursă. Administratorul poate cere o instruire
          înainte de aprobare.
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

'use client';

import {useMemo, useState} from 'react';

import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {formatInterval, formatLongDate, formatMonth, formatNumericDate} from '@/lib/dates';
import {errorMessage} from '@/lib/errors';
import {reservationStatusInfo, resourceSubtitle} from '@/lib/format';
import {cancelReservation, canCancel, useMyReservations} from '@/lib/reservations';
import type {ReservationDetails} from '@/lib/reservations';
import type {ReservationStatus} from '@/lib/types';

type Filter = 'all' | 'approved' | 'pending' | 'rejected';

const filters: {key: Filter; label: string; statuses: ReservationStatus[] | null}[] = [
  {key: 'all', label: 'Toate', statuses: null},
  {key: 'approved', label: 'Aprobate', statuses: ['APPROVED', 'COMPLETED']},
  {key: 'pending', label: 'În așteptare', statuses: ['PENDING', 'AWAITING_TRAINING']},
  {key: 'rejected', label: 'Respinse', statuses: ['REJECTED']},
];

function teamLabel(reservation: ReservationDetails): string {
  return reservation.team?.name ?? 'Individual';
}

/** Figma "Utilizator / Rezervările mele": the user's requests with status and cancel. */
export function MyReservations() {
  const reservations = useMyReservations();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('ro');
    const statuses = filters.find((f) => f.key === filter)?.statuses ?? null;
    return (reservations ?? []).filter((r) => {
      const haystack = [r.resource.name, formatNumericDate(new Date(r.startAt))]
        .join(' ')
        .toLocaleLowerCase('ro');
      return (text === '' || haystack.includes(text)) && (!statuses || statuses.includes(r.status));
    });
  }, [reservations, query, filter]);

  const details = reservations?.find((r) => r.id === detailsId) ?? null;
  const toCancel = reservations?.find((r) => r.id === cancelId) ?? null;
  const count = reservations?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Rezervările mele"
        subtitle="Urmărește statusul și gestionează rezervările tale."
        aside={reservations && `${count} ${count === 1 ? 'rezervare' : 'rezervări'}`}
      />

      <div className={list.toolbar}>
        <label className={list.search}>
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după resursă sau dată (ZZ.LL.AAAA)…"
            aria-label="Caută"
          />
        </label>
        <div className={list.filters} role="group" aria-label="Status">
          {filters.map(({key, label}) => (
            <button
              key={key}
              type="button"
              className={filter === key ? `${list.filter} ${list.filterActive}` : list.filter}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <p className={list.feedback} role="status">
          <Icon name="check" />
          {feedback}
        </p>
      )}

      {reservations === undefined ? null : visible.length === 0 ? (
        <p className={`${list.list} ${list.empty}`}>
          {count === 0
            ? 'Nu ai încă nicio rezervare. Alege o sală sau un echipament și rezervă un interval.'
            : 'Nicio rezervare nu corespunde căutării.'}
        </p>
      ) : (
        <ul className={list.list}>
          {visible.map((reservation) => {
            const start = new Date(reservation.startAt);
            const status = reservationStatusInfo[reservation.status];
            return (
              <li key={reservation.id} className={list.row}>
                <div className={list.date}>
                  <span className={list.day}>{start.getDate()}</span>
                  <span className={list.month}>{formatMonth(start)}</span>
                </div>
                <div className={list.text}>
                  <p className={list.name}>{reservation.resource.name}</p>
                  <p className={list.subtitle}>
                    {formatInterval(reservation.startAt, reservation.endAt)}, {teamLabel(reservation)}
                  </p>
                </div>
                <p className={`${list.status} ${list[status.tone]}`}>{status.label}</p>
                <div className={list.actions}>
                  <button
                    type="button"
                    className={controls.secondary}
                    onClick={() => setDetailsId(reservation.id)}
                  >
                    Detalii
                  </button>
                  {canCancel(reservation) && (
                    <button
                      type="button"
                      className={controls.danger}
                      onClick={() => setCancelId(reservation.id)}
                    >
                      Anulează
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {details && (
        <ReservationDetailsDialog
          reservation={details}
          onClose={() => setDetailsId(null)}
          onCancel={() => {
            setDetailsId(null);
            setCancelId(details.id);
          }}
        />
      )}
      {toCancel && (
        <CancelDialog
          reservation={toCancel}
          onClose={() => setCancelId(null)}
          onCancelled={() => {
            setCancelId(null);
            setFeedback(`Rezervarea pentru ${toCancel.resource.name} a fost anulată.`);
          }}
        />
      )}
    </>
  );
}

interface DetailsDialogProps {
  reservation: ReservationDetails;
  onClose: () => void;
  onCancel: () => void;
}

function ReservationDetailsDialog({reservation, onClose, onCancel}: DetailsDialogProps) {
  const status = reservationStatusInfo[reservation.status];
  return (
    <Dialog
      title="Detalii rezervare"
      icon="calendar"
      description={`${reservation.resource.name} · ${resourceSubtitle(reservation.resource)}`}
      onClose={onClose}
      footer={
        <>
          {canCancel(reservation) && (
            <button type="button" className={controls.danger} onClick={onCancel}>
              Anulează rezervarea
            </button>
          )}
          <button type="button" className={controls.secondary} onClick={onClose}>
            Închide
          </button>
        </>
      }
    >
      <dl className={controls.details}>
        <div>
          <dt>Data</dt>
          <dd>{formatLongDate(new Date(reservation.startAt))}</dd>
        </div>
        <div>
          <dt>Interval</dt>
          <dd>{formatInterval(reservation.startAt, reservation.endAt)}</dd>
        </div>
        <div>
          <dt>Echipa</dt>
          <dd>{teamLabel(reservation)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={list[status.tone]}>{status.label}</dd>
        </div>
        <div className={controls.wide}>
          <dt>Scopul rezervării</dt>
          <dd>{reservation.purpose ?? '—'}</dd>
        </div>
      </dl>
      {reservation.status === 'REJECTED' && reservation.rejectionReason && (
        <p className={controls.error}>
          <Icon name="info" />
          Motivul respingerii: {reservation.rejectionReason}
        </p>
      )}
      {reservation.status === 'AWAITING_TRAINING' && (
        <p className={controls.notice}>
          <Icon name="info" />
          Administratorul cere o instruire înainte de aprobare. După instruire, cererea revine
          în așteptare.
        </p>
      )}
      {reservation.needsReview && (
        <p className={controls.warning}>
          <Icon name="alert" />
          Resursa intră în mentenanță în acest interval. Administratorul va reprograma sau anula
          rezervarea.
        </p>
      )}
    </Dialog>
  );
}

interface CancelDialogProps {
  reservation: ReservationDetails;
  onClose: () => void;
  onCancelled: () => void;
}

function CancelDialog({reservation, onClose, onCancelled}: CancelDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await cancelReservation(reservation.id);
      onCancelled();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Anulezi rezervarea?"
      icon="alert"
      tone="danger"
      description={`${reservation.resource.name}, ${formatLongDate(new Date(reservation.startAt)).toLocaleLowerCase('ro')}, ${formatInterval(reservation.startAt, reservation.endAt)}. Intervalul se eliberează pentru alte echipe.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="button"
            className={controls.dangerSolid}
            disabled={busy}
            onClick={() => void confirm()}
          >
            Anulează rezervarea
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

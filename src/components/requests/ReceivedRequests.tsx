'use client';

import {useMemo, useState} from 'react';
import type {ReactNode} from 'react';

import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {formatInterval, formatLongDate, formatMonth} from '@/lib/dates';
import {errorMessage} from '@/lib/errors';
import {formatLocation, reservationStatusInfo} from '@/lib/format';
import {
  approveRequest,
  cancelRequest,
  completeTraining,
  rejectRequest,
  requireTraining,
  useReceivedRequests,
} from '@/lib/requests';
import type {PendingReservation} from '@/lib/types';

type Filter = 'all' | 'pending' | 'training' | 'review';

const filters: {key: Filter; label: string}[] = [
  {key: 'all', label: 'Toate'},
  {key: 'pending', label: 'În așteptare'},
  {key: 'training', label: 'Necesită instruire'},
  {key: 'review', label: 'Reanalizare'},
];

/** Which group a request belongs to, for the filters and the row's buttons. */
function kindOf(request: PendingReservation): Exclude<Filter, 'all'> {
  if (request.status === 'APPROVED') {
    return 'review';
  }
  return request.status === 'AWAITING_TRAINING' ? 'training' : 'pending';
}

/** "Necesită instruire" is offered while the student has not been trained on the resource. */
function canAskForTraining(request: PendingReservation): boolean {
  return request.status === 'PENDING' && !request.hasCompletedTraining &&
    (request.isFirstReservation || request.resource.requiresTraining);
}

function applicant(request: PendingReservation): string {
  return `${request.user.firstName} ${request.user.lastName}`;
}

type DialogKind = 'details' | 'reject' | 'training' | 'trained';

/** Figma "Admin / Cereri primite" with its popups. */
export function ReceivedRequests() {
  const requests = useReceivedRequests();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<{kind: DialogKind; id: number} | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('ro');
    return (requests ?? []).filter((r) => {
      const haystack = [applicant(r), r.team?.name, r.user.team?.name, r.resource.name]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ro');
      return (text === '' || haystack.includes(text)) && (filter === 'all' || kindOf(r) === filter);
    });
  }, [requests, query, filter]);

  const current = requests?.find((r) => r.id === open?.id) ?? null;
  const count = requests?.length ?? 0;

  /** Runs a decision and shows the result above the list ("Cerere aprobată"). */
  async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    setError(null);
    try {
      await action();
      setFeedback(message);
      setOpen(null);
      return true;
    } catch (caught) {
      setFeedback(null);
      setError(errorMessage(caught));
      return false;
    }
  }

  const approve = (r: PendingReservation) =>
    run(
      () => approveRequest(r.id),
      `Cererea lui ${applicant(r)} pentru ${r.resource.name} a fost aprobată. Solicitantul primește un e-mail.`,
    );

  const cancel = (r: PendingReservation) =>
    run(
      () => cancelRequest(r.id),
      `Rezervarea lui ${applicant(r)} pentru ${r.resource.name} a fost anulată. Solicitantul primește un e-mail.`,
    );

  function actions(request: PendingReservation, inDialog = false) {
    const kind = kindOf(request);
    const details = !inDialog && (
      <button
        type="button"
        className={controls.secondary}
        onClick={() => setOpen({kind: 'details', id: request.id})}
      >
        Detalii
      </button>
    );
    if (kind === 'review') {
      return (
        <>
          {details}
          <button type="button" className={controls.danger} onClick={() => void cancel(request)}>
            Anulează
          </button>
        </>
      );
    }
    if (kind === 'training') {
      return (
        <>
          {details}
          <button
            type="button"
            className={controls.primary}
            onClick={() => setOpen({kind: 'trained', id: request.id})}
          >
            Instruire finalizată
          </button>
        </>
      );
    }
    return (
      <>
        {details}
        {canAskForTraining(request) && (
          <button
            type="button"
            className={controls.secondary}
            onClick={() => setOpen({kind: 'training', id: request.id})}
          >
            Necesită instruire
          </button>
        )}
        <button
          type="button"
          className={controls.danger}
          onClick={() => setOpen({kind: 'reject', id: request.id})}
        >
          Respinge
        </button>
        <button type="button" className={controls.primary} onClick={() => void approve(request)}>
          Aprobă
        </button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cereri primite"
        subtitle="Aprobă, respinge sau condiționează de instruire cererile pentru resursele tale."
        aside={requests && `${count} ${count === 1 ? 'cerere' : 'cereri'}`}
      />

      <div className={list.toolbar}>
        <label className={list.search}>
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după solicitant, echipă sau resursă…"
            aria-label="Caută"
          />
        </label>
        <div className={list.filters} role="group" aria-label="Tip cerere">
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
      {error && !open && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}

      {requests === undefined ? null : visible.length === 0 ? (
        <p className={`${list.list} ${list.empty}`}>
          {count === 0
            ? 'Nu ai cereri noi. Cererile pentru resursele tale apar aici.'
            : 'Nicio cerere nu corespunde căutării.'}
        </p>
      ) : (
        <ul className={list.list}>
          {visible.map((request) => (
            <RequestRow key={request.id} request={request}>
              {actions(request)}
            </RequestRow>
          ))}
        </ul>
      )}

      {current && open?.kind === 'details' && (
        <Dialog
          title="Detalii cerere"
          icon="list"
          description={`${current.resource.name} · ${formatLocation(current.resource)}`}
          onClose={() => setOpen(null)}
          footer={actions(current, true)}
        >
          <RequestDetails request={current} />
          {error && (
            <p className={controls.error} role="alert">
              <Icon name="alert" />
              {error}
            </p>
          )}
        </Dialog>
      )}
      {current && open?.kind === 'reject' && (
        <RejectDialog
          request={current}
          onClose={() => setOpen(null)}
          onReject={(reason) =>
            run(
              () => rejectRequest(current.id, reason),
              `Cererea lui ${applicant(current)} a fost respinsă. Solicitantul primește motivul pe e-mail.`,
            )
          }
          error={error}
        />
      )}
      {current && open?.kind === 'training' && (
        <ConfirmDialog
          title="Necesită instruire"
          icon="info"
          description={`${applicant(current)} primește un e-mail că trebuie să facă instruirea pentru ${current.resource.name}. După instruire, marchezi „Instruire finalizată” și cererea revine la aprobare.`}
          confirmLabel="Cere instruire"
          onClose={() => setOpen(null)}
          onConfirm={() =>
            run(
              () => requireTraining(current.id),
              `${applicant(current)} a fost anunțat că are nevoie de instruire pentru ${current.resource.name}.`,
            )
          }
          error={error}
        />
      )}
      {current && open?.kind === 'trained' && (
        <TrainedDialog
          request={current}
          onClose={() => setOpen(null)}
          onConfirm={async (andApprove) => {
            const done = await run(
              () => completeTraining(current.id),
              `Instruirea lui ${applicant(current)} pentru ${current.resource.name} a fost înregistrată. Cererea revine la aprobare.`,
            );
            if (done && andApprove) {
              await approve(current);
            }
          }}
          error={error}
        />
      )}
    </>
  );
}

function RequestRow({request, children}: {request: PendingReservation; children: ReactNode}) {
  const start = new Date(request.startAt);
  const kind = kindOf(request);
  const team = request.team?.name ?? 'Individual';
  const note =
    kind === 'review' ? 'suprapusă cu mentenanța' : kind === 'training' ? 'așteaptă instruirea' : null;

  return (
    <li className={list.row}>
      <div className={list.date}>
        <span className={list.day}>{start.getDate()}</span>
        <span className={list.month}>{formatMonth(start)}</span>
      </div>
      <div className={list.text}>
        <div className={list.titleLine}>
          <p className={list.name}>{request.resource.name}</p>
          {request.isFirstReservation && kind === 'pending' && (
            <span className={`${list.tag} ${list.tagPending}`}>Prima rezervare</span>
          )}
          {kind === 'training' && (
            <span className={`${list.tag} ${list.tagTraining}`}>Necesită instruire</span>
          )}
          {kind === 'review' && <span className={`${list.tag} ${list.tagRejected}`}>Reanalizare</span>}
        </div>
        <p className={list.subtitle}>
          {[applicant(request), team, formatInterval(request.startAt, request.endAt), note]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className={list.actions}>{children}</div>
    </li>
  );
}

function RequestDetails({request}: {request: PendingReservation}) {
  const status = reservationStatusInfo[request.status];
  return (
    <>
      <dl className={controls.details}>
        <div>
          <dt>Solicitant</dt>
          <dd>{applicant(request)}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{request.user.email}</dd>
        </div>
        <div>
          <dt>Echipa</dt>
          <dd>{request.team?.name ?? 'Individual'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={list[status.tone]}>{request.needsReview ? 'Reanalizare' : status.label}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{formatLongDate(new Date(request.startAt))}</dd>
        </div>
        <div>
          <dt>Interval</dt>
          <dd>{formatInterval(request.startAt, request.endAt)}</dd>
        </div>
        <div className={controls.wide}>
          <dt>Scopul rezervării</dt>
          <dd>{request.purpose ?? '—'}</dd>
        </div>
      </dl>
      {request.isFirstReservation && (
        <p className={controls.warning}>
          <Icon name="alert" />
          Este prima rezervare a solicitantului pe această resursă.
          {request.hasCompletedTraining ? ' Instruirea este deja făcută.' : ' Poți cere o instruire înainte de aprobare.'}
        </p>
      )}
      {request.needsReview && (
        <p className={controls.error}>
          <Icon name="alert" />
          Rezervarea aprobată se suprapune cu o perioadă de mentenanță adăugată ulterior.
        </p>
      )}
    </>
  );
}

interface RejectDialogProps {
  request: PendingReservation;
  onClose: () => void;
  onReject: (reason: string) => Promise<boolean>;
  error: string | null;
}

/** Figma "Respinge cererea": the reason is required (backend 422 without it). */
function RejectDialog({request, onClose, onReject, error}: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      title="Respinge cererea"
      icon="alert"
      tone="danger"
      description={`${applicant(request)} · ${request.resource.name}, ${formatLongDate(new Date(request.startAt)).toLocaleLowerCase('ro')}, ${formatInterval(request.startAt, request.endAt)}. Motivul ajunge la solicitant pe e-mail.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="submit"
            form="reject-form"
            className={controls.dangerSolid}
            disabled={busy || !reason.trim()}
          >
            Respinge cererea
          </button>
        </>
      }
    >
      <form
        id="reject-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          if (!(await onReject(reason))) {
            setBusy(false);
          }
        }}
      >
        <label className={controls.field}>
          <span className={controls.label}>Motivul respingerii</span>
          <textarea
            className={controls.textarea}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="De exemplu: sala este rezervată pentru examene în acest interval."
            required
            autoFocus
          />
        </label>
      </form>
      {error && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </Dialog>
  );
}

interface ConfirmDialogProps {
  title: string;
  icon: 'info' | 'check';
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
  error: string | null;
}

function ConfirmDialog({title, icon, description, confirmLabel, onClose, onConfirm, error}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      title={title}
      icon={icon}
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="button"
            className={controls.primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {confirmLabel}
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

interface TrainedDialogProps {
  request: PendingReservation;
  onClose: () => void;
  onConfirm: (andApprove: boolean) => Promise<void>;
  error: string | null;
}

/** Figma "Instruire finalizată" (E1-45): records the training, optionally approves too. */
function TrainedDialog({request, onClose, onConfirm, error}: TrainedDialogProps) {
  const [andApprove, setAndApprove] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Instruire finalizată"
      icon="check"
      tone="success"
      description={`Confirmi că ${applicant(request)} a făcut instruirea pentru ${request.resource.name}. Nu va mai fi nevoie de instruire la următoarele rezervări.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="button"
            className={controls.primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm(andApprove);
              setBusy(false);
            }}
          >
            Confirmă instruirea
          </button>
        </>
      }
    >
      <label className={controls.checkbox}>
        <input type="checkbox" checked={andApprove} onChange={(event) => setAndApprove(event.target.checked)} />
        Aprobă și cererea pentru {formatLongDate(new Date(request.startAt)).toLocaleLowerCase('ro')},{' '}
        {formatInterval(request.startAt, request.endAt)}
      </label>
      {error && (
        <p className={controls.error} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </Dialog>
  );
}

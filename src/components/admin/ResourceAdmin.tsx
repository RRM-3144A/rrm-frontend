'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {ReactNode} from 'react';

import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {
  createResource,
  deactivateResource,
  updateResource,
  useAdmins,
  useAllResources,
  useCategories,
  useUpcomingReservationCount,
} from '@/lib/administration';
import type {ResourceInput} from '@/lib/administration';
import {kindOf} from '@/lib/catalog';
import {errorMessage} from '@/lib/errors';
import {adminNames, formatSchedule, resourceSubtitle} from '@/lib/format';
import {useSession} from '@/lib/session';
import type {Resource, ResourceStatus} from '@/lib/types';

type Filter = 'all' | ResourceStatus;

const filters: {key: Filter; label: string}[] = [
  {key: 'all', label: 'Toate'},
  {key: 'ACTIVE', label: 'Active'},
  {key: 'MAINTENANCE', label: 'În mentenanță'},
  {key: 'INACTIVE', label: 'Dezactivate'},
];

const statusInfo: Record<ResourceStatus, {label: string; tone: 'approved' | 'rejected' | 'muted'}> = {
  ACTIVE: {label: 'Activă', tone: 'approved'},
  MAINTENANCE: {label: 'În mentenanță', tone: 'rejected'},
  INACTIVE: {label: 'Dezactivată', tone: 'muted'},
};

/** Figma "Admin / Resurse" with "Adaugă / editează resursă" and "Dezactivează resursa". */
export function ResourceAdmin() {
  const resources = useAllResources();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Resource | null>(null);
  const [feedback, setFeedback] = useState<ReactNode>(null);

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('ro');
    return (resources ?? []).filter((r) => {
      const haystack = [r.name, r.description, r.location, r.category.name, r.model]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ro');
      return (text === '' || haystack.includes(text)) && (filter === 'all' || r.status === filter);
    });
  }, [resources, query, filter]);

  return (
    <>
      <PageHeader
        title="Resurse"
        subtitle="Adaugă, editează sau dezactivează sălile și echipamentele."
        aside={
          <button type="button" className={controls.primary} onClick={() => setEditing('new')}>
            <Icon name="plus" />
            Adaugă resursă
          </button>
        }
      />

      <div className={list.toolbar}>
        <label className={list.search}>
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după nume, categorie sau locație…"
            aria-label="Caută"
          />
        </label>
        <div className={list.filters} role="group" aria-label="Stare">
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
          <span>{feedback}</span>
        </p>
      )}

      {resources === undefined ? null : visible.length === 0 ? (
        <p className={`${list.list} ${list.empty}`}>Nicio resursă nu corespunde căutării.</p>
      ) : (
        <ul className={list.list}>
          {visible.map((resource) => {
            const status = statusInfo[resource.status];
            return (
              <li key={resource.id} className={list.row}>
                <span className={list.muted} aria-hidden>
                  <Icon name={kindOf(resource) === 'rooms' ? 'room' : 'chip'} />
                </span>
                <div className={list.text}>
                  <div className={list.titleLine}>
                    <p className={list.name}>{resource.name}</p>
                    {resource.requiresTraining && (
                      <span className={`${list.tag} ${list.tagTraining}`}>Necesită instruire</span>
                    )}
                  </div>
                  <p className={list.subtitle}>
                    {resourceSubtitle(resource)} · {formatSchedule(resource.schedule)} · Responsabil:{' '}
                    {adminNames(resource)}
                  </p>
                </div>
                <p className={`${list.status} ${list[status.tone]}`}>{status.label}</p>
                <div className={list.actions}>
                  <button type="button" className={controls.secondary} onClick={() => setEditing(resource)}>
                    Editează
                  </button>
                  {resource.status !== 'INACTIVE' && (
                    <button
                      type="button"
                      className={controls.danger}
                      onClick={() => setToDeactivate(resource)}
                    >
                      Dezactivează
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ResourceDialog
          resource={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            setFeedback(
              created ? (
                <>
                  Resursa {saved.name} a fost adăugată. Setează-i{' '}
                  <Link href="/admin/program">programul de funcționare</Link>, ca să poată fi rezervată.
                </>
              ) : (
                `Modificările pentru ${saved.name} au fost salvate.`
              ),
            );
          }}
        />
      )}
      {toDeactivate && (
        <DeactivateDialog
          resource={toDeactivate}
          onClose={() => setToDeactivate(null)}
          onDone={() => {
            setToDeactivate(null);
            setFeedback(
              `${toDeactivate.name} a fost dezactivată și nu mai apare în catalog. O poți reactiva din „Editează”.`,
            );
          }}
        />
      )}
    </>
  );
}

/** Form values; numbers are kept as text while typing. */
interface FormState {
  name: string;
  categoryId: string;
  kind: 'rooms' | 'equipment';
  description: string;
  status: ResourceStatus;
  maxConcurrentTeams: string;
  location: string;
  floor: string;
  seats: string;
  equipment: string;
  model: string;
  maxDurationMin: string;
  requiresTraining: boolean;
  adminIds: number[];
}

function toForm(resource: Resource | null, currentAdminId: number | undefined): FormState {
  return {
    name: resource?.name ?? '',
    categoryId: resource ? String(resource.category.id) : '',
    kind: resource ? kindOf(resource) : 'rooms',
    description: resource?.description ?? '',
    status: resource?.status ?? 'ACTIVE',
    maxConcurrentTeams: String(resource?.maxConcurrentTeams ?? 1),
    location: resource?.location ?? '',
    floor: resource?.floor?.toString() ?? '',
    seats: resource?.seats?.toString() ?? '',
    equipment: resource?.equipment ?? '',
    model: resource?.model ?? '',
    maxDurationMin: resource?.maxDurationMin?.toString() ?? '',
    requiresTraining: resource?.requiresTraining ?? false,
    // A new resource is administered by whoever adds it.
    adminIds: resource ? resource.admins.map((a) => a.id) : currentAdminId ? [currentAdminId] : [],
  };
}

function toInput(form: FormState): ResourceInput {
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  const isRoom = form.kind === 'rooms';
  return {
    name: form.name,
    categoryId: Number(form.categoryId),
    description: form.description,
    // Saving a deactivated resource from the form reactivates it.
    status: form.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE',
    maxConcurrentTeams: Number(form.maxConcurrentTeams),
    location: form.location,
    floor: number(form.floor),
    // Rooms are the resources with seats (see lib/catalog.ts).
    seats: isRoom ? (number(form.seats) ?? 0) : null,
    equipment: form.equipment,
    model: isRoom ? null : form.model,
    maxDurationMin: number(form.maxDurationMin),
    requiresTraining: form.requiresTraining,
    adminIds: form.adminIds,
  };
}

const durations = [
  {value: '', label: 'Fără limită'},
  ...[60, 90, 120, 180, 240, 360, 480].map((minutes) => ({
    value: String(minutes),
    label: minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? 'oră' : 'ore'}` : `${Math.floor(minutes / 60)} h 30 min`,
  })),
];

interface ResourceDialogProps {
  resource: Resource | null;
  onClose: () => void;
  onSaved: (resource: Resource, created: boolean) => void;
}

/** Figma "Adaugă / editează resursă". */
function ResourceDialog({resource, onClose, onSaved}: ResourceDialogProps) {
  const session = useSession();
  const categories = useCategories() ?? [];
  const admins = useAdmins();
  const [form, setForm] = useState(() => toForm(resource, session?.user.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({...current, [key]: value}));
  const isRoom = form.kind === 'rooms';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const input = toInput(form);
      const saved = resource ? await updateResource(resource.id, input) : await createResource(input);
      onSaved(saved, resource === null);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog
      wide
      title={resource ? 'Editează resursa' : 'Adaugă resursă'}
      icon={resource ? 'edit' : 'plus'}
      description={
        resource?.status === 'INACTIVE'
          ? 'Resursa este dezactivată; la salvare redevine activă și apare din nou în catalog.'
          : 'Resursa apare în catalog pentru studenți imediat după salvare.'
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button
            type="submit"
            form="resource-form"
            className={controls.primary}
            disabled={busy || !form.name.trim() || !form.categoryId}
          >
            {resource ? 'Salvează' : 'Adaugă resursa'}
          </button>
        </>
      }
    >
      <form
        id="resource-form"
        className={controls.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className={controls.field}>
          <span className={controls.label}>Nume *</span>
          <input
            className={controls.input}
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            maxLength={200}
            required
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Categorie *</span>
          <select
            className={controls.select}
            value={form.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
            required
          >
            <option value="" disabled>
              Alege categoria
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Tip</span>
          <select
            className={controls.select}
            value={form.kind}
            onChange={(event) => set('kind', event.target.value as FormState['kind'])}
          >
            <option value="rooms">Sală / laborator</option>
            <option value="equipment">Echipament</option>
          </select>
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Stare</span>
          <select
            className={controls.select}
            value={form.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE'}
            onChange={(event) => set('status', event.target.value as ResourceStatus)}
          >
            <option value="ACTIVE">Activă</option>
            <option value="MAINTENANCE">În mentenanță (nu se poate rezerva)</option>
          </select>
        </label>
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Descriere</span>
          <input
            className={controls.input}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder={isRoom ? 'De exemplu: Sală de seminar' : 'De exemplu: Imprimantă FDM cu dublu extruder'}
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Locație</span>
          <input
            className={controls.input}
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
            placeholder="De exemplu: C202"
            maxLength={200}
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Etaj</span>
          <input
            type="number"
            className={controls.input}
            value={form.floor}
            onChange={(event) => set('floor', event.target.value)}
            placeholder="0 = parter"
          />
        </label>
        {isRoom ? (
          <label className={controls.field}>
            <span className={controls.label}>Locuri</span>
            <input
              type="number"
              min={0}
              className={controls.input}
              value={form.seats}
              onChange={(event) => set('seats', event.target.value)}
            />
          </label>
        ) : (
          <label className={controls.field}>
            <span className={controls.label}>Model</span>
            <input
              className={controls.input}
              value={form.model}
              onChange={(event) => set('model', event.target.value)}
              maxLength={200}
            />
          </label>
        )}
        <label className={controls.field}>
          <span className={controls.label}>Echipare</span>
          <input
            className={controls.input}
            value={form.equipment}
            onChange={(event) => set('equipment', event.target.value)}
            placeholder="De exemplu: Videoproiector, tablă"
          />
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Echipe simultan</span>
          <select
            className={controls.select}
            value={form.maxConcurrentTeams}
            onChange={(event) => set('maxConcurrentTeams', event.target.value)}
          >
            <option value="1">1 echipă</option>
            <option value="2">2 echipe</option>
          </select>
        </label>
        <label className={controls.field}>
          <span className={controls.label}>Durată maximă a unei rezervări</span>
          <select
            className={controls.select}
            value={form.maxDurationMin}
            onChange={(event) => set('maxDurationMin', event.target.value)}
          >
            {durations.map(({value, label}) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${controls.checkbox} ${controls.wide}`}>
          <input
            type="checkbox"
            checked={form.requiresTraining}
            onChange={(event) => set('requiresTraining', event.target.checked)}
          />
          Necesită instruire înainte de prima utilizare
        </label>
        <fieldset className={`${controls.group} ${controls.wide}`}>
          <legend className={controls.label}>Administratori (aprobă cererile)</legend>
          {admins.map((admin) => (
            <label key={admin.id} className={controls.checkbox}>
              <input
                type="checkbox"
                checked={form.adminIds.includes(admin.id)}
                onChange={(event) =>
                  set(
                    'adminIds',
                    event.target.checked
                      ? [...form.adminIds, admin.id]
                      : form.adminIds.filter((id) => id !== admin.id),
                  )
                }
              />
              {admin.firstName} {admin.lastName} ({admin.email})
            </label>
          ))}
        </fieldset>
      </form>
      {form.adminIds.length === 0 && (
        <p className={controls.warning}>
          <Icon name="alert" />
          Fără administratori, nimeni nu va putea aproba cererile pentru această resursă.
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

interface DeactivateDialogProps {
  resource: Resource;
  onClose: () => void;
  onDone: () => void;
}

/** Figma "Dezactivează resursa" (DELETE /resources/{id} only deactivates). */
function DeactivateDialog({resource, onClose, onDone}: DeactivateDialogProps) {
  const upcoming = useUpcomingReservationCount(resource.id);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      title="Dezactivează resursa"
      icon="alert"
      tone="danger"
      description={`${resource.name} nu va mai apărea în catalog și nu va mai putea fi rezervată. O poți reactiva oricând din „Editează”.`}
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
                await deactivateResource(resource.id);
                onDone();
              } catch (caught) {
                setError(errorMessage(caught));
              }
            }}
          >
            Dezactivează
          </button>
        </>
      }
    >
      {upcoming > 0 && (
        <p className={controls.warning}>
          <Icon name="alert" />
          {upcoming === 1
            ? 'Există o rezervare viitoare (în așteptare sau aprobată). Rămâne în sistem;'
            : `Există ${upcoming} rezervări viitoare (în așteptare sau aprobate). Rămân în sistem;`}{' '}
          anunță solicitanții sau anulează-le din „Cereri primite”.
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

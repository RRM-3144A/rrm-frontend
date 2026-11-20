'use client';

import {useState} from 'react';

import controls from '@/components/controls.module.css';
import {Dialog} from '@/components/Dialog';
import {Icon} from '@/components/icons/Icon';
import list from '@/components/list.module.css';
import {PageHeader} from '@/components/PageHeader';
import {createCategory, deleteCategory, updateCategory, useCategories} from '@/lib/administration';
import {errorMessage} from '@/lib/errors';
import type {CategoryDetails} from '@/lib/types';

function formatCount(count: number): string {
  return count === 0 ? 'Nicio resursă' : count === 1 ? '1 resursă' : `${count} resurse`;
}

/** Figma "Admin / Categorii". */
export function CategoryAdmin() {
  const categories = useCategories();
  const [editing, setEditing] = useState<CategoryDetails | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<CategoryDetails | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Categorii"
        subtitle="Grupează resursele în categorii; studenții le folosesc ca filtru în catalog."
        aside={
          <button type="button" className={controls.primary} onClick={() => setEditing('new')}>
            <Icon name="plus" />
            Adaugă categorie
          </button>
        }
      />

      {feedback && (
        <p className={list.feedback} role="status">
          <Icon name="check" />
          {feedback}
        </p>
      )}

      {categories === undefined ? null : categories.length === 0 ? (
        <p className={`${list.list} ${list.empty}`}>Nu există încă nicio categorie.</p>
      ) : (
        <ul className={list.list}>
          {categories.map((category) => (
            <li key={category.id} className={list.row}>
              <span className={list.muted} aria-hidden>
                <Icon name="tag" />
              </span>
              <div className={list.text}>
                <p className={list.name}>{category.name}</p>
                <p className={list.subtitle}>{category.description ?? 'Fără descriere'}</p>
              </div>
              <p className={`${list.status} ${list.muted}`}>{formatCount(category.resourceCount)}</p>
              <div className={list.actions}>
                <button type="button" className={controls.secondary} onClick={() => setEditing(category)}>
                  Editează
                </button>
                <button
                  type="button"
                  className={controls.danger}
                  onClick={() => setToDelete(category)}
                  disabled={category.resourceCount > 0}
                  title={
                    category.resourceCount > 0
                      ? 'Categoria are resurse; mută-le întâi în altă categorie.'
                      : undefined
                  }
                >
                  Șterge
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name, created) => {
            setEditing(null);
            setFeedback(created ? `Categoria „${name}” a fost adăugată.` : `Categoria „${name}” a fost salvată.`);
          }}
        />
      )}
      {toDelete && (
        <DeleteDialog
          category={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setToDelete(null);
            setFeedback(`Categoria „${toDelete.name}” a fost ștearsă.`);
          }}
        />
      )}
    </>
  );
}

interface CategoryDialogProps {
  category: CategoryDetails | null;
  onClose: () => void;
  onSaved: (name: string, created: boolean) => void;
}

function CategoryDialog({category, onClose, onSaved}: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const input = {name, description: description || null};
      if (category) {
        await updateCategory(category.id, input);
      } else {
        await createCategory(input);
      }
      onSaved(name.trim(), category === null);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={category ? 'Editează categoria' : 'Adaugă categorie'}
      icon="tag"
      description={
        category && category.resourceCount > 0
          ? `Noul nume apare la toate cele ${category.resourceCount} resurse din categorie.`
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={onClose}>
            Renunță
          </button>
          <button type="submit" form="category-form" className={controls.primary} disabled={busy || !name.trim()}>
            {category ? 'Salvează' : 'Adaugă categoria'}
          </button>
        </>
      }
    >
      <form
        id="category-form"
        className={controls.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Nume *</span>
          <input
            className={controls.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
            autoFocus
          />
        </label>
        <label className={`${controls.field} ${controls.wide}`}>
          <span className={controls.label}>Descriere</span>
          <textarea
            className={controls.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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

interface DeleteDialogProps {
  category: CategoryDetails;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteDialog({category, onClose, onDeleted}: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      title="Ștergi categoria?"
      icon="trash"
      tone="danger"
      description={`„${category.name}” va fi ștearsă definitiv.`}
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
                await deleteCategory(category.id);
                onDeleted();
              } catch (caught) {
                setError(errorMessage(caught));
              }
            }}
          >
            Șterge categoria
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

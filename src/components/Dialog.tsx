'use client';

import {useEffect, useId, useRef} from 'react';
import type {ReactNode} from 'react';

import {Icon} from '@/components/icons/Icon';
import type {IconName} from '@/components/icons/Icon';

import styles from './Dialog.module.css';

interface DialogProps {
  title: string;
  /** Short text under the title. */
  description?: ReactNode;
  icon?: IconName;
  /** Colour of the icon badge: petrol by default, green for success, red for destructive actions. */
  tone?: 'default' | 'success' | 'danger';
  /** Buttons at the bottom right. */
  footer?: ReactNode;
  /** Wider panel for long forms (e.g. "Adaugă resursă"). */
  wide?: boolean;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * Modal popup from Figma ("Adaugă rezervare", "Detalii cerere", ...). Render it only
 * while it is open; Escape, the × button and a click outside call `onClose`.
 */
export function Dialog({
  title,
  description,
  icon,
  tone = 'default',
  footer,
  wide = false,
  onClose,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          {icon && (
            <span className={`${styles.badge} ${styles[tone]}`}>
              <Icon name={icon} />
            </span>
          )}
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Închide">
            <Icon name="close" />
          </button>
        </header>
        {children && <div className={styles.body}>{children}</div>}
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}

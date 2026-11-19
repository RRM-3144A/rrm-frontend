import Link from 'next/link';

import {Icon} from '@/components/icons/Icon';
import {PageHeader} from '@/components/PageHeader';

import styles from './AccessDenied.module.css';

/** Figma "Utilizator / 17 · Acces interzis (403)". */
export function AccessDenied() {
  return (
    <>
      <PageHeader
        title="Acces restricționat"
        subtitle="Această pagină aparține zonei de administrare."
      />
      <section className={styles.panel} role="alert">
        <span className={styles.icon}>
          <Icon name="alert" />
        </span>
        <h2 className={styles.heading}>Nu ai acces la această pagină</h2>
        <p className={styles.text}>
          Pagina este disponibilă doar administratorilor de resurse. Dacă ai nevoie de drepturi,
          contactează responsabilul laboratorului.
        </p>
        <Link href="/sali" className={styles.button}>
          Înapoi la catalog
        </Link>
      </section>
    </>
  );
}

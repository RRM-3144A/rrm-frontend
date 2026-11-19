import Link from 'next/link';

import {BackendStatus} from '@/components/BackendStatus';

import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Research Resource Manager</h1>
        <p className={styles.subtitle}>
          Rezervă săli și echipamente de cercetare pe intervale de 30 de minute.
        </p>
        <BackendStatus />
        {/* Until Google sign-in (E1-14) exists, these open each side of the app. */}
        <div className={styles.actions}>
          <Link href="/sali" className={styles.primary}>
            Continuă ca student
          </Link>
          <Link href="/admin/cereri" className={styles.secondary}>
            Continuă ca administrator
          </Link>
        </div>
      </section>
    </main>
  );
}

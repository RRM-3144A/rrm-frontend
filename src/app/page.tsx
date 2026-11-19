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
      </section>
    </main>
  );
}

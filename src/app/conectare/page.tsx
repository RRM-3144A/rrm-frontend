import type {Metadata} from 'next';

import {LoginCard} from '@/components/auth/LoginCard';
import {BackendStatus} from '@/components/BackendStatus';

import styles from './page.module.css';

export const metadata: Metadata = {title: 'Conectare · RRM'};

export default function ConectarePage() {
  return (
    <main className={styles.page}>
      <LoginCard />
      <footer className={styles.footer}>
        <BackendStatus />
      </footer>
    </main>
  );
}

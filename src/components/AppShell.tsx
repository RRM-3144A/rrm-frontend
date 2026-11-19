import type {ReactNode} from 'react';

import {Sidebar} from '@/components/Sidebar';
import type {Area} from '@/lib/navigation';

import styles from './AppShell.module.css';

/** Common page frame from Figma: sidebar on the left, content on the right. */
export function AppShell({area, children}: {area: Area; children: ReactNode}) {
  return (
    <div className={styles.shell}>
      <Sidebar area={area} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}

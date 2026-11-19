'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import type {ReactNode} from 'react';

import {AccessDenied} from '@/components/auth/AccessDenied';
import {Sidebar} from '@/components/Sidebar';
import type {Area} from '@/lib/navigation';
import {useSession} from '@/lib/session';

import styles from './AppShell.module.css';

/**
 * Common page frame from Figma: sidebar on the left, content on the right.
 *
 * It also guards the pages (E1-42): visitors who are not signed in go to the
 * sign-in page, and admin pages show "Acces restricționat" to non-admins.
 * The token lives in the browser, so this check runs on the client; the
 * backend still checks the role on every request.
 */
export function AppShell({area, children}: {area: Area; children: ReactNode}) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session === null) {
      router.replace('/conectare');
    }
  }, [session, router]);

  if (!session) {
    // Unknown yet, or on the way to the sign-in page.
    return null;
  }

  if (area === 'admin' && session.user.role !== 'ADMIN') {
    return (
      <div className={styles.shell}>
        <Sidebar area="student" />
        <main className={styles.content}>
          <AccessDenied />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Sidebar area={area} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}

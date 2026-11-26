'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import type {ReactNode} from 'react';

import {AccessDenied} from '@/components/auth/AccessDenied';
import {Sidebar} from '@/components/Sidebar';
import {fetchCurrentUser} from '@/lib/auth';
import {ApiError} from '@/lib/errors';
import type {Area} from '@/lib/navigation';
import {useSession} from '@/lib/session';

import styles from './AppShell.module.css';

/**
 * Common page frame from Figma: sidebar on the left, content on the right.
 *
 * It also guards the pages (E1-42) and validates active backend tokens through
 * the shared API client (E1-41) so 401 responses redirect to /conectare.
 */
export function AppShell({area, children}: {area: Area; children: ReactNode}) {
  const router = useRouter();
  const session = useSession();
  const token = session?.token;

  useEffect(() => {
    if (session === null) {
      router.replace('/conectare');
    }
  }, [session, router]);

  useEffect(() => {
    if (!token || token === 'demo') {
      return;
    }
    fetchCurrentUser().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/conectare');
      }
    });
  }, [token, router]);

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
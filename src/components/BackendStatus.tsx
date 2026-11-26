'use client';

import {useEffect, useState} from 'react';

import {apiClient} from '@/lib/api';
import {apiUrl} from '@/lib/config';

import styles from './BackendStatus.module.css';

type Status = 'checking' | 'ok' | 'down';

const labels: Record<Status, string> = {
  checking: 'Se verifică backend-ul…',
  ok: 'Backend conectat',
  down: 'Backend indisponibil',
};

/** Calls GET /health through the shared API client and shows whether the backend answers. */
export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<{status: string}>('/health', {signal: controller.signal, skipAuthRedirect: true})
      .then(() => setStatus('ok'))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setStatus('down');
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <p className={`${styles.status} ${styles[status]}`} role="status">
      <span className={styles.dot} aria-hidden />
      {labels[status]}
      <span className={styles.url}>{apiUrl}</span>
    </p>
  );
}
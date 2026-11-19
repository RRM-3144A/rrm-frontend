'use client';

import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {Icon} from '@/components/icons/Icon';
import {AuthError, allowedEmailDomain, homePathFor, signInWithGoogle} from '@/lib/auth';
import type {AuthErrorReason} from '@/lib/auth';
import {demoAccounts} from '@/lib/mock/accounts';
import type {DemoAccount} from '@/lib/mock/accounts';
import {readSession} from '@/lib/session';

import styles from './LoginCard.module.css';

const errorMessages: Record<AuthErrorReason, string> = {
  domain:
    'Contul ales nu aparține universității. ' +
    `Autentifică-te cu contul Google instituțional (@${allowedEmailDomain}).`,
  failed: 'Autentificarea nu a reușit. Încearcă din nou.',
};

/** Sign-in card from Figma ("Utilizator / 01 · Conectare" and "02 · cont neinstituțional"). */
export function LoginCard() {
  const router = useRouter();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: go straight to the right side of the app.
  useEffect(() => {
    const session = readSession();
    if (session) {
      router.replace(homePathFor(session.user.role));
    }
  }, [router]);

  async function chooseAccount(account: DemoAccount) {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogle(account);
      router.replace(homePathFor(user.role));
    } catch (exception) {
      setError(exception instanceof AuthError ? exception.reason : 'failed');
      setChooserOpen(false);
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <h1 className={styles.title}>Research Resource Manager</h1>
        <button
          type="button"
          className={styles.google}
          onClick={() => setChooserOpen(!chooserOpen)}
          aria-expanded={chooserOpen}
          disabled={busy}
        >
          <Image src="/google.svg" alt="" width={18} height={18} />
          Continuă cu Google
        </button>

        {chooserOpen && (
          <div className={styles.chooser}>
            <p className={styles.chooserNote}>Mod demonstrativ: alege contul Google</p>
            <ul className={styles.accounts}>
              {demoAccounts.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    className={styles.account}
                    onClick={() => chooseAccount(account)}
                    disabled={busy}
                  >
                    <span className={styles.accountName}>
                      {account.firstName} {account.lastName} · {account.label}
                    </span>
                    <span className={styles.accountEmail}>{account.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {error && (
        <div className={styles.error} role="alert">
          <Icon name="alert" />
          <p>{errorMessages[error]}</p>
        </div>
      )}
    </div>
  );
}

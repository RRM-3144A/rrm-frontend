'use client';

import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';

import {Icon} from '@/components/icons/Icon';
import {
  AuthError,
  allowedEmailDomain,
  demoLoginEnabled,
  googleClientId,
  homePathFor,
  signInWithGoogle,
  signInWithGoogleToken,
} from '@/lib/auth';
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

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        hd?: string;
        ux_mode?: 'popup' | 'redirect';
        auto_select?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const gisSrc = 'https://accounts.google.com/gsi/client';

/** Loads the Google Identity Services script once. */
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${gisSrc}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = gisSrc;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () =>
      window.google ? resolve(window.google) : reject(new Error('GIS unavailable')),
    );
    script.addEventListener('error', () => reject(new Error('GIS failed to load')));
  });
}

interface GoogleButtonProps {
  onCredential: (idToken: string) => void;
  onUnavailable: () => void;
}

/** Google's own "Continuă cu Google" button (Google Identity Services, ID token in a popup). */
function GoogleButton({onCredential, onUnavailable}: GoogleButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  });

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !container.current) {
          return;
        }
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => callback.current(response.credential),
          hd: allowedEmailDomain,
          ux_mode: 'popup',
          auto_select: false,
        });
        google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          locale: 'ro',
          width: 300,
        });
      })
      .catch(() => {
        if (!cancelled) {
          onUnavailable();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  return <div ref={container} className={styles.googleSlot} />;
}

/** Sign-in card from Figma ("Utilizator / 01 · Conectare" and "02 · cont neinstituțional"). */
export function LoginCard() {
  const router = useRouter();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [busy, setBusy] = useState(false);
  const onGoogleUnavailable = useCallback(() => setError('failed'), []);

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

  async function signInWithToken(idToken: string) {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogleToken(idToken);
      router.replace(homePathFor(user.role));
    } catch (exception) {
      setError(exception instanceof AuthError ? exception.reason : 'failed');
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <h1 className={styles.title}>Research Resource Manager</h1>
        {googleClientId ? (
          <>
            <GoogleButton onCredential={signInWithToken} onUnavailable={onGoogleUnavailable} />
            {busy && <p className={styles.chooserNote}>Se verifică contul…</p>}
            {demoLoginEnabled && (
              <div className={styles.chooser}>
                <p className={styles.divider}>sau intră cu un cont de test</p>
                <div className={styles.testAccounts}>
                  {demoAccounts
                    .filter((account) => account.role !== null)
                    .map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        className={styles.testAccount}
                        onClick={() => chooseAccount(account)}
                        disabled={busy}
                        title={account.email}
                      >
                        {account.label} test
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
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

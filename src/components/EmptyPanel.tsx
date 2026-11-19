import type {ReactNode} from 'react';

import styles from './EmptyPanel.module.css';

/** Frosted-glass panel ("RRM/Sticlă") with a short message, for pages still in progress. */
export function EmptyPanel({children}: {children: ReactNode}) {
  return <section className={styles.panel}>{children}</section>;
}

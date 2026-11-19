import type {ReactNode} from 'react';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Shown on the right, e.g. "5 săli" or an action button. */
  aside?: ReactNode;
}

/** Page title block from Figma ("Antet"). */
export function PageHeader({title, subtitle, aside}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </header>
  );
}

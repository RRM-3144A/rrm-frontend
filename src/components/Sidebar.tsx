'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

import {Icon} from '@/components/icons/Icon';
import {accountMenu, mainMenu, signOutItem} from '@/lib/navigation';
import type {Area, NavItem} from '@/lib/navigation';

import styles from './Sidebar.module.css';

function NavLink({item, active}: {item: NavItem; active: boolean}) {
  return (
    <Link
      href={item.href}
      className={active ? `${styles.item} ${styles.active}` : styles.item}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
}

/** Side menu from Figma ("Sidebar"); the items depend on the area. */
export function Sidebar({area}: {area: Area}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}>
        Research
        <br />
        Resource Manager
      </Link>
      <nav className={styles.menu} aria-label="Meniu principal">
        {mainMenu[area].map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
      <nav className={styles.account} aria-label="Cont">
        {accountMenu[area].map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <NavLink item={signOutItem} active={false} />
      </nav>
    </aside>
  );
}

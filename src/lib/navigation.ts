import type {IconName} from '@/components/icons/Icon';

/** Which side of the app a page belongs to; decides the sidebar menu. */
export type Area = 'student' | 'admin';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Menus from the Figma sidebars (pages UTILIZATOR and ADMIN). */
export const mainMenu: Record<Area, NavItem[]> = {
  student: [
    {label: 'Săli', href: '/sali', icon: 'room'},
    {label: 'Echipamente', href: '/echipamente', icon: 'chip'},
    {label: 'Rezervări', href: '/rezervari', icon: 'calendar'},
    {label: 'Listă de așteptare', href: '/lista-asteptare', icon: 'list'},
  ],
  admin: [
    {label: 'Cereri primite', href: '/admin/cereri', icon: 'list'},
    {label: 'Resurse', href: '/admin/resurse', icon: 'chip'},
    {label: 'Categorii', href: '/admin/categorii', icon: 'tag'},
    {label: 'Calendar și mentenanță', href: '/admin/calendar', icon: 'calendar'},
    {label: 'Program de funcționare', href: '/admin/program', icon: 'clock'},
    {label: 'Utilizare pe echipe', href: '/admin/utilizare', icon: 'chart'},
  ],
};

export const accountMenu: Record<Area, NavItem[]> = {
  student: [{label: 'Profil', href: '/profil', icon: 'user'}],
  admin: [{label: 'Profil administrator', href: '/admin/profil', icon: 'user'}],
};

/** Sign-out clears the session and returns to the sign-in page. */
export const signOutItem: NavItem = {label: 'Deconectare', href: '/conectare', icon: 'logout'};

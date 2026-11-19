import type {ReactNode} from 'react';

import {AppShell} from '@/components/AppShell';

export default function StudentLayout({children}: {children: ReactNode}) {
  return <AppShell area="student">{children}</AppShell>;
}

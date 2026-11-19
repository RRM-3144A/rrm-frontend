import type {Metadata} from 'next';
import {IBM_Plex_Sans} from 'next/font/google';
import type {ReactNode} from 'react';

import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
});

export const metadata: Metadata = {
  title: 'Research Resource Manager',
  description: 'Rezervarea sălilor și echipamentelor de cercetare – USV',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ro" className={plexSans.variable}>
      <body>{children}</body>
    </html>
  );
}

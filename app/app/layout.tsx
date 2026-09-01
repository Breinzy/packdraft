import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Packdraft — Competitive TCG Market Game',
  description:
    'Compete with virtual money using real Pokémon TCG market prices. Tournaments, temporary portfolios, and leaderboards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plex.variable} ${newsreader.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh relative overflow-x-hidden bg-background font-sans text-foreground">
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(1200px 500px at 8% -10%, rgba(228,87,46,0.07), transparent 55%), radial-gradient(900px 420px at 100% 110%, rgba(201,178,122,0.04), transparent 50%)',
          }}
        />
        <div className="grain" aria-hidden />
        <div className="relative z-10 min-h-dvh flex flex-col">{children}</div>
      </body>
    </html>
  );
}

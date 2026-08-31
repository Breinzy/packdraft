import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-dvh relative overflow-x-hidden">
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(110,155,207,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(110,155,207,0.03) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 min-h-dvh flex flex-col">{children}</div>
      </body>
    </html>
  );
}

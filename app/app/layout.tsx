import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Packdraft — Fantasy Pokemon TCG Trading',
  description:
    'Fantasy trading game for Pokemon TCG sealed products. Draft a portfolio, compete in leagues, win the week.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen relative overflow-hidden">
        {/* Ambient gradients */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(251,191,36,0.06) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}

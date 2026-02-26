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
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(110,155,207,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(110,155,207,0.03) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}

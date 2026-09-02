import Link from 'next/link';
import Header from '@/components/layout/Header';

const STEPS = [
  {
    title: 'Join a tournament',
    body: 'Every player gets the same virtual budget. Books do not carry over.',
  },
  {
    title: 'Trade the catalog',
    body: 'Buy and sell Pokémon against Packdraft prices. Nothing here moves the real market.',
  },
  {
    title: 'Finish on the board',
    body: 'Trading closes, values lock, and rank is final.',
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="page py-6 md:py-10">
        <div className="max-w-xl">
          <h1 className="page-title text-3xl md:text-4xl">Highest book wins.</h1>
          <p className="mt-3 text-[15px] text-muted leading-6">
            Join a tournament, spend a fixed virtual budget, and trade Pokémon using live Packdraft
            prices.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/tournaments" className="btn btn-primary min-h-12 px-5">
              Enter a tournament
            </Link>
            <Link href="/assets" className="btn btn-ghost min-h-12 px-5">
              Browse the market
            </Link>
          </div>
        </div>

        <ol className="mt-10 md:mt-12 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel p-4 md:p-5">
              <div className="num text-xs text-accent-light mb-2">{i + 1}</div>
              <div className="section-title mb-1.5">{step.title}</div>
              <p className="text-sm text-muted leading-5">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-xs text-faint">No real money. Simulated portfolios only.</p>
      </main>
    </>
  );
}

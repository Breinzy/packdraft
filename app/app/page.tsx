import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 page py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="flash max-w-xl">
            <p className="kicker mb-5">Virtual book · Real TCG prices</p>
            <h1 className="page-title text-5xl md:text-7xl">
              Trade the market.
              <span className="block italic text-muted">Beat the room.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted leading-relaxed max-w-md">
              Join a tournament, spend a fixed virtual budget, and finish with the highest Pokémon
              portfolio. Nothing here moves the real market.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/tournaments" className="btn btn-primary min-h-12 px-8 text-base">
                Enter a tournament
              </Link>
              <Link href="/assets" className="btn btn-ghost min-h-12 px-8 text-base">
                Browse the market
              </Link>
            </div>
          </div>

          <aside className="panel p-6 md:p-8 space-y-5 max-w-md lg:ml-auto w-full">
            <div className="kicker">How a book works</div>
            <ol className="space-y-4 text-sm text-muted">
              <li className="flex gap-3">
                <span className="num text-accent w-5">01</span>
                Fixed cash. Isolated from every other tournament.
              </li>
              <li className="flex gap-3">
                <span className="num text-accent w-5">02</span>
                Buy and sell against live Packdraft prices.
              </li>
              <li className="flex gap-3">
                <span className="num text-accent w-5">03</span>
                Rank locks when trading closes. History stays.
              </li>
            </ol>
            <p className="text-xs text-faint pt-2 border-t border-border">No real money. Simulated portfolios only.</p>
          </aside>
        </div>
      </main>
    </>
  );
}

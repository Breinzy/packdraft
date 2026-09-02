import Link from 'next/link';
import Header from '@/components/layout/Header';
import StatusBadge from '@/components/tournament/StatusBadge';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { listTournaments } from '@/lib/tournament/queries';
import { listMarketEvents } from '@/lib/events/queries';
import { formatCountdown, formatCurrency } from '@/lib/utils';
import type { MarketEvent, Tournament } from '@/types';

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

export default async function HomePage() {
  const supabase = await tryCreateServerClient();
  let tournaments: Tournament[] = [];
  let events: MarketEvent[] = [];
  if (supabase) {
    try {
      tournaments = await listTournaments(supabase);
    } catch {
      tournaments = [];
    }
    try {
      events = await listMarketEvents(supabase);
    } catch {
      events = [];
    }
  }
  const live = tournaments.filter((t) => t.status === 'upcoming' || t.status === 'active');
  const shown = (live.length > 0 ? live : tournaments).slice(0, 3);
  const liveEvents = events.filter((e) => e.status === 'upcoming' || e.status === 'open');
  const shownEvents = (liveEvents.length > 0 ? liveEvents : events).slice(0, 3);

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
            <Link href="/events" className="btn btn-ghost min-h-12 px-5">
              Predict an event
            </Link>
          </div>
        </div>

        <ol className="mt-12 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel p-5">
              <div className="num text-xs text-accent-light mb-3">{i + 1}</div>
              <div className="section-title mb-2">{step.title}</div>
              <p className="text-sm text-muted leading-5">{step.body}</p>
            </li>
          ))}
        </ol>

        {shown.length > 0 ? (
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="section-title">Tournaments</h2>
              <Link
                href="/tournaments"
                className="text-sm text-accent-light min-h-11 inline-flex items-center"
              >
                All
              </Link>
            </div>
            <ul className="space-y-2">
              {shown.map((t) => (
                <li key={t.id}>
                  <Link href={`/tournaments/${t.id}`} className="block panel panel-hover px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground truncate">{t.name}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>Budget {formatCurrency(t.starting_budget)}</span>
                      {t.status === 'upcoming' ? <span>Starts {formatCountdown(t.starts_at)}</span> : null}
                      {t.status === 'active' ? <span>Closes {formatCountdown(t.trading_closes_at)}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {shownEvents.length > 0 ? (
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="section-title">Events</h2>
              <Link
                href="/events"
                className="text-sm text-accent-light min-h-11 inline-flex items-center"
              >
                All
              </Link>
            </div>
            <ul className="space-y-2">
              {shownEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`} className="block panel panel-hover px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground truncate">{event.name}</span>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {event.status === 'upcoming' ? <span>Opens {formatCountdown(event.opens_at)}</span> : null}
                      {event.status === 'open' ? <span>Locks {formatCountdown(event.locks_at)}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-xs text-faint">No real money. Simulated portfolios only.</p>
      </main>
    </>
  );
}

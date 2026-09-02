import Link from 'next/link';
import Header from '@/components/layout/Header';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import TournamentCard from '@/components/tournament/TournamentCard';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { listTournaments } from '@/lib/tournament/queries';
import { listMarketEvents } from '@/lib/events/queries';
import { formatCountdown } from '@/lib/utils';
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
      <main className="page page-main py-10 md:py-16">
        <div className="max-w-2xl">
          <p className="label-caps">Competitive TCG markets</p>
          <h1 className="page-title mt-3 text-4xl md:text-5xl">Highest book wins.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted">
            Join a tournament, spend a fixed virtual budget, and trade Pokémon using live Packdraft
            prices.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/tournaments" className="btn btn-primary min-h-12 px-5">
              Enter a tournament
            </Link>
            <Link href="/events" className="btn btn-ghost min-h-12 px-5">
              Predict an event
            </Link>
            <Link href="/releases" className="btn btn-ghost min-h-12 px-5">
              Release weekends
            </Link>
          </div>
        </div>

        <ol className="mt-14 card-grid sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel">
              <div className="num mb-3 text-xs font-semibold text-accent-light">{String(i + 1).padStart(2, '0')}</div>
              <div className="section-title mb-2">{step.title}</div>
              <p className="text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        {shown.length > 0 ? (
          <section className="mt-12 stack">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Tournaments</h2>
              <Link
                href="/tournaments"
                className="link-quiet inline-flex min-h-11 items-center"
              >
                All
              </Link>
            </div>
            <ul className="stack">
              {shown.map((t) => (
                <li key={t.id}>
                  <TournamentCard tournament={t} href={`/tournaments/${t.id}`} compact />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {shownEvents.length > 0 ? (
          <section className="mt-12 stack">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Events</h2>
              <Link
                href="/events"
                className="link-quiet inline-flex min-h-11 items-center"
              >
                All
              </Link>
            </div>
            <ul className="stack">
              {shownEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`} className="panel panel-hover block">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold text-foreground">{event.name}</span>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {event.status === 'upcoming' ? <span>Opens {formatCountdown(event.opens_at)}</span> : null}
                      {event.status === 'open' ? <span>Locks {formatCountdown(event.locks_at)}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 text-xs text-faint">No real money. Simulated portfolios only.</p>
      </main>
    </>
  );
}

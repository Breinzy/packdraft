import Link from 'next/link';
import Header from '@/components/layout/Header';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import TournamentCard from '@/components/tournament/TournamentCard';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { listTournaments } from '@/lib/tournament/queries';
import { listMarketEvents } from '@/lib/events/queries';
import { formatCountdown } from '@/lib/utils';
import type { MarketEvent, Tournament } from '@/types';
import { MARKET_PATH, PREDICTIONS_PATH, TOURNAMENTS_PATH } from '@/lib/product/paths';

const STEPS = [
  {
    title: 'Track what you own',
    body: 'A free Pokémon collection ledger with live Packdraft marks — quantity, cost basis, and value.',
  },
  {
    title: 'Read the market',
    body: 'Browse cards, sealed, and sets using stored prices. Nothing you do here moves the real TCG market.',
  },
  {
    title: 'Compete when you want',
    body: 'Tournaments, predictions, and a virtual sandbox sit on top of the tracker. They are the differentiator, not the whole product.',
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
      <main className="page py-8 md:py-14">
        <div className="max-w-2xl">
          <p className="label-caps">Pokémon TCG portfolio</p>
          <h1 className="page-title mt-3 text-4xl md:text-5xl">Know what your cards are worth.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted">
            Packdraft is a Pokémon collection tracker with live market data. Tournaments and
            predictions turn that market into a game — they do not replace the tracker.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/signup" className="btn btn-primary min-h-12 px-5">
              Start tracking
            </Link>
            <Link href={MARKET_PATH} className="btn btn-ghost min-h-12 px-5">
              Browse the market
            </Link>
            <Link href={TOURNAMENTS_PATH} className="btn btn-ghost min-h-12 px-5">
              Tournaments
            </Link>
          </div>
        </div>

        <ol className="mt-14 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel p-5">
              <div className="num mb-3 text-xs font-semibold text-accent-light">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="section-title mb-2">{step.title}</div>
              <p className="text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        {shown.length > 0 ? (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-title">Tournaments</h2>
              <Link href={TOURNAMENTS_PATH} className="link-quiet inline-flex min-h-11 items-center">
                All
              </Link>
            </div>
            <ul className="space-y-3">
              {shown.map((t) => (
                <li key={t.id}>
                  <TournamentCard tournament={t} href={`/tournaments/${t.id}`} compact />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {shownEvents.length > 0 ? (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-title">Predictions</h2>
              <Link href={PREDICTIONS_PATH} className="link-quiet inline-flex min-h-11 items-center">
                All
              </Link>
            </div>
            <ul className="space-y-3">
              {shownEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`} className="panel panel-hover block p-4 md:p-5">
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

        <p className="mt-10 text-xs text-faint">
          No real-money trading. Collection tracking is bookkeeping against market data. Tournament
          and Sandbox cash is simulated.
        </p>
      </main>
    </>
  );
}

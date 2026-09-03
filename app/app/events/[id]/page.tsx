import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import EventTicket from '@/components/events/EventTicket';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import {
  getEventResults,
  getMarketEvent,
  getMarketEventAssets,
  getOwnEventEntry,
} from '@/lib/events/queries';
import { tickMarketEvents } from '@/lib/events/tick';
import { canEnterStatus, MARKET_EVENT_STATUS_HELP } from '@/lib/events/lifecycle';
import { formatCountdown, formatCurrency, formatPct } from '@/lib/utils';
import { MARKET_EVENT_TYPE_LABELS } from '@/types';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { pctChange } from '@/lib/events/scoring';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Event</h1>
          <NeedsDatabase feature="This event" />
        </main>
      </AppShell>
    );
  }

  const service = tryCreateServiceClient();
  if (service) {
    try {
      await tickMarketEvents(service);
    } catch {
      // continue with stored rows
    }
  }

  let event;
  try {
    event = await getMarketEvent(supabase, id);
  } catch {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Event</h1>
          <QueryFailed feature="this event" />
        </main>
      </AppShell>
    );
  }
  if (!event) notFound();

  const assets = await getMarketEventAssets(supabase, id);
  const results = event.status === 'completed' ? await getEventResults(supabase, id) : [];

  let userId: string | null = null;
  let ownPayload: Record<string, unknown> | null = null;
  try {
    const auth = await supabase.auth.getUser();
    userId = auth.data.user?.id ?? null;
    if (userId) {
      const entry = await getOwnEventEntry(supabase, id, userId);
      ownPayload = entry?.payload && typeof entry.payload === 'object' ? (entry.payload as Record<string, unknown>) : null;
    }
  } catch {
    userId = null;
  }

  const myResult = userId ? results.find((row) => row.user_id === userId) : null;

  return (
    <AppShell nav="play">
      <main className="page page-main stack">
        <Link href="/events" className="text-sm text-accent-light min-h-11 inline-flex items-center">
          ← Events
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl">{event.name}</h1>
            <p className="text-sm text-muted mt-1.5">
              {MARKET_EVENT_TYPE_LABELS[event.type]}. No Career or tournament cash is used.
            </p>
          </div>
          <EventStatusBadge status={event.status} />
        </div>

        <p className="text-sm text-muted">{MARKET_EVENT_STATUS_HELP[event.status]}</p>
        {event.description ? <p className="text-sm text-muted">{event.description}</p> : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {event.status === 'upcoming' ? <span>Opens {formatCountdown(event.opens_at)}</span> : null}
          {event.status === 'open' ? <span>Locks {formatCountdown(event.locks_at)}</span> : null}
          {event.status === 'locked' || event.status === 'settling' ? (
            <span>Settles {formatCountdown(event.settles_at)}</span>
          ) : null}
        </div>

        {myResult ? (
          <div className="panel panel-row">
            <div className="kicker mb-1">Your finish</div>
            <div className="num text-lg font-medium">
              #{myResult.rank} · {myResult.score.toFixed(2)} pts
            </div>
          </div>
        ) : null}

        <section className="stack">
          <h2 className="section-title">Assets</h2>
          <ul className="stack">
            {assets.map((row) => {
              const change = pctChange(row.start_price, row.end_price);
              return (
                <li key={row.asset_id} className="panel panel-row">
                  <Link href={`/assets/${row.asset_id}`} className="text-sm font-medium text-foreground">
                    {row.asset?.name ?? row.asset_id}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {row.start_price != null ? <span>Start {formatCurrency(row.start_price)}</span> : <span>Start pending</span>}
                    {row.end_price != null ? <span>End {formatCurrency(row.end_price)}</span> : null}
                    {change != null ? <span>{formatPct(change)}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {canEnterStatus(event.status) || ownPayload ? (
          <EventTicket
            eventId={event.id}
            type={event.type}
            assets={assets}
            existing={ownPayload}
            open={canEnterStatus(event.status)}
          />
        ) : null}

        {event.status === 'completed' ? (
          <section className="stack">
            <h2 className="section-title">Results</h2>
            {results.length === 0 ? (
              <p className="text-sm text-muted">No entries.</p>
            ) : (
              <ol className="stack">
                {results.map((row) => (
                  <li key={row.user_id} className="panel panel-row flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex items-baseline gap-3">
                      <span className="num text-sm text-gold font-medium w-8 shrink-0">#{row.rank}</span>
                      <Link href={`/players/${row.user_id}`} className="text-sm font-medium truncate">
                        {row.display_name}
                      </Link>
                    </div>
                    <span className="num text-sm shrink-0">{row.score.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

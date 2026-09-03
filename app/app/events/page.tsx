import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { listMarketEvents } from '@/lib/events/queries';
import { tickMarketEvents } from '@/lib/events/tick';
import { formatCountdown } from '@/lib/utils';
import { MARKET_EVENT_STATUS_HELP } from '@/lib/events/lifecycle';
import { MARKET_EVENT_TYPE_LABELS } from '@/types';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Events</h1>
          <NeedsDatabase feature="Market Events" />
        </main>
      </AppShell>
    );
  }

  const service = tryCreateServiceClient();
  if (service) {
    try {
      await tickMarketEvents(service);
    } catch {
      // Show stored rows if tick cannot run yet (migration not applied).
    }
  }

  let events;
  try {
    events = await listMarketEvents(supabase);
  } catch {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Events</h1>
          <QueryFailed feature="Market Events" />
          <p className="text-sm text-muted">
            If Career Mode already works, apply{' '}
            <code className="text-foreground">20260902150000_phase14_market_events.sql</code> (and
            the Phase 15 settlement migration it depends on).
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="play">
      <main className="page page-main stack">
        <div className="flex flex-wrap gap-x-4">
          <Link href="/releases" className="inline-flex min-h-11 items-center text-sm text-accent-light">
            Release weekends
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="panel text-sm text-muted">
            No events yet. An admin can create one from /admin.
          </div>
        ) : (
          <ul className="stack">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="block panel panel-hover">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-medium text-foreground">{event.name}</h2>
                    <EventStatusBadge status={event.status} />
                  </div>
                  <p className="text-sm text-muted mt-2">{MARKET_EVENT_STATUS_HELP[event.status]}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{MARKET_EVENT_TYPE_LABELS[event.type]}</span>
                    {event.status === 'upcoming' ? <span>Opens {formatCountdown(event.opens_at)}</span> : null}
                    {event.status === 'open' ? <span>Locks {formatCountdown(event.locks_at)}</span> : null}
                    {event.status === 'locked' ? <span>Settles {formatCountdown(event.settles_at)}</span> : null}
                    {event.status === 'completed' ? <span>Settled</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}

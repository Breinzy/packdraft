import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { tickTournaments } from '@/lib/tournament/queries';
import { tickMarketEvents } from '@/lib/events/tick';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  try {
    const tournaments = await tickTournaments(service);
    let events: unknown = null;
    try {
      events = await tickMarketEvents(service);
    } catch (err) {
      events = { error: err instanceof Error ? err.message : 'Unknown error' };
    }
    return NextResponse.json({ ok: true, result: { tournaments, events } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

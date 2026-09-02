import { NextResponse } from 'next/server';
import { requireUser, rpcErrorMessage, rpcErrorStatus } from '@/lib/auth/require-user';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { EventEntryError, parseEventPayload, payloadToJson } from '@/lib/events/scoring';
import { getMarketEvent, getMarketEventAssets } from '@/lib/events/queries';
import { canEnterStatus } from '@/lib/events/lifecycle';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }

  try {
    const event = await getMarketEvent(service, eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!canEnterStatus(event.status)) {
      return NextResponse.json({ error: 'Event is not open for entries' }, { status: 409 });
    }

    const assets = await getMarketEventAssets(service, eventId);
    const payload = parseEventPayload(
      event.type,
      body,
      assets.map((row) => row.asset_id)
    );

    const { data, error } = await service.rpc('submit_market_event_entry', {
      p_user_id: auth.user.id,
      p_event_id: eventId,
      p_payload: payloadToJson(payload),
    });

    if (error) {
      const message = rpcErrorMessage(error);
      return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
    }

    return NextResponse.json({ ok: true, ...((data as object) ?? {}) });
  } catch (err) {
    const message = err instanceof EventEntryError ? err.message : rpcErrorMessage(err);
    const status = err instanceof EventEntryError ? 400 : rpcErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { tickTournaments } from '@/lib/tournament/queries';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  try {
    const result = await tickTournaments(service);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

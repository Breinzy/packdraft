import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createNextContest, tickContestStatuses } from '@/lib/contest/scheduler';
import { syncPrices } from '@/lib/pricing/sync';

export const maxDuration = 300;

/**
 * Admin proxy — user-auth gated, calls internal functions with service role.
 * Actions: tick | create-contest | sync-prices | import-products
 */
export async function POST(request: Request) {
  const supabaseUser = await createServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { action } = await request.json() as { action: string };

  try {
    if (action === 'tick') {
      const transitions = await tickContestStatuses(supabase);
      return NextResponse.json({ ok: true, transitions });
    }

    if (action === 'create-contest') {
      const transitions = await tickContestStatuses(supabase);
      const result = await createNextContest(supabase);
      return NextResponse.json({ ok: true, ...result, transitions });
    }

    if (action === 'sync-prices') {
      const result = await syncPrices(supabase);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'import-products') {
      // Fire-and-forget via internal fetch (import is too long to await here)
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      fetch(
        `${baseUrl}/api/admin/import-products?maxCards=1000&creditBudget=5000`,
        { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }
      ).catch(() => {});
      return NextResponse.json({ ok: true, message: 'Import started — check Vercel logs for progress' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

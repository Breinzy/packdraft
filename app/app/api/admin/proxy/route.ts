import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { syncMarketPrices } from '@/lib/market/sync';
import { getCronSecret } from '@/lib/env';

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabaseUser = await createServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { action } = (await request.json()) as { action: string };

  try {
    if (action === 'sync-prices') {
      const result = await syncMarketPrices(supabase);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'import-assets') {
      const secret = getCronSecret();
      if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
      }
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      fetch(`${baseUrl}/api/admin/import-assets?maxCards=1000&creditBudget=5000`, {
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => {});
      return NextResponse.json({ ok: true, message: 'Import started — check server logs for progress' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

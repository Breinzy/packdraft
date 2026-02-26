import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncPrices } from '@/lib/pricing/sync';

/**
 * Manual price sync trigger.
 * POST /api/sync-prices
 * 
 * In production, replace with Supabase cron or edge function.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncPrices(supabase);

  return NextResponse.json(result);
}

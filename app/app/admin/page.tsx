import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import AdminPanel from './AdminPanel';
import { listTournaments } from '@/lib/tournament/queries';
import { listMarketEvents } from '@/lib/events/queries';
import { getJobState, type MarketJobState } from '@/lib/market/job-state';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  if (!isAdminEmail(user.email)) redirect('/dashboard');

  const { count: assetCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  const { count: sealedCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .eq('asset_type', 'sealed');

  const { count: singlesCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .eq('asset_type', 'single');

  const { count: gradedCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .eq('asset_type', 'graded');

  const { data: lastSync } = await supabase
    .from('price_snapshots')
    .select('recorded_at')
    .not('asset_id', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: staleHint } = await supabase
    .from('price_snapshots')
    .select('*', { count: 'exact', head: true })
    .not('asset_id', 'is', null);

  const tournaments = await listTournaments(supabase);
  let events: import('@/types').MarketEvent[] = [];
  try {
    events = await listMarketEvents(supabase);
  } catch {
    events = [];
  }

  let importJob: MarketJobState | null = null;
  try {
    importJob = await getJobState(supabase, 'catalog_import');
  } catch {
    importJob = null;
  }

  return (
    <AdminPanel
      stats={{
        totalAssets: assetCount ?? 0,
        sealedCount: sealedCount ?? 0,
        singlesCount: singlesCount ?? 0,
        gradedCount: gradedCount ?? 0,
        snapshotCount: staleHint ?? 0,
        lastSync: lastSync?.recorded_at ?? null,
      }}
      importJob={importJob}
      tournaments={tournaments}
      events={events}
    />
  );
}

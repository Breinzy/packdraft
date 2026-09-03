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
  let historyJob: MarketJobState | null = null;
  try {
    importJob = await getJobState(supabase, 'catalog_import');
  } catch {
    importJob = null;
  }
  try {
    historyJob = await getJobState(supabase, 'history_backfill');
  } catch {
    historyJob = null;
  }

  let volumeLeaders: {
    assetId: string;
    name: string;
    assetType: string;
    volume7d: number;
    volume30d: number;
    volume180d: number;
    dailyTier: string;
    alwaysDaily: boolean;
  }[] = [];
  let alwaysDailyCount = 0;
  let highVolumeCount = 0;
  try {
    const { data: volumeRows } = await supabase
      .from('asset_market_stats')
      .select('asset_id, volume_7d, volume_30d, volume_180d, daily_tier, always_daily, assets(name, asset_type)')
      .order('volume_30d', { ascending: false })
      .limit(25);

    const always = await supabase
      .from('asset_market_stats')
      .select('*', { count: 'exact', head: true })
      .eq('always_daily', true);
    const high = await supabase
      .from('asset_market_stats')
      .select('*', { count: 'exact', head: true })
      .eq('daily_tier', 'high');
    alwaysDailyCount = always.count ?? 0;
    highVolumeCount = high.count ?? 0;
    volumeLeaders = (volumeRows ?? []).map((row) => {
      const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
      return {
        assetId: row.asset_id as string,
        name: (asset as { name?: string } | null)?.name ?? 'Unknown',
        assetType: (asset as { asset_type?: string } | null)?.asset_type ?? '',
        volume7d: Number(row.volume_7d ?? 0),
        volume30d: Number(row.volume_30d ?? 0),
        volume180d: Number(row.volume_180d ?? 0),
        dailyTier: String(row.daily_tier ?? 'skip'),
        alwaysDaily: Boolean(row.always_daily),
      };
    });
  } catch {
    volumeLeaders = [];
  }

  const { data: setRows } = await supabase.from('sets').select('id, name').order('name').limit(80);
  const sets = (setRows ?? []).map((row) => ({ id: row.id as string, name: row.name as string }));

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
      historyJob={historyJob}
      volumeLeaders={volumeLeaders}
      alwaysDailyCount={alwaysDailyCount ?? 0}
      highVolumeCount={highVolumeCount ?? 0}
      tournaments={tournaments}
      events={events}
      sets={sets}
    />
  );
}

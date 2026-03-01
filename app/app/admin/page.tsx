import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Current contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Product counts
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: sealedCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('category', 'sealed');

  const { count: gradedCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('category', 'graded');

  // Last price sync
  const { data: lastSync } = await supabase
    .from('price_snapshots')
    .select('recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  // League count for current contest
  const { count: leagueCount } = contest
    ? await supabase
        .from('leagues')
        .select('*', { count: 'exact', head: true })
        .eq('contest_id', contest.id)
    : { count: 0 };

  const { count: portfolioCount } = contest
    ? await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('contest_id', contest.id)
    : { count: 0 };

  return (
    <AdminPanel
      contest={contest}
      stats={{
        totalProducts: totalProducts ?? 0,
        sealedCount: sealedCount ?? 0,
        gradedCount: gradedCount ?? 0,
        leagueCount: leagueCount ?? 0,
        portfolioCount: portfolioCount ?? 0,
        lastSync: lastSync?.recorded_at ?? null,
      }}
    />
  );
}

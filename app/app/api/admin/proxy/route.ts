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
  const body = (await request.json()) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

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
      fetch(`${baseUrl}/api/admin/import-assets`, {
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => {});
      return NextResponse.json({
        ok: true,
        message: 'Catalog import chunk started. It resumes from the saved cursor and stops at Vercel / PPT limits.',
      });
    }

    if (action === 'pause-import') {
      const { pauseJob } = await import('@/lib/market/job-state');
      const state = await pauseJob(supabase, 'catalog_import');
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'resume-import') {
      const { resumeJob } = await import('@/lib/market/job-state');
      const state = await resumeJob(supabase, 'catalog_import');
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'create-tournament') {
      const { createTournament } = await import('@/lib/tournament/admin');
      const startingBudget =
        typeof body.startingBudget === 'number' ? body.startingBudget : Number(body.startingBudget);
      const durationDays =
        typeof body.durationDays === 'number' ? body.durationDays : Number(body.durationDays);
      const result = await createTournament(supabase, {
        name: typeof body.name === 'string' ? body.name : '',
        description: typeof body.description === 'string' ? body.description : '',
        startingBudget: Number.isFinite(startingBudget) ? startingBudget : 10000,
        durationDays: Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 7,
        createdBy: user.id,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'tick-tournaments') {
      const { tickTournaments } = await import('@/lib/tournament/queries');
      const result = await tickTournaments(supabase);
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'settle-tournament') {
      const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : '';
      if (!tournamentId) {
        return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
      }
      const { data, error } = await supabase.rpc('settle_tournament', {
        p_tournament_id: tournamentId,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, result: data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

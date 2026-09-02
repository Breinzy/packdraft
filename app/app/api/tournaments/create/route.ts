import { NextResponse } from 'next/server';
import { requireUser, rpcErrorMessage, rpcErrorStatus } from '@/lib/auth/require-user';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import { createTournament } from '@/lib/tournament/admin';
import { creatorBudgetCap, creatorDurationCap } from '@/lib/creators/rules';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  const userClient = await createClient();
  const { data: profile } = await userClient
    .from('profiles')
    .select('is_creator')
    .eq('id', auth.user.id)
    .maybeSingle();

  const admin = isAdminEmail(auth.user.email);
  if (!admin && !profile?.is_creator) {
    return NextResponse.json({ error: 'Creator profile required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const budget = Number(body.startingBudget ?? 10000);
    const days = Number(body.durationDays ?? 7);
    const result = await createTournament(service, {
      name: typeof body.name === 'string' ? body.name : '',
      description: typeof body.description === 'string' ? body.description : '',
      startingBudget: creatorBudgetCap(admin, Number.isFinite(budget) ? budget : 10000),
      durationDays: creatorDurationCap(admin, Number.isFinite(days) ? days : 7),
      createdBy: auth.user.id,
      visibility: body.visibility === 'private' ? 'private' : 'public',
      hostKind: admin ? 'admin' : 'creator',
      sponsorName: typeof body.sponsorName === 'string' ? body.sponsorName : '',
      sponsorUrl: typeof body.sponsorUrl === 'string' ? body.sponsorUrl : '',
      qualifierTournamentId:
        typeof body.qualifierTournamentId === 'string' && body.qualifierTournamentId
          ? body.qualifierTournamentId
          : null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = rpcErrorMessage(err);
    return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
  }
}

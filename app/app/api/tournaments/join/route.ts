import { NextResponse } from 'next/server';
import { requireUser, rpcErrorMessage, rpcErrorStatus } from '@/lib/auth/require-user';
import { tryCreateServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  let body: { tournamentId?: unknown; inviteCode?: unknown };
  try {
    body = (await request.json()) as { tournamentId?: unknown; inviteCode?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : '';
  const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode : undefined;
  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
  }

  const { data, error } = await service.rpc('join_tournament', {
    p_user_id: auth.user.id,
    p_tournament_id: tournamentId,
    p_invite_code: inviteCode ?? null,
  });

  if (error) {
    const message = rpcErrorMessage(error);
    return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
  }

  return NextResponse.json({ ok: true, portfolioId: data });
}

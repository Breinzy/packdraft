import { NextResponse } from 'next/server';
import { requireUser, rpcErrorMessage, rpcErrorStatus } from '@/lib/auth/require-user';
import { parseQuantity, parseSide, TradeError } from '@/lib/portfolio/engine';
import { tryCreateServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Server is missing Supabase service credentials' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const assetId = typeof body.assetId === 'string' ? body.assetId : '';
  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
  }

  try {
    const side = parseSide(body.side);
    const quantity = parseQuantity(body.quantity);

    const { data, error } = await service.rpc('execute_career_trade', {
      p_user_id: auth.user.id,
      p_asset_id: assetId,
      p_side: side,
      p_quantity: quantity,
    });

    if (error) {
      const message = rpcErrorMessage(error);
      return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
    }

    return NextResponse.json({ ok: true, ...((data as object) ?? {}) });
  } catch (err) {
    const message = err instanceof TradeError ? err.message : rpcErrorMessage(err);
    return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
  }
}

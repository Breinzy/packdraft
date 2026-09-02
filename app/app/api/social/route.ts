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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'follow' || action === 'unfollow') {
      const targetId = typeof body.userId === 'string' ? body.userId : '';
      if (!targetId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      const { error } = await service.rpc(action === 'follow' ? 'follow_user' : 'unfollow_user', {
        p_user_id: auth.user.id,
        p_followee_id: targetId,
      });
      if (error) {
        const message = rpcErrorMessage(error);
        return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'friend-request') {
      const targetId = typeof body.userId === 'string' ? body.userId : '';
      if (!targetId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      const { data, error } = await service.rpc('request_friendship', {
        p_user_id: auth.user.id,
        p_addressee_id: targetId,
      });
      if (error) {
        const message = rpcErrorMessage(error);
        return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
      }
      return NextResponse.json({ ok: true, id: data });
    }

    if (action === 'friend-respond') {
      const friendshipId = typeof body.friendshipId === 'string' ? body.friendshipId : '';
      const accept = Boolean(body.accept);
      if (!friendshipId) {
        return NextResponse.json({ error: 'friendshipId is required' }, { status: 400 });
      }
      const { error } = await service.rpc('respond_friendship', {
        p_user_id: auth.user.id,
        p_friendship_id: friendshipId,
        p_accept: accept,
      });
      if (error) {
        const message = rpcErrorMessage(error);
        return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = rpcErrorMessage(err);
    return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
  }
}

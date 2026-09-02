import { NextResponse } from 'next/server';
import { requireUser, rpcErrorMessage, rpcErrorStatus } from '@/lib/auth/require-user';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { parseCreatorSlug } from '@/lib/creators/rules';

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

  try {
    const slug = parseCreatorSlug(typeof body.slug === 'string' ? body.slug : '');
    const bio = typeof body.bio === 'string' ? body.bio : '';
    const { error } = await service.rpc('claim_creator_profile', {
      p_user_id: auth.user.id,
      p_slug: slug,
      p_bio: bio,
    });
    if (error) {
      const message = rpcErrorMessage(error);
      return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
    }
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    const message = rpcErrorMessage(err);
    return NextResponse.json({ error: message }, { status: rpcErrorStatus(message) });
  }
}

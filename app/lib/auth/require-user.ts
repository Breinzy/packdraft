import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export { rpcErrorMessage, rpcErrorStatus } from '@/lib/api/rpc-errors';

export async function requireUser(): Promise<
  { user: User } | { user: null; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  return { user };
}

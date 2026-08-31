import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

export function createServiceClient() {
  const env = getServerEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

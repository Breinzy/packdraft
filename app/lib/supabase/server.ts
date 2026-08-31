import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOptionalPublicEnv, getPublicEnv } from '@/lib/env';

async function cookieClient(supabaseUrl: string, supabasePublishableKey: string) {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from Server Component — safe to ignore
        }
      },
    },
  });
}

export async function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return cookieClient(supabaseUrl, supabasePublishableKey);
}

export async function tryCreateServerClient() {
  const { supabaseUrl, supabasePublishableKey } = getOptionalPublicEnv();
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return cookieClient(supabaseUrl, supabasePublishableKey);
}

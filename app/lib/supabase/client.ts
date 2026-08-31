import { createBrowserClient } from '@supabase/ssr';
import { getOptionalPublicEnv, getPublicEnv } from '@/lib/env';

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

export function tryCreateBrowserClient() {
  const { supabaseUrl, supabasePublishableKey } = getOptionalPublicEnv();
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

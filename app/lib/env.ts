/**
 * Typed environment access.
 *
 * Throws only when a value is *read* and missing, so Next.js can still
 * compile pages that import these helpers. Never log values.
 *
 * NEXT_PUBLIC_* values MUST be read with static `process.env.NEXT_PUBLIC_…`
 * member access. Next.js only inlines those into the browser bundle when the
 * identifier is a compile-time string. `process.env[name]` is always undefined
 * in client components, which previously broke signup/login/trade.
 */

function nonempty(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function read(name: string): string | undefined {
  const value = process.env[name];
  return nonempty(value);
}

function requireValue(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readPublicEnv() {
  return {
    supabaseUrl: nonempty(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: nonempty(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };
}

export function getPublicEnv() {
  const { supabaseUrl, supabasePublishableKey } = readPublicEnv();
  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabasePublishableKey) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return { supabaseUrl, supabasePublishableKey };
}

export function getOptionalPublicEnv() {
  return readPublicEnv();
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    serviceRoleKey: requireValue('SUPABASE_SERVICE_ROLE_KEY'),
    pokemonPriceTrackerApiKey: requireValue('POKEMON_PRICE_TRACKER_API_KEY'),
    cronSecret: requireValue('CRON_SECRET'),
    adminEmails: parseAdminEmails(read('ADMIN_EMAILS')),
  };
}

export function getCronSecret(): string | undefined {
  return read('CRON_SECRET');
}

export function getAdminEmails(): string[] {
  return parseAdminEmails(read('ADMIN_EMAILS'));
}

function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'POKEMON_PRICE_TRACKER_API_KEY',
  'CRON_SECRET',
  'ADMIN_EMAILS',
] as const;

/**
 * Typed environment access.
 *
 * Throws only when a value is *read* and missing, so Next.js can still
 * compile pages that import these helpers. Never log values.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function requireValue(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: requireValue('NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: requireValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
}

export function getOptionalPublicEnv() {
  return {
    supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: read('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
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

# Packdraft — Supabase setup

Packdraft already has a hosted project. Do **not** create a new one and do **not** run `supabase db reset` (that would wipe the Pokémon catalog).

Linked project ref: `lximcqaunrovzonsbjkb` (us-east-1).

## 1. API keys (names only)

From [API settings](https://supabase.com/dashboard/project/lximcqaunrovzonsbjkb/settings/api):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret (server only) |

Also required for jobs and admin:

| Variable | Where it comes from |
|---|---|
| `POKEMON_PRICE_TRACKER_API_KEY` | PokemonPriceTracker account |
| `CRON_SECRET` | Any long random string you generate |
| `ADMIN_EMAILS` | Comma-separated emails allowed to use `/admin` |

Optional, for CLI migrate from an agent:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Account access tokens](https://supabase.com/dashboard/account/tokens) |

Never commit values. Never paste secrets into chat or docs.

## 2. Where to put them

### Cloud Agents

Add the names above as secrets on environment [d1326d73-a560-11f1-a7d1-d6b4613131ce](https://cursor.com/dashboard/cloud-agents/environments/e/d1326d73-a560-11f1-a7d1-d6b4613131ce).

A running agent does **not** see newly added secrets. Start a **new** Cloud Agent after saving.

### Local app

Copy `app/.env.example` to `app/.env.local` and fill in the same names.

### Vercel (production)

Set the same names on the Packdraft Vercel project (Production + Preview).

## 3. Apply pending migrations

CLI `db push` has previously failed on this project because the login role cannot `ALTER ROLE cli_login_postgres`. Prefer the SQL editor until that is fixed.

1. Open [SQL editor](https://supabase.com/dashboard/project/lximcqaunrovzonsbjkb/sql/new).
2. Run, in order (skip a file if it was already applied):
   - `supabase/migrations/20260831120000_phase2_market_and_user_foundation.sql`
   - `supabase/migrations/20260831180000_phase5_10_tournament_engine.sql`
3. In Table Editor, confirm `assets`, `tcgs`, and `tournaments` exist.

## 4. After keys + schema

1. Sign in on the app.
2. Open `/admin` with an email listed in `ADMIN_EMAILS`.
3. Import assets, sync prices, create a tournament.
4. Join from `/tournaments` and trade from `/assets`.

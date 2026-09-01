# Packdraft — Supabase setup

There are two separate connections. They are easy to mix up.

| Connection | Who uses it | What it is for |
|---|---|---|
| **Supabase MCP** | The coding agent (Cursor) | Apply migrations, inspect tables, run SQL on your behalf |
| **App env vars** | The Packdraft Next.js app | Auth, trading RPCs, admin, price sync |

MCP does **not** replace the app keys. Even with MCP connected, `/assets` and join/trade still need `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` on the environment that runs the app (Vercel, `app/.env.local`, Cloud Agent secrets).

## Supabase MCP (agent access)

MCP is Cursor talking to Supabase as you. It is not the website talking to Supabase.

Once connected, an agent can `list_tables`, `list_migrations`, `apply_migration`, and `execute_sql` instead of you pasting SQL in the dashboard. It still cannot sign players in, execute trades, or run `/admin` — those use the app env vars below.

Official hosted server: [supabase.com/mcp](https://supabase.com/mcp) (`https://mcp.supabase.com/mcp`). This repo pins it to the existing project in `.cursor/mcp.json` (`project_ref=lximcqaunrovzonsbjkb`).

1. Open the Packdraft repo in **Cursor desktop**.
2. **Settings → Cursor Settings → Tools & MCP**.
3. Find **supabase** and click **Connect** / **Authenticate**.
4. Log in to Supabase in the browser and approve the org that owns project `lximcqaunrovzonsbjkb`.
5. Confirm the server shows as connected (tools enabled). Restart Cursor if tools do not appear.
6. Start a **new** Cloud Agent after that. This running Cloud Agent has no Supabase MCP tools, and a live agent will not pick up a newly authenticated server.

You do not paste API keys into chat for MCP. It uses browser OAuth.

Do not put a personal access token in `.cursor/mcp.json`. A Bearer token is only for CI-style agents that cannot open a browser, and it must stay in secrets, not git.

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

Preferred path after MCP is connected: ask a **new** agent to `list_migrations` then `apply_migration` for any file not already on the project.

Fallback if MCP is not connected: CLI `db push` has previously failed on this project because the login role cannot `ALTER ROLE cli_login_postgres`. Use the SQL editor instead.

1. Open [SQL editor](https://supabase.com/dashboard/project/lximcqaunrovzonsbjkb/sql/new).
2. Run, in order (skip a file if it was already applied):
   - `supabase/migrations/20260831120000_phase2_market_and_user_foundation.sql`
   - `supabase/migrations/20260831180000_phase5_10_tournament_engine.sql`
   - `supabase/migrations/20260901120000_market_job_state.sql`
3. In Table Editor, confirm `assets`, `tcgs`, `tournaments`, and `market_job_state` exist.

If `SUPABASE_ACCESS_TOKEN` is set, `python3 script/cloud/apply-hosted-schema.py` applies those three files via the Management API. After that, `python3 script/cloud/copy-catalog-to-hosted.py` copies the local catalog into hosted `assets` + latest snapshots.

## 4. After keys + schema

1. Sign in on the app.
2. Open `/admin` with an email listed in `ADMIN_EMAILS`.
3. Import assets, sync prices, create a tournament.
4. Join from `/tournaments` and trade from `/assets`.

# Packdraft — Repository Audit (Phase 0)

**Date:** 2026-08-30  
**Scope:** Existing codebase vs `docs/roadmap.md` and `AGENTS.md`.  
**Reset:** Not performed. This document is the audit. Reset requires explicit approval.

No secret values are recorded here. Environment variables are listed by **name** and whether they appear configured locally.

---

## 1. Summary

The repo is a working Next.js 16 + Supabase beta of an older game: weekly auto-assigned leagues, draft-then-lock portfolios, slot caps, cash decay.

The new product is different: isolated tournaments, virtual cash, buy **and** sell against live market prices, immutable trades, deterministic settlement.

**Recommendation:** Keep the platform (stack, auth, Supabase clients, design tokens) and the PokemonPriceTracker **provider client**. Rebuild schema and the game engine. Delete the weekly-league contest layer.

The linked Supabase project is **ACTIVE_HEALTHY** and already holds a real catalog (see §7). Do not `db reset` that project.

---

## 2. Connection status (verified this session)

| Item | Status |
|------|--------|
| Git remote | `origin` → `https://github.com/Breinzy/packdraft.git` (`master` tracks `origin/master`) |
| Supabase CLI | Logged in; this folder **linked** |
| Linked project | `lximcqaunrovzonsbjkb` (`Breinzy's Project`, us-east-1, Postgres 17) |
| Project health | `ACTIVE_HEALTHY` |
| Public API | Responds (auth without a key returns 401, not a pause error) |
| `supabase migration list` | **Failed** — CLI login role cannot `ALTER ROLE cli_login_postgres` (permission 42501). Migrations cannot be compared via CLI until this is fixed. |

---

## 3. Framework and dependencies

App lives in `app/` (Next.js project). Repo root holds `supabase/`, `docs/`, `vercel.json`, `AGENTS.md`.

| Package | Version (package.json) | Verdict |
|---------|------------------------|---------|
| next | 16.1.6 | KEEP |
| react / react-dom | 19.2.3 | KEEP |
| typescript | ^5 | KEEP |
| tailwindcss | ^4 | KEEP |
| @supabase/ssr | ^0.8.0 | KEEP |
| @supabase/supabase-js | ^2.97.0 | KEEP |
| eslint + eslint-config-next | 9 / 16.1.6 | KEEP |
| supabase CLI (devDep) | ^2.76.12 | KEEP |

No extra frameworks. No test runner. Dependencies are lean and match the roadmap stack. **No unnecessary runtime dependencies to remove.**

TypeScript `strict: true` is on.

---

## 4. Routes / pages

| Route | File | Role today | Audit |
|-------|------|------------|-------|
| `/` | `app/app/page.tsx` | Landing | REBUILD copy/layout in Phase 1; do not keep league/week claims |
| `/auth/login` | `app/app/auth/login/page.tsx` | Email + Google | KEEP |
| `/auth/signup` | `app/app/auth/signup/page.tsx` | Signup + display name metadata | KEEP |
| `/auth/callback` | `app/app/auth/callback/route.ts` | OAuth code exchange | KEEP |
| `/auth/onboarding` | `app/app/auth/onboarding/page.tsx` | Display name | KEEP |
| `/dashboard` | `app/app/dashboard/page.tsx` | Signed-in hub (contest-shaped) | REBUILD in Phase 1 as a shell without trading |
| `/draft` | `app/app/draft/page.tsx` | Slot-draft builder | DELETE as a game screen; salvage browse UI for Phase 4 |
| `/leaderboard` | `app/app/leaderboard/page.tsx` | Live league + global | REBUILD in Phase 9 |
| `/results/[contestId]` | `app/app/results/[contestId]/page.tsx` | Post-week reveal | REBUILD in Phase 10 |
| `/settings` | `app/app/settings/page.tsx` | Display name | KEEP |
| `/admin` | `app/app/admin/page.tsx` | Ops panel | REBUILD auth + actions later; pattern is useful |

Loading/error boundaries exist for dashboard, draft, leaderboard, results.

**Missing vs Phase 1:** centralized route guards, password reset, `.env.example` at the documented location, responsive layout system, mobile nav as a first-class pattern.

---

## 5. Components

| Path | Role | Audit |
|------|------|-------|
| `components/layout/Header.tsx` | Nav, countdown, auth, mobile menu | KEEP chrome; REBUILD contest status |
| `components/layout/Ticker.tsx` | League ticker | DELETE or REBUILD after tournaments exist |
| `components/portfolio/PortfolioBuilder.tsx` | Draft orchestrator | DELETE game logic; Adapt browse wiring in Phase 4/8 |
| `components/portfolio/ProductList.tsx` | Search, filters, pagination | KEEP as Phase 4 starting point |
| `components/portfolio/ProductRow.tsx` | Asset row | KEEP as Phase 4 starting point |
| `components/portfolio/PortfolioPanel.tsx` | Holdings + lock | REBUILD in Phase 8 (avg cost, P&L, sell) |
| `components/portfolio/BudgetGauge.tsx` | Budget bar | REBUILD as cash/invested in Phase 8 |
| `components/portfolio/BestFitSuggestion.tsx` | Leftover-cash nudge | DELETE (slot-draft leftover) |
| `components/leaderboard/LeagueTable.tsx` | League ranks | REBUILD in Phase 9 |
| `components/leaderboard/GlobalTable.tsx` | Global ranks | REBUILD in Phase 9 |
| `components/ui/StatCard.tsx` | Stat tile | KEEP |
| `components/ui/Button.tsx` | Unused | DELETE |
| `components/ui/Badge.tsx` | Unused | DELETE |

---

## 6. Libraries

| Path | Role | Audit |
|------|------|-------|
| `lib/supabase/client.ts` | Browser client | KEEP |
| `lib/supabase/server.ts` | RSC/API cookie client | KEEP |
| `lib/supabase/session.ts` | Middleware cookie refresh | KEEP |
| `middleware.ts` | Session refresh only (no route protection) | KEEP refresh; add guards in Phase 1 |
| `lib/pricing/client.ts` | PokemonPriceTracker HTTP client | KEEP as **provider implementation** |
| `lib/pricing/sync.ts` | Snapshot writer | REBUILD behind provider interface (Phase 3) |
| `lib/pricing/import.ts` | Catalog import | REBUILD behind provider interface (Phase 3) |
| `lib/utils.ts` | currency / pct / countdown / cn | KEEP |
| `lib/portfolio/helpers.ts` | Latest price + slot/budget validate | REBUILD in Phase 5 (keep price lookup idea) |
| `lib/contest/scheduler.ts` | Weekly contest clock | DELETE |
| `lib/contest/scoring.ts` | End-week score + decay | DELETE |
| `lib/contest/autoLock.ts` | Lock all books at start | DELETE |
| `lib/contest/leagueAssignment.ts` | Fill leagues of 20 | DELETE |
| `types/index.ts` | Product/contest types + slot constants | REBUILD types; DELETE `BUDGET` / `MAX_SLOTS` / `CASH_DECAY_RATE` |

---

## 7. Database schema and migrations

### Tables (current)

`profiles`, `contests`, `leagues`, `products`, `price_snapshots`, `portfolios`, `portfolio_items`

### Enums (current)

`contest_status`: `registration` | `pending` | `active` | `complete`  
`product_type`: sealed types + `psa_9` / `psa_10`

### Migrations (local, in order)

1. `20260222094903_initial_schema.sql` — core schema, RLS, signup trigger, seed products  
2. `20260222095500_seed_contest_and_prices.sql` — dev contest/prices  
3. `20260222120000_add_psa_and_scheduling.sql` — PSA columns, `registration`  
4. `20260222120100_seed_psa_cards.sql`  
5. `20260222170000_fix_trigger_registration_status.sql`  
6. `20260222180000_resilient_trigger.sql`  
7. `20260222190000_add_display_name_set.sql`  
8. `20260222200000_league_max_players.sql`  
9. `20260226120000_tcgplayer_id_unique.sql` — `upsert_product` RPC  
10. `20260227120000_deactivate_seed_products.sql`

### Remote row counts (anon REST, 2026-08-30)

| Table | Approx rows |
|-------|-------------|
| products | 1723 |
| price_snapshots | 1929 |
| profiles | 1 |
| contests | 2 |
| leagues | 1 |
| portfolios | 0 |
| portfolio_items | 0 |

**Implication:** Market data on the linked project is real and worth preserving through Phase 2. Game tables are nearly empty. Do **not** run `supabase db reset` against this project.

Roadmap Phase 2 needs `tcgs`, `sets`, `assets` (normalized, provider-agnostic). `products` is Pokémon-shaped and must be migrated or replaced — not kept as the domain model.

---

## 8. Authentication

- Supabase Auth: email/password + Google OAuth (`signInWithOAuth` → `/auth/callback`).
- Profile row created by `handle_new_user` trigger on `auth.users` insert.
- That trigger also **auto-assigns a league and creates a portfolio** when a contest exists. That violates the new join model. DELETE the game side of the trigger; KEEP profile creation.
- Onboarding gate: `profiles.display_name_set`.
- Protection is **per-page redirects**. Middleware only refreshes cookies.
- `/api/admin/proxy` requires any logged-in user, not an admin list. Admin **page** checks `ADMIN_EMAILS` (that name is **not** set in local env).

**UNKNOWN:** Whether Google OAuth is enabled on this restored Supabase project's Auth providers (code assumes it is).

---

## 9. External API integrations

**PokemonPriceTracker** (`https://www.pokemonpricetracker.com/api/v2`)

- Isolated today in `lib/pricing/client.ts` (good).
- Sync/import call it from cron/admin routes (acceptable direction).
- Game/UI should never import this client (roadmap § market data). Today they do not call it from React; they read `price_snapshots`. **Keep that boundary.**
- Auth: `POKEMON_PRICE_TRACKER_API_KEY` (server-only). Configured locally.

No other external APIs.

---

## 10. Environment variable names

Local file: `app/.env.local` (gitignored). Example file: `app/.env.local.example` (incomplete). Roadmap wants `.env.example` with names only.

| Name | Required for | Local `.env.local` | In example file |
|------|----------------|--------------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | App + Auth | configured | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App + Auth | configured | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Crons, admin, register | configured | yes |
| `POKEMON_PRICE_TRACKER_API_KEY` | Price sync/import | configured | **no** |
| `CRON_SECRET` | Cron + some admin routes | configured | **no** |
| `ADMIN_EMAILS` | Admin page gate | **not set** | **no** |
| `VERCEL_URL` | Admin proxy self-fetch on Vercel | platform-provided | **no** |

**UNKNOWN:** Whether production Vercel env has the same names configured.

Never commit `.env.local`. Do not log or document values.

---

## 11. Working functionality (old product)

- Sign up / log in / log out / OAuth callback / stay signed in (cookie refresh).
- Profile display name onboarding + settings.
- Browse catalog with search/filter/pagination (when products exist).
- Server-side portfolio add/remove/lock with session auth (old slot/budget rules).
- Price sync + catalog import against PokemonPriceTracker.
- Admin panel can trigger jobs (over-permissive proxy).
- Dark terminal visual language.

---

## 12. Incomplete vs the new MVP

- `/api/portfolio/register` exists and is **never called** from the UI.
- No buy/sell ledger. No immutable transactions.
- No isolated tournament join (signup trigger is the only “join”).
- No settlement-price snapshots / locked historical results (old scorer uses live end prices + cash decay).
- No asset detail page or price-history chart.
- No env validation.
- No tests.
- No `.env.example` covering all names.
- Responsive: some mobile CSS exists; not a first-class layout system. Core new flows (buy/sell/join) are not designed.
- Returning users cannot join a new round without the unwired register route.

---

## 13. Obsolete / dead code

- Root `portfolio-builder.jsx` and `doc/portfolio-builder.jsx` (prototype).
- Root `packdraft-buildplan.md` and `doc/packdraft-buildplan.md` (superseded by `docs/roadmap.md`).
- `.cursor/plans/backend-first_completion.plan.md` (old plan).
- `Button.tsx`, `Badge.tsx` (unused).
- `GET /api/create-next-contest` (duplicate of cron).
- `pending` contest status (scheduler does not use it).
- Seed products in early migrations (later deactivated; live catalog is imported).
- `getPortfolioWithItems()` unused helper.
- Stock `app/README.md`.
- Default `app/public/*.svg` placeholders.

---

## 14. KEEP / REBUILD / DELETE / UNKNOWN

### KEEP

- Next.js 16 App Router, React 19, Tailwind 4, TypeScript strict, ESLint, Vercel.
- `app/lib/supabase/client.ts`, `server.ts`, `session.ts`, `app/middleware.ts` (session refresh).
- Auth pages: login, signup, callback, onboarding; settings display-name flow.
- `app/app/globals.css` tokens (dark terminal, DM Mono, accent palette).
- `app/lib/utils.ts` formatters.
- `app/lib/pricing/client.ts` as the first market-data **provider**.
- Git history, `vercel.json` as a cron **shape**, `supabase/config.toml`, `app/package.json` lockfile.
- Linked Supabase project + existing `products` / `price_snapshots` **data** (migrate in Phase 2, do not wipe).
- `StatCard.tsx`, `ProductList.tsx`, `ProductRow.tsx` as UI starting points.

### REBUILD

- Database: introduce `tcgs`, `sets`, `assets`; reshape snapshots; separate user / market / tournament (and reserve career/event domains without implementing those features).
- Profile trigger: keep `profiles` insert; remove league/portfolio auto-create.
- Dashboard, Header status, landing copy.
- Pricing sync/import → provider interface + normalization (Phase 3).
- Portfolio APIs → cash, positions, buy, sell, transactions (Phase 5).
- Contest/league/scoring → tournament engine, participation, settlement (Phases 6–7, 10).
- Leaderboard/results pages (Phases 9–10).
- Admin proxy (must be actually admin-gated).
- RLS for isolated tournament books.
- Types (`types/index.ts`).
- `.env.example` (names only) + env validation (Phase 1).
- Responsive application shell (Phase 1).

### DELETE (on approved reset)

- `app/lib/contest/*` (scheduler, scoring, autoLock, leagueAssignment).
- Contest-specific APIs: `score-contest`, `create-next-contest`, `cron/tick` (old lifecycle), `cron/create-contest`, portfolio `lock`/`register` as currently specified.
- Slot/decay constants and BestFit leftover logic.
- Prototype JSX files and old build-plan markdown (keep `docs/roadmap.md` + this audit).
- Unused `Button.tsx` / `Badge.tsx`.
- Signup trigger behavior that assigns leagues and portfolios.

Do not delete `products` / snapshot **rows** on the remote project as part of app-code reset.

### UNKNOWN

- Google OAuth provider enabled on the restored project (needs dashboard check or a live OAuth attempt).
- Production Vercel env completeness.
- Why `supabase migration list` cannot create `cli_login_postgres` (org/role permission). Blocks CLI migrate until resolved.
- Whether Phase 2 should **map** the 1723 products into `assets` or re-import through the new provider pipeline (product decision — do not invent at reset time).
- Whether the 1 existing profile should be preserved (likely yes).

---

## 15. Proposed reset (not executed)

After this audit is approved, reset should:

1. Leave git history, `origin`, Supabase link, and `app/.env.local` untouched.
2. Add a root or `app/.env.example` with **names only** for every variable in §10.
3. Remove DELETE-listed application files.
4. Keep KEEP-listed files; strip contest/league fields from Header/dashboard rather than deleting auth.
5. **Not** run `supabase db reset` on `lximcqaunrovzonsbjkb`.
6. Not add Career, Market Events, monetization, or extra dependencies.
7. Leave a compileable shell: auth routes + layout + tokens + supabase clients + pricing client. Trading routes may 404 until later phases.

Phase 0 definition of done (clean `tsc` / lint / build, no unexplained legacy features) applies **after** that reset, not before.

---

## 16. Phase 0 status

| Task | Status |
|------|--------|
| Inspect repository | Done |
| Categorize KEEP / REBUILD / DELETE / UNKNOWN | Done |
| `docs/repository-audit.md` | This file |
| Reset | Executed in the foundation branch (obsolete contest/league application code removed; linked database not reset) |
| Clean build / lint / types after reset | Follow-up on the foundation branch |
| Complete `.env.example` | Done (repo root, names only) |

The weekly-league application layer was removed. Auth, Supabase clients, design tokens, and the PokemonPriceTracker HTTP client remain. Market catalog **data** on the linked project is preserved and mapped in Phase 2 rather than wiped.

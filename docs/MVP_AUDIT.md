# Packdraft — MVP Audit (Phase 21)

**Date:** 2026-09-03  
**Scope:** Live application in `app/` plus the imported `frontend/` snapshot, audited against the collector-first roadmap in `docs/roadmap.md` and `AGENTS.md`.  
**Reset:** Not performed. Working backends stay. This document is the map for reorganization.

No secret values are recorded here.

---

## 1. Product direction change

The previous roadmap treated Packdraft as a competitive TCG market **game**. That work reached roughly Phase 20: auth, Pokémon catalog + prices, isolated tournaments, Career virtual book, market events, social/creators, Pro flag, release weekends.

The new product is:

1. A useful free **Pokémon collection / portfolio tracker**
2. Tournaments as competition on real market movement
3. Predictions as a skill loop
4. Sandbox for virtual strategy testing
5. Pro for intelligence, not basic tracking

The imported `frontend/` snapshot (from `packdraft-frontend-06`) is the visual/IA target: Overview, Portfolio, Market, Watchlist, Sets as primary navigation. It is a v0 mock. **Do not use `frontend/lib/data.ts` prices or the client `PortfolioProvider` as market truth.**

---

## 2. Inventory

### Complete and keep (backend / domain)

| Area | Where | Notes |
|------|--------|--------|
| Auth (email, Google, onboarding, password) | `app/app/auth/*`, middleware session refresh | Keep. Default signed-in home should become Overview. |
| Profiles, Pro flag | `profiles`, `lib/auth/pro.ts` | Pro entitlement exists; Pro intelligence does not. |
| Pokémon catalog + PPT ingestion | `assets`, `sets`, `tcgs`, `lib/market/*` | Provider → normalize → DB. Pokémon-only in practice. |
| Price snapshots + stale handling | `price_snapshots` | Authoritative live marks. |
| Tournament engine | join/trade RPCs, lifecycle, settlement | Isolated virtual books. Keep as differentiator. |
| Career virtual book | `career_*` tables, `/api/career/trade` | **Not** a Collectr-style collection. Maps to **Sandbox**. |
| Market events | `lib/events/*`, `/events` | Maps to **Predictions**. Independent of portfolios. |
| Player tournament history | `/players` | Keep; later feeds investor profile. |
| Admin import / cron | `/admin`, `/api/cron/*` | Keep. |

### Partial / UI-complete but wrong product frame

| Area | Status |
|------|--------|
| Dashboard `/dashboard` | Signed-in hub framed as game + Career value as “portfolio”. |
| Career `/career` | Working virtual $1,000 book labeled as the user’s portfolio. |
| Markets `/assets` | Working catalog browse/trade. Game-first copy. |
| App shell / nav | Dashboard, Career, Tournaments, Markets, Events. Game-first. |
| Marketing `/` | “Highest book wins.” Tournament-first. |
| Design system | Dark investment pass exists; `frontend/` is the new visual source (Manrope, cobalt, collector chrome). |

### Missing vs new MVP (do not build in this pass unless noted)

| Roadmap phase | Gap |
|---------------|-----|
| 24 Collection tracker | No user-entered qty / purchase price / purchase date / cost basis for **real** holdings. |
| 25 Market/discovery | Catalog exists; no dedicated Sets IA, weak discovery (movers, trending). |
| 26 Watchlists + alerts | No watchlist table or UI. |
| 27–31 | Investor profile, richer analytics, prediction track record UX. |
| 32–40 Pro | Stripe/Pro intelligence not built. `pro_until` is a flag only. |
| Social / creators | Built under old phases 16–17. Defer promotion; do not delete. |

### Obsolete as product framing (do not delete the systems)

| Old concept | New concept | Action |
|-------------|-------------|--------|
| Career Mode as “My Portfolio” | Sandbox | Relabel routes/copy. Keep tables and RPCs. |
| Market Events | Predictions | Relabel nav. Keep `/events` URLs working. |
| Dashboard as game HQ | Overview (collection-first) | New signed-in home. |
| “Enter tournament” as primary CTA | Add to collection / browse market | Shell CTA changes. Collection add is a honest stub until Phase 24. |

### Technical debt

- Two Next apps: live `app/` and design snapshot `frontend/`. Only `app/` should ship.
- Duplicate chrome (`Header` marketing vs `AppShell`).
- Career value shown as if it were a real collection.
- Social, creator host, release weekends are extra surface area vs the new MVP spine.
- `frontend/` depends on lucide, shadcn, `@base-ui/react`, recharts. Live app stays lean: port tokens/shell/IA, not the mock store.

---

## 3. Route map (target IA)

| New route | Role | Backed by |
|-----------|------|-----------|
| `/` | Marketing. Collector pitch. Game as differentiator. | Existing landing, new copy. |
| `/overview` | Signed-in home. Collection empty + sandbox snapshot + live competition. | Dashboard queries, relabeled. |
| `/portfolio` | Collection tracker. Empty until Phase 24. | Placeholder. Does **not** write Career rows. |
| `/market` | Catalog discovery. | Existing `searchCatalog`. |
| `/watchlist` | Research queue. | Empty state until Phase 26. |
| `/sets`, `/sets/[id]` | Set browse. | `sets` table + catalog filter. |
| `/assets/[id]` | Asset detail + virtual trade ticket. | Keep canonical URL for tournament/sandbox fills. |
| `/tournaments` | Live competition. | Unchanged engine. |
| `/events` | Predictions. | Unchanged engine. Nav label: Predictions. |
| `/sandbox` | Virtual $1,000 book (old Career). | Career queries/RPCs. |
| `/pro` | Intelligence upsell. | Coming-soon page. |

### Redirects / aliases

| From | To |
|------|-----|
| `/dashboard` | `/overview` |
| `/assets` (listing) | `/market` (query string preserved) |
| `/career` | `/sandbox` |
| `/career/leaderboard` | `/sandbox/leaderboard` |
| `/asset/[id]` | `/assets/[id]` |
| `/predictions` | `/events` |

---

## 4. Architecture rules this pass must not break

- Collection, Sandbox (`career_*`), Tournament books, and Predictions (`market_events`) stay separate.
- Server remains authoritative for cash, prices, ranks, and settlement.
- No fabricated market data from the frontend mock.
- No collection schema migration in this pass (Phase 24).
- No Stripe/AI (Phases 32+).
- Social/creators remain reachable, not primary nav.

---

## 5. This reorganization slice (Phase 21–22 + IA)

In scope:

- This audit.
- Port `frontend/` visual tokens, typography, and collector shell into `app/`.
- Collector-first navigation with working Tournaments and Predictions (not “Coming soon”).
- New routes wired to **real** catalog/sandbox/tournament data.
- Honest empty states for Collection and Watchlist.
- Marketing copy pivot.

Out of scope:

- Real collection ledger.
- Watchlist persistence.
- Replacing tournament/event engines.
- Deleting Career tables.
- Adopting mock `frontend/lib/store.tsx`.

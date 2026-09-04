# Packdraft — Database Design

Packdraft data is split by domain. Game tables from the weekly-league beta (`contests`, `leagues`, `portfolios`, `portfolio_items`, `products`) remain in the linked project so existing catalog rows are not wiped. Application code no longer reads or writes those game tables.

## User data

### `profiles`

Packdraft-specific user record, keyed to `auth.users`.

| Column | Role |
|---|---|
| `id` | Same as `auth.users.id` |
| `email` | Account email |
| `display_name` | Public name |
| `display_name_set` | Onboarding gate |
| `created_at` | Signup time |

Created by `handle_new_user` on `auth.users` insert. The trigger only creates a profile. It does not assign leagues or portfolios.

## Market data

External APIs are providers. Packdraft stores a normalized catalog and historical prices.

### `tcgs`

A trading-card game. MVP seed: Pokémon (`slug = pokemon`).

### `sets`

A set belongs to a TCG (`tcg_id`).

### `assets`

Something that can be traded inside Packdraft. Not a copy of a provider schema.

| Column | Role |
|---|---|
| `tcg_id` | Owning TCG |
| `set_id` | Optional set |
| `name` | Display name |
| `asset_type` | `sealed`, `single`, or `graded` |
| `external_id` | Provider identity (TCGPlayer id for PokemonPriceTracker) |
| `image_url` | Optional image |
| `metadata` | Provider extras (grade, card number, sealed subtype) |
| `active` | Eligible for sync / future trading |
| `legacy_product_id` | One-time map from beta `products.id` |

Identity for upserts: `(tcg_id, external_id, asset_type, grade)` where grade comes from `metadata->>'grade'`.

### `price_snapshots`

Immutable historical market prices. “Current price” is the latest row for an asset.

| Column | Role |
|---|---|
| `asset_id` | Packdraft asset |
| `price` | USD amount |
| `recorded_at` | When Packdraft stored the observation |
| `source` | Provider id (e.g. `pokemonpricetracker`) |
| `condition` | Optional (PSA 10, unopened, …) |
| `price_type` | `market`, `unopened`, `ebay_smart`, `ebay_average` |
| `change_7d` | Percent change vs ~7d ago when known |
| `volume` | Optional trade/sales count from the provider |
| `metadata` | Extra provider payload |
| `product_id` | Legacy FK to `products` (nullable) |

Writes use the service role. Clients may `SELECT`.

### `market_job_state`

Singleton rows `catalog_import`, `price_sync`, and `history_backfill`. Each cron/admin chunk claims a row, writes a cursor (`sealed_offset`, `set_index`, `graded_offset`, or `last_asset_id`), and releases it. Clients may `SELECT`. Writes are service-role only.

`history_backfill` starts **paused**. Resume it from `/admin` before it spends PPT credits.

### `asset_market_stats`

Per-asset trailing PPT sales volume (`volume_7d` / `volume_30d` / `volume_180d`) and `daily_tier` (`always` | `high` | `normal` | `skip`). Written by the 6-month history backfill and daily priority sync. Public `SELECT`. Service-role writes.

### `set_latest_indexes`

Derived basket per set: sum of latest member prices (cards + graded + sealed, `price > 0`). Not a provider field. Point-in-time baskets use RPCs `latest_prices_at` / `set_indexes_at`.

## Tournament data (Phases 5–10)

Tournament money is isolated from Career Mode and from the unused legacy `portfolios` table.

### `tournaments`

One competition. Status: `upcoming | active | locked | settling | completed | archived`.

| Column | Role |
|---|---|
| `starting_budget` | Virtual cash each joiner receives |
| `starts_at` | Becomes `active` |
| `trading_closes_at` | Becomes `locked`; settlement as-of time |
| `ends_at` | Display / archive boundary |
| `tcg_id` | Eligible catalog |
| `eligible_asset_types` | Default sealed, graded, single |

### `tournament_portfolios`

One book per `(tournament_id, user_id)`. `starting_cash` and `cash` never leave this tournament.

### `tournament_participants`

Join record (`joined_at` breaks ranking ties).

### `tournament_positions`

Integer quantity + `average_cost` per asset in a book.

### `tournament_transactions`

Immutable buy/sell ledger. Execution price comes from Packdraft snapshots, never from the client.

### `tournament_settlement_prices` / `tournament_results`

Frozen at close. See `docs/settlement.md`.

Writes go through security-definer RPCs executed by the service role after the Next.js API authenticates the user: `join_tournament`, `execute_tournament_trade`, `settle_tournament`, `tick_tournaments`. `get_tournament_standings` is readable by anon/authenticated.

## Player history

A basic `/players/[id]` page already exists. Public record is derived from `tournament_results` (and, for the owner, `tournament_transactions` replayed with the same average-cost rules as live trading). Tournament cash and positions still do not carry over. Career Mode is a separate book and is not shown here.

## Career Mode (Phase 12)

Persistent solo book. Isolated from every tournament.

### `career_portfolios`

One row per user. `starting_cash` is always `$1,000`. `cash` never leaves this table into a tournament.

### `career_positions` / `career_transactions`

Same quantity, average-cost, and immutable ledger rules as tournament books. Writes go through `ensure_career_portfolio` and `execute_career_trade` (service role). Clients may `SELECT` their own rows.

### `career_value_snapshots`

Point-in-time cash + marked holdings, written when the book is created and after each career trade. Used for the career chart. Not a tournament settlement freeze.

Do not store career cash on `profiles`. Do not transfer cash or positions between Career and tournaments.

### Career progression (Phase 13)

No extra Career tables. Levels, milestones, archetypes, streaks, and badges are computed in `app/lib/career/progression.ts`. Public ranks use `get_career_standings()` (security definer; value + handle only).

## Market Events (Phase 14)

Independent prediction competitions. No cash.

### `market_events`

Type: `release_price | direction | ranking | biggest_mover`. Status: `upcoming | open | locked | settling | completed | cancelled`. Clock fields: `opens_at`, `locks_at`, `settles_at`.

### `market_event_assets`

Event universe plus frozen start/end settlement prices (`packdraft_settlement_price`).

### `market_event_entries` / `market_event_results`

One payload per user while the event is `open`. Results are written at settlement and then immutable. Entries are private until lock, then public.

Writes: `submit_market_event_entry`, `freeze_market_event_prices` (service role). Scoring is application code.

## Settlement integrity (Phase 15)

`packdraft_settlement_price(asset_id, as_of)` is the competition quote. `settle_tournament` uses it instead of last snapshot before close. See `docs/settlement.md`.

## Social (Phase 16)

### `friendships` / `follows` / `activity_events`

Friend requests are pairwise and unique. Follows are public. The feed is visible to the actor, accepted friends, and followers. Writes go through service-role RPCs (`request_friendship`, `respond_friendship`, `follow_user`, `unfollow_user`, `record_activity`).

Private tournaments use `tournaments.visibility` + `invite_code`. RLS hides private rows unless the viewer is the host or a participant. Invite visitors are loaded in the app via the service role **only when the invite matches**. `join_tournament(user, tournament, invite)` enforces the code.

`get_player_rankings()` is tournament-results only (wins, average return). Career value is not mixed in.

## Creator tournaments (Phase 17)

`profiles.creator_slug`, `creator_bio`, `is_creator`. `tournaments.host_kind` is `admin` or `creator`. `claim_creator_profile` is a service-role RPC. Creator budget/duration caps are application rules (`app/lib/creators/rules.ts`); books still use the same isolated tournament engine.

## Monetization / free-to-play (Phases 18–19)

`profiles.pro_until` is a flag. Pro must not change tournament cash, prices, ranks, or settlement. Ads are a placeholder. Affiliate links use optional `PACKDRAFT_TCGPLAYER_AFFILIATE`.

`tournaments.entry_mode` is constrained to `'free'`. Optional `qualifier_tournament_id` + `qualifier_max_rank` gate join on a prior `tournament_results.rank`.

## Release campaigns (Phase 20)

`release_campaigns` + `release_campaign_items` group a tournament and prediction events around a set drop. Child competitions stay isolated. No cash moves between them.

## Legacy tables (unused by the app)

`contests`, `leagues`, `portfolios`, `portfolio_items`, `products` — weekly-league beta. Catalog rows were copied into `tcgs` / `sets` / `assets` / `price_snapshots.asset_id`. Do not `db reset` the linked project.

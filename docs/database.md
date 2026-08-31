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

## Player history (Phase 11)

There is no Career wallet here. A player's public record is derived from `tournament_results` (and, for the owner, `tournament_transactions` replayed with the same average-cost rules as live trading). Tournament cash and positions still do not carry over.

## Reserved domains (not implemented)

Career Mode and Market Event tables are **not** created in this migration. Do not store tournament cash on `profiles`.

## Legacy tables (unused by the app)

`contests`, `leagues`, `portfolios`, `portfolio_items`, `products` — weekly-league beta. Catalog rows were copied into `tcgs` / `sets` / `assets` / `price_snapshots.asset_id`. Do not `db reset` the linked project.

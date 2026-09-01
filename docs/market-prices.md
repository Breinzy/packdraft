# Packdraft — Market Price Methodology (MVP)

Packdraft is a simulation layer over real TCG market data. Virtual trades do not affect real-world prices.

## Pipeline

```
PokemonPriceTracker API
  → provider adapter (server only)
    → normalize
    → Packdraft database (assets + price_snapshots)
    → game engine / UI
```

The game engine and React components must not call the provider. They read Packdraft snapshots.

## Provider

**PokemonPriceTracker** (`https://www.pokemonpricetracker.com/api/v2`) is provider id `pokemonpricetracker`.

It keys products by TCGPlayer id. Auth is `POKEMON_PRICE_TRACKER_API_KEY` (server-only).

| Asset type | Endpoint | Price stored |
|---|---|---|
| Sealed | `/sealed-products` (or Business `/export?type=sealed`) | `unopenedPrice`, else TCGPlayer `prices.market` |
| Ungraded singles | `/cards` per set (`fetchAllInSet=true`) | TCGPlayer `prices.market` |
| Graded PSA 9 / PSA 10 | `/cards?includeEbay=true` | eBay `smartMarketPrice.price`, else average of comps |

`price_type` records which field was used (`unopened`, `market`, `ebay_smart`, `ebay_average`).

English cards only. Assets without a usable price are not inserted (the catalog should be tradable, not full of **NO PRICE** rows).

`recorded_at` is **when Packdraft stored the observation**, not PPT’s `lastUpdated`. PPT regenerates dumps at **06:00 UTC**.

## Full catalog import

A 50k-card catalog cannot finish in one Vercel Hobby invocation (`maxDuration` 300s) or one PPT credit window.

Import is a **resumable job** (`market_job_state`, job `catalog_import`):

1. **Sealed** — Business `/export?type=sealed` when the key allows it (0 credits, 2 downloads/day). Otherwise paginate `/sealed-products?minPrice=0.01` (PPT requires a filter).
2. **Singles** — list English `/sets`, then `/cards?setId=…&fetchAllInSet=true` (no eBay). Cursor is `set_index`.
3. **Graded** — paginate `/cards?includeEbay=true` (max 50/page). Only PSA 9/10 rows with an eBay price are stored.

Each chunk stops at the first of:

* ~240s elapsed (leaves headroom under Vercel’s 300s cap)
* per-chunk credit budget (`PACKDRAFT_IMPORT_CREDIT_BUDGET`, default 2500)
* PPT `X-RateLimit-Daily-Remaining` at or below 25
* HTTP 429 daily limit

Request spacing defaults to 1.1s (~60/min). Daily cron `GET /api/admin/import-assets` at **08:00 UTC** continues the cursor. Admin **IMPORT CATALOG CHUNK** starts one chunk without resetting progress.

The small **sample** importer (`importMarketCatalog`, `mode=sample`) still exists for smoke tests. It is not the full catalog.

Local loop: `bash script/cloud/import-catalog.sh`.

PPT plans (credits/day): Free 100, Pro 20k, Business 200k. A Pro key can ingest singles over several days; graded eBay data costs ~2 credits/card. Business export is the only cheap way to snapshot the whole sealed list in one download.

## Current price

For an asset at time T (default now):

1. Select snapshots for `asset_id` with `recorded_at <= T`.
2. Take the latest `recorded_at`.
3. That row’s `price` is the Packdraft current price.

Do not reconstruct prices from holdings.

## Daily price sync

`syncMarketPrices` walks **existing** active assets by `id` cursor (`market_job_state` job `price_sync`). It does not add products.

It is also time- and credit-boxed. Cron runs at **09:00 UTC** so it does not race PPT’s 06:00 UTC regenerate. A Hobby run will not refresh 50k rows in one day; the cursor continues on later runs.

## Stale data

A current snapshot is **stale** when `now - recorded_at` exceeds **36 hours**.

Sync is scheduled daily. 36 hours is a one-miss buffer. Stale flags are informational in the asset browser. Trading still uses the latest stored snapshot when one exists (the server looks up the price; the client cannot submit a price). Settlement uses the latest snapshot at or before `trading_closes_at` and fails if a held asset has no such row.

## History

Every sync **inserts** a new snapshot. Existing rows are not updated. This is how Packdraft answers “what was this worth at time T?”

## Settlement

See `docs/settlement.md`. Completed `tournament_results` are never recomputed from a later live tick.

## Failure behavior

If the provider errors, Packdraft keeps the last stored snapshot and records the sync error. It does not invent a price.

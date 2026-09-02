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

English cards only. Assets without a usable price are not inserted. Online **code cards** are skipped — they are TCG Live redeem codes, not tournament holdings.

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

Request spacing defaults to 1.1s (~60/min). Each PPT HTTP call times out after 45s so a hung provider cannot pin a Vercel invocation. Daily cron `GET /api/admin/import-assets` at **08:00 UTC** continues the cursor. Admin **IMPORT CATALOG CHUNK** starts one chunk without resetting progress.

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

`syncMarketPrices` no longer walks the whole catalog.

Daily universe (union):

1. **Always** — Pokémon **Elite Trainer Boxes** and **booster boxes** (name/metadata subtype). These refresh **with sales volume** every run.
2. **High volume** — cards whose trailing **30-day PPT volume ≥ 10** after the 6-month history pass (`asset_market_stats.daily_tier = high`).
3. **Held** — any asset with quantity > 0 in a tournament book or Career book.

Zero-volume filler is skipped. Each daily fetch uses `includeHistory=true` (`days=180`) so volume windows stay current. Cron is still **09:00 UTC**.

### One-pass 6-month history

Admin job `history_backfill` (starts **paused**):

* Walks every active sealed product and card
* Requests PPT `includeHistory=true&days=180`
* Inserts missing daily `price_snapshots` (stable noon-UTC `recorded_at` per day)
* Upserts `asset_market_stats` (`volume_7d` / `volume_30d` / `volume_180d`, `daily_tier`)

Cost is about **2 credits per single/sealed** (price + history) and **3** if eBay graded is needed. An API-plan key (~20k credits/day) cannot finish ~20k assets in one day; run chunks from `/admin` across days. Do not unpause this job until you intend to spend those credits.

Admin **Volume leaders** is the operator view of that table.

## Stale data

A current snapshot is **stale** when `now - recorded_at` exceeds **36 hours**.

Sync is scheduled daily. 36 hours is a one-miss buffer. Stale flags are informational in the asset browser. Trading still uses the latest stored snapshot when one exists (the server looks up the price; the client cannot submit a price). Competition settlement uses the 24-hour window + median method in `docs/settlement.md`, not an arbitrary last sale.

## History

Snapshots are insert-only. A re-run skips a day that already has a row for that asset (noon UTC key). The 6-month backfill is how charts get a real series; daily sync then adds/refreshes the priority set. UI still shows 14 days free / 90 with Pro from Packdraft snapshots, not a live PPT call.

## Settlement

See `docs/settlement.md`. Completed `tournament_results` are never recomputed from a later live tick.

## Failure behavior

If the provider errors, Packdraft keeps the last stored snapshot and records the sync error. It does not invent a price.

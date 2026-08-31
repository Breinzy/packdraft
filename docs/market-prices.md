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
| Sealed | `/sealed-products` | `unopenedPrice`, else TCGPlayer `prices.market` |
| Graded PSA 9 / PSA 10 | `/cards?includeEbay=true` | eBay `smartMarketPrice.price`, else average of comps |
| Ungraded singles | not ingested in this phase | — |

`price_type` records which field was used (`unopened`, `market`, `ebay_smart`, `ebay_average`).

## Current price

For an asset at time T (default now):

1. Select snapshots for `asset_id` with `recorded_at <= T`.
2. Take the latest `recorded_at`.
3. That row’s `price` is the Packdraft current price.

Do not reconstruct prices from holdings.

## Stale data

A current snapshot is **stale** when `now - recorded_at` exceeds **36 hours**.

Sync is scheduled daily. 36 hours is a one-miss buffer. Stale flags are informational in this phase (no trading yet). Later phases must refuse or warn on stale quotes before execution and settlement.

## History

Every sync **inserts** a new snapshot. Existing rows are not updated. This is how Packdraft answers “what was this worth at time T?”

## Settlement (not implemented)

Tournament settlement (Phase 10) must freeze prices at close and must not revalue completed results from a later live tick. Phase 15 will add volume floors, outlier filters, and a documented settlement window. Until then, do not treat “last provider tick” as a prize-grade settlement price.

## Failure behavior

If the provider errors, Packdraft keeps the last stored snapshot and records the sync error. It does not invent a price.

# Collector catalog wiring

The imported mockup UI (`app/components/*-view.tsx`, `asset-detail.tsx`, etc.) stays on its original data contract: synchronous `assets` / `sets` arrays and `getAsset` / `getSet` lookups in `app/lib/data.ts`.

It must not call PokemonPriceTracker or any other provider. Packdraft catalog APIs sit in between.

```
PokemonPriceTracker
  → normalize / ingest
  → assets + price_snapshots
  → /api/catalog/snapshot|sets|assets
  → hydrateCatalog()
  → mockup components
```

## What is real

* Asset identity, names, set membership, rarity / card number / sealed subtype from `assets.metadata`
* Current price, 7-day change, and volume from `asset_latest_prices` (latest `price_snapshots` row)
* Price history on the asset page: stored snapshots only, oldest → newest, not padded to 180 points
* Set lists and member counts from `sets` / `assets`

## What is not invented

* 24-hour change, 30-day change, and watcher counts are `0` until Packdraft stores those facts
* PSA grade quotes are omitted unless a graded catalog row exists as its own asset
* Collection and watchlist have **no server ledger** yet (roadmap Phases 24 and 26). The mock seed holdings are gone. Adds/watches stay in `localStorage` only and do not write Career, tournament, or market-event tables.

## Snapshot

`GET /api/catalog/snapshot` is a bounded market slice so the mockup can render without loading the full catalog:

* Latest quotes by 7-day change (gainers and losers)
* Sealed products
* Recently inserted assets
* Real search hits for the palette’s popular queries

Set pages fetch members via `GET /api/catalog/sets/:id` (capped). Asset pages fetch `GET /api/catalog/assets/:id` including recorded history.

Search still runs in memory over whatever has been hydrated. It is not a full-catalog search until the palette is wired to `/api/catalog/search`.

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
* Current price, 7-day change, and latest snapshot volume from `asset_latest_prices`
* Trailing 30-day PPT sales volume from `asset_market_stats.volume_30d` when the history backfill has written a row
* 24-hour and 30-day percent changes when an earlier snapshot exists
* Price history on the asset page: stored snapshots only, oldest → newest, not padded to 180 points
* Set index: sum of priced members (cards + sealed + graded) from `set_latest_indexes`

## What is not invented

* 24-hour / 30-day change stay `0` when Packdraft has no earlier snapshot
* Watcher counts are `0` until a watchlist ledger exists
* PSA grade quotes are omitted unless a graded catalog row exists as its own asset
* Collection and watchlist have **no server ledger** yet (roadmap Phases 24 and 26). The mock seed holdings are gone. Adds/watches stay in `localStorage` only and do not write Career, tournament, or market-event tables.

## Snapshot

`GET /api/catalog/snapshot` is a bounded market slice so the mockup can render without loading the full catalog:

* Latest quotes by 7-day change (gainers and losers)
* Sealed products
* Recently inserted assets
* Real search hits for the palette’s popular queries
* Every set’s current basket index and 30-day change

Set detail fetches members via `GET /api/catalog/sets/:id` (capped grid; full-basket index). Asset pages fetch `GET /api/catalog/assets/:id` including recorded history.

Search still runs in memory over whatever has been hydrated. It is not a full-catalog search until the palette is wired to `/api/catalog/search`.

## Set index

A Packdraft set index is a **derived basket**, not a provider quote.

* **Level** — sum of the latest `price_snapshots` price for every active set member with `price > 0`. Singles, graded rows, and sealed products all sit in the same basket.
* **30-day change** — same basket as-of now vs as-of 30 days ago (`set_indexes_at`). `0` when there is no prior basket.
* **History** — one point per UTC day that has at least one member snapshot, last observation carried forward across cards and sealed. Calendar days with no observation are not filled in.

The sets list reads `set_latest_indexes` so every expansion has an index without loading every card into the browser. The list sparkline uses real basket values sampled at 180d / 30d / 7d / now (`set_indexes_at`). Set detail still loads members for the grid (capped) while the index and observation-day history stay the full basket.

See `docs/market-prices.md`.

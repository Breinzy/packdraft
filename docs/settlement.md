# Packdraft — Settlement Methodology

Settlement is deterministic. After a competition is completed, historical results must not change when live prices move.

This applies to **tournaments** and **market events**. Career Mode is a live book; it is not settled this way.

## When tournament settlement runs

A tournament is eligible after `now >= trading_closes_at`.

Status path:

1. `active` → `locked` (trading disabled)
2. `locked` → `settling`
3. `settling` → `completed` (results stored, `settled_at` set)

`tick_tournaments()` (daily cron at 07:00 UTC, plus join/trade/read ticks) advances this path. Admins can settle a specific tournament.

## Settlement price (Phase 15)

Packdraft does **not** use an arbitrary last sale as the competition price.

For an asset at as-of time `T` (tournament: `trading_closes_at`; event start: `opens_at`; event end: `settles_at`):

1. Collect `price_snapshots` for that `asset_id` with `recorded_at` in **`[T − 24 hours, T]`** and `price > 0`. Every stored source in that window is included.
2. If **4 or more** prints exist, drop Tukey IQR outliers (fence `Q1 − 1.5·IQR` … `Q3 + 1.5·IQR`). Quartiles use the same linear interpolation as Postgres `percentile_cont`.
3. Aggregate the remaining prints:
   * **3+** → **median** (`percentile_cont(0.5)`), rounded to cents
   * **2** → **mean**, rounded to cents
   * **1** → that print
4. If the window is empty, **fallback** to the latest snapshot with `recorded_at <= T` and `price > 0`.
5. If that is also missing, settlement **fails**. Packdraft does not invent a price.

SQL: `packdraft_settlement_price(asset_id, as_of)`. TypeScript: `computeSettlementQuote` in `app/lib/market/settlement-price.ts`. They are meant to match.

Frozen tournament rows live on `tournament_settlement_prices`. Composite quotes (median/mean) store `price_snapshot_id` as null and `recorded_at` as `T`.

### Volume

`price_snapshots.volume` is stored when the provider sends it. It currently **defaults to 0** for unknown prints, so volume is **not** a hard exclude. A future filter can require a minimum once volume is reliable.

### Stale data

A UI quote is stale after **36 hours** (`docs/market-prices.md`). Settlement prefers the 24-hour window, so a single stale last sale outside that window is ignored unless the window is empty (fallback).

Daily catalog import runs at 08:00 UTC. Daily price sync runs at 09:00 UTC. Both are after PokemonPriceTracker’s 06:00 UTC regenerate. Tournament settlement at 07:00 UTC therefore uses stored snapshots as of close, not a later live tick.

## Tournament final value

For each participant:

```
holdings_value = Σ (quantity × settlement_price)
final_value    = cash + holdings_value
return_pct     = (final_value − starting_cash) / starting_cash × 100
```

Cash is the book’s remaining virtual cash. Quantity is the integer position at close.

## Tournament ranking

Unique ranks via `row_number()` ordered by:

1. `final_value` descending
2. `joined_at` ascending (earlier join wins ties)
3. `user_id` ascending

Tied values still receive distinct ranks.

## Market events

Start prices freeze at `opens_at` with the same function. End prices freeze at `settles_at`. Scores are computed in application code (`app/lib/events/scoring.ts`) and written to `market_event_results`. After `completed`, those rows do not change.

## Lock

Rows in `tournament_results` / `market_event_results` are the historical result. Completed standings are read from those tables only. They are not recomputed from later `price_snapshots`.

Trading RPCs refuse any tournament status other than `active`. Event entry RPCs refuse any status other than `open`.

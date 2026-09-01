# Packdraft — Settlement Methodology (MVP)

Settlement is deterministic. After a tournament is completed, historical results must not change when live prices move.

## When settlement runs

A tournament is eligible after `now >= trading_closes_at`.

Status path:

1. `active` → `locked` (trading disabled)
2. `locked` → `settling`
3. `settling` → `completed` (results stored, `settled_at` set)

`tick_tournaments()` (daily cron at 07:00 UTC, plus join/trade/read ticks) advances this path. Admins can settle a specific tournament.

## Settlement price

For every asset held in any tournament book:

1. Take `price_snapshots` for that `asset_id` with `recorded_at <= trading_closes_at`.
2. Use the latest such row.
3. Store it on `tournament_settlement_prices` (one row per tournament + asset).

If any holding has no snapshot at or before close, settlement **fails**. Packdraft does not invent a price.

Daily catalog import runs at 08:00 UTC. Daily price sync runs at 09:00 UTC. Both are after PokemonPriceTracker’s 06:00 UTC regenerate. Settlement at 07:00 UTC therefore uses the last stored snapshot as of close, not a later live tick.

## Final value

For each participant:

```
holdings_value = Σ (quantity × settlement_price)
final_value    = cash + holdings_value
return_pct     = (final_value − starting_cash) / starting_cash × 100
```

Cash is the book’s remaining virtual cash. Quantity is the integer position at close.

## Ranking

Unique ranks via `row_number()` ordered by:

1. `final_value` descending
2. `joined_at` ascending (earlier join wins ties)
3. `user_id` ascending

Tied values still receive distinct ranks.

## Lock

Rows in `tournament_results` are the historical result. Completed/archived standings are read from that table only. They are not recomputed from later `price_snapshots`.

Trading RPCs refuse any status other than `active`.

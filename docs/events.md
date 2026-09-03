# Packdraft — Predictions (Market Events)

**Product name:** Predictions.  
**Code/schema name:** Market Events (`market_events`, `/events`).

Under the collector-first roadmap, this is the prediction skill loop. It does not use collection, Sandbox, or tournament cash.

---

Market Events are temporary prediction competitions. They are not a portfolio and they do not use Career or tournament cash.

## Isolation

- No cash, positions, or transfers.
- Entries are a JSON payload on `market_event_entries`.
- Scoring uses frozen start/end settlement prices, not a live last sale.

## Types

| Type | Player submits | Score |
|---|---|---|
| `release_price` | Predicted USD price for one event asset | `max(0, 100 − abs(predicted − actual) / actual × 100)` |
| `direction` | One asset + up/down | 1 if the frozen end vs start matches; 0 on a tie or miss |
| `ranking` | Ordered list of every event asset | Spearman correlation mapped to 0–100 |
| `biggest_mover` | One asset | 1 if that asset has the max absolute % move (ties share the point) |

Ranks: higher score first, then earlier `submitted_at`, then `user_id`.

## Lifecycle

`upcoming` → `open` (freeze start prices at `opens_at`) → `locked` (no more entries) → `settling` → `completed` (freeze end prices, store results).

Daily cron `GET /api/cron/tick-tournaments` also ticks events. Admins can tick or settle from `/admin`.

Release weekends (`docs/releases.md`) can attach several events to a set-drop campaign. Scoring and cash isolation do not change.

## Writes

Authenticated `POST /api/events/enter` validates the payload, then calls `submit_market_event_entry` (service role). Clients cannot set scores or ranks.

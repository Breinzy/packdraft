# Packdraft — Career Mode

Career Mode is a persistent simulated book. It is not a tournament.

## Isolation

- One Career book per user.
- Starting cash is **$1,000**.
- Career cash and positions never enter a tournament.
- Tournament cash and positions never enter Career.
- Same Packdraft catalog and stored snapshots as tournaments. Virtual trades still do not move real TCG prices.

## Writes

Authenticated Next.js `/api/career/trade` calls service-role RPCs:

- `ensure_career_portfolio` — creates the $1,000 book on first visit
- `execute_career_trade` — server looks up the latest `price_snapshots` row; client never submits price or cash

Buy/sell math matches the tournament engine: integer quantity, weighted average cost, insufficient cash / holdings rejected.

## Valuation

Live value = remaining cash + Σ (quantity × latest stored snapshot).

`career_value_snapshots` records that mark when the book is created and after each fill. The Career chart is those points plus the current live value. It is not a tournament settlement freeze.

## Not in this phase

Levels, archetypes, milestones, career leaderboards, and Market Events. Tournament history stays on `/players/[id]`.

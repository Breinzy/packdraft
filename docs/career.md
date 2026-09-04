# Packdraft — Sandbox (Career Mode)

**Product name:** Sandbox.  
**Code/schema name:** Career Mode (`career_*` tables, `/api/career/trade`).

Under the collector-first roadmap, this is **not** the user’s real collection. It is a persistent virtual strategy-testing book, isolated from Collection and from every tournament.

Do not merge these tables into a collection ledger. Phase 24 adds collection tracking separately.

---

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

## Progression (Phase 13)

Derived on read from the Career ledger and snapshots. Nothing here writes tournament tables.

- **Milestones / levels** from peak marked value: $2k, $5k, $10k, $25k, $100k, $1M (Rookie → Legend).
- **Archetype** from current cash vs holdings mix (sealed / singles / graded).
- **Stats** include trade counts, realized P&L (same average-cost replay as player history, this book only), streak of consecutive UTC days with a career fill.
- **Challenges / badges** are checklists on `/career`.
- **Historical ranking** is `get_career_standings()` — live marked Career value, public rank + handle only. Positions and cash stay RLS-private. `/players/[id]` remains tournament history.

Market Events are a separate product (`docs/events.md`). Do not mix Career cash into an event.

Release weekends (`docs/releases.md`) can attach Career-independent prediction events next to a tournament. Still no cash transfer.


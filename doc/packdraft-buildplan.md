# Packdraft — Build Plan

---

## Cursor Starting Prompt

Paste this into Cursor Composer (Cmd+I) to kick off the project:

```
Build a full-stack web app called Packdraft — a fantasy trading game for Pokemon TCG sealed products. Think fantasy football but for Pokemon cards. Users get $1000 in fantasy dollars, pick up to 20 units of sealed products (each unit occupies one slot), and compete in leagues of 20 players over a 7-day window. The player whose portfolio has grown the most in value by end of week wins.

Tech stack:
- Next.js 14 (App Router)
- Supabase (auth, database, cron)
- Tailwind CSS
- TypeScript

Core rules:
- $1000 starting budget, no fractional purchases
- 20 slots max, each unit of a product costs one slot
- No single product can exceed 10 slots (50% of total)
- Unspent cash decays at 1% over the 7-day contest window
- Prices locked at contest start, evaluated at contest end
- Price source: TCGPlayer market price (sealed products only for v1)
- Leagues of 20 players, auto-assigned on signup, global leaderboard runs alongside

Eligible products (v1 — sealed only):
- Booster Boxes
- Elite Trainer Boxes (ETB)
- Premium Collection ETBs
- Booster Bundles
- UPCs (Ultra Premium Collections)

Build in this exact order:
1. Supabase schema (users, leagues, portfolios, portfolio_items, products, price_snapshots tables)
2. Auth (email/password, auto-assign league on signup)
3. Portfolio builder UI (reference component attached)
4. Leaderboard page (league + global)
5. TCGPlayer price sync (manual trigger for now, cron later)

For the UI, use a dark trading terminal aesthetic — monospace font, muted dark background, purple/yellow accents. Reference the attached component for layout and feature details. Make it feel like Bloomberg meets Pokemon.

Start with the Supabase schema and show me the SQL before creating any files.
```

Then attach the portfolio-builder.jsx file as context.

---

## Roadmap

### Phase 1 — Core Loop (Weeks 1–2)
Get one complete playable contest working end to end.

- [ ] Supabase schema
- [ ] Email auth + league auto-assignment
- [ ] Product catalog (manual seed data for v1, ~30 sealed products)
- [ ] Portfolio builder UI
- [ ] Price snapshot system (manual trigger)
- [ ] Contest start/end logic
- [ ] Leaderboard (league + global)
- [ ] Deploy to Vercel + connect packdraft.app domain

### Phase 2 — Polish (Weeks 3–4)
Make it feel real and shareable.

- [ ] Portfolio reveal on contest end (show everyone's picks)
- [ ] Weekly results page with winner callout
- [ ] Best-fit suggestion ("You have $34 left — add a Booster Bundle?")
- [ ] Email notifications (contest start, end, results)
- [ ] Mobile responsive pass
- [ ] TCGPlayer API integration (replace manual seed data)
- [ ] Automated price sync via Supabase cron

### Phase 3 — Growth (Month 2+)
Add reasons to come back every week.

- [ ] Win/loss history per user
- [ ] Global leaderboard with all-time rankings
- [ ] Social sharing card for results ("I finished #1 in League Alpha-7")
- [ ] PSA 9 + PSA 10 graded cards support
- [ ] Additional TCGs (MTG, One Piece, Lorcana)
- [ ] Paid entry tournaments with prize pools (requires legal review first)

---

## File Structure

```
packdraft/
├── app/
│   ├── layout.tsx                  # Root layout, fonts, global styles
│   ├── page.tsx                    # Landing / home page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── draft/
│   │   └── page.tsx                # Portfolio builder (main game screen)
│   ├── league/
│   │   └── [leagueId]/page.tsx     # League leaderboard
│   ├── leaderboard/
│   │   └── page.tsx                # Global leaderboard
│   └── results/
│       └── [contestId]/page.tsx    # End of week results + reveal
│
├── components/
│   ├── portfolio/
│   │   ├── PortfolioBuilder.tsx    # Main builder UI
│   │   ├── ProductList.tsx         # Market / product browser
│   │   ├── ProductRow.tsx          # Single product row
│   │   ├── PortfolioPanel.tsx      # Right panel — slots, budget, submit
│   │   ├── BudgetGauge.tsx         # Budget allocation bar
│   │   └── BestFitSuggestion.tsx   # "You have $X left" nudge
│   ├── leaderboard/
│   │   ├── LeagueTable.tsx
│   │   └── GlobalTable.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Ticker.tsx              # League info / countdown bar
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       └── StatCard.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── schema.sql              # Full schema — run this first
│   ├── tcgplayer/
│   │   ├── client.ts               # TCGPlayer API wrapper
│   │   └── sync.ts                 # Price snapshot sync logic
│   ├── contest/
│   │   ├── scoring.ts              # Portfolio value calculation
│   │   └── leagueAssignment.ts     # Auto-assign user to league
│   └── utils.ts
│
├── types/
│   └── index.ts                    # Shared TypeScript types
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── sync-prices/index.ts    # Edge function for price cron
│
└── public/
    └── og-image.png                # Social share image
```

---

## Supabase Schema (give this to Cursor after it generates it to verify)

Tables you need:

**users** — extends Supabase auth.users
- id, email, created_at, current_league_id

**leagues**
- id, name (e.g. "Alpha-7"), created_at, contest_id, player_count, is_full

**contests**
- id, starts_at, ends_at, status (pending/active/complete), price_snapshot_start_id, price_snapshot_end_id

**products**
- id, name, set_name, type (booster_box/etb/bundle/upc/premium), tcgplayer_id, is_active

**price_snapshots**
- id, product_id, price, recorded_at, source (tcgplayer)

**portfolios**
- id, user_id, contest_id, submitted_at, is_locked, final_value, final_rank_league, final_rank_global

**portfolio_items**
- id, portfolio_id, product_id, quantity, price_at_lock

---

## Key Rules to Remind Cursor About

If Cursor loses context mid-build, paste this:

```
Packdraft rules:
- $1000 budget, whole units only, no fractional buying
- 20 slots, each unit = 1 slot, max 10 slots per product
- Cash left over decays 1% over 7 days (factor into final score)
- Scoring: final portfolio value = (units × end price) + (remaining cash × 0.99)
- Prices pulled from TCGPlayer, locked at contest start
- Leagues of 20, auto-filled on signup, global leaderboard runs in parallel
- Portfolios hidden until contest ends, then fully revealed
```

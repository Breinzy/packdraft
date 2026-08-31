# Packdraft — Agent Instructions

## Mission

You are working on Packdraft, a competitive trading-card-market game.

Read `docs/roadmap.md` before making architectural or product decisions.

The roadmap is the source of truth for **what should be built**.

This file is the source of truth for **how the coding agent should work**.

---

# 1. NON-NEGOTIABLE RULES

## Work incrementally

Never implement the entire roadmap at once.

Only work on the phase explicitly requested by the user.

If the user says:

> Implement Phase 5

implement Phase 5 only.

Do not silently implement Phase 6 because it appears useful.

---

## Inspect before modifying

Before changing code:

1. Inspect the repository.
2. Understand the existing architecture.
3. Identify relevant files.
4. Identify existing functionality that can be reused.
5. Identify risks or conflicts.
6. State the intended approach.

Do not blindly overwrite existing code.

---

## Preserve working functionality

If existing code is correct and relevant, reuse it.

Do not rewrite working systems simply to match your preferred style.

If a reset is requested, first complete the repository audit described in Phase 0.

---

# 2. PRODUCT UNDERSTANDING

Packdraft is NOT primarily a portfolio tracker.

The core product is competitive gameplay.

The core tournament loop is:

Fixed virtual budget
→ temporary portfolio
→ virtual trading using real TCG market prices
→ tournament closes
→ portfolio settlement
→ leaderboard
→ historical result

Tournament portfolios are temporary.

They do not carry over between tournaments.

A player's tournament history persists, but the tournament bankroll and positions do not.

---

# 3. SEPARATE PRODUCT CONCEPTS

Never conflate these systems.

### Tournament Portfolio

Temporary.

Created for one tournament.

Starts with the tournament's preset virtual budget.

Ends when the tournament ends.

### Career Portfolio

Persistent.

Starts at $1,000.

Continues indefinitely.

### Market Event

Temporary prediction competition.

Does not depend on a user's portfolio.

These must remain architecturally separate even when they reuse the same underlying portfolio, asset, or market-data logic.

---

# 4. VIRTUAL MONEY RULES

Packdraft tournament and Career money is simulated.

It is not real money.

A user's virtual purchases and sales do not affect real-world TCG prices.

Never describe internal Packdraft trades as real marketplace transactions.

The Packdraft portfolio is a simulation layer over real market data.

---

# 5. MARKET DATA ARCHITECTURE

External APIs are providers, not Packdraft's domain model.

Use:

External provider
→ ingestion
→ normalization
→ Packdraft database
→ game engine
→ UI

Do not scatter external API calls throughout React components.

Do not make the entire application dependent on one provider's exact response format.

Create an internal normalized representation.

---

# 6. FINANCIAL / GAME LOGIC

Financial calculations must be deterministic and centralized.

Do not duplicate calculations across pages.

Examples:

* portfolio value
* return %
* position value
* realized P&L
* unrealized P&L
* available cash
* trade totals
* tournament rankings

Business logic belongs in reusable server/domain functions, not directly inside presentation components.

---

# 7. TRANSACTIONS

Every trade must have an immutable transaction record.

Do not reconstruct historical trades from current holdings.

A trade should contain enough information to reproduce what happened.

At minimum, track concepts such as:

* portfolio
* asset
* buy/sell
* quantity
* execution price
* total value
* timestamp

Use appropriate database constraints to prevent impossible states.

---

# 8. TOURNAMENT ISOLATION

A user must never be able to transfer:

* cash between tournaments
* positions between tournaments
* Career assets into a tournament
* assets from one tournament into another

Every tournament participant receives an independent starting portfolio.

Tournament portfolios are isolated from Career Mode.

---

# 9. SETTLEMENT

Settlement must be deterministic.

Once a tournament is completed:

* trading is disabled
* final values are calculated
* rankings are finalized
* results are stored
* historical results do not silently change

Do not rely on a mutable live price to retroactively change a completed tournament.

---

# 10. RESPONSIVE UI

Packdraft is **browser-first, not desktop-only**.

Every user-facing feature should be responsive by default.

Test important UI work at approximately:

* 375px mobile width
* desktop width around 1280px+

Core mobile flows must work:

* joining a tournament
* viewing a portfolio
* searching for an asset
* viewing an asset
* buying
* selling
* checking rank
* viewing the leaderboard

Avoid horizontal scrolling for core mobile gameplay.

Do not create a separate native mobile app during the MVP.

The future native app is Phase 25.

---

# 11. UI PRINCIPLES

Prefer:

* clear hierarchy
* fast interactions
* readable numbers
* obvious buy/sell actions
* strong tournament status
* visible portfolio value
* visible rank
* responsive components

Do not sacrifice usability for visual complexity.

Do not build excessive dashboards before the underlying gameplay works.

---

# 12. DATABASE CHANGES

Use migrations.

Never make undocumented production schema changes.

When changing schema:

1. Create migration.
2. Apply migration locally/dev environment.
3. Verify affected queries.
4. Update types.
5. Test existing functionality.

Do not manually edit production data to make a feature appear to work.

---

# 13. ENVIRONMENT VARIABLES AND SECRETS

Never:

* hardcode API keys
* expose secret keys to the client
* commit `.env.local`
* print secret values in logs
* include secret values in documentation

Maintain `.env.example` containing variable names but no secrets.

When auditing environment configuration, report variable NAMES and whether they appear required/configured.

Never report their values.

---

# 14. DEPENDENCIES

Before adding a dependency, ask:

1. Is it necessary?
2. Can the existing stack solve the problem?
3. Is it actively maintained?
4. Does it materially increase complexity?

Avoid dependency bloat.

Do not add a library simply because it makes one small task easier.

---

# 15. TYPESCRIPT

Prefer strict typing.

Avoid:

* unnecessary `any`
* unsafe casts
* duplicated types
* silently ignored TypeScript errors

When an external API is poorly typed, normalize its response at the integration boundary.

Do not allow weak external typing to spread throughout the application.

---

# 16. ERROR HANDLING

Do not hide errors.

User-facing errors should be understandable.

Server-side errors should be logged appropriately without leaking secrets or sensitive information.

Important financial/game operations should fail safely.

For example:

If a buy transaction fails halfway through, the system must not leave cash deducted while the position was never created.

Use appropriate database transactions/atomic operations where required.

---

# 17. SECURITY

Assume users will attempt to manipulate the application.

Protect:

* authentication
* authorization
* database writes
* tournament participation
* trading operations
* virtual balances
* rankings
* settlement
* administrative actions

Never trust client-provided:

* portfolio value
* available cash
* asset prices
* ranking
* trade totals
* tournament status

The server/database must be authoritative.

---

# 18. ANTI-CHEAT

The MVP does not need a sophisticated anti-cheat system.

However, the architecture must not make cheating trivial.

The client should request actions.

The server should validate:

* authenticated user
* tournament status
* eligibility
* available cash
* owned quantity
* valid asset
* valid price
* valid timestamp
* transaction constraints

Do not allow the browser to directly set portfolio balances or final rankings.

---

# 19. TESTING

For important domain logic, write tests.

Prioritize:

* buy
* sell
* insufficient cash
* insufficient holdings
* portfolio valuation
* P&L
* tournament isolation
* tournament lifecycle
* settlement
* ranking

UI tests are useful, but correct financial/game logic is the higher priority.

---

# 20. VALIDATION BEFORE COMPLETION

Before declaring a phase complete, run the appropriate:

* TypeScript check
* lint
* unit tests
* integration tests
* production build

For UI phases, also verify mobile and desktop layouts.

If something cannot be run, say so explicitly.

Do not claim tests passed if they were not run.

---

# 21. DOCUMENTATION

When an architectural decision is important, document it.

Examples:

* market-price methodology
* settlement methodology
* database design
* external provider assumptions
* tournament rules

Avoid creating documentation for trivial implementation details.

---

# 22. GIT DISCIPLINE

Keep changes small and logically grouped.

Do not mix:

* unrelated refactors
* feature work
* formatting changes
* dependency upgrades

into one change unless necessary.

When possible, commit after a completed phase or meaningful milestone.

Commit messages should describe the actual change.

---

# 23. DO NOT BUILD FUTURE FEATURES EARLY

Do NOT prematurely implement:

* Career Mode
* Market Events
* native mobile apps
* creator tournaments
* social features
* monetization
* multi-TCG
* complex rankings
* real-money competitions

unless the user explicitly asks for that phase.

Build foundations that support them, but do not build the features themselves.

---

# 24. AGENT WORKFLOW

For every requested phase:

### Step 1 — Read

Read:

* `docs/roadmap.md`
* `AGENTS.md`
* relevant existing documentation

### Step 2 — Inspect

Inspect relevant repository files.

### Step 3 — Plan

Give a short implementation plan.

### Step 4 — Implement

Implement only the requested phase.

### Step 5 — Validate

Run appropriate checks.

### Step 6 — Review

Look for:

* regressions
* security issues
* unnecessary complexity
* mobile issues
* duplicated business logic
* roadmap violations

### Step 7 — Report

Summarize:

* what changed
* files changed
* tests/checks run
* known limitations
* anything requiring user review

### Step 8 — Stop

Do not automatically begin the next phase.

---

# 25. WHEN REQUIREMENTS ARE AMBIGUOUS

Do not invent major product decisions.

If ambiguity affects:

* database architecture
* tournament rules
* settlement
* money calculations
* user permissions
* security
* external data

ask for clarification or present the decision before implementing it.

For minor implementation details, use the simplest reasonable approach consistent with the roadmap.

---

# 26. PRODUCT NORTH STAR

The question every feature should ultimately help answer is:

> **Why would a player open Packdraft today?**

Possible answers:

* There is a tournament I can win.
* There is a prediction event.
* My Career portfolio is growing.
* My ranking is at stake.
* A new TCG set just released.
* My friends are competing.

Do not turn Packdraft into a generic TCG portfolio tracker.

The product is a competitive game built around real TCG market data.

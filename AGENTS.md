# Packdraft — Agent Instructions

## Mission

You are working on Packdraft, a Pokémon TCG portfolio and investing platform with competitive game mechanics.

Read `docs/roadmap.md` before making architectural or product decisions.

The roadmap is the source of truth for **what should be built**.

This file is the source of truth for **how the coding agent should work**.

The previous competitive-game roadmap is obsolete as product direction. Do not continue it. Start from **Phase 21** unless the user names a later phase.

---

# 1. NON-NEGOTIABLE RULES

## Work incrementally

Never implement the entire roadmap at once.

Only work on the phase explicitly requested by the user.

If the user says:

> Implement Phase 24

implement Phase 24 only.

Do not silently implement Phase 25 because it appears useful.

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

Do not rewrite working backend functionality simply because the roadmap changed.

Do not delete useful functionality without justification.

If a product reset is requested, first complete the repository audit described in Phase 21 (`docs/MVP_AUDIT.md`).

---

# 2. PRODUCT UNDERSTANDING

Packdraft is **not** primarily a fantasy-trading game.

The core utility is tracking and understanding Pokémon TCG investments.

The product combines four pillars:

1. **Utility** — a genuinely useful free collection/portfolio tracker.
2. **Competition** — tournaments using real Pokémon market prices.
3. **Experimentation** — sandbox strategy testing with virtual capital.
4. **Intelligence** — Pro-tier analysis and decision support.

Game mechanics are an engagement layer on top of the tracker.

The free product must be good enough to use without paying. Pro sells advanced intelligence, not basic tracking.

Focus exclusively on Pokémon TCG through the entire MVP.

Do not add other TCGs, sports cards, or multi-game catalogs until the Pokémon MVP is complete and the user asks for that work.

---

# 3. SEPARATE PRODUCT CONCEPTS

Never conflate these systems.

### Collection / portfolio (free utility)

Persistent tracking of a user’s real Pokémon holdings.

Users record quantity, purchase price, and purchase date.

Values follow Packdraft market data.

This is **not** a Packdraft marketplace and **not** a tournament book.

### Tournament portfolio

Temporary.

Created for one tournament.

Starts with the tournament’s preset virtual budget.

Ends when the tournament ends.

### Sandbox portfolio

Persistent or session-based virtual strategy-testing book.

Uses virtual capital.

Isolated from collection holdings and from every tournament.

### Predictions

Skill track record around Pokémon market behavior.

Does not require transferring collection or tournament assets.

Resolution uses Packdraft market data.

### Pro intelligence

Analysis layered on Packdraft data.

Does not change cash, prices, ranks, or tournament outcomes.

Existing Career Mode, Market Events, and similar systems from the old roadmap may map onto Collection, Sandbox, or Predictions. Do not merge or rename them until Phase 21’s audit says how.

These systems may reuse the same underlying asset, price, or portfolio-engine code. They must remain architecturally separate.

---

# 4. MONEY RULES

Distinguish **recorded cost basis** from **virtual money**.

Collection tracking stores the user’s stated purchase prices. That is bookkeeping against market data. It is not Packdraft buying or selling cards in the real world.

Tournament and Sandbox money is simulated. It is not real money.

A user’s Packdraft purchases and sales do not affect real-world TCG prices.

Never describe internal Packdraft trades as real marketplace transactions.

Never build real-money trading, bank connections, or a physical-card marketplace during the MVP.

The Packdraft portfolio layer is a simulation and tracking layer over real market data.

---

# 5. MARKET DATA ARCHITECTURE

External APIs are providers, not Packdraft’s domain model.

Use:

External provider
→ ingestion
→ normalization
→ Packdraft database
→ application / game engine
→ UI

Keep **product data**, **market data**, **user portfolio data**, and **analytics** separate.

Do not scatter external API calls throughout React components.

Do not make the entire application dependent on one provider’s exact response format.

Create an internal normalized representation.

Design interfaces so another TCG could be added later, but do not implement other TCGs.

Never expose fabricated market data.

---

# 6. FINANCIAL / GAME LOGIC

Financial calculations must be deterministic and centralized.

Do not duplicate calculations across pages.

Examples:

* portfolio value
* cost basis
* return %
* position value
* realized P&L
* unrealized P&L
* available cash
* trade totals
* tournament rankings
* prediction accuracy

Business logic belongs in reusable server/domain functions, not directly inside presentation components.

Do not create fake precision where the underlying data does not support it.

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

Collection add/edit/remove events that change cost basis or quantity also need durable records.

Use appropriate database constraints to prevent impossible states.

---

# 8. PORTFOLIO ISOLATION

A user must never be able to transfer:

* cash between tournaments
* positions between tournaments
* collection holdings into a tournament
* collection holdings into Sandbox
* Sandbox assets into a tournament
* assets from one tournament into another

Every tournament participant receives an independent starting portfolio.

Tournament portfolios are isolated from Collection and Sandbox.

---

# 9. SETTLEMENT

Settlement must be deterministic.

Once a tournament is completed:

* trading is disabled
* final values are calculated
* rankings are finalized
* results are stored
* historical results do not silently change

The same rule applies to resolved predictions: outcomes lock and do not silently change with a later live price.

Do not rely on a mutable live price to retroactively change a completed tournament or resolved prediction.

---

# 10. RESPONSIVE UI

Packdraft is **browser-first, not desktop-only**.

Every user-facing feature should be responsive by default.

Test important UI work at approximately:

* 375px mobile width
* desktop width around 1280px+

Core mobile flows must work:

* adding a holding
* viewing a portfolio
* searching for an asset
* viewing an asset
* joining a tournament
* buying / selling in tournament or sandbox
* checking rank
* viewing the leaderboard

Avoid horizontal scrolling for core mobile flows.

Do not create a native mobile app during the MVP. Native apps are deferred.

Never regress existing mobile functionality.

---

# 11. UI PRINCIPLES

The UI should feel like a premium dark investment platform with light gamification.

It should **not** feel like a generic SaaS dashboard, a children’s Pokémon site, a stock-trading clone, or a gambling product.

Prefer:

* clear hierarchy
* fast interactions
* readable numbers
* obvious add / buy / sell actions
* visible portfolio value
* visible cost basis and return
* strong tournament status
* visible rank
* responsive components
* the shared Packdraft design system

Do not sacrifice usability for visual complexity.

Do not invent one-off styling when a design-system component exists.

After Phase 22, all new UI must use that system.

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
* collection / portfolio writes
* tournament participation
* trading operations
* virtual balances
* rankings
* settlement
* Pro entitlements
* administrative actions

Never trust client-provided:

* portfolio value
* available cash
* asset prices
* ranking
* trade totals
* tournament status
* Pro status

The server/database must be authoritative.

Do not expose sensitive data to clients unnecessarily.

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
* Pro entitlement when a Pro-only action is requested

Do not allow the browser to directly set portfolio balances, final rankings, or subscription state.

---

# 19. TESTING

For important domain logic, write tests.

Prioritize:

* add / edit / remove holdings
* cost basis
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
* prediction resolution
* portfolio isolation between collection, sandbox, and tournaments

UI tests are useful, but correct financial and data logic is the higher priority.

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

Never claim a phase is complete without verifying the actual implementation.

---

# 21. DOCUMENTATION

When an architectural decision is important, document it.

Examples:

* market-price methodology
* settlement methodology
* database design
* external provider assumptions
* tournament rules
* collection vs sandbox vs tournament isolation
* Pro entitlement rules

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

* other TCGs
* native mobile apps
* social network / messaging
* real-money trading or marketplace
* bank connections
* gambling or prediction-market mechanics
* pay-to-win tournament mechanics
* Stripe / Pro AI features before their phase
* advanced achievements or complex career progression
* enterprise/API products

unless the user explicitly asks for that phase.

Build foundations that support later phases, but do not build the features themselves.

Do not paywall basic collection tracking.

Do not implement AI that fabricates prices or guarantees profitable trades.

---

# 24. AGENT WORKFLOW

For every requested phase:

### Step 1 — Read

Read:

* `docs/roadmap.md`
* `AGENTS.md`
* `docs/MVP_AUDIT.md` if it exists
* relevant existing documentation

### Step 2 — Inspect

Inspect relevant repository files.

### Step 3 — Plan

Give a short implementation plan.

For major architectural changes, explain the reasoning before implementing.

### Step 4 — Implement

Implement only the requested phase.

Use reusable components and existing architecture where possible.

Do not create duplicate systems for functionality that already exists.

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
* fabricated or provider-coupled market data

### Step 7 — Report

Summarize:

* what was completed
* files / components changed
* database changes
* tests / checks run
* remaining issues
* recommended follow-up work
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
* Free vs Pro boundary

ask for clarification or present the decision before implementing it.

For minor implementation details, use the simplest reasonable approach consistent with the roadmap.

---

# 26. PRODUCT NORTH STAR

The Pokémon MVP should make a user think:

1. Packdraft is the place I track my Pokémon investments.
2. I can compete with other investors here.
3. I can test strategies without risking money.
4. I want Packdraft Pro because it actually helps me understand my portfolio.

Every feature should strengthen **utility**, **competition**, **experimentation**, or **intelligence**.

Do not build features merely because they sound impressive.

Build the best free Pokémon TCG investment tracker possible, then layer competitive gameplay and premium investment intelligence on top.

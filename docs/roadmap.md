# Packdraft — Development Roadmap

## 0. Product Definition

Packdraft is a competitive trading-card-market game.

Players compete using virtual money to build portfolios of real TCG assets whose values are determined by external market prices.

Packdraft is **not primarily a collection tracker**.

The core experience is:

> Receive a fixed virtual budget → build a portfolio → trade real TCG assets using virtual money → market prices change → finish with the highest portfolio value → compete on a leaderboard.

The initial TCG is Pokémon.

The architecture should eventually support other TCGs without rebuilding the game engine.

---

# 1. Product Modes

Packdraft will eventually have three major modes.

## 1.1 Tournament Mode — CORE PRODUCT

A tournament creates a **temporary portfolio** for each participant.

Example:

* Starting budget: $10,000
* Duration: 7 days
* Asset universe: Pokémon singles + sealed
* Entry: Free
* Winner: highest final portfolio value

A player joins the tournament and receives the tournament's starting cash.

They can buy and sell eligible assets during the trading period.

When the tournament ends:

1. Trading stops.
2. All positions are valued using the tournament's settlement prices.
3. Final portfolio values are calculated.
4. Players are ranked.
5. Winners are determined.
6. The tournament becomes historical/archived.
7. The player starts with a fresh portfolio in the next tournament.

### Important

Tournament portfolios are **NOT persistent**.

A player's tournament bankroll does not carry into another tournament.

A player cannot transfer positions or cash between tournaments.

Each tournament is an isolated competition.

---

## 1.2 Career Mode — POST-MVP

Career Mode is a persistent simulated investment career.

The player starts with:

**$1,000**

The portfolio persists indefinitely.

The player attempts to grow:

$1,000 → $2,000 → $10,000 → $100,000 → $1,000,000+

Career Mode should eventually include:

* persistent portfolio
* lifetime P&L
* trade history
* career statistics
* achievements
* investor archetype
* career milestones
* historical performance
* rankings/leaderboards
* optional challenges

Career Mode is **NOT a tournament**.

There is no scheduled reset.

Career Mode should eventually feel more like an NBA 2K MyCareer/Madden-style progression system than a portfolio tracker.

---

## 1.3 Market Events — POST-MVP

Market Events are temporary prediction competitions tied to real TCG events.

Examples:

### Release Event

Predict the price of the biggest chase cards one week after release.

### Price Direction

Predict whether an asset rises or falls.

### Ranking

Rank five chase cards by their future price.

### Biggest Mover

Predict which asset will gain the most percentage value.

Market Events are separate from portfolio tournaments.

They may use external market prices as the outcome/oracle.

---

# 2. MVP OBJECTIVE

The MVP must prove one thing:

> **Can people have fun competing against each other by managing a temporary virtual TCG portfolio using real market prices?**

The MVP should contain ONLY the functionality required to prove this.

### MVP loop

1. User creates account.
2. User views available tournaments.
3. User joins tournament.
4. User receives starting virtual cash.
5. User browses eligible Pokémon assets.
6. User buys assets.
7. User sells assets.
8. Portfolio value changes as market prices change.
9. User sees their current ranking.
10. Tournament closes.
11. Final portfolios are calculated.
12. Final leaderboard is displayed.
13. Tournament is archived.

If this loop is not fun, additional features will not save the product.

### What is NOT in the MVP

Do not treat later numbered phases as work that must happen before a playable game.

Out of MVP:

* Career Mode and career progression
* Market Events
* Richer player identity / achievements than a basic history page
* Social features, creator tournaments, monetization
* Native apps, multi-TCG, advanced rankings, analytics

The tournament loop above is the product until it is fun.

---

# 3. TECH STACK

Use the existing project stack if it already matches this architecture.

Preferred stack:

* Next.js
* TypeScript
* Tailwind CSS
* Supabase
* PostgreSQL
* Supabase Auth
* Vercel

Do not introduce additional frameworks or services unless there is a clear technical requirement.

Prefer simple solutions.

Avoid premature abstraction.

---

# 4. REPOSITORY RULES

The repository must remain understandable to a human developer.

The agent must:

* inspect existing code before modifying it
* avoid unnecessary rewrites
* avoid unrelated changes
* avoid unnecessary dependencies
* never hardcode secrets
* never expose secrets
* never commit `.env.local`
* maintain `.env.example`
* use database migrations for schema changes
* preserve type safety
* avoid duplicated business logic
* keep external API integrations isolated
* keep business logic separate from UI
* write reusable functions for financial calculations
* verify work before declaring a phase complete

Do not implement future roadmap phases unless explicitly instructed.

---

# 5. PHASE 0 — REPOSITORY AUDIT AND RESET

## Objective

Understand the existing repository before rebuilding.

### Tasks

1. Inspect the complete repository.
2. Identify the current framework and dependencies.
3. Identify existing routes/pages.
4. Identify existing components.
5. Identify database schema.
6. Identify Supabase migrations.
7. Identify authentication.
8. Identify external API integrations.
9. Identify environment variable NAMES.
10. Identify existing working functionality.
11. Identify incomplete functionality.
12. Identify obsolete/dead code.
13. Identify code worth preserving.

Never expose secret environment variable values.

Create:

`docs/repository-audit.md`

The audit must clearly categorize:

* KEEP
* REBUILD
* DELETE
* UNKNOWN

### Reset

After the audit has been reviewed/approved:

Remove obsolete application code while preserving:

* Git history
* useful configuration
* valid environment setup
* verified database configuration
* useful migrations
* reusable code that is demonstrably correct

Create a clean foundation.

### Definition of done

The repository has:

* clean build
* clean TypeScript
* clean lint
* documented environment variables
* documented database state
* no unexplained legacy features
* no unnecessary dependencies

---

# 6. PHASE 1 — APPLICATION FOUNDATION + RESPONSIVE DESIGN SYSTEM

## Objective

Create a stable application shell that works well on both desktop and mobile browsers.

Packdraft is **browser-first**, but it is NOT desktop-only.

The first public product should be a responsive web application that provides a high-quality experience on:

* desktop PC
* laptop
* tablet
* mobile phone

**Do NOT build a separate native iOS/Android application during the MVP.**

### Build

* Next.js application structure
* TypeScript configuration
* Tailwind
* Supabase client/server configuration
* environment validation
* authentication
* user profiles
* basic navigation
* loading states
* error states
* responsive layout system
* responsive typography
* responsive spacing
* reusable mobile/desktop components where appropriate

### Authentication

Users can:

* sign up
* log in
* log out
* remain authenticated
* access protected pages

### Responsive requirements

The MVP must support approximately:

**Desktop**

* 1280px+
* mouse/keyboard-friendly interactions
* tables/charts may use additional horizontal space

**Mobile**

* approximately 375px+
* touch-friendly controls
* no horizontal scrolling for core workflows
* mobile-friendly cards and holdings
* appropriate use of bottom navigation or compact navigation
* trading actions optimized for small screens

### Critical mobile flows

These must work extremely well on a phone:

1. Join tournament
2. View tournament portfolio
3. Search for an asset
4. View asset
5. Buy
6. Sell
7. Check portfolio value/rank
8. View leaderboard

Mobile must be treated as a first-class viewport during development, not as a final cleanup task.

### Definition of done

A new user can:

Sign up → log in → access dashboard → log out.

The application is usable on both desktop and mobile browsers.

No trading functionality yet.

---

# 7. PHASE 2 — DATABASE FOUNDATION

## Objective

Create the core data model.

The database must separate:

1. market data
2. game data
3. user data
4. tournament state
5. career state
6. prediction events

Do not mix these concepts.

---

## Initial conceptual schema

### Users

`profiles`

Stores Packdraft-specific user information.

### TCGs

`tcgs`

Examples:

* Pokémon
* later: MTG
* later: One Piece
* later: Yu-Gi-Oh!
* etc.

### Sets

`sets`

A set belongs to a TCG.

### Assets

`assets`

An asset represents something that can be traded inside Packdraft.

Examples:

* Pokémon single
* sealed booster box
* ETB
* booster bundle

Suggested fields:

* id
* tcg_id
* set_id
* name
* asset_type
* external_id
* image_url
* metadata
* active

Do not assume the external provider's schema is Packdraft's schema.

### Price Snapshots

`price_snapshots`

Stores historical market prices.

Suggested conceptual fields:

* asset_id
* price
* timestamp
* source
* condition
* market/price type
* metadata

Historical price data is critical.

Packdraft must be able to determine what an asset was worth at a particular point in time.

---

# 8. PHASE 3 — MARKET DATA LAYER

## Objective

Create a reliable internal market-data system.

External APIs are **DATA PROVIDERS**.

They should not become the application's internal data model.

Architecture:

External Provider(s)
→ ingestion layer
→ normalization
→ Packdraft database
→ game engine

The game engine should interact with Packdraft's normalized data rather than directly depending on an external API.

### Requirements

Build:

* provider interface
* asset synchronization
* price synchronization
* normalized asset records
* historical price snapshots
* timestamps
* source tracking
* error handling
* stale-data detection

The system must know:

> What is the current price?

and:

> What was the price at a specific historical time?

---

# 9. PHASE 4 — ASSET BROWSER

## Objective

Allow players to discover assets available for trading.

Build:

* asset search
* asset filtering
* asset detail page
* image
* current market price
* price history
* asset type
* set
* TCG

Initial MVP filters:

* Pokémon set
* singles/sealed
* search

Do not build advanced analytics yet.

All screens must remain responsive on mobile.

---

# 10. PHASE 5 — PORTFOLIO ENGINE

## Objective

Build the core trading engine.

This is one of the most important phases.

The portfolio engine must support:

### Cash

Every portfolio has cash.

### Positions

A portfolio can own quantities of assets.

### Buy

Buying an asset:

* checks available cash
* creates/increases position
* decreases cash
* records transaction

### Sell

Selling:

* checks owned quantity
* decreases position
* increases cash
* records transaction

### Portfolio valuation

At any timestamp:

`portfolio_value = cash + market_value_of_positions`

### Transaction history

Every trade must be recorded.

Never derive historical trades solely from current positions.

---

# 11. PHASE 6 — TOURNAMENT ENGINE

## Objective

Turn the portfolio engine into Packdraft.

Create:

`tournaments`

A tournament should have:

* name
* description
* TCG
* starting budget
* start time
* trading close time
* end time
* status
* rules
* eligible assets
* prize information
* creation metadata

---

## Tournament lifecycle

### Upcoming

Players can view and potentially join.

### Active

Players can trade.

### Locked

Trading is disabled.

### Settling

Final prices and portfolios are calculated.

### Completed

Leaderboard is finalized.

### Archived

Historical results remain viewable.

---

# 12. PHASE 7 — TOURNAMENT PARTICIPATION

## Objective

Allow users to actually play.

Create a tournament participation record for each player.

A player joining a tournament receives:

`starting_cash`

and:

`cash = starting_cash`

with:

`positions = empty`

Every participant starts independently.

### Important rules

A player cannot:

* transfer cash between tournaments
* transfer assets between tournaments
* use Career Mode assets
* use another tournament's portfolio
* spend real money to increase their tournament bankroll

The tournament portfolio exists only within that tournament.

---

# 13. PHASE 8 — TRADING UI

## Objective

Make trading intuitive.

Build:

### Tournament Dashboard

Display:

* current portfolio value
* cash
* invested value
* return %
* rank
* time remaining

### Buy

Show:

* asset
* current price
* quantity
* total cost
* remaining cash

### Sell

Show:

* owned quantity
* current price
* quantity to sell
* proceeds

### Holdings

Show:

* asset
* quantity
* average acquisition price
* current price
* unrealized P&L
* percentage return

### Trade History

Show:

* timestamp
* asset
* buy/sell
* quantity
* execution price
* total value

All core trading interactions must be excellent on both desktop and mobile.

---

# 14. PHASE 9 — LEADERBOARD

## Objective

Make competition visible.

Display:

* rank
* username
* portfolio value
* return %
* cash
* invested value

Leaderboards should update during active tournaments.

At completion, rankings become final.

Leaderboard must be usable on narrow mobile screens without requiring horizontal scrolling for core information.

---

# 15. PHASE 10 — SETTLEMENT

## Objective

Correctly determine winners.

At tournament close:

1. Disable trading.
2. Determine settlement prices.
3. Value every position.
4. Add cash.
5. Calculate final portfolio value.
6. Calculate return.
7. Rank players.
8. Store final results.
9. Lock results.
10. Display winners.

Settlement must be deterministic.

If settlement data changes after a tournament is completed, the historical result should not silently change.

At the completion of Phase 10, Packdraft should be a playable web MVP on both desktop and mobile browsers.

---

# 16. PHASE 11 — MVP POLISH (CURRENT)

## Objective

Make the tournament MVP actually playable.

Phases 0–10 already cover the product: account, catalog, join, buy/sell, rank, settlement. This phase is bugfix and playability, not new modes.

A basic `/players/[id]` history page already exists from earlier work. Leave it. Do not expand achievements, career-like stats, or social identity here.

### Build

* Honest price labels: **STALE** only when a stored quote is old; **NO PRICE** when Packdraft has no snapshot
* Honest empty states: an empty catalog is not “database disconnected”
* Deterministic, readable timestamps on trades
* Fonts that load without runtime Google Fonts 404s
* Join / browse / buy / sell / rank remain usable on ~375px and desktop
* Keep the local import/sample-tournament path working

### Do not build

* Career Mode
* Market Events
* Richer profile/achievement systems
* Social, creator tournaments, monetization, native apps, multi-TCG

### Definition of done

The MVP loop works without misleading UI. Typecheck, lint, tests, and production build pass.

---

# 17. PHASE 12 — CAREER MODE (POST-MVP)

## Objective

Add persistent solo progression.

Create a separate persistent Career Portfolio.

Starting balance:

**$1,000**

Career Mode should reuse the same underlying:

* assets
* prices
* trading engine
* portfolio valuation

But Career Mode has different lifecycle rules.

### Career Portfolio

Persistent.

### Tournament Portfolio

Temporary.

Never merge their balances or positions.

### Initial Career MVP

* $1,000 starting balance
* buy
* sell
* portfolio valuation
* trade history
* lifetime return
* portfolio chart
* current holdings

---

# 18. PHASE 13 — CAREER PROGRESSION

Later add:

* levels
* achievements
* milestones
* investor archetypes
* career statistics
* badges
* challenges
* streaks
* historical rankings

Example milestones:

* $2,000
* $5,000
* $10,000
* $25,000
* $100,000
* $1M

Career Mode should feel more like:

**NBA 2K MyCareer / Madden Franchise progression**

than a portfolio tracker.

---

# 19. PHASE 14 — MARKET EVENTS

## Objective

Create temporary prediction competitions around real TCG market events.

Examples:

### Release Prediction

Predict chase-card prices after a new set releases.

### Direction

Predict whether an asset rises or falls.

### Ranking

Rank assets by future performance.

### Biggest Mover

Predict which asset has the largest percentage move.

Market Events must be independent of a player's tournament or Career portfolio.

---

# 20. PHASE 15 — MARKET DATA / SETTLEMENT INTEGRITY

Before real prizes are introduced, create robust settlement rules.

Potential requirements:

* minimum transaction volume
* multiple qualifying transactions
* outlier filtering
* multiple marketplace sources when available
* defined settlement windows
* defined price calculation
* stale-data detection
* transparent settlement methodology

Do not use an arbitrary "last sale" as a settlement price for important competitions.

Document the settlement methodology.

---

# 21. PHASE 16 — SOCIAL FEATURES

Only after the core game is proven.

Potential features:

* friends
* profiles
* following
* public tournaments
* private tournaments
* invite links
* shareable results
* activity feed
* achievements
* player rankings

---

# 22. PHASE 17 — CREATOR TOURNAMENTS

Allow creators to host Packdraft competitions.

Example:

**"PokeStreamer Championship"**

A creator can invite their audience into a tournament.

Potential functionality:

* creator-branded tournaments
* invite links
* custom rules
* custom leaderboard
* creator page
* sponsorship integration

This can become a major user-acquisition channel.

---

# 23. PHASE 18 — MONETIZATION

Do not build monetization before the core game is fun.

Potential revenue streams:

## Pro Membership

Possible benefits:

* advanced analytics
* advanced price history
* additional Career features
* premium statistics
* advanced tournament tools
* additional customization

Pro must not provide an unfair competitive advantage in tournaments unless explicitly designed and balanced.

## Sponsored Tournaments

Brands can sponsor tournaments and provide prizes.

Examples:

* card shops
* marketplaces
* grading companies
* TCG brands
* creators

## Affiliate Revenue

Allow users to discover real-world purchasing options for assets.

Potential flow:

Packdraft asset
→ real-world market
→ affiliate transaction

## Advertising

Free users may eventually generate advertising revenue.

A portion of advertising/sponsorship revenue could potentially support promotional prize pools.

Do not promise fixed prizes until the economics and legal structure have been validated.

---

# 24. PHASE 19 — FREE-TO-PLAY COMPETITIVE ECONOMY

The long-term goal is for users to be able to participate without paying.

Potential free competition structure:

Free player
→ enters free tournament
→ competes
→ wins prizes/status
→ earns ranking
→ qualifies for larger events

Revenue can come from:

* sponsorship
* advertising
* affiliate revenue
* Pro membership
* creator partnerships

The core competitive experience should not require users to pay.

---

# 25. PHASE 20 — RELEASE EVENTS

Create special events around major TCG releases.

Example:

### 30th Anniversary Release Weekend

Players can participate in:

* price predictions
* portfolio tournament
* biggest mover prediction
* chase-card ranking
* sealed-product challenge

This should become a recurring content engine.

Every significant TCG release can create a new Packdraft event.

---

# 26. PHASE 21 — MULTI-TCG

Only after Pokémon is working.

The game engine should support:

* Pokémon
* Magic: The Gathering
* Yu-Gi-Oh!
* One Piece
* Disney Lorcana
* other supported TCGs

The TCG should be data.

The tournament/portfolio engine should be TCG-agnostic.

---

# 27. PHASE 22 — ADVANCED GAME MODES

Potential future modes:

### Draft

Players take turns selecting assets.

### Sealed Only

Only sealed products.

### Singles Only

Only singles.

### Budget Challenge

Example:

$1,000 starting budget.

### Short-Term Flip

24-hour competition.

### Long-Term

30/60/90-day competition.

### Team

Multiple players per team.

### League

Recurring competitions with season standings.

---

# 28. PHASE 23 — PACKDRAFT RANKING SYSTEM

Eventually create a persistent competitive rating.

Potential categories:

* overall
* tournament
* prediction
* singles
* sealed
* Career

The ranking system should reward skill rather than simply number of games played.

Do not implement a complex rating system until sufficient gameplay data exists.

---

# 29. PHASE 24 — ANALYTICS

Eventually provide players with deeper analysis:

* portfolio performance
* benchmark performance
* asset allocation
* win rate
* trade efficiency
* average holding period
* realized vs unrealized P&L
* risk metrics
* prediction accuracy
* performance by TCG/set/asset type

---

# 30. PHASE 25 — NATIVE MOBILE APP

Do not build the native mobile application during the initial MVP.

The responsive web app is the first mobile product.

Once Packdraft has real users and usage data, evaluate a native application.

Preferred future approach:

* React Native / Expo, if still appropriate
* shared backend/API
* shared domain/business logic where practical
* native mobile UI
* push notifications
* app-specific features

Potential reasons to build native:

* significant mobile usage
* retention benefits
* push notifications
* App Store/Google Play discovery
* improved mobile performance
* home-screen presence
* user demand

Do not build a native app merely because it is technically possible.

The decision should be driven by actual product usage.

---

# 31. PHASE 26 — POLISH AND SCALE

After product-market validation:

* performance optimization
* caching
* background jobs
* data ingestion scaling
* monitoring
* error tracking
* database optimization
* rate limiting
* abuse prevention
* anti-cheat
* infrastructure scaling

---

# 32. DEVELOPMENT PRINCIPLE: BUILD THE ENGINE BEFORE THE FEATURES

The most important reusable systems are:

1. Asset system
2. Market-price system
3. Portfolio engine
4. Transaction engine
5. Tournament engine
6. Settlement engine
7. Event engine
8. Ranking system

UI features should consume these systems.

Do not implement business logic separately inside individual pages.

---

# 33. DEVELOPMENT PRINCIPLE: RESPONSIVE BY DEFAULT

Every user-facing feature must be responsive unless explicitly marked desktop-only.

The coding agent must test important UI changes at both:

* desktop viewport
* mobile viewport

Do not build a desktop interface and plan to "make it responsive later."

Core flows must remain usable without horizontal scrolling on mobile.

Desktop can expose more information and richer layouts, but mobile must retain the complete core gameplay experience.

---

# 34. DEVELOPMENT PRINCIPLE: ONE PHASE AT A TIME

The coding agent must NOT attempt to implement the entire roadmap in one pass.

For every phase:

1. Read the roadmap.
2. Inspect the current implementation.
3. Identify the relevant files.
4. Explain the implementation plan.
5. Implement only the requested phase.
6. Run validation.
7. Fix errors.
8. Summarize changes.
9. State what remains incomplete.
10. Stop.

Do not automatically proceed to the next phase.

---

# 35. DEFINITION OF DONE

A phase is not complete merely because code was written.

A phase is complete when:

* functionality works
* TypeScript passes
* lint passes
* tests pass where applicable
* production build passes where applicable
* database migrations are correct
* no secrets are exposed
* no unrelated functionality was changed
* the implementation matches this roadmap
* responsive behavior is verified when the phase contains UI work

---

# 36. CURRENT BUILD TARGET

## Done — tournament MVP (Phases 0–10)

Account, catalog, join, buy/sell, leaderboard, and settlement exist. That **is** the MVP.

A basic player history page also exists. Do not expand it into Career stats.

## Now — Phases 13–15

Career progression (levels, milestones, archetypes, streaks, Career ranks), Market Events, and settlement integrity (windowed median, not last sale).

## Not now

Do **not** start:

* Social features, creator tournaments, monetization
* Native apps, multi-TCG, advanced rankings


---

# 37. CORE PRODUCT PRINCIPLE

Packdraft should always answer this question:

> **Why would I open this today?**

The answer should eventually be:

* There is a tournament I can win.
* There is an event I can predict.
* My Career portfolio is growing.
* My ranking is at stake.
* A new TCG set just released.
* My friends are competing.

Packdraft is a game built around the constantly changing real-world TCG market.

It is not merely a portfolio tracker.
It is not merely a price tracker.
It is not merely a prediction platform.

The goal is to build a persistent competitive ecosystem around TCG market knowledge and decision-making.

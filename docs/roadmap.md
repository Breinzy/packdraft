# Packdraft — MVP Roadmap

This document is the source of truth for **what should be built**.

The previous competitive-game roadmap reached approximately Phase 20. Treat this document as the new product direction. Do not assume previous phases remain valid simply because they were completed.

Start with **Phase 21 — MVP Reset / Product Foundation**.

---

# Product vision

Packdraft is a Pokémon TCG portfolio and investing platform with competitive game mechanics.

The core product is:

1. A genuinely useful **free** Pokémon TCG collection/portfolio tracker.
2. Tournaments that turn real Pokémon market movement into competition.
3. Predictions that create an additional skill/engagement loop.
4. Sandbox mode where users can test investment strategies with virtual capital.
5. A **Pro** tier that provides AI-powered portfolio intelligence and personalized analysis.

The product should feel like:

> Collectr + investment analytics + fantasy sports.

It should **not** feel like:

* A generic SaaS dashboard
* A children’s Pokémon website
* A generic stock trading app
* A gambling product
* An AI chatbot with Pokémon data attached

The UI should be modern, dark, premium, responsive, slightly gamified, and investment-oriented.

**Focus exclusively on Pokémon TCG through the entire MVP.**

Do not add Yu-Gi-Oh!, Magic, One Piece, sports cards, or other TCGs until the Pokémon MVP is complete and validated.

---

# Product principles

## 1. Free must be good

The free product should be useful enough that someone can use Packdraft without ever paying.

Do not artificially cripple basic collection/portfolio tracking to force upgrades.

Free users should get meaningful market information, tracking, tournaments, predictions, and sandbox functionality.

The Pro tier monetizes **advanced intelligence**, not basic functionality.

## 2. Packdraft is not just a game

The game mechanics are an engagement layer.

The core utility is tracking and understanding Pokémon TCG investments.

Users should have reasons to return even when they aren’t participating in a tournament.

## 3. Pro sells decision support

Do not position AI as guaranteeing profitable trades or providing certainty.

Pro should provide:

* Analysis
* Context
* Risk assessment
* Scenario analysis
* Portfolio intelligence
* Personalized research
* Entry/exit context

Avoid simplistic “BUY THIS” / “SELL THIS” recommendations.

The product should help users make better-informed decisions.

## 4. Data quality matters

Packdraft’s value depends heavily on accurate Pokémon market data.

Build the data architecture so pricing sources can be replaced, expanded, and reconciled later.

Do not tightly couple the entire application to one price provider.

## 5. Build for the MVP, not the fantasy version

Prioritize a polished, coherent Pokémon MVP over building every possible feature.

Do not add unnecessary complexity.

When deciding between:

* A) A feature that sounds impressive
* B) A feature that makes the core product substantially better

Choose B.

---

# MVP product structure

```
PACKDRAFT
|
+-- FREE
|   +-- Collection / Portfolio Tracking
|   +-- Pokémon Market Data
|   +-- Watchlists / Alerts
|   +-- Tournaments
|   +-- Predictions
|   +-- Sandbox
|   +-- Basic Investor Profile
|
+-- PRO
|   +-- AI Portfolio Analysis
|   +-- Portfolio Risk Analysis
|   +-- Position Analysis
|   +-- Entry / Exit Context
|   +-- Personalized Set / Asset Research
|   +-- Advanced Quantitative Analytics
|   +-- AI Research Assistant
|
+-- FUTURE
    +-- Additional TCGs
    +-- Social features
    +-- Advanced monetization
    +-- Additional game modes
```

---

# Phase 21 — MVP reset / product foundation

Before continuing feature development, audit the current application against this product direction.

The existing application was built against the previous roadmap. **Do not assume that all previous phases are still relevant.**

### Tasks

* Inspect the entire current application.
* Inventory existing functionality.
* Identify what is complete.
* Identify what is partially complete.
* Identify what is obsolete under the new product direction.
* Identify technical debt.
* Identify duplicated UI/components.
* Identify missing MVP functionality.
* Identify features that should be removed or deferred.
* Verify current database/schema architecture.
* Verify current Pokémon data architecture.
* Verify authentication and user/portfolio architecture.

### Deliverable

Create `docs/MVP_AUDIT.md`.

The audit should map existing functionality to this roadmap.

Do not rewrite working backend functionality simply because the roadmap changed.

Do not delete useful functionality without justification.

---

# Phase 22 — Design system + application shell

Establish the final Packdraft visual system before continuing major feature work.

Design direction:

* Dark
* Premium
* Modern
* Blue primary accent
* Rounded surfaces
* Subtle borders
* Strong typography hierarchy
* Investment platform aesthetic
* Light gamification
* Responsive desktop/mobile

The UI should feel like:

> Fantasy sports meets investment platform.

Not:

> Generic SaaS dashboard.

Build reusable components for:

* Navigation
* Cards
* Buttons
* Inputs
* Tabs
* Badges
* Tables
* Charts
* Portfolio metrics
* Asset cards
* Tournament cards
* Leaderboard rows
* Modals
* Toasts
* Loading states
* Empty states
* Error states

Create a centralized design system.

Avoid arbitrary one-off styling.

All future phases must use this system.

---

# Phase 23 — Pokémon data foundation

Create a reliable Pokémon-only market data foundation.

Requirements:

* Pokémon sets
* Cards
* Sealed products
* Product metadata
* Current pricing
* Historical pricing where available
* Price source tracking
* Data timestamps
* Source reliability
* Data normalization

Separate:

* Product data
* Market data
* User portfolio data
* Analytics

The architecture should eventually support multiple TCGs, but **do not implement other TCGs yet**.

Design schemas/interfaces so adding another TCG later does not require rewriting the application.

---

# Phase 24 — Free collection / portfolio tracker

Build the core free utility that competes with Collectr.

Users should be able to:

* Add Pokémon cards
* Add sealed products
* Specify quantity
* Record purchase price
* Record purchase date
* Track current value
* View cost basis
* View unrealized gain/loss
* View realized gains where applicable
* View portfolio history
* View individual position performance
* Organize holdings
* Search Pokémon products

Portfolio dashboard should clearly show:

* Total value
* Cost basis
* Total return
* Percentage return
* Day/week/month movement where data supports it
* Portfolio allocation
* Biggest winners
* Biggest losers

This functionality should be excellent before moving on.

---

# Phase 25 — Pokémon market / discovery

Create a market/discovery experience.

Users should be able to browse:

* Pokémon cards
* Sealed products
* Sets
* Recent movers
* Popular products
* Trending products
* Historical performance

Asset pages should show:

* Current price
* Historical chart
* Price changes
* Basic market information
* Product metadata
* User watch functionality

The UI should make Packdraft feel like a Pokémon investment platform rather than simply a collection database.

---

# Phase 26 — Watchlists + alerts

Users can watch Pokémon assets.

Implement:

* Watchlist
* Price alerts
* Significant movement alerts
* Optional portfolio alerts
* Basic notification infrastructure

Do not overbuild notification infrastructure.

Create the foundation needed for future intelligent alerts.

---

# Phase 27 — Tournaments

Implement the core Packdraft tournament system.

Users receive a fixed virtual budget.

Example:

* $1,000
* $5,000
* $10,000

They construct a temporary Pokémon portfolio.

Performance is based on real Pokémon market prices.

Tournament functionality:

* Create/join tournament
* Tournament start/end
* Entry conditions
* Starting capital
* Portfolio construction
* Portfolio locking rules
* Participant list
* Live standings
* Portfolio performance
* Final standings
* Tournament history

Make tournaments feel competitive and exciting.

Important information:

* Current rank
* Portfolio value
* Return
* Rank movement
* Time remaining
* Leaderboard
* Biggest movers

The tournament experience should be one of Packdraft’s signature features.

---

# Phase 28 — Tournament gameplay / engagement

Improve the tournament experience so it is more than a portfolio table.

Add:

* Rank movement
* Performance comparisons
* Player-vs-player context
* Biggest gains/losses
* Tournament milestones
* Countdown
* Tournament status
* Portfolio performance visualization
* Relevant market events

The goal is to create reasons to return while a tournament is active.

Do not add meaningless badges or gamification purely for decoration.

---

# Phase 29 — Predictions

Build the prediction system.

Users can make predictions around Pokémon market behavior.

Potential prediction types:

* Price target
* Percentage movement
* Relative performance
* Set/product performance
* Market events

Each prediction should include:

* Prediction
* Timestamp
* Time horizon
* Resolution date
* Outcome
* Accuracy

Users should have a visible prediction track record.

The prediction system should contribute to an investor profile.

Do **not** make predictions a meaningless points system.

Predictions should demonstrate skill and build a historical track record.

---

# Phase 30 — Sandbox mode

Build Sandbox as a strategy-testing environment.

User selects:

* Starting capital
* Portfolio
* Pokémon assets
* Investment strategy

Sandbox tracks performance against the real market.

Users should be able to:

* Buy
* Sell
* Reallocate
* Monitor performance
* Compare strategies
* Track hypothetical portfolios

The purpose is:

> Test your TCG investing skills without risking real money.

Sandbox should **not** depend on historical hindsight simulations as its primary gameplay mechanic.

Use current/ongoing market data where possible.

Allow users to test decisions and strategies over time.

---

# Phase 31 — Basic investor profile

Create a user investor profile.

Show:

* Portfolio performance
* Tournament performance
* Tournament wins
* Tournament rank
* Prediction record
* Prediction accuracy
* Sandbox performance
* Favorite sets/categories
* Public/private profile controls

Do not overbuild social networking yet.

The profile should establish the user’s identity as a TCG investor/player.

---

# Phase 32 — Pro foundation / Stripe

Implement subscription infrastructure.

Pro should be clearly separated from Free.

Do not paywall basic collection tracking.

Build:

* Subscription state
* Pro entitlement
* Upgrade flow
* Stripe integration
* Subscription management
* Graceful downgrade behavior
* Usage tracking where necessary

Pricing can remain configurable.

Do not hardcode business assumptions throughout the application.

---

# Phase 33 — Pro: AI portfolio analysis

Build the flagship Pro feature.

The AI should analyze the user’s actual Packdraft portfolio.

It should understand:

* Holdings
* Cost basis
* Position size
* Performance
* Purchase dates
* Asset categories
* Sets
* Portfolio concentration
* Historical portfolio behavior

Provide:

* Portfolio summary
* Strengths
* Weaknesses
* Concentration analysis
* Risk factors
* Notable changes
* Areas worth researching

Do not generate generic ChatGPT responses.

The analysis should be grounded in Packdraft data.

---

# Phase 34 — Pro: risk profile

Create a quantitative portfolio risk profile.

Potential metrics:

* Concentration
* Volatility
* Drawdown
* Liquidity
* Asset/category exposure
* Position sizing
* Diversification

Present results in a clear, understandable way.

Example:

* Portfolio risk: Moderate
* Concentration: High
* Liquidity: Moderate
* Volatility: High

Do not pretend these metrics are perfectly objective.

Explain what the metrics mean.

---

# Phase 35 — Pro: position / entry / exit analysis

For individual holdings, Pro users can request deeper analysis.

Analyze:

* Current price
* User cost basis
* Position size
* Historical price
* Recent momentum
* Comparable assets
* Portfolio exposure
* Risk

Provide structured scenarios:

* Hold thesis
* Add/research thesis
* Reduce exposure thesis
* Exit/realize-profit considerations

Do not make guaranteed predictions.

Do not use language implying certainty.

This is research and decision support.

---

# Phase 36 — Pro: personalized set / asset discovery

Use the user’s behavior and portfolio to personalize research.

Consider:

* Sets they own
* Sets they watch
* Asset types
* Typical price ranges
* Historical portfolio behavior
* Tournament behavior
* Predictions

Surface:

> Things worth researching.

Explain why each item was surfaced.

Example:

> You frequently track modern sealed products, and this set has characteristics similar to assets you have historically followed.

Do not simply say:

> BUY THIS.

---

# Phase 37 — Pro: quantitative analytics

Build advanced analytics.

Potential features:

* Portfolio benchmarking
* Relative performance
* Category performance
* Set performance
* Alpha vs benchmark
* Volatility
* Maximum drawdown
* Correlation where sufficient data exists
* Allocation analysis
* Historical performance
* Performance attribution

Benchmark examples:

* Pokémon sealed
* Pokémon singles
* Specific sets
* User-defined categories

Make this genuinely quantitative.

Do not create fake precision where the underlying data does not support it.

---

# Phase 38 — Pro: AI research assistant

Create a conversational AI layer on top of Packdraft’s data.

Users can ask questions such as:

* What are the biggest risks in my portfolio?
* Why has my portfolio underperformed this set?
* What positions have contributed most to my return?
* What Pokémon sets should I research based on my portfolio?
* Compare my sealed holdings against the broader Pokémon sealed market.

The AI must use Packdraft’s available data and clearly distinguish:

* Known data
* Calculations
* Interpretation
* Uncertainty

Do not let the AI fabricate pricing or market information.

---

# Phase 39 — Proactive insights

Move beyond a chatbot.

Packdraft should proactively surface useful information.

Examples:

* Position reached a significant milestone
* Portfolio concentration changed
* Asset materially outperformed benchmark
* Risk increased
* Watchlist asset moved significantly
* Prediction is nearing resolution
* Tournament position changed significantly

This should feel like:

> Packdraft is watching the market for me.

rather than:

> Here’s another dashboard.

---

# Phase 40 — Full UX / mobile polish

Once core functionality is complete, perform a full application-wide UX pass.

Audit every page on:

* Desktop
* Tablet
* Mobile

Fix:

* Layout inconsistencies
* Navigation
* Typography
* Spacing
* Overflow
* Tables
* Charts
* Loading states
* Empty states
* Error states
* Accessibility
* Touch targets
* Animations

Mobile should feel intentionally designed, not like a compressed desktop site.

---

# Phase 41 — Data quality / performance / security

Before MVP release, audit:

### Data

* Price accuracy
* Missing data
* Stale data
* Duplicate products
* Incorrect mappings
* Historical consistency

### Performance

* Database queries
* API calls
* Server-side rendering
* Caching
* Image loading
* Large portfolio performance

### Security

* Authentication
* Authorization
* Row-level security
* API exposure
* User data isolation
* Stripe entitlement security

Do not expose sensitive data to clients unnecessarily.

---

# Phase 42 — MVP QA

Perform comprehensive end-to-end testing.

Test:

* Account creation
* Login
* Collection creation
* Adding cards
* Adding sealed
* Editing holdings
* Removing holdings
* Portfolio calculations
* Market data
* Watchlists
* Alerts
* Tournament creation
* Tournament joining
* Portfolio locking
* Tournament scoring
* Leaderboards
* Predictions
* Prediction resolution
* Sandbox
* Pro upgrade
* Pro entitlement
* AI portfolio analysis
* AI analysis accuracy
* Mobile functionality

Fix bugs rather than simply documenting them.

---

# Phase 43 — MVP launch preparation

Prepare Packdraft for initial users.

Create:

* Landing page
* Clear product positioning
* Free vs Pro comparison
* Onboarding
* Empty-state guidance
* Example portfolio
* Example tournament
* Example AI analysis
* Basic help/documentation
* Feedback mechanism
* Error monitoring
* Analytics

The onboarding should answer:

1. What is Packdraft?
2. Why should I use it?
3. How do I add my collection?
4. What can I do for free?
5. Why would I eventually want Pro?

---

# Phase 44 — MVP validation

Do **not** immediately start adding more TCGs.

First validate Pokémon Packdraft.

Measure:

* Signups
* Activated users
* Collections created
* Assets tracked
* Weekly active users
* Tournament participation
* Prediction participation
* Sandbox usage
* Free → Pro conversion
* Pro retention
* AI feature usage
* Most-used features
* User retention

Identify:

* What makes people come back?
* What makes people pay?
* What makes people stop using Packdraft?

---

# Post-MVP — Expansion decision

Only after the Pokémon MVP is stable and validated should the team evaluate adding other TCGs.

Potential expansion:

* Magic: The Gathering
* Yu-Gi-Oh!
* One Piece
* Other collectible markets

The architecture should make this possible, but the MVP should remain Pokémon-focused.

When expanding, do not simply copy Pokémon-specific assumptions.

Create a proper TCG abstraction layer for:

* Games
* Sets
* Products
* Cards
* Market data
* Pricing sources
* Categories
* Metadata

---

# Deferred features

Do **not** prioritize these during the Pokémon MVP unless they become necessary:

* Bank account connections
* Full personal finance tracking
* Real-money trading
* Marketplace
* Physical card buying/selling
* Social network
* Messaging
* Advanced achievements
* Complex career progression
* Other TCGs
* Prediction-market mechanics
* Gambling mechanics
* Pay-to-win tournament mechanics
* Complex referral systems
* Enterprise/API products
* Mobile native app

The MVP should prove the core product first.

---

# North star

The final Pokémon MVP should make a user think:

1. Packdraft is the place I track my Pokémon investments.
2. I can compete with other investors here.
3. I can test strategies without risking money.
4. I want Packdraft Pro because it actually helps me understand my portfolio.

The product should combine:

* Utility
* Competition
* Experimentation
* Intelligence

The free product earns the user’s attention.

Tournaments, predictions, and sandbox create engagement.

Pro converts serious users by providing genuinely useful analysis.

Do not build features merely because they sound impressive.

Every feature should strengthen one of those four pillars.

---

# Agent execution rules

These rules also live in `AGENTS.md`. Follow both files.

1. Read this roadmap before starting each phase.
2. Inspect existing code before implementing anything.
3. Preserve working functionality unless there is a compelling reason to change it.
4. Do not blindly continue from the old roadmap. The product direction has changed.
5. Complete each phase to a production-quality state before moving on.
6. Use reusable components and existing architecture where possible.
7. Do not create duplicate systems for functionality that already exists.
8. Keep Pokémon-specific implementation cleanly separated from future TCG abstraction.
9. Prioritize correctness and data quality over superficial features.
10. Do not sacrifice UX for speed of implementation.
11. When a requirement is ambiguous, choose the simplest implementation consistent with the product vision.
12. Do not ask for approval for minor implementation decisions. Use reasonable engineering judgment.
13. For major architectural changes, explain the reasoning before making the change.
14. Run tests/build/lint after significant changes.
15. Never claim a phase is complete without verifying the actual implementation.
16. At the end of each phase, provide: what was completed, files/components changed, database changes, remaining issues, tests performed, and any recommended follow-up work.
17. Keep the UI consistent with the Packdraft design system.
18. Never regress existing mobile functionality.
19. Never expose fabricated market data.
20. Remember the core objective: **build the best free Pokémon TCG investment tracker possible, then layer competitive gameplay and premium investment intelligence on top.**

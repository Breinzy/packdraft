# Packdraft — Monetization and free-to-play

No payment processor is wired. Do not promise real prizes.

## Pro

`profiles.pro_until` is an admin-granted flag.

Pro may:

- show a longer price-history window
- show a longer Career chart
- hide the ad placeholder

Pro must **not** change:

- tournament or Career cash
- execution prices
- ranks
- settlement

## Other revenue surfaces

- Sponsor label / URL on a tournament (display only)
- Optional TCGPlayer affiliate query (`PACKDRAFT_TCGPLAYER_AFFILIATE`)
- Ad placeholder for non-Pro users

## Free-to-play

`entry_mode` is `'free'` only. Optional qualifier: finish at or above `qualifier_max_rank` in `qualifier_tournament_id`.

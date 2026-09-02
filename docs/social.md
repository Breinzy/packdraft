# Packdraft — Social

Friends, follows, an activity feed, shareable results, and player rankings. Tournament books stay isolated.

## What it is

- `/social` — feed + incoming friend requests
- `/players` — tournament-record rankings (`get_player_rankings()`)
- `/players/[id]` — tournament history, follow / friend, share link
- Private tournaments use an invite query `?invite=`

## Isolation

Social does not move cash or positions. A friend cannot see another player’s tournament holdings unless those rows are already public (leaderboard / settled results). Career stats stay on `/career`.

## Writes

Authenticated `POST /api/social` calls service-role RPCs. Clients cannot insert friendships or feed rows directly.

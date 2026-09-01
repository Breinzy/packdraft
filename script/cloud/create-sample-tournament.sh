#!/usr/bin/env bash
# Create one active local tournament so join/trade can be verified after import.
# Uses the local Supabase Postgres container. Does not touch hosted data.
set -euo pipefail

DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_packdraft}"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Local Supabase database container '$DB_CONTAINER' is not running." >&2
  echo "Run script/cloud/start.sh first." >&2
  exit 1
fi

NAME="${TOURNAMENT_NAME:-Local smoke tournament}"
NAME_SQL="${NAME//\'/\'\'}"

echo "==> Creating tournament: $NAME"
docker exec "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -c "
INSERT INTO tournaments (
  name,
  description,
  tcg_id,
  starting_budget,
  starts_at,
  trading_closes_at,
  ends_at,
  status,
  eligible_asset_types
)
SELECT
  '$NAME_SQL',
  'Highest virtual portfolio wins.',
  id,
  10000,
  now(),
  now() + interval '7 days',
  now() + interval '7 days',
  'active',
  ARRAY['sealed', 'graded', 'single']::text[]
FROM tcgs
WHERE slug = 'pokemon'
RETURNING id, name, status, starting_budget;
"

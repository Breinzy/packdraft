#!/usr/bin/env bash
# Print local stack readiness without exposing secret values.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_packdraft}"

configured() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ] && [ -f "$REPO_ROOT/app/.env.local" ]; then
    value="$(sed -n "s/^${name}=//p" "$REPO_ROOT/app/.env.local" | head -1)"
  fi
  if [ -n "$value" ]; then
    echo "$name=configured"
  else
    echo "$name=missing"
  fi
}

echo "==> Secrets (names only)"
configured POKEMON_PRICE_TRACKER_API_KEY
configured CRON_SECRET
configured SUPABASE_SERVICE_ROLE_KEY
configured NEXT_PUBLIC_SUPABASE_URL
configured ADMIN_EMAILS

echo "==> HTTP"
if curl -sS -o /dev/null -w 'GET /tournaments %{http_code}\n' http://127.0.0.1:3000/tournaments; then
  :
else
  echo "GET /tournaments unreachable"
fi
if curl -sS -o /dev/null -w 'GET /assets %{http_code}\n' http://127.0.0.1:3000/assets; then
  :
else
  echo "GET /assets unreachable"
fi

echo "==> Database"
if docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  docker exec "$DB_CONTAINER" psql -U postgres -c "
    select 'active_assets' as t, count(*) from assets where active
    union all select 'inactive_seed_assets', count(*) from assets where not active
    union all select 'snapshots', count(*) from price_snapshots
    union all select 'tournaments', count(*) from tournaments;
  "
else
  echo "Local Supabase database container is not running."
fi

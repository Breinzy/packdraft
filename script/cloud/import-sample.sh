#!/usr/bin/env bash
# Kick off a SMALL real-data import from PokemonPriceTracker into the local database,
# to verify the pipeline end-to-end without burning API credits or waiting an hour.
#
# Requires:
#   - POKEMON_PRICE_TRACKER_API_KEY available to the running dev server
#     (injected Cloud Agent secret; start.sh copies it into app/.env.local).
#   - The dev server running on :3000 (the environment's `next-dev` terminal).
#
# Override the size/throttle via env vars, e.g. MAX_SETS=3 MAX_CARDS=100 bash script/cloud/import-sample.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# CRON_SECRET guards the import route: prefer the env, else read app/.env.local, else the dev default.
CRON="${CRON_SECRET:-}"
if [ -z "$CRON" ] && [ -f "$REPO_ROOT/app/.env.local" ]; then
  CRON="$(sed -n 's/^CRON_SECRET=//p' "$REPO_ROOT/app/.env.local" | head -1)"
fi
CRON="${CRON:-local-dev-cron-secret}"

BASE="${APP_URL:-http://127.0.0.1:3000}"
MAX_SETS="${MAX_SETS:-1}"       # sealed pages per search term
MAX_CARDS="${MAX_CARDS:-25}"    # top graded cards
THROTTLE_MS="${THROTTLE_MS:-1500}"
CREDIT_BUDGET="${CREDIT_BUDGET:-300}"

echo "==> Importing real catalog (maxSets=$MAX_SETS maxCards=$MAX_CARDS throttleMs=$THROTTLE_MS creditBudget=$CREDIT_BUDGET)"
echo "    Target: $BASE/api/admin/import-assets"
curl -sS -X POST \
  "$BASE/api/admin/import-assets?maxSets=$MAX_SETS&maxCards=$MAX_CARDS&throttleMs=$THROTTLE_MS&creditBudget=$CREDIT_BUDGET" \
  -H "Authorization: Bearer $CRON"
echo
echo "==> Done. Check the JSON above for sealedImported / gradedImported / snapshotsWritten / errors."

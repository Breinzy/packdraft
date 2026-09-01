#!/usr/bin/env bash
# Resume the full PokemonPriceTracker catalog import in time/credit-boxed chunks.
# Safe to re-run. Stops when the job completes, is paused, or PPT daily credits run out.
#
# Each chunk respects:
#   - Vercel-style time budget (default 240s) so the same code path works on Hobby
#   - PACKDRAFT_IMPORT_CREDIT_BUDGET / CREDIT_BUDGET per chunk
#   - PPT X-RateLimit-Daily-Remaining (importer stops before hitting 0)
#
# Requires the local (or target) Next server and CRON_SECRET.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

read_env_local() {
  local name="$1"
  if [ -f "$REPO_ROOT/app/.env.local" ]; then
    sed -n "s/^${name}=//p" "$REPO_ROOT/app/.env.local" | head -1
  fi
}

CRON="${CRON_SECRET:-}"
if [ -z "$CRON" ]; then
  CRON="$(read_env_local CRON_SECRET)"
fi
CRON="${CRON:-local-dev-cron-secret}"

KEY="${POKEMON_PRICE_TRACKER_API_KEY:-}"
if [ -z "$KEY" ]; then
  KEY="$(read_env_local POKEMON_PRICE_TRACKER_API_KEY)"
fi
if [ -z "$KEY" ]; then
  echo "POKEMON_PRICE_TRACKER_API_KEY is not set in the environment or app/.env.local." >&2
  exit 1
fi

BASE="${APP_URL:-http://127.0.0.1:3000}"
TIME_BUDGET_MS="${TIME_BUDGET_MS:-240000}"
CREDIT_BUDGET="${CREDIT_BUDGET:-2500}"
THROTTLE_MS="${THROTTLE_MS:-1100}"
SLEEP_BETWEEN="${SLEEP_BETWEEN:-2}"
MAX_CHUNKS="${MAX_CHUNKS:-0}"
OUT_DIR="${TMPDIR:-/tmp}/packdraft-catalog-import"
mkdir -p "$OUT_DIR"

echo "==> Full catalog import loop"
echo "    Target: $BASE/api/admin/import-assets"
echo "    timeBudgetMs=$TIME_BUDGET_MS creditBudget=$CREDIT_BUDGET throttleMs=$THROTTLE_MS"

chunk=0
while true; do
  chunk=$((chunk + 1))
  if [ "$MAX_CHUNKS" -gt 0 ] && [ "$chunk" -gt "$MAX_CHUNKS" ]; then
    echo "==> Reached MAX_CHUNKS=$MAX_CHUNKS"
    exit 0
  fi

  OUT="$OUT_DIR/chunk-${chunk}.json"
  echo "==> Chunk $chunk"
  HTTP_CODE="$(
    curl -sS -o "$OUT" -w '%{http_code}' -X POST \
      "$BASE/api/admin/import-assets?timeBudgetMs=$TIME_BUDGET_MS&creditBudget=$CREDIT_BUDGET&throttleMs=$THROTTLE_MS" \
      -H "Authorization: Bearer $CRON"
  )"
  cat "$OUT"
  echo
  echo "    HTTP $HTTP_CODE"

  if [ "$HTTP_CODE" != "200" ]; then
    echo "Chunk failed." >&2
    exit 1
  fi

  set +e
  python3 - "$OUT" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
skip_reason = data.get("skipReason")
stop = data.get("stopReason")
completed = data.get("completed")
print(
    f"    stage={data.get('stage')} stop={stop} completed={completed} skip={skip_reason} "
    f"sealed+={data.get('sealedImported')} singles+={data.get('singlesImported')} "
    f"graded+={data.get('gradedImported')} credits={data.get('creditsUsed')} "
    f"dailyRemaining={data.get('dailyRemaining')}"
)
if skip_reason in ("paused", "completed", "already_running") or completed:
    sys.exit(10)
if stop in ("daily_limit", "paused"):
    sys.exit(10)
if data.get("ok") is False:
    sys.exit(1)
sys.exit(0)
PY
  status=$?
  set -e
  if [ "$status" -eq 10 ]; then
    echo "==> Import loop stopping (complete, paused, or daily PPT limit)."
    exit 0
  fi
  if [ "$status" -ne 0 ]; then
    echo "Chunk reported failure." >&2
    exit 1
  fi

  sleep "$SLEEP_BETWEEN"
done

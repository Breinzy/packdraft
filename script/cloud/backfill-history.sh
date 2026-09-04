#!/usr/bin/env bash
# Resume the paused 6-month PPT history + volume backfill in time/credit-boxed chunks.
# Safe to re-run. Exits when the job is paused, complete, or PPT daily credits run out.
#
# Requires the local (or target) Next server, CRON_SECRET, and POKEMON_PRICE_TRACKER_API_KEY.
# The job starts paused. Resume it from /admin (or SQL) before this loop will ingest.
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
CREDIT_BUDGET="${CREDIT_BUDGET:-2000}"
THROTTLE_MS="${THROTTLE_MS:-1100}"
SLEEP_BETWEEN="${SLEEP_BETWEEN:-2}"
MAX_CHUNKS="${MAX_CHUNKS:-0}"
OUT_DIR="${TMPDIR:-/tmp}/packdraft-history-backfill"
mkdir -p "$OUT_DIR"

echo "==> History + volume backfill loop"
echo "    Target: $BASE/api/admin/history-backfill"
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
      "$BASE/api/admin/history-backfill?timeBudgetMs=$TIME_BUDGET_MS&creditBudget=$CREDIT_BUDGET&throttleMs=$THROTTLE_MS" \
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
print(
    f"    stop={stop} skip={skip_reason} visited+={data.get('visited')} "
    f"snapshots+={data.get('snapshotsWritten')} stats+={data.get('statsUpdated')} "
    f"wrapped={data.get('wrapped')}"
)
if skip_reason in ("paused", "completed", "already_running") or data.get("skippedJob"):
    sys.exit(10)
if stop in ("daily_limit", "paused", "complete"):
    sys.exit(10)
if data.get("ok") is False:
    sys.exit(1)
sys.exit(0)
PY
  status=$?
  set -e
  if [ "$status" -eq 10 ]; then
    echo "==> History loop stopping (complete, paused, or daily PPT limit)."
    exit 0
  fi
  if [ "$status" -ne 0 ]; then
    echo "Chunk reported failure." >&2
    exit 1
  fi

  sleep "$SLEEP_BETWEEN"
done

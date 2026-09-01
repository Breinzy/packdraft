#!/usr/bin/env bash
# Apply pending hosted migrations (if credentials exist) then copy the local catalog.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

python3 "$REPO_ROOT/script/cloud/hosted-status.py"
status=$?

if [ "$status" -eq 2 ]; then
  echo "Hosted env is not configured for this process." >&2
  exit 2
fi

if [ "$status" -eq 3 ]; then
  echo "==> Attempting hosted schema apply"
  python3 "$REPO_ROOT/script/cloud/apply-hosted-schema.py"
  apply_status=$?
  if [ "$apply_status" -ne 0 ]; then
    echo "Schema apply failed. Catalog was not copied." >&2
    exit "$apply_status"
  fi
fi

python3 "$REPO_ROOT/script/cloud/copy-catalog-to-hosted.py"
copy_status=$?
python3 "$REPO_ROOT/script/cloud/hosted-status.py"
exit "$copy_status"

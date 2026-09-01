#!/usr/bin/env bash
# Cloud Agent `start` phase: per-boot runtime bring-up. Idempotent and safe to re-run.
# Starts the Docker daemon, brings up the local Supabase stack, applies migrations,
# and writes app/.env.local so the Next.js dev server can reach Supabase.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_BIN="$REPO_ROOT/app/node_modules/.bin/supabase"

echo "==> Ensuring the Docker daemon is running"
if ! docker info >/dev/null 2>&1; then
  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || true
  sudo nohup dockerd --storage-driver=fuse-overlayfs >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi
# Make the socket usable without sudo for this boot.
sudo chmod 666 /var/run/docker.sock || true
docker info >/dev/null 2>&1 || { echo "Docker failed to start; see /tmp/dockerd.log" >&2; exit 1; }

echo "==> Starting the local Supabase stack (idempotent)"
cd "$REPO_ROOT"
if ! "$SUPABASE_BIN" status >/dev/null 2>&1; then
  "$SUPABASE_BIN" start
fi

echo "==> Applying database migrations"
"$SUPABASE_BIN" migration up --local

echo "==> Writing app/.env.local (local Supabase keys are fixed by the CLI)"
ENV_FILE="$REPO_ROOT/app/.env.local"
STATUS_ENV="$("$SUPABASE_BIN" status -o env 2>/dev/null || true)"
PUBLISHABLE_KEY="$(printf '%s\n' "$STATUS_ENV" | sed -n 's/^PUBLISHABLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
SECRET_KEY="$(printf '%s\n' "$STATUS_ENV" | sed -n 's/^SECRET_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
# Fall back to the documented fixed local dev keys if the env output format differs.
PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"
SECRET_KEY="${SECRET_KEY:-sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz}"
# Always rewrite so Cloud Agent secrets injected on this boot reach Next.js.
# Server-only secrets pass through from the environment when present.
# This is how the real PokemonPriceTracker import gets its key without committing keys.
cat > "$ENV_FILE" <<EOF
# Auto-generated for local development by script/cloud/start.sh. Gitignored.
# Supabase points at the LOCAL stack. Server secrets come from injected env vars.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SECRET_KEY}
CRON_SECRET=${CRON_SECRET:-local-dev-cron-secret}
POKEMON_PRICE_TRACKER_API_KEY=${POKEMON_PRICE_TRACKER_API_KEY:-}
ADMIN_EMAILS=${ADMIN_EMAILS:-}
EOF

if [ -z "${POKEMON_PRICE_TRACKER_API_KEY:-}" ]; then
  echo "WARNING: POKEMON_PRICE_TRACKER_API_KEY is not set."
  echo "         Real catalog import will fail until it is added as a Cloud Agent secret."
fi

echo "==> start.sh complete. Supabase Studio: http://127.0.0.1:54323"

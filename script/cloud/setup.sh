#!/usr/bin/env bash
# Cloud Agent `install` phase: durable, idempotent setup that can be baked into a
# snapshot. Installs Docker (needed for the local Supabase stack), configures it for
# the nested-container VM, and installs Node dependencies.
#
# Per-boot work (starting dockerd, `supabase start`) lives in start.sh, because
# processes started here do not survive into a later boot.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "==> Installing Docker and container networking prerequisites"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
# --force-confold keeps existing conffiles so the install stays non-interactive.
sudo apt-get install -y -o Dpkg::Options::=--force-confold \
  docker.io fuse-overlayfs uidmap

echo "==> Selecting the legacy iptables backend"
# Ubuntu 24.04 defaults to nftables, which breaks Docker bridge networking in the
# nested Cloud Agent VM (containers cannot reach each other). Legacy iptables works.
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

echo "==> Allowing the current user to talk to the Docker socket"
sudo usermod -aG docker "$(id -un)" || true

echo "==> Installing Node dependencies (app/)"
cd "$REPO_ROOT/app"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> setup.sh complete"

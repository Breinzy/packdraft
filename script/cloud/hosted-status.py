#!/usr/bin/env python3
"""Compare local Docker catalog vs hosted Supabase (no secret values printed)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROJECT_REF = "lximcqaunrovzonsbjkb"
DB_CONTAINER = os.environ.get("SUPABASE_DB_CONTAINER", "supabase_db_packdraft")


def load_env_local() -> dict[str, str]:
    env: dict[str, str] = {}
    path = REPO / "app" / ".env.local"
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key] = value
    return env


def rest(base: str, key: str, path: str):
    req = urllib.request.Request(
        base.rstrip("/") + path,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            cr = res.headers.get("content-range")
            return res.status, cr, None
    except urllib.error.HTTPError as err:
        return err.code, err.headers.get("content-range"), err.read()[:180].decode("utf-8", "replace")
    except Exception as exc:
        return None, None, f"{type(exc).__name__}: {exc}"


def count_from_range(content_range: str | None) -> str:
    if not content_range or "/" not in content_range:
        return "?"
    return content_range.split("/")[-1]


def local_json(sql: str):
    proc = subprocess.run(
        ["docker", "exec", DB_CONTAINER, "psql", "-U", "postgres", "-A", "-t", "-c", sql],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return None, proc.stderr.strip()[:200]
    line = proc.stdout.strip()
    if not line:
        return None, "empty"
    return json.loads(line), None


def main() -> int:
    local_env = load_env_local()
    hosted_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    hosted_service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    local_url = local_env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")

    print("==> Connections")
    print(f"    local .env.local URL host: {local_url.split('://')[-1] if local_url else 'missing'}")
    hosted_host = hosted_url.split("://")[-1] if hosted_url else "missing"
    print(f"    process env URL host: {hosted_host}")
    print(f"    expected hosted ref: {PROJECT_REF}")
    print(f"    SUPABASE_ACCESS_TOKEN: {'set' if os.environ.get('SUPABASE_ACCESS_TOKEN') else 'unset'}")
    print(
        f"    SUPABASE_DB_PASSWORD: {'set' if os.environ.get('SUPABASE_DB_PASSWORD') or os.environ.get('DATABASE_URL') else 'unset'}"
    )
    print(f"    ADMIN_EMAILS in .env.local: {'set' if local_env.get('ADMIN_EMAILS', '').strip() else 'empty'}")

    print("\n==> Local Docker catalog")
    counts, err = local_json(
        """
        select json_build_object(
          'assets', (select count(*) from assets),
          'active', (select count(*) from assets where active),
          'sealed', (select count(*) from assets where active and asset_type='sealed'),
          'single', (select count(*) from assets where active and asset_type='single'),
          'graded', (select count(*) from assets where active and asset_type='graded'),
          'snapshots', (select count(*) from price_snapshots),
          'sets', (select count(*) from sets)
        );
        """
    )
    if err:
        print(f"    unavailable: {err}")
    else:
        print(f"    {json.dumps(counts)}")
    job, job_err = local_json(
        "select row_to_json(j) from market_job_state j where job='catalog_import';"
    )
    if job and not job_err:
        print(
            "    import "
            f"status={job.get('status')} stage={job.get('stage')} "
            f"set_index={job.get('set_index')} "
            f"singles={job.get('singles_imported')} "
            f"credits={job.get('credits_used')} "
            f"daily_remaining={job.get('daily_remaining')}"
        )

    print("\n==> Hosted REST")
    if not hosted_url or PROJECT_REF not in hosted_url:
        print("    process env is not the hosted project URL; cannot probe hosted.")
        return 2
    if not hosted_service:
        print("    SUPABASE_SERVICE_ROLE_KEY unset")
        return 2

    mvp = ["assets", "tcgs", "sets", "tournaments", "market_job_state"]
    legacy = ["products", "contests", "price_snapshots"]
    missing_mvp = False
    for table in mvp + legacy:
        status, cr, body = rest(hosted_url, hosted_service, f"/rest/v1/{table}?select=id")
        count = count_from_range(cr)
        if status in (200, 206):
            print(f"    {table}: ok count={count}")
        else:
            print(f"    {table}: http={status} count={count}")
            if table in mvp:
                missing_mvp = True
                if body:
                    print(f"      {body[:120].replace(chr(10), ' ')}")

    print("\n==> Upload readiness")
    if missing_mvp:
        print("    BLOCKED: hosted is still on the beta schema. Apply the three pending migrations.")
        print("    SQL editor: https://supabase.com/dashboard/project/" + PROJECT_REF + "/sql/new")
        print("    Or set SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD and run:")
        print("      python3 script/cloud/apply-hosted-schema.py")
        print("      python3 script/cloud/copy-catalog-to-hosted.py")
        return 3
    print("    Hosted MVP tables exist. Run python3 script/cloud/copy-catalog-to-hosted.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

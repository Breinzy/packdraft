#!/usr/bin/env python3
"""Apply pending Packdraft migrations to the hosted project.

Does not run db reset. Tries, in order:

1. DATABASE_URL or SUPABASE_DB_PASSWORD via the IPv4 pooler (psql)
2. SUPABASE_ACCESS_TOKEN via the Management API

The service_role JWT is not a database password and cannot apply DDL.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROJECT_REF = "lximcqaunrovzonsbjkb"
POOLER_HOST = "aws-1-us-east-1.pooler.supabase.com"
FILES = [
    REPO / "supabase/migrations/20260831120000_phase2_market_and_user_foundation.sql",
    REPO / "supabase/migrations/20260831180000_phase5_10_tournament_engine.sql",
    REPO / "supabase/migrations/20260901120000_market_job_state.sql",
    REPO / "supabase/migrations/20260902120000_phase12_career_mode.sql",
    REPO / "supabase/migrations/20260902130000_phase15_settlement_integrity.sql",
    REPO / "supabase/migrations/20260902140000_phase13_career_progression.sql",
    REPO / "supabase/migrations/20260902150000_phase14_market_events.sql",
    REPO / "supabase/migrations/20260902160000_phase16_social.sql",
    REPO / "supabase/migrations/20260902170000_phase17_creator_tournaments.sql",
    REPO / "supabase/migrations/20260902180000_phase18_monetization.sql",
    REPO / "supabase/migrations/20260902190000_phase19_freetoplay.sql",
    REPO / "supabase/migrations/20260902200000_phase20_release_events.sql",
    REPO / "supabase/migrations/20260902210000_price_history_volume.sql",
    REPO / "supabase/migrations/20260904120000_set_indexes.sql",
]


def missing_creds_message() -> str:
    names = " ".join(path.name for path in FILES)
    return (
        "No hosted DDL credentials. Set SUPABASE_DB_PASSWORD (database password from "
        "Project Settings → Database) or SUPABASE_ACCESS_TOKEN (Account → Access Tokens), "
        f"then re-run. SQL editor fallback: https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new\n"
        f"Run in order: {names}"
    )


def connection_uri() -> str | None:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        return database_url
    password = os.environ.get("SUPABASE_DB_PASSWORD", "").strip()
    if not password:
        return None
    user = f"postgres.{PROJECT_REF}"
    return (
        f"postgresql://{user}:{urllib.parse.quote(password, safe='')}@"
        f"{POOLER_HOST}:5432/postgres?sslmode=require"
    )


def ensure_psql() -> str | None:
    found = shutil.which("psql")
    if found:
        return found
    print("==> Installing postgresql-client for hosted apply")
    proc = subprocess.run(
        ["sudo", "apt-get", "install", "-y", "-qq", "postgresql-client"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(proc.stderr[-400:] if proc.stderr else "apt-get failed", file=sys.stderr)
        return None
    return shutil.which("psql")


def apply_via_psql(uri: str) -> int:
    psql = ensure_psql()
    if not psql:
        return 1
    for path in FILES:
        sql = path.read_text()
        print(f"==> Applying {path.name} via pooler ({len(sql)} chars)")
        proc = subprocess.run(
            [psql, uri, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "")[-800:]
            print(f"    psql failed: {err}", file=sys.stderr)
            return 1
        print("    ok")
    print("==> Hosted schema apply finished (psql)")
    return 0


def apply_via_management_api(token: str) -> int:
    for path in FILES:
        sql = path.read_text()
        print(f"==> Applying {path.name} via Management API ({len(sql)} chars)")
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            data=json.dumps({"query": sql}).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "PackdraftHostedApply/1.0",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                print(f"    HTTP {res.status}")
        except urllib.error.HTTPError as err:
            body = err.read().decode()[:500]
            print(f"    HTTP {err.code}: {body}", file=sys.stderr)
            return 1
    print("==> Hosted schema apply finished (Management API)")
    return 0


def main() -> int:
    uri = connection_uri()
    if uri:
        return apply_via_psql(uri)

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if token:
        return apply_via_management_api(token)

    print(missing_creds_message(), file=sys.stderr)
    for path in FILES:
        print(f"  {path}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

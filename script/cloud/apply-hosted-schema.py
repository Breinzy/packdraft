#!/usr/bin/env python3
"""Apply pending Packdraft migrations to the hosted project via the Management API.

Requires SUPABASE_ACCESS_TOKEN (account token, not the service_role JWT).
Does not run db reset. Skips statements if objects already exist (IF NOT EXISTS).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROJECT_REF = "lximcqaunrovzonsbjkb"
FILES = [
    REPO / "supabase/migrations/20260831120000_phase2_market_and_user_foundation.sql",
    REPO / "supabase/migrations/20260831180000_phase5_10_tournament_engine.sql",
    REPO / "supabase/migrations/20260901120000_market_job_state.sql",
]


def main() -> int:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        print(
            "SUPABASE_ACCESS_TOKEN is not set. Hosted project is still on the beta schema "
            "(products/contests). Apply the three pending migrations in the SQL editor, "
            "or add an account access token and re-run this script.",
            file=sys.stderr,
        )
        print("Files:", file=sys.stderr)
        for path in FILES:
            print(f"  {path}", file=sys.stderr)
        return 2

    for path in FILES:
        sql = path.read_text()
        print(f"==> Applying {path.name} ({len(sql)} chars)")
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            data=json.dumps({"query": sql}).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                print(f"    HTTP {res.status}")
        except urllib.error.HTTPError as err:
            body = err.read().decode()[:500]
            print(f"    HTTP {err.code}: {body}", file=sys.stderr)
            return 1
    print("==> Hosted schema apply finished")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

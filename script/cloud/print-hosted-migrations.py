#!/usr/bin/env python3
"""Print the three pending hosted migrations as one SQL script for the SQL editor."""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FILES = [
    REPO / "supabase/migrations/20260831120000_phase2_market_and_user_foundation.sql",
    REPO / "supabase/migrations/20260831180000_phase5_10_tournament_engine.sql",
    REPO / "supabase/migrations/20260901120000_market_job_state.sql",
]


def main() -> int:
    parts = [
        "-- Packdraft hosted schema (do not db reset).",
        "-- Paste into https://supabase.com/dashboard/project/lximcqaunrovzonsbjkb/sql/new",
        "",
    ]
    for path in FILES:
        parts.append(f"-- ========== {path.name} ==========")
        parts.append(path.read_text().rstrip())
        parts.append("")
    print("\n".join(parts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

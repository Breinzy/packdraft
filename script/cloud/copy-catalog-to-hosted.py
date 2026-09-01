#!/usr/bin/env python3
"""Copy the local Packdraft catalog (assets + latest snapshot) to hosted Supabase.

Uses local Docker Postgres as the source and the hosted service role as the destination.
Does not copy tournament books. Safe to re-run (upsert_asset + new snapshot rows).

Aborts if NEXT_PUBLIC_SUPABASE_URL is the local stack, so a copy cannot wipe
or confuse the Docker catalog with itself.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

HOSTED_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
HOSTED_SERVICE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DB_CONTAINER = os.environ.get("SUPABASE_DB_CONTAINER", "supabase_db_packdraft")
WORKERS = int(os.environ.get("PACKDRAFT_COPY_WORKERS", "4"))
RETRYABLE_HTTP = {408, 429, 500, 502, 503, 504}


def hosted_request(path: str, method: str = "GET", payload=None, prefer: str = "return=minimal"):
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
    last_error = "unknown"
    for attempt in range(8):
        req = urllib.request.Request(
            HOSTED_URL + path,
            data=data,
            method=method,
            headers={
                "apikey": HOSTED_SERVICE,
                "Authorization": f"Bearer {HOSTED_SERVICE}",
                "Content-Type": "application/json",
                "Prefer": prefer,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                raw = res.read()
                if not raw:
                    return res.status, None
                try:
                    return res.status, json.loads(raw.decode())
                except json.JSONDecodeError:
                    return res.status, raw.decode()
        except urllib.error.HTTPError as err:
            body = err.read().decode()
            if err.code in RETRYABLE_HTTP and attempt < 7:
                time.sleep(min(32, 2 ** attempt))
                last_error = f"{err.code}: {body[:120]}"
                continue
            return err.code, body
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            last_error = str(err)
            time.sleep(min(32, 2 ** attempt))
    return 599, f"network after retries: {last_error}"


def local_rows(sql: str) -> list[dict]:
    proc = subprocess.run(
        [
            "docker",
            "exec",
            DB_CONTAINER,
            "psql",
            "-U",
            "postgres",
            "-A",
            "-t",
            "-c",
            sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    out = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        out.append(json.loads(line))
    return out


def copy_one(row: dict) -> tuple[bool, bool, str | None]:
    try:
        return _copy_one(row)
    except Exception as err:
        return False, False, f"unexpected {type(err).__name__}: {err}"[:200]


def _copy_one(row: dict) -> tuple[bool, bool, str | None]:
    status, body = hosted_request(
        "/rest/v1/rpc/upsert_asset",
        method="POST",
        payload={
            "p_tcg_slug": "pokemon",
            "p_set_name": row.get("set_name") or "Unknown",
            "p_name": row["name"],
            "p_asset_type": row["asset_type"],
            "p_external_id": row["external_id"],
            "p_image_url": row.get("image_url"),
            "p_metadata": row.get("metadata") or {},
            "p_active": True,
        },
        prefer="return=representation",
    )
    asset_id = body if isinstance(body, str) else None
    if status >= 400 or not asset_id:
        return False, False, f"upsert {status}: {str(body)[:200]}"
    if row.get("price") is None:
        return True, False, None
    snap_status, snap_body = hosted_request(
        "/rest/v1/price_snapshots",
        method="POST",
        payload={
            "asset_id": asset_id,
            "product_id": None,
            "price": row["price"],
            "change_7d": row.get("change_7d") or 0,
            "volume": row.get("volume") or 0,
            "source": row.get("source") or "pokemonpricetracker",
            "condition": row.get("condition"),
            "price_type": row.get("price_type") or "market",
            "metadata": row.get("snap_metadata") or {},
            "recorded_at": row.get("recorded_at"),
        },
    )
    if snap_status >= 400:
        return True, False, f"snapshot {snap_status}: {str(snap_body)[:200]}"
    return True, True, None


def main() -> int:
    if not HOSTED_URL or not HOSTED_SERVICE:
        print("Hosted NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing", file=sys.stderr)
        return 2
    if "127.0.0.1" in HOSTED_URL or "localhost" in HOSTED_URL:
        print(
            "NEXT_PUBLIC_SUPABASE_URL points at local Supabase. Unset it or export the hosted URL.",
            file=sys.stderr,
        )
        return 2

    status, body = hosted_request("/rest/v1/assets?select=id&limit=1")
    if status == 404:
        print(
            "Hosted project has no public.assets table. Apply Packdraft Phase 2 / 5–10 / "
            "market_job_state migrations first (script/cloud/apply-hosted-schema.py).",
            file=sys.stderr,
        )
        return 3
    if status not in (200, 206):
        print(f"Hosted assets probe failed http={status} {str(body)[:200]}", file=sys.stderr)
        return 3

    rows = local_rows(
        """
        select json_build_object(
          'name', a.name,
          'asset_type', a.asset_type,
          'external_id', a.external_id,
          'image_url', a.image_url,
          'metadata', a.metadata,
          'set_name', s.name,
          'price', p.price,
          'change_7d', p.change_7d,
          'volume', p.volume,
          'source', p.source,
          'condition', p.condition,
          'price_type', p.price_type,
          'snap_metadata', p.metadata,
          'recorded_at', p.recorded_at
        )
        from assets a
        left join sets s on s.id = a.set_id
        left join lateral (
          select * from price_snapshots ps
          where ps.asset_id = a.id
          order by recorded_at desc
          limit 1
        ) p on true
        where a.active and a.external_id is not null
        order by a.asset_type, a.name;
        """
    )
    print(f"==> Copying {len(rows)} local active assets to hosted ({WORKERS} workers)", flush=True)
    copied = 0
    snapped = 0
    errors = 0
    with ThreadPoolExecutor(max_workers=max(1, WORKERS)) as pool:
        futures = [pool.submit(copy_one, row) for row in rows]
        for i, fut in enumerate(as_completed(futures), start=1):
            ok, did_snap, err = fut.result()
            if not ok:
                errors += 1
                if errors <= 5 and err:
                    print(f"    {err}", file=sys.stderr, flush=True)
            else:
                copied += 1
                if did_snap:
                    snapped += 1
            if i % 200 == 0:
                print(
                    f"    progress={i}/{len(rows)} copied={copied} snapped={snapped} errors={errors}",
                    flush=True,
                )

    print(f"==> Done copied={copied} snapped={snapped} errors={errors}", flush=True)
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

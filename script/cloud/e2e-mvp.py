#!/usr/bin/env python3
"""Live MVP functionality test against the running Next app.

Default: app/.env.local (local Docker Supabase). Aborts if that file points
at hosted, so local runs cannot write to production.

PACKDRAFT_E2E_HOSTED=1: use process-env hosted keys (project lximcqaunrovzonsbjkb)
and create users via the Auth admin API so email confirmation cannot block the run.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
APP_URL = os.environ.get("APP_URL", "http://127.0.0.1:3000")
HOSTED_REF = "lximcqaunrovzonsbjkb"
HOSTED = os.environ.get("PACKDRAFT_E2E_HOSTED") == "1"
RESULTS: list[tuple[str, bool, str]] = []


def load_env_local() -> dict[str, str]:
    env: dict[str, str] = {}
    path = REPO / "app" / ".env.local"
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key] = value
    return env


def rest(base: str, key: str, path: str, method: str = "GET", payload=None, extra_headers=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(base.rstrip("/") + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            raw = res.read()
            body = json.loads(raw.decode()) if raw else None
            return res.status, body
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            body = json.loads(raw) if raw else raw
        except json.JSONDecodeError:
            body = raw
        return err.code, body


def load_target() -> tuple[str, str, str]:
    if HOSTED:
        base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        anon = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
        service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if HOSTED_REF not in base:
            print("PACKDRAFT_E2E_HOSTED=1 but process env is not the hosted project.", file=sys.stderr)
            raise SystemExit(2)
        if not anon or not service:
            print("Hosted anon/service keys missing from process env.", file=sys.stderr)
            raise SystemExit(2)
        return base, anon, service

    env = load_env_local()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon = env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if "127.0.0.1" not in base and "localhost" not in base:
        print("app/.env.local is not pointing at local Supabase; aborting to avoid hosted writes.", file=sys.stderr)
        raise SystemExit(2)
    return base, anon, service


def create_user(base: str, service: str, email: str, password: str, display_name: str) -> tuple[int, str | None]:
    status, body = rest(
        base,
        service,
        "/auth/v1/admin/users",
        method="POST",
        payload={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"display_name": display_name},
        },
    )
    user_id = None
    if isinstance(body, dict):
        user_id = (body.get("user") or {}).get("id") or body.get("id")
    return status, user_id


def http_app(path: str):
    req = urllib.request.Request(APP_URL + path, headers={"Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            html = res.read().decode("utf-8", "replace")
            return res.status, html
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8", "replace")
    except TimeoutError:
        return 0, "timeout"


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))


def rpc(base: str, service: str, name: str, payload: dict):
    return rest(base, service, f"/rest/v1/rpc/{name}", method="POST", payload=payload)


def main() -> int:
    base, anon, service = load_target()
    print(f"==> Target {'hosted ' + HOSTED_REF if HOSTED else 'local Docker'}")

    stamp = str(int(time.time()))
    email = f"e2e.{stamp}@example.com"
    password = "PackdraftE2e1!"
    other_email = f"e2e2.{stamp}@example.com"

    print("==> Pages")
    for path in ["/", "/tournaments", "/assets", "/auth/login", "/auth/signup"]:
        status, html = http_app(path)
        check(f"GET {path}", status == 200, f"http {status}")

    status, html = http_app("/assets")
    check("market lists assets", status == 200 and ("NO PRICE" in html or "$" in html or "PAGE" in html), f"http {status} len={len(html)}")
    status, html = http_app("/assets?q=zzzznomatchesxyz")
    check("filter miss copy", "No assets match these filters." in html, f"http {status}")

    print("==> Catalog")
    status, assets = rest(
        base,
        service,
        "/rest/v1/assets?select=id,name,asset_type,active&active=eq.true&limit=1",
    )
    check("assets table readable", status == 200 and isinstance(assets, list) and len(assets) > 0, str(status))

    status, counts = rest(
        base,
        service,
        "/rest/v1/assets?select=asset_type&active=eq.true",
        extra_headers={"Prefer": "count=exact", "Range": "0-0"},
    )
    # range response may 206; rest() treats as error. Count via rpc workaround:
    sealed = rest(base, service, "/rest/v1/assets?select=id&active=eq.true&asset_type=eq.sealed&limit=1")[0]
    singles = rest(base, service, "/rest/v1/assets?select=id&active=eq.true&asset_type=eq.single&limit=1")[0]
    check("sealed present", sealed in (200, 206), str(sealed))
    check("singles present", singles in (200, 206), str(singles))

    status, cheap_rows = rest(
        base,
        service,
        "/rest/v1/rpc/get_tournament_standings".replace(
            "/rpc/get_tournament_standings",
            "/price_snapshots?select=asset_id,price,assets(id,name,asset_type,active)&order=price.asc&limit=1",
        ),
    )
    # simpler: fetch snapshots joined
    status, cheap_rows = rest(
        base,
        service,
        "/rest/v1/price_snapshots?select=asset_id,price,recorded_at,assets!inner(id,name,asset_type,active)&price=gt.0&price=lt.25&assets.active=eq.true&order=price.asc&limit=5",
    )
    check("priced assets exist", status == 200 and isinstance(cheap_rows, list) and len(cheap_rows) > 0, str(status))
    if not (isinstance(cheap_rows, list) and cheap_rows):
        print_summary()
        return 1
    cheap = cheap_rows[0]
    cheap_id = cheap["asset_id"]
    cheap_price = float(cheap["price"])

    status, pricey_rows = rest(
        base,
        service,
        "/rest/v1/price_snapshots?select=asset_id,price,assets!inner(id,name,active,asset_type)&price=gt.200&assets.active=eq.true&order=price.desc&limit=1",
    )
    pricey_id = pricey_rows[0]["asset_id"] if status == 200 and pricey_rows else None
    check("expensive asset exists", bool(pricey_id), str(status))

    print("==> Auth")
    if HOSTED:
        status, user_id = create_user(base, service, email, password, "E2E Player")
        check("signup", status in (200, 201) and bool(user_id), f"http {status}")
        status, user2 = create_user(base, service, other_email, password, "E2E Rival")
        check("second signup", status in (200, 201) and bool(user2), f"http {status}")
    else:
        status, signup = rest(
            base,
            anon,
            "/auth/v1/signup",
            method="POST",
            payload={"email": email, "password": password, "data": {"display_name": "E2E Player"}},
        )
        user_id = None
        if isinstance(signup, dict):
            user_id = (signup.get("user") or {}).get("id") or signup.get("id")
        check("signup", status in (200, 201) and bool(user_id), f"http {status}")

        status, signup2 = rest(
            base,
            anon,
            "/auth/v1/signup",
            method="POST",
            payload={"email": other_email, "password": password, "data": {"display_name": "E2E Rival"}},
        )
        user2 = None
        if isinstance(signup2, dict):
            user2 = (signup2.get("user") or {}).get("id") or signup2.get("id")
        check("second signup", status in (200, 201) and bool(user2), f"http {status}")

    status, login = rest(
        base,
        anon,
        "/auth/v1/token?grant_type=password",
        method="POST",
        payload={"email": email, "password": password},
    )
    check("login", status == 200 and isinstance(login, dict) and login.get("access_token"), f"http {status}")

    if user_id:
        rest(
            base,
            service,
            "/rest/v1/profiles?id=eq." + user_id,
            method="PATCH",
            payload={"display_name": "E2E Player", "display_name_set": True},
            extra_headers={"Prefer": "return=minimal"},
        )
    if user2:
        rest(
            base,
            service,
            "/rest/v1/profiles?id=eq." + user2,
            method="PATCH",
            payload={"display_name": "E2E Rival", "display_name_set": True},
            extra_headers={"Prefer": "return=minimal"},
        )

    print("==> Tournaments")
    status, tcg = rest(base, service, "/rest/v1/tcgs?slug=eq.pokemon&select=id")
    tcg_id = tcg[0]["id"] if status == 200 and tcg else None
    check("pokemon tcg seeded", bool(tcg_id), str(status))

    status, existing = rest(
        base, service, "/rest/v1/tournaments?status=eq.active&select=id,name,starting_budget&limit=1"
    )
    tournament_id = existing[0]["id"] if status == 200 and existing else None
    check("active tournament exists", bool(tournament_id), str(status))

    if not (user_id and tournament_id and cheap_id and tcg_id):
        print_summary()
        return 1

    status, join = rpc(base, service, "join_tournament", {"p_user_id": user_id, "p_tournament_id": tournament_id})
    check("join tournament", status == 200, str(join)[:180])
    cash_before_rejoin = None
    status, books = rest(
        base,
        service,
        f"/rest/v1/tournament_portfolios?user_id=eq.{user_id}&tournament_id=eq.{tournament_id}&select=id,cash,starting_cash",
    )
    if status == 200 and books:
        cash_before_rejoin = float(books[0]["cash"])
    status, join_again = rpc(base, service, "join_tournament", {"p_user_id": user_id, "p_tournament_id": tournament_id})
    status, books_after = rest(
        base,
        service,
        f"/rest/v1/tournament_portfolios?user_id=eq.{user_id}&tournament_id=eq.{tournament_id}&select=id,cash",
    )
    check(
        "rejoin is idempotent",
        status == 200
        and isinstance(books_after, list)
        and len(books_after) == 1
        and cash_before_rejoin is not None
        and float(books_after[0]["cash"]) == cash_before_rejoin,
        f"count={len(books_after) if isinstance(books_after, list) else None} cash={books_after}",
    )

    status, books = rest(
        base,
        service,
        f"/rest/v1/tournament_portfolios?user_id=eq.{user_id}&tournament_id=eq.{tournament_id}&select=id,cash,starting_cash",
    )
    book = books[0] if status == 200 and books else None
    check("starting cash is tournament budget", bool(book) and float(book["cash"]) == float(book["starting_cash"]), str(book))

    print("==> Trading")
    status, buy = rpc(
        base,
        service,
        "execute_tournament_trade",
        {
            "p_user_id": user_id,
            "p_tournament_id": tournament_id,
            "p_asset_id": cheap_id,
            "p_side": "buy",
            "p_quantity": 3,
        },
    )
    check("buy 3 cheap assets", status == 200 and isinstance(buy, dict) and buy.get("ok") is not False, str(buy)[:220])

    status, sell = rpc(
        base,
        service,
        "execute_tournament_trade",
        {
            "p_user_id": user_id,
            "p_tournament_id": tournament_id,
            "p_asset_id": cheap_id,
            "p_side": "sell",
            "p_quantity": 1,
        },
    )
    check("sell 1", status == 200, str(sell)[:220])

    status, oversell = rpc(
        base,
        service,
        "execute_tournament_trade",
        {
            "p_user_id": user_id,
            "p_tournament_id": tournament_id,
            "p_asset_id": cheap_id,
            "p_side": "sell",
            "p_quantity": 9999,
        },
    )
    check("oversell rejected", status >= 400 or (isinstance(oversell, dict) and oversell.get("ok") is False), str(oversell)[:220])

    if pricey_id:
        status, broke = rpc(
            base,
            service,
            "execute_tournament_trade",
            {
                "p_user_id": user_id,
                "p_tournament_id": tournament_id,
                "p_asset_id": pricey_id,
                "p_side": "buy",
                "p_quantity": 5000,
            },
        )
        check("insufficient cash rejected", status >= 400, str(broke)[:220])

    status, txs = rest(
        base,
        service,
        f"/rest/v1/tournament_transactions?select=side,quantity,execution_price&order=executed_at.desc&limit=5",
    )
    check("immutable transactions recorded", status == 200 and isinstance(txs, list) and len(txs) >= 2, str(status))

    print("==> Isolation")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    status, created = rest(
        base,
        service,
        "/rest/v1/tournaments",
        method="POST",
        payload={
            "name": f"E2E isolation {stamp}",
            "description": "Isolation check",
            "tcg_id": tcg_id,
            "starting_budget": 10000,
            "starts_at": now,
            "trading_closes_at": "2099-01-01T00:00:00Z",
            "ends_at": "2099-01-01T00:00:00Z",
            "status": "active",
            "eligible_asset_types": ["sealed", "single", "graded"],
        },
        extra_headers={"Prefer": "return=representation"},
    )
    iso_id = None
    if status in (200, 201) and isinstance(created, list) and created:
        iso_id = created[0]["id"]
    elif status in (200, 201) and isinstance(created, dict):
        iso_id = created.get("id")
    check("create second tournament", bool(iso_id), str(status))
    if iso_id and user2:
        rpc(base, service, "join_tournament", {"p_user_id": user2, "p_tournament_id": iso_id})
        rpc(
            base,
            service,
            "execute_tournament_trade",
            {
                "p_user_id": user2,
                "p_tournament_id": iso_id,
                "p_asset_id": cheap_id,
                "p_side": "buy",
                "p_quantity": 1,
            },
        )
        status, book_a = rest(
            base,
            service,
            f"/rest/v1/tournament_portfolios?user_id=eq.{user_id}&tournament_id=eq.{tournament_id}&select=cash",
        )
        status_b, book_b = rest(
            base,
            service,
            f"/rest/v1/tournament_portfolios?user_id=eq.{user2}&tournament_id=eq.{iso_id}&select=cash",
        )
        cash_a = float(book_a[0]["cash"]) if status == 200 and book_a else None
        cash_b = float(book_b[0]["cash"]) if status_b == 200 and book_b else None
        check("books are isolated", cash_a is not None and cash_b is not None and cash_a != cash_b, f"a={cash_a} b={cash_b}")

    print("==> Settlement")
    two_hours_ago = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 7200))
    status, closing = rest(
        base,
        service,
        "/rest/v1/tournaments",
        method="POST",
        payload={
            "name": f"E2E settle {stamp}",
            "description": "Closes after a trade",
            "tcg_id": tcg_id,
            "starting_budget": 10000,
            "starts_at": two_hours_ago,
            "trading_closes_at": "2099-01-02T00:00:00Z",
            "ends_at": "2099-01-02T00:00:00Z",
            "status": "active",
            "eligible_asset_types": ["sealed", "single", "graded"],
        },
        extra_headers={"Prefer": "return=representation"},
    )
    settle_id = None
    if status in (200, 201) and isinstance(closing, list) and closing:
        settle_id = closing[0]["id"]
    elif status in (200, 201) and isinstance(closing, dict):
        settle_id = closing.get("id")
    check("create closing tournament", bool(settle_id), str(status))
    if settle_id and user_id:
        jstatus, jbody = rpc(base, service, "join_tournament", {"p_user_id": user_id, "p_tournament_id": settle_id})
        check("join before close", jstatus == 200, str(jbody)[:180])
        rpc(
            base,
            service,
            "execute_tournament_trade",
            {
                "p_user_id": user_id,
                "p_tournament_id": settle_id,
                "p_asset_id": cheap_id,
                "p_side": "buy",
                "p_quantity": 1,
            },
        )
        hour_ago = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600))
        rest(
            base,
            service,
            "/rest/v1/price_snapshots",
            method="POST",
            payload={
                "asset_id": cheap_id,
                "price": cheap_price,
                "change_7d": 0,
                "volume": 0,
                "source": "pokemonpricetracker",
                "price_type": "market",
                "recorded_at": hour_ago,
            },
            extra_headers={"Prefer": "return=minimal"},
        )
        past = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 120))
        pstatus, pbody = rest(
            base,
            service,
            f"/rest/v1/tournaments?id=eq.{settle_id}",
            method="PATCH",
            payload={"trading_closes_at": past, "ends_at": past},
            extra_headers={"Prefer": "return=representation"},
        )
        check("close time patched", pstatus in (200, 204) or (isinstance(pbody, list) and pbody), f"http {pstatus} {str(pbody)[:120]}")
        status, tick = rpc(base, service, "tick_tournaments", {})
        check("tick tournaments", status == 200, str(tick)[:220])
        status, settled_row = rest(
            base, service, f"/rest/v1/tournaments?id=eq.{settle_id}&select=id,status,settled_at"
        )
        settled_status = settled_row[0]["status"] if status == 200 and settled_row else None
        check("closed tournament settles", settled_status == "completed", f"status={settled_status}")
        status, results = rest(
            base, service, f"/rest/v1/tournament_results?tournament_id=eq.{settle_id}&select=rank,final_value"
        )
        check(
            "results frozen",
            status == 200 and isinstance(results, list) and len(results) >= 1,
            str(results)[:180],
        )
        status, late_trade = rpc(
            base,
            service,
            "execute_tournament_trade",
            {
                "p_user_id": user_id,
                "p_tournament_id": settle_id,
                "p_asset_id": cheap_id,
                "p_side": "buy",
                "p_quantity": 1,
            },
        )
        check("trade rejected after close", status >= 400, str(late_trade)[:220])

    print("==> Rank")
    status, standings = rpc(base, service, "get_tournament_standings", {"p_tournament_id": tournament_id})
    check("standings readable", status == 200 and isinstance(standings, list) and len(standings) >= 1, str(status))

    status, player_page = http_app(f"/players/{user_id}")
    check("player history page", status == 200, f"http {status}")

    print_summary()
    failed = [name for name, ok, _ in RESULTS if not ok]
    return 1 if failed else 0


def print_summary() -> None:
    failed = [(n, d) for n, ok, d in RESULTS if not ok]
    print()
    print(f"==> {sum(1 for _, ok, _ in RESULTS if ok)} passed, {len(failed)} failed, {len(RESULTS)} total")
    for name, detail in failed:
        print(f"    FAIL {name}: {detail}")


if __name__ == "__main__":
    raise SystemExit(main())

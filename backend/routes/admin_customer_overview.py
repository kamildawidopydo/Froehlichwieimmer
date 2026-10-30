"""Read-only admin customer overview, per-customer IPO list and change history (no writes)."""
from __future__ import annotations

from collections import defaultdict
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, HTTPException

from server import db, require_admin
from services.cash_service import get_cash_summary
from services.stock_price_service import get_quotes as get_stock_quotes

router = APIRouter(prefix="/api/admin/customers", tags=["admin-customer-overview"])

INACTIVE_STATUSES = {"inactive", "deactivated", "disabled"}
BLOCKED_STATUSES = {"blocked", "locked", "suspended", "gesperrt"}
OPEN_FILTERS = {
    "ipo_requests": {"status": {"$in": ["pending", "approved"]}},
    "stock_orders": {"status": "pending"},
    "bond_purchase_requests": {"status": {"$in": ["pending", "approved"]}},
    "payout_requests": {"status": {"$in": ["pending", "requested"]}},
    "support_tickets": {"status": "open"},
}
ACTIVITY_COLLS = ("stock_orders", "ipo_requests", "bond_purchase_requests", "payout_requests", "support_tickets")


def _num(v) -> float:
    if v is None:
        return 0.0
    if isinstance(v, Decimal128):
        return float(v.to_decimal())
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _iso(v) -> Optional[str]:
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc).isoformat()
    return v if isinstance(v, str) else None


def _uid(v) -> Optional[str]:
    return str(v) if v is not None else None


def customer_numbers(ids: List[str]) -> Dict[str, str]:
    """KD-<last hex chars>; lengthened only where a short form would collide."""
    out: Dict[str, str] = {}
    for length in (8, 12, 24):
        groups: Dict[str, List[str]] = defaultdict(list)
        for i in ids:
            if i not in out:
                groups[i[-length:].upper()].append(i)
        for short, members in groups.items():
            if len(members) == 1 or length == 24:
                for m in members:
                    out[m] = f"KD-{m[-length:].upper()}"
    return out


def _status(doc: dict, login_locked: bool) -> Dict[str, Any]:
    raw = str(doc.get("status") or "active").lower()
    if raw in INACTIVE_STATUSES:
        key, label = "inactive", "Inaktiv"
    elif raw in BLOCKED_STATUSES:
        key, label = "blocked", "Gesperrt"
    else:
        key, label = "active", "Aktiv"
    return {"status": key, "status_label": label, "login_locked": login_locked}


def _ipo_valuations(reqs: List[dict]) -> Dict[tuple, float]:
    vals: Dict[tuple, float] = {}
    for r in sorted(reqs, key=lambda x: str(x.get("valuation_set_at") or x.get("created_at") or "")):
        if r.get("status") not in ("approved", "allocated") or r.get("use_admin_valuation") is False:
            continue
        lp = _num(r.get("listing_price_per_share"))
        if lp <= 0:
            continue
        for sym in (r.get("position_symbol"), r.get("ticker")):
            if sym:
                vals[(_uid(r.get("user_id")), str(sym).strip().upper())] = lp
    return vals


@router.get("/overview")
async def customers_overview(_admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    users = await db.users.find({}, {"password_hash": 0, "password_reset_tokens": 0}).to_list(5000)
    ids = [str(u["_id"]) for u in users]
    numbers = customer_numbers(ids)
    now = datetime.now(timezone.utc)

    locked = set()
    async for la in db.login_attempts.find({"locked_until": {"$gt": now.replace(tzinfo=None)}}):
        ident = str(la.get("identifier") or "")
        if ident.startswith("email:"):
            locked.add(ident[6:].lower())

    stocks = await db.stock_positions.find({"is_active": {"$ne": False}}).to_list(20000)
    stocks = [s for s in stocks if _num(s.get("quantity")) > 0]
    quotes = await get_stock_quotes(db, sorted({str(s["symbol"]).strip().upper() for s in stocks if s.get("symbol")}))
    ipo_reqs = await db.ipo_requests.find({}).to_list(20000)
    ipo_vals = _ipo_valuations(ipo_reqs)
    bonds = await db.bond_positions.find({"is_active": {"$ne": False}}).to_list(20000)
    contracts = await db.depot_contracts.find({"is_active": True}).to_list(20000)

    agg: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "stocks_value": 0.0, "bonds_value": 0.0, "contracts_value": 0.0,
        "positions": 0, "ipo_positions": 0, "contracts": 0, "fallback_positions": 0,
        "open": defaultdict(int), "last_activity": None,
    })
    for s in stocks:
        a = agg[_uid(s.get("user_id"))]
        qty, sym = _num(s.get("quantity")), str(s.get("symbol") or "").upper()
        est = ipo_vals.get((_uid(s.get("user_id")), sym))
        price = est if est is not None else (quotes.get(sym) or {}).get("price")
        if price is None:
            a["fallback_positions"] += 1
            price = _num(s.get("avg_cost"))
        a["stocks_value"] += qty * float(price)
        a["positions"] += 1
        if est is not None:
            a["ipo_positions"] += 1
    for b in bonds:
        a = agg[_uid(b.get("user_id"))]
        nominal = _num(b.get("nominal_betrag") if b.get("nominal_betrag") is not None else b.get("nominal_amount"))
        kurs = b.get("aktueller_kurs")
        if kurs is None:
            a["fallback_positions"] += 1
            kurs = b.get("average_purchase_price_pct")
        a["bonds_value"] += nominal * _num(kurs) / 100
        a["positions"] += 1
    for c in contracts:
        a = agg[_uid(c.get("user_id"))]
        a["contracts_value"] += _num(c.get("amount_eur"))
        a["contracts"] += 1

    for coll, filt in OPEN_FILTERS.items():
        async for row in db[coll].aggregate([{"$match": filt}, {"$group": {"_id": "$user_id", "n": {"$sum": 1}}}]):
            agg[_uid(row["_id"])]["open"][coll] += row["n"]
    for coll in ACTIVITY_COLLS:
        async for row in db[coll].aggregate([{"$group": {"_id": "$user_id", "t": {"$max": "$created_at"}}}]):
            _bump(agg[_uid(row["_id"])], row.get("t"))
    async for row in db.cash_ledger.aggregate([
        {"$match": {"source": {"$ne": "admin"}}}, {"$group": {"_id": "$user_id", "t": {"$max": "$created_at"}}},
    ]):
        _bump(agg[_uid(row["_id"])], row.get("t"))

    cash_by_user = dict(zip(ids, await asyncio.gather(*(get_cash_summary(db, {"id": i}) for i in ids))))
    items = []
    for u in users:
        uid = str(u["_id"])
        a = agg[uid]
        cash = cash_by_user[uid]
        cash_balance, cash_available = float(cash["balance"]), float(cash["available"])
        name = u.get("name") or " ".join(x for x in (u.get("first_name"), u.get("last_name")) if x) or None
        open_counts = dict(a["open"])
        items.append({
            "id": uid,
            "customer_number": numbers[uid],
            "name": name,
            "email": u.get("email"),
            "role": u.get("role") or "user",
            **_status(u, str(u.get("email") or "").lower() in locked),
            "is_test_account": bool(u.get("is_test_account")),
            "created_at": _iso(u.get("created_at")),
            "total_assets": round(cash_balance + a["stocks_value"] + a["bonds_value"] + a["contracts_value"], 2),
            "cash_balance": round(cash_balance, 2),
            "cash_available": round(cash_available, 2),
            "securities_value": round(a["stocks_value"] + a["bonds_value"], 2),
            "contracts_value": round(a["contracts_value"], 2),
            "positions": a["positions"],
            "ipo_positions": a["ipo_positions"],
            "contracts": a["contracts"],
            "fallback_positions": a["fallback_positions"],
            "has_depot": a["positions"] > 0 or a["contracts"] > 0,
            "open_requests": sum(open_counts.values()),
            "open_breakdown": open_counts,
            "last_activity": _iso(a["last_activity"]),
        })
    return {
        "items": items,
        "generated_at": now.isoformat(),
        "basis": {
            "total_assets": "Liquidität + Aktien (Börsenkurs bzw. IPO-Schätzung, sonst Einstand) + Anleihen + Zinsanlagen zum Nennbetrag",
            "last_activity": "Aufträge, Anfragen, Auszahlungen, Support, eigene Buchungen – Anmeldungen werden nicht protokolliert",
        },
    }


def _bump(a: dict, t) -> None:
    if not isinstance(t, datetime):
        return
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    if a["last_activity"] is None or t > a["last_activity"]:
        a["last_activity"] = t


async def _require_customer(user_id: str) -> ObjectId:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Ungültige Kunden-ID")
    oid = ObjectId(user_id)
    if not await db.users.find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    return oid


def _owner(oid: ObjectId) -> dict:
    return {"user_id": {"$in": [oid, str(oid)]}}


@router.get("/{user_id}/details")
async def customer_details(user_id: str, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    """Read-only data for the detail tabs: prices (EUR quote or IPO estimate), orders, watchlist, activity."""
    oid = await _require_customer(user_id)
    own = _owner(oid)
    stocks = await db.stock_positions.find(own).to_list(1000)
    syms = sorted({str(s["symbol"]).strip().upper() for s in stocks if s.get("symbol")})
    quotes = await get_stock_quotes(db, syms) if syms else {}
    vals = _ipo_valuations(await db.ipo_requests.find(own).to_list(1000))
    price_map, price_source = {}, {}
    for sym in syms:
        est = vals.get((str(oid), sym))
        q = (quotes.get(sym) or {}).get("price")
        if est is not None:
            price_map[sym], price_source[sym] = est, "ipo_estimate"
        elif q is not None:
            price_map[sym], price_source[sym] = float(q), "market"
    orders = await db.stock_orders.find(own).sort("created_at", -1).to_list(200)
    watch = await db.watchlists.find(own).sort("sort_order", 1).to_list(200)
    snaps = await db.portfolio_snapshots.find(own).sort("snapshot_date", -1).to_list(1)
    labels = {"stock_orders": "Aktienauftrag", "ipo_requests": "IPO-Anfrage", "bond_purchase_requests": "Anleihen-Anfrage",
              "payout_requests": "Auszahlungsantrag", "support_tickets": "Support-Anfrage"}
    events = []
    for coll, label in labels.items():
        async for d in db[coll].find(own).sort("created_at", -1).limit(50):
            detail = d.get("symbol") or d.get("ticker") or d.get("isin") or d.get("subject") or ""
            events.append({"id": f"{coll}-{d['_id']}", "event_type": f"{label} · {detail} · {d.get('status') or ''}".strip(" ·"),
                           "created_at": _iso(d.get("created_at"))})
    events.sort(key=lambda e: e["created_at"] or "", reverse=True)
    return {
        "price_map": price_map,
        "price_source": price_source,
        "orders": [{
            "id": str(o["_id"]), "side": o.get("side"), "symbol": o.get("symbol"), "quantity": _num(o.get("quantity")),
            "status": o.get("status"), "created_at": _iso(o.get("created_at")), "rejection_reason": o.get("rejection_reason"),
        } for o in orders],
        "watchlist": [{"symbol": w.get("symbol"), "added_at": _iso(w.get("created_at")),
                       "stocks": {"name": w.get("display_name")}} for w in watch],
        "activity": events[:100],
        "snapshots": [{"total_value": _num(s.get("total_value")), "snapshot_date": s.get("snapshot_date")} for s in snaps],
    }


@router.get("/{user_id}/ipo-requests")
async def customer_ipo_requests(user_id: str, _admin: dict = Depends(require_admin)) -> List[Dict[str, Any]]:
    oid = await _require_customer(user_id)
    docs = await db.ipo_requests.find(_owner(oid)).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        shares = _num(d.get("allocated_shares") if d.get("status") == "allocated" else d.get("shares_requested"))
        sub, lp = d.get("subscription_price_per_share"), d.get("listing_price_per_share")
        out.append({
            "id": str(d["_id"]), "company_name": d.get("company_name"), "ticker": d.get("ticker"),
            "status": d.get("status"), "shares": shares, "amount_eur": _num(d.get("amount_eur")),
            "subscription_price": _num(sub) if sub is not None else None,
            "listing_price": _num(lp) if lp is not None else None,
            "use_admin_valuation": d.get("use_admin_valuation") is not False,
            "created_at": _iso(d.get("created_at")), "allocation_date": _iso(d.get("allocation_date")),
            "valuation_set_at": _iso(d.get("valuation_set_at")), "is_archived": bool(d.get("is_archived")),
        })
    return out


@router.get("/{user_id}/change-log")
async def customer_change_log(user_id: str, _admin: dict = Depends(require_admin)) -> Dict[str, Any]:
    """Aggregates the admin traces that already exist; marks entries without before/after or reason."""
    oid = await _require_customer(user_id)
    entries: List[Dict[str, Any]] = []
    async for p in db.position_adjustments.find({"target_user_id": {"$in": [oid, str(oid)]}}):
        entries.append({
            "at": _iso(p.get("created_at")), "admin_id": _uid(p.get("admin_user_id")),
            "area": "Bestandskorrektur", "subject": f"{p.get('kind')} · {p.get('asset_key')}",
            "before": str(_num(p.get("before"))), "after": str(_num(p.get("after"))),
            "reason": p.get("reason") or p.get("note"), "complete": True,
        })
    async for r in db.ipo_requests.find(_owner(oid)):
        label = f"{r.get('company_name') or ''} ({r.get('ticker') or '–'})"
        if r.get("handled_at"):
            entries.append({
                "at": _iso(r.get("handled_at")), "admin_id": _uid(r.get("handled_by")), "area": "IPO-Anfrage",
                "subject": label, "before": "pending", "after": r.get("approved_at") and "approved" or (r.get("rejected_at") and "rejected") or r.get("status"),
                "reason": r.get("decision_note"), "complete": False,
            })
        if r.get("status") == "allocated" and r.get("allocation_date"):
            entries.append({
                "at": _iso(r.get("allocation_date")), "admin_id": _uid(r.get("allocated_by")), "area": "IPO-Zuteilung",
                "subject": label, "before": None, "after": f"{_num(r.get('allocated_shares')):g} Stück",
                "reason": None, "complete": False,
            })
        for h in r.get("valuation_history") or []:
            lp, sub = h.get("listing_price_per_share"), h.get("subscription_price_per_share")
            after = ", ".join(x for x in (
                f"Schätzwert {_num(lp):.4f} €" if lp is not None else None,
                f"Kaufpreis {_num(sub):.4f} €" if sub is not None else None) if x) or "Einstellung geändert"
            entries.append({
                "at": _iso(h.get("at")), "admin_id": _uid(h.get("by")), "area": "IPO-Bewertung",
                "subject": label, "before": None, "after": after, "reason": None, "complete": False,
            })
    async for c in db.depot_contracts.find(_owner(oid)):
        entries.append({
            "at": _iso(c.get("created_at")), "admin_id": _uid(c.get("created_by")), "area": "Vertrag angelegt",
            "subject": f"{c.get('product_type')} · {c.get('bank_name') or ''}", "before": None,
            "after": f"{_num(c.get('amount_eur')):.2f} € · {c.get('zinssatz')} %", "reason": c.get("note"), "complete": False,
        })
    async for a in db.audit_log.find({"entity_id": str(oid)}):
        entries.append({
            "at": _iso(a.get("changed_at")), "admin_id": None, "admin_label": a.get("changed_by"),
            "area": f"Audit · {a.get('entity_type')}", "subject": a.get("action"),
            "before": str(a.get("before")) if a.get("before") is not None else None,
            "after": str(a.get("after")) if a.get("after") is not None else None, "reason": a.get("reason"), "complete": True,
        })
    admin_ids = {ObjectId(e["admin_id"]) for e in entries if e.get("admin_id") and ObjectId.is_valid(e["admin_id"])}
    admins = {str(u["_id"]): u.get("email") async for u in db.users.find({"_id": {"$in": list(admin_ids)}}, {"email": 1})}
    for e in entries:
        e.setdefault("admin_label", admins.get(e.get("admin_id")) or (e.get("admin_id") and "unbekannt") or "nicht erfasst")
    entries.sort(key=lambda e: e.get("at") or "", reverse=True)
    return {
        "items": entries,
        "not_logged": [
            "Direktes Anlegen/Löschen von Aktien- und Anleihepositionen über „Bestand eintragen“",
            "Löschen von Verträgen",
            "Änderungen an Kundenstammdaten (Name, Adresse, Telefon)",
            "Vorherige Werte bei IPO-Bewertungen",
        ],
    }

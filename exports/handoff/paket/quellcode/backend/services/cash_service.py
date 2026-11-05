"""
Cash-Service (Session 82.18 · Depot Phase 2).

Append-only Ledger als **Source of Truth** für Kunden-Cash.
Kein `balance`-Feld auf `users` mehr als Basis — Balance wird IMMER aus
`cash_ledger`-Events berechnet.

Design-Prinzipien:
  - Mongo-Standalone-sicher: jede Buchung ist genau EIN Dokument-Insert.
    Multi-Collection-Financial-Flows (Cash-Debit + Position-Create) sind
    explizit NICHT Teil dieser Phase.
  - Idempotenz: Unique-Index auf `(user_id, idempotency_key)` verhindert
    Duplicate-Inserts bei Retry.
  - Präzision: Beträge als BSON `Decimal128` gespeichert, `ROUND_HALF_EVEN`.
  - Read-Aggregation: `settled_credits - settled_debits = balance`.

Öffentliche Funktionen:
  - `get_cash_summary(db, user)`       – Balance/Available/Unsettled
  - `get_cash_history(db, user, limit)` – letzte N Ledger-Events
  - `create_cash_event(db, ...)`        – validiert + inserted 1 Event
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN, InvalidOperation
from typing import Optional

from bson import ObjectId
from bson.decimal128 import Decimal128


# ─── Konstanten ─────────────────────────────────────────────────────────
ALLOWED_CURRENCIES = frozenset({"EUR", "USD"})

# Event-Types (Session 82.30 · Bond-Execution: bond_purchase freigegeben)
_ACTIVE_TYPES = frozenset({
    "deposit", "withdrawal", "adjustment", "reserve", "release",
    "stock_purchase",   # 82.26
    "stock_sale",       # 82.28
    "ipo_purchase",     # 82.29
    "bond_purchase",    # 82.30
})

# Reserviert für kommende Phasen (dokumentiert, aber nicht akzeptiert)
_RESERVED_TYPES = frozenset({
    "dividend", "interest", "fee", "tax",
})

_DIRECTIONS = frozenset({"credit", "debit"})
_STATUSES = frozenset({"pending", "settled", "cancelled"})

_MONEY_QUANT = Decimal("0.01")


# ─── Money-Helpers ───────────────────────────────────────────────────────
def _to_decimal(value) -> Decimal:
    """Sicherer Cast zu Decimal; nur strikte Werte."""
    if value is None:
        raise ValueError("amount fehlt")
    if isinstance(value, Decimal):
        d = value
    elif isinstance(value, Decimal128):
        d = value.to_decimal()
    elif isinstance(value, (int, str)):
        try:
            d = Decimal(str(value))
        except InvalidOperation as exc:
            raise ValueError(f"ungültiger Betrag: {value!r}") from exc
    elif isinstance(value, float):
        # Explizit blocken — Float-Arithmetik nicht für Geld.
        raise ValueError("float ist für Geldbeträge nicht erlaubt")
    else:
        raise ValueError(f"unerwarteter Typ für amount: {type(value).__name__}")
    if d != d:  # NaN
        raise ValueError("amount ist NaN")
    return d.quantize(_MONEY_QUANT, rounding=ROUND_HALF_EVEN)


def _to_bson(amount: Decimal) -> Decimal128:
    return Decimal128(amount)


def _decimal_from_bson(v) -> Decimal:
    if v is None:
        return Decimal("0.00")
    if isinstance(v, Decimal128):
        return v.to_decimal()
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError):
        return Decimal("0.00")


def _fmt_amount(d: Decimal) -> str:
    """Für JSON-Response — String, damit keine Float-Präzisionsverluste im Wire-Format entstehen."""
    return format(d.quantize(_MONEY_QUANT, rounding=ROUND_HALF_EVEN), "f")


def _ownership(user: dict) -> dict:
    oid = ObjectId(user["id"])
    return {"$or": [{"user_id": oid}, {"user_id": str(oid)}]}


# ─── Validation ──────────────────────────────────────────────────────────
def _validate_currency(currency: str) -> str:
    c = (currency or "").upper()
    if c not in ALLOWED_CURRENCIES:
        raise ValueError(f"unsupported currency: {currency!r}")
    return c


def _validate_type(event_type: str) -> str:
    t = (event_type or "").lower()
    if t in _ACTIVE_TYPES:
        return t
    if t in _RESERVED_TYPES:
        raise ValueError(f"event type '{t}' reserviert für spätere Phase")
    raise ValueError(f"unknown event type: {event_type!r}")


def _validate_direction(direction: str) -> str:
    d = (direction or "").lower()
    if d not in _DIRECTIONS:
        raise ValueError(f"invalid direction: {direction!r}")
    return d


def _validate_status(status: str) -> str:
    s = (status or "").lower()
    if s not in _STATUSES:
        raise ValueError(f"invalid status: {status!r}")
    return s


def validate_cash_event(
    *,
    user_id: str,
    event_type: str,
    direction: str,
    amount,
    currency: str,
    status: str = "settled",
    idempotency_key: str,
    description: Optional[str] = None,
    source: str = "admin",
    source_reference_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> dict:
    """
    Validiert und konstruiert das Ledger-Dokument (ohne Insert).
    Nutzung: Route → validate → create_cash_event.
    """
    if not user_id or not isinstance(user_id, str):
        raise ValueError("user_id fehlt")
    try:
        uid = ObjectId(user_id)
    except Exception as exc:
        raise ValueError(f"ungültige user_id: {user_id!r}") from exc

    if not idempotency_key or not isinstance(idempotency_key, str):
        raise ValueError("idempotency_key erforderlich")
    if len(idempotency_key) < 8 or len(idempotency_key) > 200:
        raise ValueError("idempotency_key muss 8..200 Zeichen sein")

    ev_type = _validate_type(event_type)
    ev_dir = _validate_direction(direction)
    ev_status = _validate_status(status)
    cur = _validate_currency(currency)
    amt = _to_decimal(amount)
    if amt <= Decimal("0.00"):
        raise ValueError("amount muss > 0 sein")

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": uid,
        "type": ev_type,
        "direction": ev_dir,
        "amount": _to_bson(amt),
        "currency": cur,
        "status": ev_status,
        "idempotency_key": idempotency_key,
        "source": source or "admin",
        "source_reference_id": source_reference_id,
        "description": (description or "").strip()[:500] or None,
        "effective_at": now,
        "created_at": now,
        "created_by": created_by,
    }
    return doc


async def create_cash_event(db, **kwargs) -> dict:
    """
    Führt einen validierten Ledger-Insert aus. Idempotent via Unique-Index.

    Returns dict mit:
      - status: 'inserted' | 'duplicate'
      - event: das eingefügte oder bestehende Dokument (serialisiert)
    """
    doc = validate_cash_event(**kwargs)
    try:
        res = await db.cash_ledger.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"status": "inserted", "event": _serialize_event(doc)}
    except Exception as exc:
        # DuplicateKeyError from unique index → Idempotency-Hit
        if getattr(exc, "code", None) == 11000 or "duplicate key" in str(exc).lower():
            existing = await db.cash_ledger.find_one({
                "user_id": doc["user_id"],
                "idempotency_key": doc["idempotency_key"],
            })
            if existing:
                return {"status": "duplicate", "event": _serialize_event(existing)}
        raise


# ─── Read / Aggregation ──────────────────────────────────────────────────
async def _aggregate_balances(db, user: dict) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Berechnet (settled_credits, settled_debits, pending_debits, open_buy_reservations).
    Session 82.19: Buy-Order-Reservations werden aus `stock_orders` gelesen
    (Order-State, KEIN Ledger-Event) und in `available` einberechnet.
    """
    ownership = _ownership(user)
    pipeline = [
        {"$match": ownership},
        {"$group": {
            "_id": {"status": "$status", "direction": "$direction"},
            "total": {"$sum": "$amount"},
        }},
    ]
    settled_credit = Decimal("0.00")
    settled_debit = Decimal("0.00")
    pending_debit = Decimal("0.00")
    async for row in db.cash_ledger.aggregate(pipeline):
        st = row["_id"].get("status")
        dr = row["_id"].get("direction")
        amt = _decimal_from_bson(row.get("total"))
        if st == "settled" and dr == "credit":
            settled_credit += amt
        elif st == "settled" and dr == "debit":
            settled_debit += amt
        elif st == "pending" and dr == "debit":
            pending_debit += amt

    # Session 82.19: open Buy-Order Reservations
    open_buy = Decimal("0.00")
    res_pipe = [
        {"$match": {**ownership, "side": "buy", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$reserved_cash"}}},
    ]
    async for row in db.stock_orders.aggregate(res_pipe):
        open_buy = _decimal_from_bson(row.get("total"))
    # Reservierungen offener Anleihe-Direktorders (warten auf Bankbestätigung)
    bond_pipe = [
        {"$match": {**ownership, "order_type": "direct",
                    "status": {"$in": ["awaiting_bank", "bank_submitted"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$reserved_cash"}}},
    ]
    async for row in db.bond_purchase_requests.aggregate(bond_pipe):
        open_buy += _decimal_from_bson(row.get("total"))
    return settled_credit, settled_debit, pending_debit, open_buy


async def get_cash_summary(db, user: dict) -> dict:
    """
    Aggregierter Cash-Zustand:
      balance   = settled_credits - settled_debits
      unsettled = pending_debits
      available = balance - unsettled - open_buy_reservations
    """
    credits, debits, pending, open_buy = await _aggregate_balances(db, user)
    balance = (credits - debits).quantize(_MONEY_QUANT, rounding=ROUND_HALF_EVEN)
    unsettled = pending.quantize(_MONEY_QUANT, rounding=ROUND_HALF_EVEN)
    open_buy_reservations = open_buy.quantize(_MONEY_QUANT, rounding=ROUND_HALF_EVEN)
    available = (balance - unsettled - open_buy_reservations).quantize(
        _MONEY_QUANT, rounding=ROUND_HALF_EVEN,
    )
    return {
        "balance": _fmt_amount(balance),
        "available": _fmt_amount(available),
        "unsettled": _fmt_amount(unsettled),
        "open_buy_reservations": _fmt_amount(open_buy_reservations),
        "currency": "EUR",
    }


def _serialize_event(doc: dict) -> dict:
    amt = _decimal_from_bson(doc.get("amount"))
    return {
        "id": str(doc["_id"]),
        "type": doc.get("type"),
        "direction": doc.get("direction"),
        "amount": _fmt_amount(amt),
        "currency": doc.get("currency"),
        "status": doc.get("status"),
        "description": doc.get("description"),
        "source": doc.get("source"),
        "source_reference_id": doc.get("source_reference_id"),
        "effective_at": (
            doc["effective_at"].isoformat()
            if isinstance(doc.get("effective_at"), datetime) else doc.get("effective_at")
        ),
        "created_at": (
            doc["created_at"].isoformat()
            if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")
        ),
    }


async def get_cash_history(db, user: dict, limit: int = 100) -> list[dict]:
    limit = max(1, min(int(limit or 100), 500))
    cursor = db.cash_ledger.find(_ownership(user)).sort(
        [("effective_at", -1), ("created_at", -1)]
    ).limit(limit)
    return [_serialize_event(doc) async for doc in cursor]


# ─── Index-Ensure ────────────────────────────────────────────────────────
async def ensure_indexes(db) -> None:
    """Idempotente Indizes — sicher bei jedem Startup."""
    await db.cash_ledger.create_index(
        [("user_id", 1), ("idempotency_key", 1)],
        unique=True,
        name="user_idem_unique",
    )
    await db.cash_ledger.create_index(
        [("user_id", 1), ("effective_at", -1)], name="user_effective_desc",
    )
    await db.cash_ledger.create_index(
        [("user_id", 1), ("created_at", -1)], name="user_created_desc",
    )

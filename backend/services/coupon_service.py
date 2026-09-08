"""
Coupon-Service (Session 82.61a · Mongo-nativer Stock-Trade-Coupon).

Legacy-Parität zu `peek_stock_trade_coupon`, `submit_user_stock_order` und
`execute_stock_order` gemäß Session-82.60-Audit.

Regeln (verbindlich, aus 82.60):
  - Coupon nur bei BUY. Bei SELL → hard error.
  - Coupon optional. Buy ohne Coupon → regulärer Flow, keine Änderung.
  - Coupon ist NICHT user-gebunden.
  - Single-use via Status-Enum: `active → reserved → consumed`
    (`revoked` als Terminal für Admin-Widerruf).
  - Kein Ablaufdatum, kein Min/Max-Order, keine User-Binding.
  - Percent-Rabatt auf `gross = qty × limit_price`.
  - `discount = round(gross × percent / 100, 2)` mit `ROUND_HALF_EVEN`.
  - `cash_debit = gross - discount` (nur beim Buy-Execute).
  - Position `avg_cost` bleibt bei vollem `executed_price` (LEGACY PARITY).
    Diese Anomalie wird bewusst NICHT „gefixt".

Keine Float-Arithmetik. Alle Beträge als Decimal / Decimal128.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN, InvalidOperation
from secrets import token_hex
from typing import Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from pymongo import ReturnDocument


# ─── Konstanten ────────────────────────────────────────────────────────
_MONEY = Decimal("0.01")
_PCT = Decimal("0.0001")

STATUS_ACTIVE = "active"
STATUS_RESERVED = "reserved"
STATUS_CONSUMED = "consumed"
STATUS_REVOKED = "revoked"

_ALL_STATUS = frozenset({STATUS_ACTIVE, STATUS_RESERVED, STATUS_CONSUMED, STATUS_REVOKED})


# ─── Fehler ────────────────────────────────────────────────────────────
class CouponError(Exception):
    """Sanft: Coupon-Operation nicht möglich; kein finanzieller Nebeneffekt entstanden."""

    def __init__(self, code: str, detail: str, http_status: int = 400):
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.http_status = http_status


# ─── Helpers ───────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _q_money(d: Decimal) -> Decimal:
    return d.quantize(_MONEY, rounding=ROUND_HALF_EVEN)


def _dec_from_bson(v) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal128):
        return v.to_decimal()
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except InvalidOperation:
        return Decimal("0")


def normalize_code(code: Optional[str]) -> str:
    return (code or "").strip().upper()


def compute_discount(gross: Decimal, percent: Decimal) -> Decimal:
    """LEGACY-PARITY: discount = round(gross × pct / 100, 2)."""
    return _q_money(gross * percent / Decimal("100"))


def compute_net(gross: Decimal, percent: Optional[Decimal]) -> Decimal:
    """LEGACY-PARITY: net = gross - discount (buy). Ohne Coupon: net == gross."""
    if percent is None:
        return _q_money(gross)
    return _q_money(gross - compute_discount(gross, percent))


def serialize_coupon(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "code": doc.get("code"),
        "percent": format(_dec_from_bson(doc.get("percent")), "f"),
        "status": doc.get("status"),
        "reserved_order_id": str(doc.get("reserved_order_id")) if doc.get("reserved_order_id") else None,
        "reserved_at": doc["reserved_at"].isoformat() if isinstance(doc.get("reserved_at"), datetime) else None,
        "consumed_order_id": str(doc.get("consumed_order_id")) if doc.get("consumed_order_id") else None,
        "consumed_at": doc["consumed_at"].isoformat() if isinstance(doc.get("consumed_at"), datetime) else None,
        "consumed_by_user_id": str(doc.get("consumed_by_user_id")) if doc.get("consumed_by_user_id") else None,
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else None,
        "updated_at": doc["updated_at"].isoformat() if isinstance(doc.get("updated_at"), datetime) else None,
        "preview_only": bool(doc.get("preview_only", False)),
        "qa_session": doc.get("qa_session"),
    }


# ─── Indizes ───────────────────────────────────────────────────────────
async def ensure_indexes(db) -> None:
    """Idempotent. Wird beim Backend-Startup einmal aufgerufen."""
    await db.stock_trade_coupons.create_index(
        [("code", 1)], unique=True, name="code_unique",
    )
    await db.stock_trade_coupons.create_index(
        [("status", 1)], name="status_idx",
    )
    await db.stock_trade_coupons.create_index(
        [("reserved_order_id", 1)], name="reserved_order_idx", sparse=True,
    )
    await db.stock_trade_coupons.create_index(
        [("consumed_order_id", 1)], name="consumed_order_idx", sparse=True,
    )


# ─── Read-only Peek ────────────────────────────────────────────────────
async def find_active_coupon(db, code: str) -> Optional[dict]:
    """Read-only lookup. Returns None if not active."""
    norm = normalize_code(code)
    if not norm:
        return None
    return await db.stock_trade_coupons.find_one(
        {"code": norm, "status": STATUS_ACTIVE}
    )


async def peek_coupon(
    db, *,
    code: str,
    side: str,
    quantity: int,
    limit_price: Decimal,
) -> dict:
    """
    Read-only Preview: validiert Coupon + berechnet Preview-Werte.

    KEIN Reserve, KEIN Consume, KEIN State-Change. `db.stock_trade_coupons`
    wird ausschließlich mit `find_one` gelesen.

    Returns:
      {coupon_id, code, percent, gross, discount, net, side, quantity, limit_price, currency}

    Raises CouponError bei ungültiger Eingabe, sell+code oder inaktivem Coupon.
    """
    norm = normalize_code(code)
    if not norm:
        raise CouponError("COUPON_CODE_REQUIRED", "Gutscheincode fehlt", 422)
    if (side or "").lower() == "sell":
        raise CouponError(
            "COUPON_SELL_FORBIDDEN",
            "Gutscheine sind nur für Kaufaufträge gültig",
            400,
        )
    if (side or "").lower() != "buy":
        raise CouponError("BAD_SIDE", "side muss 'buy' sein", 422)
    if quantity is None or quantity <= 0:
        raise CouponError("BAD_QUANTITY", "quantity muss > 0 sein", 422)
    if limit_price is None or limit_price <= 0:
        raise CouponError("BAD_LIMIT_PRICE", "limit_price muss > 0 sein", 422)

    doc = await find_active_coupon(db, norm)
    if not doc:
        raise CouponError(
            "COUPON_INVALID",
            "Ungültiger oder bereits verwendeter Gutscheincode",
            404,
        )

    pct = _dec_from_bson(doc.get("percent"))
    gross = _q_money(limit_price * Decimal(int(quantity)))
    discount = compute_discount(gross, pct)
    net = _q_money(gross - discount)
    return {
        "coupon_id": str(doc["_id"]),
        "code": doc["code"],
        "percent": format(pct, "f"),
        "gross": format(gross, "f"),
        "discount": format(discount, "f"),
        "net": format(net, "f"),
        "side": "buy",
        "quantity": int(quantity),
        "limit_price": format(_q_money(limit_price), "f"),
        "currency": "EUR",
    }


# ─── State-Transitions ─────────────────────────────────────────────────
async def reserve_coupon_for_order(
    db, *,
    code: str,
    order_id: ObjectId,
    side: str,
) -> dict:
    """
    CAS-Reserve. Atomar `active → reserved` mit `reserved_order_id = order_id`.

    Aufruf-Sequenz: Order MUSS zuerst insertiert sein.
    Bei Miss (CouponError COUPON_NOT_AVAILABLE): Caller MUSS Order löschen.

    Returns: das aktualisierte Coupon-Dokument.
    Raises CouponError bei sell, invalid code oder unavailable coupon.
    """
    norm = normalize_code(code)
    if not norm:
        raise CouponError("COUPON_CODE_REQUIRED", "Gutscheincode fehlt", 422)
    if (side or "").lower() != "buy":
        raise CouponError(
            "COUPON_SELL_FORBIDDEN",
            "Gutscheine sind nur für Kaufaufträge gültig",
            400,
        )

    now = _now()
    updated = await db.stock_trade_coupons.find_one_and_update(
        {"code": norm, "status": STATUS_ACTIVE},
        {"$set": {
            "status": STATUS_RESERVED,
            "reserved_order_id": order_id,
            "reserved_at": now,
            "updated_at": now,
        }},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        existing = await db.stock_trade_coupons.find_one({"code": norm})
        if not existing:
            raise CouponError(
                "COUPON_INVALID",
                "Ungültiger Gutscheincode",
                404,
            )
        raise CouponError(
            "COUPON_NOT_AVAILABLE",
            "Gutschein ist nicht mehr verfügbar (bereits reserviert oder eingelöst)",
            409,
        )
    return updated


async def release_coupon_for_order(
    db, *,
    coupon_id: Optional[ObjectId],
    order_id: ObjectId,
) -> bool:
    """
    CAS-Release. Idempotent: gibt nur frei, wenn genau diese Order die
    Reservation hält. Returns True bei aktivem Release, False wenn no-op.
    Kein Fehler bei doppeltem Aufruf.
    """
    if coupon_id is None:
        doc = await db.stock_trade_coupons.find_one({"reserved_order_id": order_id})
        if not doc:
            return False
        coupon_id = doc["_id"]

    now = _now()
    res = await db.stock_trade_coupons.update_one(
        {
            "_id": coupon_id,
            "status": STATUS_RESERVED,
            "reserved_order_id": order_id,
        },
        {
            "$set": {"status": STATUS_ACTIVE, "updated_at": now},
            "$unset": {"reserved_order_id": "", "reserved_at": ""},
        },
    )
    return res.modified_count > 0


async def consume_coupon_for_order(
    db, *,
    coupon_id: ObjectId,
    order_id: ObjectId,
    user_id: ObjectId,
) -> bool:
    """
    CAS-Consume. Legacy-Parität: State `reserved → consumed`, persistiere
    `consumed_at`, `consumed_order_id`, `consumed_by_user_id`, entferne
    `reserved_order_id`, `reserved_at`.

    Idempotent:
      - Erste Konsumption für diese Order: True.
      - Bereits consumed FÜR DIESE Order: False (no-op success).
      - Consumed für andere Order oder Status inkonsistent: hard error.
    """
    if coupon_id is None:
        raise CouponError("COUPON_ID_MISSING", "coupon_id fehlt bei Consumption", 500)

    now = _now()
    updated = await db.stock_trade_coupons.find_one_and_update(
        {
            "_id": coupon_id,
            "status": STATUS_RESERVED,
            "reserved_order_id": order_id,
        },
        {
            "$set": {
                "status": STATUS_CONSUMED,
                "consumed_at": now,
                "consumed_order_id": order_id,
                "consumed_by_user_id": user_id,
                "updated_at": now,
            },
            "$unset": {"reserved_order_id": "", "reserved_at": ""},
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated is not None:
        return True

    # CAS-Miss: prüfen ob idempotent success (bereits für diese Order consumed).
    doc = await db.stock_trade_coupons.find_one({"_id": coupon_id})
    if not doc:
        raise CouponError("COUPON_MISSING", "Coupon existiert nicht mehr", 500)

    if (
        doc.get("status") == STATUS_CONSUMED
        and doc.get("consumed_order_id") == order_id
    ):
        return False  # idempotent no-op

    raise CouponError(
        "COUPON_STATE_CONFLICT",
        (
            f"Coupon-Status ist '{doc.get('status')}' — Consumption für Order "
            f"{order_id} nicht möglich."
        ),
        409,
    )


# ─── Admin/QA Utilities ────────────────────────────────────────────────
async def admin_create_coupon(
    db, *,
    percent: Decimal,
    admin_id: Optional[str] = None,
    preview_only: bool = True,
    qa_session: Optional[str] = None,
    code: Optional[str] = None,
) -> dict:
    """
    Legt aktiven Coupon an. Retry-Loop bei UNIQUE-Kollision (nur wenn Code
    autogeneriert wird). `preview_only=True` markiert QA-Coupons für spätere
    Cleanups (nicht verwendete werden gelöscht; benutzte bleiben audit-safe).
    """
    if percent is None or percent <= 0 or percent > 100:
        raise CouponError("BAD_PERCENT", "percent muss zwischen 0 und 100 liegen", 422)

    pct_bson = Decimal128(percent.quantize(_PCT, rounding=ROUND_HALF_EVEN))
    now = _now()
    for _ in range(25):
        new_code = normalize_code(code) if code else token_hex(6).upper()
        if not new_code:
            raise CouponError("BAD_CODE", "leerer Code", 422)
        doc = {
            "code": new_code,
            "percent": pct_bson,
            "status": STATUS_ACTIVE,
            "reserved_order_id": None,
            "reserved_at": None,
            "consumed_order_id": None,
            "consumed_at": None,
            "consumed_by_user_id": None,
            "created_at": now,
            "updated_at": now,
            "created_by": admin_id,
            "preview_only": bool(preview_only),
            "qa_session": qa_session,
        }
        try:
            res = await db.stock_trade_coupons.insert_one(doc)
            doc["_id"] = res.inserted_id
            return doc
        except Exception as exc:
            if getattr(exc, "code", None) == 11000 or "duplicate key" in str(exc).lower():
                if code:
                    raise CouponError(
                        "COUPON_CODE_TAKEN",
                        f"Code {new_code} existiert bereits",
                        409,
                    )
                continue
            raise
    raise CouponError("COUPON_CREATE_FAILED", "Konnte keinen eindeutigen Code generieren", 500)


async def admin_revoke_coupon(db, *, coupon_id: ObjectId) -> bool:
    """Setzt Coupon auf revoked. Nur wenn active UND nicht reserviert."""
    now = _now()
    res = await db.stock_trade_coupons.update_one(
        {"_id": coupon_id, "status": STATUS_ACTIVE, "reserved_order_id": None},
        {"$set": {"status": STATUS_REVOKED, "updated_at": now}},
    )
    if res.modified_count == 0:
        doc = await db.stock_trade_coupons.find_one({"_id": coupon_id})
        if not doc:
            raise CouponError("COUPON_NOT_FOUND", "Coupon nicht gefunden", 404)
        raise CouponError(
            "COUPON_NOT_REVOCABLE",
            f"Coupon kann nicht widerrufen werden (Status: {doc.get('status')})",
            409,
        )
    return True

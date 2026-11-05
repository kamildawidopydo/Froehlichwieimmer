"""Session 82.93 — Position Adjustment Service (Safe Backend).

Additive Admin-Endpoints für Stock- und Bond-Position-Korrekturen mit
vollständigem Audit-Trail. Keine direkten Position-Hacks — jede Mutation
läuft über einen immutable adjustment_record + Position-Delta-Berechnung.

Erlaubte Gründe:
- corporate_action  · Aktiensplit, Kapitalerhöhung, Spin-off
- migration_correction · Migration-Repair aus Phase-0-Import
- inheritance_transfer · Erbschaft / Depotübertragung
- data_repair · manuelle Korrektur nachweisbarer Systemfehler

Verboten:
- Beliebige Positions-Änderung ohne dokumentierten Business-Case
- Cost-Basis-Overwrite (avg-cost) → separate BLOCKED-Adjustment-Art
- Delete aus Audit-Trail
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin/portfolio", tags=["position-adjustments"])

_ALLOWED_REASONS = {"corporate_action", "migration_correction", "inheritance_transfer", "data_repair"}


def _parse_dec(s: str, field: str) -> Decimal:
    try:
        return Decimal(str(s))
    except (InvalidOperation, TypeError):
        raise HTTPException(status_code=422, detail=f"Ungültiger {field}")


async def _ensure_indexes() -> None:
    await _db.position_adjustments.create_index(
        [("idempotency_key", 1)], unique=True, name="idem_unique", background=True
    )
    await _db.position_adjustments.create_index(
        [("target_user_id", 1), ("created_at", -1)], background=True
    )


class StockAdjustmentIn(BaseModel):
    target_user_id: str = Field(..., min_length=1, max_length=64)
    symbol: str = Field(..., min_length=1, max_length=32)
    delta_qty: str = Field(..., description="Signed decimal delta (e.g. '+3' or '-1.5')")
    reason: str = Field(..., min_length=1)
    reference_id: Optional[str] = Field(default=None, max_length=128)
    idempotency_key: str = Field(..., min_length=8, max_length=128)
    note: Optional[str] = Field(default=None, max_length=1000)
    model_config = {"extra": "forbid"}


class BondAdjustmentIn(BaseModel):
    target_user_id: str = Field(..., min_length=1, max_length=64)
    isin: str = Field(..., min_length=8, max_length=32)
    delta_nominal: str = Field(...)
    denomination: Optional[str] = Field(default="1000")
    reason: str = Field(..., min_length=1)
    reference_id: Optional[str] = Field(default=None, max_length=128)
    idempotency_key: str = Field(..., min_length=8, max_length=128)
    note: Optional[str] = Field(default=None, max_length=1000)
    model_config = {"extra": "forbid"}


async def _apply_adjustment(*, kind: str, payload_dict: Dict[str, Any], admin: dict) -> Dict[str, Any]:
    """Immutable Adjustment + Position-Delta. Kein direkter Position-Overwrite."""
    await _ensure_indexes()
    reason = payload_dict["reason"]
    if reason not in _ALLOWED_REASONS:
        raise HTTPException(status_code=422, detail=f"reason must be one of {sorted(_ALLOWED_REASONS)}")
    if not ObjectId.is_valid(payload_dict["target_user_id"]):
        raise HTTPException(status_code=422, detail="Ungültige target_user_id")
    target_oid = ObjectId(payload_dict["target_user_id"])
    if not await _db.users.find_one({"_id": target_oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Target user not found")

    now = datetime.now(timezone.utc)
    if kind == "stock":
        delta = _parse_dec(payload_dict["delta_qty"], "delta_qty")
        asset_key = payload_dict["symbol"].upper()
        # Session 82.94-fix: reale Mongo-Collection ist `stock_positions`
        # (Legacy `user_stock_positions` aus Supabase-Zeit existiert nicht).
        coll_positions = _db.stock_positions
        pos_filter = {"user_id": target_oid, "symbol": asset_key}
        pos_before = await coll_positions.find_one(pos_filter)
        current = Decimal(str(pos_before.get("quantity", 0))) if pos_before else Decimal(0)
        new_val = current + delta
        if new_val < 0:
            raise HTTPException(status_code=409, detail="Negative Position nicht erlaubt")
    else:
        delta = _parse_dec(payload_dict["delta_nominal"], "delta_nominal")
        # Denomination-Default aus vorhandener Position übernehmen (falls gesetzt),
        # sonst Fallback aus Payload oder 1000.
        asset_key = payload_dict["isin"].upper()
        # Session 82.94-fix: `bond_positions` mit Feld `nominal_amount`.
        coll_positions = _db.bond_positions
        pos_filter = {"user_id": target_oid, "isin": asset_key}
        pos_before = await coll_positions.find_one(pos_filter)
        denom_from_pos = None
        if pos_before and pos_before.get("denomination") is not None:
            denom_from_pos = _parse_dec(str(pos_before.get("denomination")), "denomination")
        denom = denom_from_pos or _parse_dec(payload_dict.get("denomination") or "1000", "denomination")
        if denom <= 0 or (delta % denom) != 0:
            raise HTTPException(status_code=422, detail=f"delta_nominal muss Vielfaches von {denom} sein")
        current = Decimal(str(pos_before.get("nominal_amount", 0))) if pos_before else Decimal(0)
        new_val = current + delta
        if new_val < 0:
            raise HTTPException(status_code=409, detail="Negative Nominale nicht erlaubt")

    adj_doc = {
        "kind": kind,
        "idempotency_key": payload_dict["idempotency_key"],
        "target_user_id": target_oid,
        "admin_user_id": ObjectId(admin["id"]),
        "asset_key": asset_key,
        "reason": reason,
        "reference_type": kind,
        "reference_id": payload_dict.get("reference_id"),
        "delta": Decimal128(str(delta)),
        "before": Decimal128(str(current)),
        "after": Decimal128(str(new_val)),
        "note": (payload_dict.get("note") or "").strip()[:1000] or None,
        "created_at": now,
    }
    try:
        result = await _db.position_adjustments.insert_one(adj_doc)
    except DuplicateKeyError:
        existing = await _db.position_adjustments.find_one({"idempotency_key": payload_dict["idempotency_key"]})
        return {
            "status": "already_applied",
            "adjustment_id": str(existing["_id"]),
            "idempotent": True,
            "before": str(existing["before"]),
            "after": str(existing["after"]),
        }

    # Position-Delta atomar anwenden (upsert).
    # Session 82.94-fix: bond nutzt `nominal_amount` (Real-Schema), stock `quantity`.
    update_field = "quantity" if kind == "stock" else "nominal_amount"
    await coll_positions.update_one(
        pos_filter,
        {"$set": {update_field: Decimal128(str(new_val)), "updated_at": now},
         "$setOnInsert": {"user_id": target_oid, ("symbol" if kind == "stock" else "isin"): asset_key,
                          "created_at": now}},
        upsert=True,
    )
    return {
        "status": "applied",
        "adjustment_id": str(result.inserted_id),
        "idempotent": False,
        "kind": kind,
        "asset": asset_key,
        "before": str(current),
        "delta": str(delta),
        "after": str(new_val),
    }


@router.post("/stock-position-adjustments", status_code=201)
async def create_stock_adjustment(body: StockAdjustmentIn, admin: dict = Depends(require_admin)):
    return await _apply_adjustment(kind="stock", payload_dict=body.model_dump(), admin=admin)


@router.post("/bond-position-adjustments", status_code=201)
async def create_bond_adjustment(body: BondAdjustmentIn, admin: dict = Depends(require_admin)):
    return await _apply_adjustment(kind="bond", payload_dict=body.model_dump(), admin=admin)


# ─── SESSION 82.94 · Admin Read (Position-Listen für Adjustment-UIs) ─────
def _dec_str(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, Decimal128):
        try:
            return format(v.to_decimal(), "f")
        except Exception:
            return None
    try:
        return format(Decimal(str(v)), "f")
    except Exception:
        return None


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else (v if isinstance(v, str) else None)


async def _load_user_map(uids: List[ObjectId]) -> Dict[str, Dict[str, Any]]:
    if not uids:
        return {}
    cursor = _db.users.find(
        {"_id": {"$in": uids}},
        projection={"email": 1, "name": 1, "first_name": 1, "last_name": 1},
    )
    out: Dict[str, Dict[str, Any]] = {}
    async for u in cursor:
        out[str(u["_id"])] = {
            "id": str(u["_id"]),
            "email": u.get("email"),
            "name": u.get("name"),
            "first_name": u.get("first_name"),
            "last_name": u.get("last_name"),
        }
    return out


@router.get("/stock-positions")
async def admin_list_stock_positions(
    user_id: Optional[str] = Query(default=None),
    symbol: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Read-only Admin-Liste aller (oder gefilterter) Stock-Positionen.

    Enrichment: User-Profil (Email, Name) + kompakte Position-Metriken.
    Keine synthetischen Preise — Marktwert liefert das Frontend über den
    bestehenden Quotes-Endpoint separat.
    """
    q: Dict[str, Any] = {}
    if user_id:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=422, detail="Ungültige user_id")
        q["user_id"] = ObjectId(user_id)
    if symbol:
        q["symbol"] = symbol.upper()
    cursor = _db.stock_positions.find(q).sort([("updated_at", -1)]).limit(limit)
    docs = await cursor.to_list(limit)
    uids = list({d["user_id"] for d in docs if d.get("user_id")})
    umap = await _load_user_map([u for u in uids if isinstance(u, ObjectId)])
    items: List[Dict[str, Any]] = []
    for d in docs:
        uid = d.get("user_id")
        uid_str = str(uid) if uid else None
        items.append({
            "id": str(d["_id"]),
            "user_id": uid_str,
            "user": umap.get(uid_str),
            "symbol": d.get("symbol"),
            "quantity": _dec_str(d.get("quantity")) or "0",
            "avg_cost": _dec_str(d.get("avg_cost")) or "0",
            "currency": d.get("currency") or "EUR",
            "is_active": bool(d.get("is_active", True)),
            "updated_at": _iso(d.get("updated_at")),
            "created_at": _iso(d.get("created_at")),
        })
    return {"items": items, "count": len(items)}


@router.get("/bond-positions")
async def admin_list_bond_positions(
    user_id: Optional[str] = Query(default=None),
    isin: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Read-only Admin-Liste aller (oder gefilterter) Bond-Positionen."""
    q: Dict[str, Any] = {}
    if user_id:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=422, detail="Ungültige user_id")
        q["user_id"] = ObjectId(user_id)
    if isin:
        q["isin"] = isin.upper()
    cursor = _db.bond_positions.find(q).sort([("updated_at", -1)]).limit(limit)
    docs = await cursor.to_list(limit)
    uids = list({d["user_id"] for d in docs if d.get("user_id")})
    umap = await _load_user_map([u for u in uids if isinstance(u, ObjectId)])
    items: List[Dict[str, Any]] = []
    for d in docs:
        uid = d.get("user_id")
        uid_str = str(uid) if uid else None
        items.append({
            "id": str(d["_id"]),
            "user_id": uid_str,
            "user": umap.get(uid_str),
            "isin": d.get("isin"),
            "bond_name": d.get("bond_name"),
            "issuer": d.get("issuer"),
            "currency": d.get("currency") or "EUR",
            "nominal_amount": _dec_str(d.get("nominal_amount")) or "0",
            "average_purchase_price_pct": _dec_str(d.get("average_purchase_price_pct")),
            "cost_basis": _dec_str(d.get("cost_basis")),
            "kupon_rate": _dec_str(d.get("kupon_rate") or d.get("coupon_rate")),
            "maturity_date": d.get("maturity_date"),
            "denomination": _dec_str(d.get("denomination")) or "1000",
            "is_active": bool(d.get("is_active", True)),
            "updated_at": _iso(d.get("updated_at")),
            "created_at": _iso(d.get("created_at")),
        })
    return {"items": items, "count": len(items)}


@router.get("/position-adjustments")
async def list_adjustments(
    user_id: Optional[str] = Query(default=None),
    asset: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    _admin: dict = Depends(require_admin),
):
    q: Dict[str, Any] = {}
    if user_id:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=422, detail="Ungültige user_id")
        q["target_user_id"] = ObjectId(user_id)
    if asset:
        q["asset_key"] = asset.upper()
    if kind:
        if kind not in ("stock", "bond"):
            raise HTTPException(status_code=422, detail="kind must be stock or bond")
        q["kind"] = kind
    docs = await _db.position_adjustments.find(q).sort([("created_at", -1)]).limit(limit).to_list(limit)
    return {
        "items": [
            {
                "id": str(d["_id"]),
                "kind": d["kind"],
                "idempotency_key": d["idempotency_key"],
                "target_user_id": str(d["target_user_id"]),
                "admin_user_id": str(d["admin_user_id"]),
                "asset": d["asset_key"],
                "reason": d["reason"],
                "reference_id": d.get("reference_id"),
                "delta": str(d["delta"]),
                "before": str(d["before"]),
                "after": str(d["after"]),
                "note": d.get("note"),
                "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            }
            for d in docs
        ],
        "count": len(docs),
    }

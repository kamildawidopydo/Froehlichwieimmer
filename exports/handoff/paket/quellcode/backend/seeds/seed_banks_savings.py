"""Seed script — Savings Comparison Platform (Session 93 · Phase 1).

Sicherheitsprinzipien:
    * ADDITIV: bestehende Nicht-Demo-Dokumente werden NIE überschrieben oder
      gelöscht. Existierende `banks` ohne `is_demo=True` werden nur um fehlende
      Referenzfelder ergänzt (Country-Code, DGS-Code, Regulator etc.).
    * DEMO-ISOLATION: neu erzeugte Datensätze tragen zwingend
      `is_demo=True`, `data_source="demo_seed"`, `verified_at=None`.
    * IDEMPOTENT: mehrfaches Ausführen erzeugt keine Duplikate — Upserts über
      `slug` (Banken) bzw. `(bank_slug, product_type, term_months, is_demo)`
      (Angebote).
    * DRY-RUN Standard: Änderungen werden erst mit `--apply` geschrieben.

Aufruf:
    python -m backend.seeds.seed_banks_savings --dry-run
    python -m backend.seeds.seed_banks_savings --apply
    python -m backend.seeds.seed_banks_savings --apply --reset-demo   # löscht alte Demo-Angebote/Banken

Ausgabe:
    Statistik-Zusammenfassung (created / updated / skipped_non_demo).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

# Ermöglicht Aufruf via `python /app/backend/seeds/seed_banks_savings.py`.
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(_HERE)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from seeds.data.countries import COUNTRIES  # noqa: E402
from seeds.data.deposit_guarantee_schemes import DEPOSIT_GUARANTEE_SCHEMES  # noqa: E402
from seeds.data.banks_demo import DEMO_BANKS  # noqa: E402
from seeds.data.savings_offers_demo import build_all_offers  # noqa: E402


COUNTRY_NAME_BY_CODE = {c["code"]: c["name"] for c in COUNTRIES}
DGS_BY_CODE = {d["code"]: d for d in DEPOSIT_GUARANTEE_SCHEMES}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _protection_text(dgs_code: str | None) -> Tuple[str, str] | Tuple[None, None]:
    dgs = DGS_BY_CODE.get(dgs_code or "")
    if not dgs:
        return None, None
    return (
        f"€100.000 · {dgs['name']}",
        "€100.000",
    )


def _bank_doc_from_seed(b: Dict[str, Any]) -> Dict[str, Any]:
    """Baut das MongoDB-Dokument für eine Demo-Bank."""
    country = COUNTRY_NAME_BY_CODE.get(b["country_code"], b["country_code"])
    prot_text, prot_amount = _protection_text(b.get("dgs_code"))
    now = _now()
    return {
        "slug": b["slug"],
        "name": b["name"],
        "legal_name": b.get("legal_name"),
        "country_code": b["country_code"],
        "country": country,  # Legacy-Anzeige (z. B. "Germany")
        "dgs_code": b.get("dgs_code"),
        "deposit_guarantee_country_code": b["country_code"],
        "deposit_protection": prot_text,
        "deposit_protection_amount": prot_amount,
        "logo_url": None,
        "website_url": b.get("website_url"),
        "founded_year": b.get("founded_year"),
        "regulator_name": b.get("regulator_name"),
        "credit_rating": None,  # bewusst leer — nichts erfinden
        "available_for_de_customers": True,
        "online_account_opening": True,
        "interest_frequency_default": None,
        "description": None,
        "status": "active",
        "is_active": True,
        "is_demo": True,
        "data_source": "demo_seed",
        "verified_at": None,
        "valid_from": None,
        "valid_until": None,
        "created_at": now,
        "updated_at": now,
    }


async def _seed_countries(db, apply: bool) -> Dict[str, int]:
    coll = db.countries
    created = updated = 0
    for c in COUNTRIES:
        existing = await coll.find_one({"code": c["code"]})
        payload = {**c, "is_active": True, "updated_at": _now()}
        if existing:
            diff = {k: v for k, v in payload.items() if existing.get(k) != v}
            if diff and apply:
                await coll.update_one({"_id": existing["_id"]}, {"$set": diff})
            if diff:
                updated += 1
        else:
            if apply:
                await coll.insert_one({**payload, "created_at": _now()})
            created += 1
    return {"created": created, "updated": updated, "total_seed": len(COUNTRIES)}


async def _seed_dgs(db, apply: bool) -> Dict[str, int]:
    coll = db.deposit_guarantee_schemes
    created = updated = 0
    for d in DEPOSIT_GUARANTEE_SCHEMES:
        existing = await coll.find_one({"code": d["code"]})
        payload = {**d, "is_demo": False, "updated_at": _now()}
        if existing:
            diff = {k: v for k, v in payload.items() if existing.get(k) != v}
            if diff and apply:
                await coll.update_one({"_id": existing["_id"]}, {"$set": diff})
            if diff:
                updated += 1
        else:
            if apply:
                await coll.insert_one({**payload, "created_at": _now()})
            created += 1
    return {"created": created, "updated": updated, "total_seed": len(DEPOSIT_GUARANTEE_SCHEMES)}


async def _seed_banks(db, apply: bool, reset_demo: bool) -> Dict[str, int]:
    coll = db.banks
    if reset_demo and apply:
        # Nur DEMO-Banken werden entfernt — echte Produktions-Datensätze bleiben.
        await coll.delete_many({"is_demo": True})
    created = updated = skipped_non_demo_enriched = 0
    for b in DEMO_BANKS:
        doc = _bank_doc_from_seed(b)
        existing = await coll.find_one({"slug": doc["slug"]})
        if existing is None:
            if apply:
                await coll.insert_one(doc)
            created += 1
            continue
        # Nicht-Demo-Bank existiert bereits — NUR fehlende Referenzfelder ergänzen,
        # niemals Werte überschreiben (Produktions-Schutz).
        if not existing.get("is_demo"):
            enrichment = {
                "country_code": doc["country_code"],
                "dgs_code": doc["dgs_code"],
                "deposit_guarantee_country_code": doc["deposit_guarantee_country_code"],
                "legal_name": doc.get("legal_name"),
                "website_url": doc.get("website_url"),
                "founded_year": doc.get("founded_year"),
                "regulator_name": doc.get("regulator_name"),
            }
            missing = {k: v for k, v in enrichment.items() if existing.get(k) in (None, "", []) and v is not None}
            # Legacy-Deposit-Protection nur ergänzen, wenn leer:
            if not existing.get("deposit_protection") and doc.get("deposit_protection"):
                missing["deposit_protection"] = doc["deposit_protection"]
            if not existing.get("deposit_protection_amount") and doc.get("deposit_protection_amount"):
                missing["deposit_protection_amount"] = doc["deposit_protection_amount"]
            if missing and apply:
                missing["updated_at"] = _now()
                await coll.update_one({"_id": existing["_id"]}, {"$set": missing})
            if missing:
                skipped_non_demo_enriched += 1
            continue
        # Demo-Bank existiert → aktualisieren.
        upd = {k: v for k, v in doc.items() if k not in ("_id", "created_at")}
        upd["updated_at"] = _now()
        if apply:
            await coll.update_one({"_id": existing["_id"]}, {"$set": upd})
        updated += 1
    return {
        "created": created,
        "updated_demo": updated,
        "non_demo_enriched": skipped_non_demo_enriched,
        "total_seed": len(DEMO_BANKS),
    }


async def _seed_offers(db, apply: bool, reset_demo: bool) -> Dict[str, int]:
    coll = db.savings_offers
    if reset_demo and apply:
        await coll.delete_many({"is_demo": True})
    offers = build_all_offers(DEMO_BANKS)
    created = updated = skipped_non_demo_exists = 0
    # Deduplication-Key: (bank_slug, product_type, term_months oder null, is_demo)
    for o in offers:
        now = _now()
        payload = {**o, "created_at": now, "updated_at": now}
        # 1) Wenn bereits ein NICHT-Demo-Offer für dieselbe (bank_slug,
        #    product_type, term_months)-Kombi existiert → nicht als Demo
        #    dazuseeden (Produktionsschutz + keine Duplikate im UI).
        non_demo_exists = await coll.find_one({
            "bank_slug": o["bank_slug"],
            "product_type": o["product_type"],
            "term_months": o.get("term_months"),
            "is_demo": {"$ne": True},
        })
        if non_demo_exists:
            skipped_non_demo_exists += 1
            continue
        q = {
            "bank_slug": o["bank_slug"],
            "product_type": o["product_type"],
            "term_months": o.get("term_months"),
            "is_demo": True,
        }
        existing = await coll.find_one(q)
        if existing is None:
            if apply:
                await coll.insert_one(payload)
            created += 1
        else:
            upd = {k: v for k, v in payload.items() if k not in ("_id", "created_at")}
            if apply:
                await coll.update_one({"_id": existing["_id"]}, {"$set": upd})
            updated += 1
    return {
        "created": created,
        "updated": updated,
        "skipped_non_demo_exists": skipped_non_demo_exists,
        "total_seed": len(offers),
    }


async def _ensure_indexes(db, apply: bool) -> None:
    if not apply:
        return
    await db.countries.create_index("code", unique=True)
    await db.deposit_guarantee_schemes.create_index("code", unique=True)
    await db.banks.create_index("slug", unique=True)
    await db.banks.create_index("country_code")
    await db.banks.create_index("is_demo")
    await db.savings_offers.create_index([("bank_slug", 1), ("product_type", 1)])
    await db.savings_offers.create_index("is_demo")
    await db.savings_offers.create_index([("bank_slug", 1), ("product_type", 1), ("term_months", 1), ("is_demo", 1)])


async def main_async(apply: bool, reset_demo: bool) -> None:
    # .env-Variablen laden (fallback über python-dotenv).
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(_BACKEND, ".env"))
    except Exception:  # pragma: no cover
        pass
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]
    print(f"→ DB: {db_name}   (dry_run={not apply}, reset_demo={reset_demo})")

    await _ensure_indexes(db, apply)
    countries_stats = await _seed_countries(db, apply)
    dgs_stats = await _seed_dgs(db, apply)
    banks_stats = await _seed_banks(db, apply, reset_demo)
    offers_stats = await _seed_offers(db, apply, reset_demo)

    print()
    print("countries       :", countries_stats)
    print("dgs             :", dgs_stats)
    print("banks           :", banks_stats)
    print("savings_offers  :", offers_stats)
    print()
    if not apply:
        print("Dry-Run — es wurden KEINE Daten geschrieben. Mit --apply erneut ausführen.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="Änderungen tatsächlich schreiben (sonst Dry-Run)")
    p.add_argument("--reset-demo", action="store_true", help="Zuerst alle Demo-Datensätze entfernen")
    args = p.parse_args()
    asyncio.run(main_async(args.apply, args.reset_demo))


if __name__ == "__main__":
    main()

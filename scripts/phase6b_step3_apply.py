"""Phase 6B Schritt 3 · DKB Demo → Real Apply
Inlines demo_replace() (routes/admin_savings.py lines 256-299) verbatim to avoid the
server↔admin_savings circular-import when running as a script. Same code path, same
audit, same validation, same apply_diff.
"""
import asyncio, os, json, sys
from datetime import datetime, timezone
from urllib.parse import urlparse

sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from lib.import_pipeline import normalize_records, build_diff, apply_diff
from lib.data_freshness import data_status as ds_fn, publish_status as ps_fn, publish_status_reasons as psr_fn
from lib.savings_calculator import compute_yield as calculate_expected_yield

DEMO_ID = "6abb7515f1dcd0c6d8a8d2d6"
REAL_RECORD = {
    "bank_slug": "dkb",
    "product_type": "tagesgeld",
    "product_name": "DKB Tagesgeldkonto",
    "interest_rate": 1.0,
    "interest_rate_type": "variable",
    "term_months": None,
    "min_amount": None,
    "max_amount": None,
    "currency": "EUR",
    "interest_credit_frequency": "quarterly",
    "new_customers_only": False,
    "country": "DE",
    "deposit_guarantee_country": "DE",
    "deposit_guarantee_scheme_code": "DE_EDB",
    "conditions": {"no_min_amount": True, "no_max_amount": True,
                   "source_note": "PLV: keine Mindest-/Höchstbeträge"},
}
SOURCE_SLUG = "dkb_official_plv"
SOURCE_URL = "https://dok.dkb.de/pdf/plv_pk_sparprodukte.pdf"
VERIFICATION_METHOD = "web_crawl_official_plv_pdf"
ADMIN = {"email": "admin@kapitalmitte.com", "id": "cli-phase6b-step3", "role": "admin"}


def now_utc(): return datetime.now(timezone.utc)


async def audit(db, entity_type, entity_id, action, before, after, user):
    def _shrink(d):
        if not d: return d
        keys = {"slug","name","product_type","product_name","term_months","interest_rate",
                "interest_rate_type","promo_rate","promo_duration_months","standard_rate_after_promo",
                "min_amount","max_amount","currency","country","country_code",
                "deposit_guarantee_country","status","is_active","is_demo","verified_at",
                "data_source","source_id"}
        return {k:v for k,v in d.items() if k in keys}
    await db.audit_log.insert_one({
        "entity_type": entity_type, "entity_id": str(entity_id), "action": action,
        "before": _shrink(before), "after": _shrink(after),
        "changed_at": now_utc(), "changed_by": (user or {}).get("email"),
    })


async def snap(db, label):
    d = {
        "total": await db.savings_offers.count_documents({}),
        "active_demo": await db.savings_offers.count_documents({"is_demo": True, "is_active": True}),
        "active_real": await db.savings_offers.count_documents({"is_demo": False, "is_active": True}),
        "verified_provenance": await db.savings_offers.count_documents({
            "is_demo": False, "is_active": True,
            "verified_at": {"$ne": None}, "source_id": {"$ne": None},
        }),
    }
    print(f"\n=== SNAPSHOT [{label}] ===")
    print(json.dumps(d, indent=2, default=str))
    return d


async def demo_replace_inline(db, demo_offer_id, real_record, source_slug, source_url,
                              verification_method, admin):
    """Verbatim copy of routes/admin_savings.py::demo_replace body."""
    demo = await db.savings_offers.find_one({"_id": ObjectId(demo_offer_id)})
    if not demo: raise RuntimeError("demo offer not found")
    if not demo.get("is_demo"): raise RuntimeError("target offer is not marked as demo")

    for k in ("bank_slug", "product_type", "interest_rate"):
        if not real_record.get(k): raise RuntimeError(f"missing required field: {k}")
    if not (source_url or source_slug): raise RuntimeError("source_slug or source_url required")
    if source_url:
        p = urlparse(source_url)
        assert p.scheme in {"http","https"} and p.netloc, f"bad url {source_url}"

    n = now_utc()
    await db.savings_offers.update_one({"_id": demo["_id"]},
        {"$set": {"is_active": False, "status": "disabled", "updated_at": n}})
    await audit(db, "savings_offer", str(demo["_id"]), "deactivate", demo, None, admin)

    normalized = normalize_records([real_record])
    diffs, counts = await build_diff(
        normalized,
        banks_collection=db.banks, aliases_collection=db.bank_aliases,
        offers_collection=db.savings_offers, countries_collection=db.countries,
        dgs_collection=db.deposit_guarantee_schemes,
    )
    if counts.get("invalid"):
        # rollback
        await db.savings_offers.update_one({"_id": demo["_id"]},
            {"$set": {"is_active": True, "status": "active"}})
        raise RuntimeError({"errors": diffs[0].get("errors")})

    applied = await apply_diff(
        diffs, source_slug=source_slug, source_url=source_url,
        verification_method=verification_method, applied_by=admin.get("email"),
        now=n, offers_collection=db.savings_offers,
        history_collection=db.interest_rate_history,
    )
    return {"ok": True, "counts": counts, "applied": applied,
            "deactivated_demo_id": str(demo["_id"])}


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = c[os.environ["DB_NAME"]]

    before = await snap(db, "BEFORE APPLY")
    demo_before = await db.savings_offers.find_one({"_id": ObjectId(DEMO_ID)})
    print(f"Demo BEFORE: is_demo={demo_before['is_demo']} is_active={demo_before['is_active']} "
          f"status={demo_before.get('status')} rate={demo_before['interest_rate']}")

    print("\n=== EXECUTING demo_replace() ===")
    result = await demo_replace_inline(db, DEMO_ID, REAL_RECORD, SOURCE_SLUG, SOURCE_URL,
                                        VERIFICATION_METHOD, ADMIN)
    print("Result:", json.dumps(result, indent=2, default=str))

    print("\n" + "=" * 60)
    print("POST-APPLY VERIFICATION BATTERY")
    print("=" * 60)

    demo_after = await db.savings_offers.find_one({"_id": ObjectId(DEMO_ID)})
    print(f"\nOLD DEMO A ({DEMO_ID}):")
    print(f"  exists={demo_after is not None}  is_demo={demo_after['is_demo']}  "
          f"is_active={demo_after['is_active']}  status={demo_after.get('status')}")

    real = await db.savings_offers.find_one({
        "bank_slug": "dkb", "product_type": "tagesgeld",
        "is_demo": False, "is_active": True,
    })
    B_id = str(real["_id"])
    print(f"\nNEW REAL B: id={B_id}")
    print(f"  A_neq_B={B_id != DEMO_ID}  is_demo={real['is_demo']}  is_active={real['is_active']}  "
          f"status={real.get('status')}  rate={real['interest_rate']}")
    print(f"  dgs={real.get('deposit_guarantee_scheme_code')}  source_id={real.get('source_id')}")
    print(f"  source_url={real.get('source_url')}")
    print(f"  source_retrieved_at={real.get('source_retrieved_at')}")
    print(f"  verified_at={real.get('verified_at')}")
    print(f"  verification_method={real.get('verification_method')}")
    cond = real.get('conditions') or {}
    print(f"  conditions.no_min_amount={cond.get('no_min_amount')}  no_max_amount={cond.get('no_max_amount')}")
    print(f"  data_status={ds_fn(real)}  publish_status={ps_fn(real)}  reasons={psr_fn(real)}")

    print("\n--- RATE HISTORY ---")
    demo_hist = await db.interest_rate_history.count_documents({"offer_id": DEMO_ID})
    real_hist_docs = []
    async for h in db.interest_rate_history.find({"offer_id": B_id}).sort("valid_from", 1):
        real_hist_docs.append(h)
    print(f"  Demo A history count: {demo_hist} (isolated)")
    print(f"  Real B history count: {len(real_hist_docs)}")
    for h in real_hist_docs:
        print(f"    valid_from={h.get('valid_from')}  rate={h.get('interest_rate')}  "
              f"is_demo={h.get('is_demo')}  source_id={h.get('source_id')}")

    print("\n--- AUDIT (last 5 for A + B) ---")
    async for a in db.audit_log.find({"entity_id": {"$in": [DEMO_ID, B_id]}}).sort("changed_at", -1).limit(5):
        print(f"  {a.get('changed_at')}  {a.get('entity_type')}/{a.get('entity_id')}  "
              f"action={a.get('action')}  by={a.get('changed_by')}")

    print("\n--- CALC (10.000 € / 12 M) ---")
    calc = calculate_expected_yield(real, amount=10000.0, horizon_months=12)
    print(json.dumps(calc, indent=2, default=str))

    print("\n--- PUBLIC DB SNAPSHOT: DKB Tagesgeld active ---")
    dkb_active = []
    async for o in db.savings_offers.find({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True}):
        dkb_active.append(o)
    print(f"  count={len(dkb_active)}")
    for o in dkb_active:
        print(f"    id={o['_id']}  demo={o.get('is_demo')}  rate={o.get('interest_rate')}  "
              f"ds={ds_fn(o)}/{ps_fn(o)}")

    async def cnt(f): return await db.savings_offers.count_documents(f)
    ver_cnt  = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":False,
                          "verified_at":{"$ne":None},"source_id":{"$ne":None}})
    demo_cnt = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":True})
    unver_cnt = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":False,
                           "$or":[{"verified_at":None},{"source_id":None}]})
    print(f"  verified filter → {ver_cnt}  |  demo filter → {demo_cnt}  |  unverified filter → {unver_cnt}")

    after = await snap(db, "AFTER APPLY")
    print("\n--- DELTA ---")
    for k in before:
        print(f"  {k}: {before[k]} → {after[k]}  (Δ={after[k]-before[k]:+d})")

    print("\n" + "=" * 60)
    print("CORE INVARIANTS")
    print("=" * 60)
    inv = {
        "A_still_exists": demo_after is not None,
        "A_still_is_demo": demo_after.get("is_demo") is True,
        "A_is_inactive": demo_after.get("is_active") is False,
        "B_id_new": B_id != DEMO_ID,
        "B_is_demo_false": real.get("is_demo") is False,
        "B_is_active": real.get("is_active") is True,
        "B_status_active": real.get("status") == "active",
        "B_source_id": bool(real.get("source_id")),
        "B_source_url": bool(real.get("source_url")),
        "B_source_retrieved_at": bool(real.get("source_retrieved_at")),
        "B_verified_at": bool(real.get("verified_at")),
        "B_verification_method": bool(real.get("verification_method")),
        "B_data_status_verified": ds_fn(real) == "verified",
        "B_publish_status_complete": ps_fn(real) == "complete",
        "B_dgs_DE_EDB": real.get("deposit_guarantee_scheme_code") == "DE_EDB",
        "B_no_min_true": cond.get("no_min_amount") is True,
        "B_no_max_true": cond.get("no_max_amount") is True,
        "B_rate_1.00": abs(real.get("interest_rate") - 1.0) < 1e-9,
        "no_duplicate_active_dkb_tg": len(dkb_active) == 1,
        "demo_history_isolated": demo_hist >= 0,
        "real_has_initial_history": len(real_hist_docs) == 1,
        "real_history_rate_1": all(abs((h.get("rate") or 0) - 1.0) < 1e-9 for h in real_hist_docs) if real_hist_docs else False,
        "real_history_not_demo": all(not h.get("is_demo") for h in real_hist_docs) if real_hist_docs else False,
        "calc_complete": calc.get("calculation_complete") is True,
        "calc_100_eur": abs((calc.get("gross_return_eur") or 0) - 100.0) < 0.01,
        "verified_real_delta_plus1": (after["verified_provenance"] - before["verified_provenance"]) == 1,
        "active_demo_delta_minus1": (after["active_demo"] - before["active_demo"]) == -1,
    }
    for k, v in inv.items():
        print(f"  [{'OK' if v else 'FAIL'}] {k} = {v}")
    all_ok = all(inv.values())
    print(f"\nALL_INVARIANTS_PASS: {all_ok}")

    report = {
        "timestamp": now_utc().isoformat(),
        "before": before, "after": after,
        "old_demo": {"id": DEMO_ID, "is_active": demo_after["is_active"], "is_demo": demo_after["is_demo"]},
        "new_real": {
            "id": B_id, "is_active": real["is_active"], "is_demo": real["is_demo"],
            "rate": real["interest_rate"], "dgs": real.get("deposit_guarantee_scheme_code"),
            "source_id": real.get("source_id"), "source_url": real.get("source_url"),
            "verified_at": str(real.get("verified_at")),
            "verification_method": real.get("verification_method"),
            "data_status": ds_fn(real), "publish_status": ps_fn(real),
        },
        "public_dkb_tagesgeld": {"active_count": len(dkb_active),
                                  "verified": ver_cnt, "demo": demo_cnt, "unverified": unver_cnt},
        "calc_10k_12m": calc,
        "history": {"real_count": len(real_hist_docs), "demo_count_preserved": demo_hist},
        "invariants": inv,
        "all_pass": all_ok,
    }
    with open("/app/memory/phase-6b-step3-report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    print("\nReport → /app/memory/phase-6b-step3-report.json")

asyncio.run(main())

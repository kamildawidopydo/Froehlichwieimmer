"""Phase 6B Schritt 3 — POST-APPLY VERIFICATION ONLY (idempotent, no writes).
Rerun the full invariant battery after the apply already succeeded.
"""
import asyncio, os, json, sys
from datetime import datetime, timezone
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from lib.data_freshness import data_status as ds_fn, publish_status as ps_fn, publish_status_reasons as psr_fn
from lib.savings_calculator import compute_yield

DEMO_ID = "6abb7515f1dcd0c6d8a8d2d6"

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = c[os.environ["DB_NAME"]]

    demo = await db.savings_offers.find_one({"_id": ObjectId(DEMO_ID)})
    real = await db.savings_offers.find_one({"bank_slug":"dkb","product_type":"tagesgeld","is_demo":False,"is_active":True})
    B_id = str(real["_id"])
    cond = real.get("conditions") or {}

    dkb_active = []
    async for o in db.savings_offers.find({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True}):
        dkb_active.append(o)

    demo_hist = await db.interest_rate_history.count_documents({"offer_id": DEMO_ID})
    real_hist = []
    async for h in db.interest_rate_history.find({"offer_id": B_id}).sort("valid_from", 1):
        real_hist.append(h)

    calc = compute_yield(real, amount=10000.0, horizon_months=12)

    async def cnt(f): return await db.savings_offers.count_documents(f)
    ver_cnt  = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":False,
                           "verified_at":{"$ne":None},"source_id":{"$ne":None}})
    demo_cnt = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":True})
    unver_cnt = await cnt({"bank_slug":"dkb","product_type":"tagesgeld","is_active":True,"is_demo":False,
                            "$or":[{"verified_at":None},{"source_id":None}]})

    # Audit
    audits = []
    async for a in db.audit_log.find({"entity_id": {"$in": [DEMO_ID, B_id]}}).sort("changed_at", -1).limit(10):
        audits.append({"at":str(a.get("changed_at")),"entity":a.get("entity_type"),"id":a.get("entity_id"),
                       "action":a.get("action"),"by":a.get("changed_by")})

    inv = {
        "A_still_exists": demo is not None,
        "A_still_is_demo": demo.get("is_demo") is True,
        "A_is_inactive": demo.get("is_active") is False,
        "A_status_disabled": demo.get("status") == "disabled",
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
        "real_has_initial_history": len(real_hist) == 1,
        "real_history_rate_1": all(abs((h.get("rate") or 0) - 1.0) < 1e-9 for h in real_hist),
        "real_history_not_demo": all(not h.get("is_demo") for h in real_hist),
        "real_history_valid_from_set": all(h.get("valid_from") for h in real_hist),
        "real_history_source_set": all(h.get("source_id") for h in real_hist),
        "calc_complete": calc.get("calculation_complete") is True,
        "calc_100_eur": abs((calc.get("gross_return_eur") or 0) - 100.0) < 0.01,
        "audit_deactivation_logged": any(a["action"]=="deactivate" and a["id"]==DEMO_ID for a in audits),
        "verified_filter_1": ver_cnt == 1,
        "demo_filter_0": demo_cnt == 0,
        "unverified_filter_0": unver_cnt == 0,
    }
    print("=" * 60)
    print("PHASE 6B · SCHRITT 3 · INVARIANT VERIFICATION")
    print("=" * 60)
    for k, v in inv.items():
        print(f"  [{'OK ' if v else 'FAIL'}] {k} = {v}")
    all_ok = all(inv.values())
    print(f"\nALL_INVARIANTS_PASS: {all_ok}  ({sum(inv.values())}/{len(inv)})")

    # merge with previous report
    try:
        with open("/app/memory/phase-6b-step3-report.json") as f:
            report = json.load(f)
    except Exception:
        report = {}
    report.update({
        "verification_ts": datetime.now(timezone.utc).isoformat(),
        "invariants": inv,
        "all_pass": all_ok,
        "audit_trail": audits,
        "history": {"real_count": len(real_hist), "demo_count_preserved": demo_hist,
                    "real_entries": [{"rate":h.get("rate"),"valid_from":str(h.get("valid_from")),
                                       "source_id":h.get("source_id"),"is_demo":h.get("is_demo")}
                                      for h in real_hist]},
        "public_dkb_tagesgeld": {"active_count": len(dkb_active), "verified": ver_cnt,
                                  "demo": demo_cnt, "unverified": unver_cnt},
        "calc_10k_12m": calc,
    })
    with open("/app/memory/phase-6b-step3-report.json","w") as f:
        json.dump(report, f, indent=2, default=str)
    print("\nReport → /app/memory/phase-6b-step3-report.json")

asyncio.run(main())

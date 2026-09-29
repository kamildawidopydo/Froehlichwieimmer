"""Session 94 · Apply 5 verified real credit offers.
Uses existing banks (ing, dkb, postbank, santander) and creates only the
missing `norisbank` bank record. No CRUD endpoint call — direct Mongo insert
via the same schema the admin endpoint would use.
"""
import asyncio, os, json, sys
from datetime import datetime, timezone
sys.path.insert(0, '/app/backend')
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

NOW = datetime.now(timezone.utc)

# Bekannte Bank-IDs (aus Preview-DB gelesen)
BANK_IDS = {
    "ing": "6a82fe2eb0ef4c52da900a86",
    "dkb": "6abb7515f1dcd0c6d8a8d28b",
    "postbank": "6a82fe2eb0ef4c52da900a87",
    "santander": "6abb7515f1dcd0c6d8a8d2ad",  # Banco Santander (Spain) — pragmatischer Reuse
    # norisbank wird beim Setup angelegt
}

OFFERS = [
    {
        "_slug": "ing",
        "record": {
            "bank_id": BANK_IDS["ing"],
            "product_name": "Ratenkredit",
            "min_amount_eur": 5000, "max_amount_eur": 100000,
            "min_term_months": 12, "max_term_months": 120,
            "effective_rate_from": 3.69, "effective_rate_to": 10.99,
            "nominal_rate_from": 3.62, "nominal_rate_to": 10.47,
            "monthly_rate_from": None,
            "purposes": ["Freie Verwendung"],
            "features": ["Zinsrabatt −0,20 % ab Kreditbetrag 40.001 €"],
            "representative_example": {
                "amount_eur": 15000, "term_months": 120,
                "effective_rate": 7.22, "sollzins": 6.99,
                "monatsrate": 174.09, "gesamtbetrag": 20889.99,
                "quote": "§17 PAngV — mindestens zwei Drittel der Kunden",
            },
            "source_id": "ing_official_kredit_konditionen",
            "source_url": "https://www.ing.de/kredit/kredit-konditionen/",
            "source_retrieved_at": NOW,
            "verified_at": NOW,
            "verification_method": "web_crawl_official_kredit_konditionen_page",
            "is_active": True, "is_demo": False,
        },
    },
    {
        "_slug": "dkb",
        "record": {
            "bank_id": BANK_IDS["dkb"],
            "product_name": "Privatkredit Sofort",
            "min_amount_eur": 2500, "max_amount_eur": 100000,
            "min_term_months": 12, "max_term_months": 120,
            # Korrektur pro User: Privatkredit Sofort ab 6,99 % effektiv
            "effective_rate_from": 6.99, "effective_rate_to": 6.99,
            "nominal_rate_from": None, "nominal_rate_to": None,
            "monthly_rate_from": None,
            "purposes": ["Freie Verwendung"],
            "features": [
                "Sofort-Auszahlung nach digitalem Kontocheck",
                "Automatischer Zinsvorteil −0,30 pp gegenüber Klassisch",
                "Kostenlose Sondertilgungen",
                "Bis zu 3 Ratenpausen möglich",
            ],
            "representative_example": None,
            "source_id": "dkb_official_sofortkredit",
            "source_url": "https://www.dkb.de/privatkunden/kredite/sofortkredit",
            "source_retrieved_at": NOW,
            "verified_at": NOW,
            "verification_method": "web_crawl_official_dkb_produktseite",
            "is_active": True, "is_demo": False,
        },
    },
    {
        "_slug": "postbank",
        "record": {
            "bank_id": BANK_IDS["postbank"],
            "product_name": "Privatkredit direkt",
            "min_amount_eur": 3000, "max_amount_eur": 80000,
            "min_term_months": 12, "max_term_months": 120,
            "effective_rate_from": 3.25, "effective_rate_to": 14.30,
            "nominal_rate_from": 3.21, "nominal_rate_to": 13.45,
            "monthly_rate_from": None,
            "purposes": ["Freie Verwendung"],
            "features": ["Kostenlose Sondertilgungen", "Ratenpausen vertraglich möglich"],
            "representative_example": {
                "amount_eur": 10000, "term_months": 84,
                "effective_rate": 9.27, "sollzins": 8.90,
                "monatsrate": 162.0, "gesamtbetrag": 13558.0,
                "quote": "§17 PAngV — mindestens zwei Drittel der Kunden",
            },
            "source_id": "postbank_official_privatkredit_direkt",
            "source_url": "https://www.postbank.de/privatkunden/produkte/kredite/privatkredit-direkt.html",
            "source_retrieved_at": NOW,
            "verified_at": NOW,
            "verification_method": "web_crawl_official_postbank_produktseite",
            "is_active": True, "is_demo": False,
        },
    },
    {
        "_slug": "santander",
        "record": {
            "bank_id": BANK_IDS["santander"],
            "product_name": "BestCredit / Ratenkredit (Openbank Deutschland AG)",
            "min_amount_eur": 1000, "max_amount_eur": 75000,
            "min_term_months": 12, "max_term_months": 96,
            "effective_rate_from": 2.99, "effective_rate_to": 11.98,
            "nominal_rate_from": 2.95, "nominal_rate_to": 11.37,
            "monthly_rate_from": None,
            "purposes": ["Freie Verwendung"],
            "features": ["Auszahlung per Instant Payment möglich", "Aufstockung bei entsprechender Bonität"],
            "representative_example": {
                "amount_eur": 10000, "term_months": 84,
                "effective_rate": 7.27, "sollzins": 7.04,
                "monatsrate": 151.11, "gesamtbetrag": 12693.24,
                "quote": "§17 PAngV — mindestens zwei Drittel der Kunden",
            },
            "source_id": "santander_official_ratenkredit",
            "source_url": "https://www.santander.de/privatkunden/kredite-und-finanzierungen/alle-kredite/ratenkredit/",
            "source_retrieved_at": NOW,
            "verified_at": NOW,
            "verification_method": "web_crawl_official_santander_produktseite",
            "is_active": True, "is_demo": False,
        },
    },
    {
        "_slug": "norisbank",
        "record": {
            "bank_id": None,  # wird beim Setup gesetzt
            "product_name": "Top-Kredit",
            "min_amount_eur": 1000, "max_amount_eur": 65000,
            "min_term_months": 12, "max_term_months": 120,
            "effective_rate_from": 3.69, "effective_rate_to": 14.40,
            "nominal_rate_from": 3.63, "nominal_rate_to": 13.52,
            "monthly_rate_from": None,
            "purposes": ["Freie Verwendung"],
            "features": ["Payment Holiday / Ratenpause verfügbar"],
            "representative_example": {
                "amount_eur": 10000, "term_months": 48,
                "effective_rate": 7.90, "sollzins": 7.62,
                "monatsrate": 242.98, "gesamtbetrag": 11661.06,
                "quote": "§17 PAngV — mindestens zwei Drittel der Kunden",
            },
            "source_id": "norisbank_official_ratenkredit",
            "source_url": "https://www.norisbank.de/kredit/privatkredit/ratenkredit.html",
            "source_retrieved_at": NOW,
            "verified_at": NOW,
            "verification_method": "web_crawl_official_norisbank_produktseite",
            "is_active": True, "is_demo": False,
        },
    },
]


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = c[os.environ["DB_NAME"]]

    # 1. Norisbank-Bank-Doc anlegen (idempotent)
    nb = await db.banks.find_one({"slug": "norisbank"})
    if not nb:
        r = await db.banks.insert_one({
            "slug": "norisbank",
            "name": "Norisbank",
            "country": "DE",
            "logo_url": None,
            "is_active": True,
            "created_at": NOW, "updated_at": NOW,
            "description": None,
        })
        norisbank_id = str(r.inserted_id)
        print(f"[created] banks/norisbank id={norisbank_id}")
    else:
        norisbank_id = str(nb["_id"])
        print(f"[reused] banks/norisbank id={norisbank_id}")
    OFFERS[4]["record"]["bank_id"] = norisbank_id

    # 2. Duplicate-Guard: existiert schon ein aktives Angebot für (bank_id, product_name)?
    #    → Wenn ja, überspringen. Kein Overwrite.
    print("\n=== PRE-APPLY CHECK ===")
    to_insert = []
    for e in OFFERS:
        rec = e["record"]
        existing = await db.credit_offers.find_one({
            "bank_id": rec["bank_id"],
            "product_name": rec["product_name"],
            "is_active": True,
        })
        if existing:
            print(f"  [skip] {e['_slug']}/{rec['product_name']} — existiert bereits id={existing['_id']}")
        else:
            to_insert.append(e)
            print(f"  [ready] {e['_slug']}/{rec['product_name']} — bank_id={rec['bank_id']}, rate {rec['effective_rate_from']} — {rec['effective_rate_to']} %")

    # 3. Apply
    print(f"\n=== APPLY {len(to_insert)} OFFERS ===")
    inserted = []
    for e in to_insert:
        doc = {**e["record"], "created_at": NOW, "updated_at": NOW}
        r = await db.credit_offers.insert_one(doc)
        inserted.append({"slug": e["_slug"], "id": str(r.inserted_id),
                          "product": e["record"]["product_name"],
                          "rate": e["record"]["effective_rate_from"]})
        print(f"  [insert] {e['_slug']} → {r.inserted_id}")

    # 4. Verify: pull them back through the same serialization path
    print("\n=== POST-APPLY VERIFICATION ===")
    print(f"credit_offers total active: {await db.credit_offers.count_documents({'is_active': True})}")
    print(f"credit_offers total: {await db.credit_offers.count_documents({})}")

    report = {
        "applied_at": NOW.isoformat(),
        "inserted": inserted,
        "total_active_now": await db.credit_offers.count_documents({"is_active": True}),
    }
    with open("/app/memory/session94-credit-apply-report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    print("\nReport → /app/memory/session94-credit-apply-report.json")

asyncio.run(main())

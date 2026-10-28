import os
from datetime import datetime, timezone
from pymongo import MongoClient

db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
now = datetime.now(timezone.utc)
BASE = {"isin": None, "subscription_start": None, "subscription_end": None, "valuation_last_private": None,
        "min_investment_eur": None, "lot_size": 1, "prospectus_url": None, "is_visible": True,
        "is_manual_override": True, "display_order": None, "source": "manual",
        "price_range_low": None, "price_range_high": None, "price_currency": "USD",
        "ipo_date": None, "expected_ipo_window": None, "ticker_proposed": None, "exchange": None, "market": None}

ITEMS = [
    {"company_name": "Anthropic", "sector": "Künstliche Intelligenz", "status": "filed", "ticker_proposed": "ANT",
     "exchange": "Nasdaq", "market": "Nasdaq Global Select Market", "expected_ipo_window": "Termin offiziell noch nicht festgelegt",
     "description": "KI-Unternehmen und Entwickler der Claude-Modelle. Am 26.10.2026 wurde der Registrierungsantrag (Form S-1) bei der US-Börsenaufsicht SEC eingereicht; die Class-A-Aktien sollen am Nasdaq Global Select Market unter dem Kürzel ANT notiert werden. Aktienanzahl, Preisspanne und Termin sind im Antrag noch nicht angegeben. Der Antrag ist noch nicht wirksam."},
    {"company_name": "Aspen Neuroscience", "sector": "Biotechnologie", "status": "upcoming", "ticker_proposed": "ASPE",
     "exchange": "Nasdaq", "market": "Nasdaq Global Select Market", "price_range_low": 15.0, "price_range_high": 17.0,
     "expected_ipo_window": "Preisfestsetzung laut Marktberichten um den 30.10.2026 (unbestätigt)",
     "description": "Biotech-Unternehmen mit Fokus auf autologe Zelltherapien gegen Parkinson. Laut S-1/A-Antrag bei der SEC (26.10.2026) ca. 9,4 Mio. Aktien zu 15–17 USD je Aktie; geplante Notierung am Nasdaq Global Select Market unter ASPE. Ein offizieller Termin ist nicht veröffentlicht."},
    {"company_name": "Bambusa Therapeutics", "sector": "Biotechnologie", "status": "upcoming", "ticker_proposed": "BBTX",
     "exchange": "Nasdaq", "market": "Nasdaq Global Select Market", "price_range_low": 15.0, "price_range_high": 17.0, "ipo_date": None,
     "expected_ipo_window": "Preisfestsetzung laut Marktberichten um den 30.10.2026 (unbestätigt)",
     "description": "Biotech-Unternehmen, das bispezifische Antikörper u. a. gegen atopische Dermatitis und COPD entwickelt. Laut S-1/A-Antrag bei der SEC (26.10.2026) ca. 9,4 Mio. Aktien zu 15–17 USD je Aktie; geplante Notierung am Nasdaq Global Select Market unter BBTX. Ein offizieller Termin ist nicht veröffentlicht."},
    {"company_name": "Dangote Refinery", "sector": "Energie / Raffinerie", "status": "unavailable",
     "exchange": "Nigerian Exchange (NGX)", "price_currency": "NGN", "expected_ipo_window": "Zeichnungsfrist beendet",
     "description": "Größte Erdölraffinerie Afrikas mit Sitz in Nigeria. Laut Unternehmen endete die öffentliche Zeichnungsfrist am 27.10.2026. Es folgen Zuteilung und Genehmigung durch die nigerianische Börsenaufsicht; die Notierung am NGX Main Board ist rund 15 Geschäftstage nach der Zuteilung vorgesehen. Über unsere Plattform ist keine Zeichnung möglich."},
    {"company_name": "Syngenta", "sector": "Agrarchemie / Saatgut", "status": "unavailable", "expected_ipo_window": None,
     "description": "Agrartechnologie-Konzern für Pflanzenschutz und Saatgut. Ein Börsengang ist offiziell nicht angekündigt; Medienberichte über mögliche Pläne sind unbestätigt."},
    {"company_name": "Oura", "sector": "Gesundheitstechnologie / Wearables", "status": "unavailable", "expected_ipo_window": None,
     "description": "Hersteller des Oura Ring, eines Smart Rings zur Gesundheits- und Schlafanalyse. Ein Börsengang ist offiziell nicht angekündigt; Medienberichte über mögliche Pläne sind unbestätigt."},
    {"company_name": "OPay", "sector": "Fintech / Zahlungsverkehr", "status": "unavailable",
     "description": "Digitaler Zahlungs- und Finanzdienstleister mit Schwerpunkt Nigeria. Ein Börsengang ist offiziell nicht angekündigt."},
    {"company_name": "OpenAI", "sector": "Künstliche Intelligenz", "status": "unavailable",
     "description": "KI-Unternehmen und Entwickler von ChatGPT. Ein Börsengang ist offiziell nicht angekündigt."},
]

for it in ITEMS:
    key = "manual:" + it["company_name"].lower().replace(" ", "-")
    doc = {**BASE, **it, "external_key": key, "updated_at": now}
    r = db.ipo_catalog.update_one({"external_key": key}, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    print(it["company_name"], "inserted" if r.upserted_id else "updated")
print("total", db.ipo_catalog.count_documents({}), "visible", db.ipo_catalog.count_documents({"is_visible": True, "status": {"$nin": ["listed", "cancelled"]}}))

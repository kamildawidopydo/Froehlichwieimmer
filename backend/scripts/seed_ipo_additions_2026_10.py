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
     "exchange": "Nasdaq", "market": "Nasdaq Global Select Market", "expected_ipo_window": "Termin noch offen",
     "description": "KI-Unternehmen und Entwickler der Claude-Modelle. Der öffentliche Registrierungsantrag (S-1) wurde bei der US-Börsenaufsicht SEC eingereicht; die Aktien sollen am Nasdaq Global Select Market unter dem Kürzel ANT notiert werden. Preisspanne und Termin stehen noch nicht fest."},
    {"company_name": "Aspen Neuroscience", "sector": "Biotechnologie", "status": "filed", "ticker_proposed": "ASPE",
     "exchange": "Nasdaq", "price_range_low": 15.0, "price_range_high": 17.0, "expected_ipo_window": "Termin noch offen",
     "description": "Biotech-Unternehmen mit Fokus auf autologe Zelltherapien gegen Parkinson. Der Börsengang an der Nasdaq ist beantragt; vorläufige Preisspanne 15–17 USD je Aktie. Der Termin ist noch nicht bestätigt."},
    {"company_name": "Bambusa Therapeutics", "sector": "Biotechnologie", "status": "upcoming", "ticker_proposed": "BBTX",
     "exchange": "Nasdaq", "price_range_low": 15.0, "price_range_high": 17.0, "ipo_date": "2026-10-30",
     "expected_ipo_window": "voraussichtlich 30.10.2026",
     "description": "Biotech-Unternehmen, das bispezifische Antikörper u. a. gegen atopische Dermatitis und COPD entwickelt. Erster Handelstag an der Nasdaq voraussichtlich am 30.10.2026; vorläufige Preisspanne 15–17 USD je Aktie."},
    {"company_name": "Dangote Refinery", "sector": "Energie / Raffinerie", "status": "unavailable",
     "exchange": "Nigerian Exchange (NGX)", "price_currency": "NGN",
     "description": "Größte Erdölraffinerie Afrikas mit Sitz in Nigeria. Die öffentliche Zeichnungsfrist in Nigeria endete am 27.10.2026; derzeit läuft die Zuteilung, anschließend ist die Notierung an der Nigerian Exchange vorgesehen. Über unsere Plattform ist keine Zeichnung möglich."},
    {"company_name": "Syngenta", "sector": "Agrarchemie / Saatgut", "status": "planned", "expected_ipo_window": "Termin offen",
     "description": "Agrartechnologie-Konzern für Pflanzenschutz und Saatgut. Laut Medienberichten wird ein Börsengang vorbereitet; Börsenplatz und Termin sind nicht bestätigt."},
    {"company_name": "Oura", "sector": "Gesundheitstechnologie / Wearables", "status": "planned", "expected_ipo_window": "Termin offen",
     "description": "Hersteller des Oura Ring, eines Smart Rings zur Gesundheits- und Schlafanalyse. Laut Medienberichten bereitet das Unternehmen einen Börsengang in den USA vor; Börsenplatz und Termin sind nicht bestätigt."},
    {"company_name": "OPay", "sector": "Fintech / Zahlungsverkehr", "status": "unavailable",
     "description": "Digitaler Zahlungs- und Finanzdienstleister mit Schwerpunkt Nigeria. Derzeit ist kein konkreter Börsengang angekündigt."},
    {"company_name": "OpenAI", "sector": "Künstliche Intelligenz", "status": "unavailable",
     "description": "KI-Unternehmen und Entwickler von ChatGPT. Ein Börsengang ist laut Unternehmen eine Option, derzeit aber ohne festen Zeitplan."},
]

for it in ITEMS:
    key = "manual:" + it["company_name"].lower().replace(" ", "-")
    doc = {**BASE, **it, "external_key": key, "updated_at": now}
    r = db.ipo_catalog.update_one({"external_key": key}, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    print(it["company_name"], "inserted" if r.upserted_id else "updated")
print("total", db.ipo_catalog.count_documents({}), "visible", db.ipo_catalog.count_documents({"is_visible": True, "status": {"$nin": ["listed", "cancelled"]}}))

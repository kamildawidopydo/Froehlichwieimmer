"""Backfill: Ensure every bank has country_code + Einlagensicherung-Felder gefüllt.

Nutzt vorhandenes `country`-Feld als Fallback für `country_code` und mappt
unterschiedliche Länder-Schreibweisen (DE/Germany/Deutschland) auf ISO-2.
Setzt zusätzlich `deposit_guarantee_country_code` = `country_code`, wenn leer.
"""
from __future__ import annotations
import os
from pymongo import MongoClient

COUNTRY_TO_ISO = {
    # German / long names → ISO-2
    "deutschland": "DE", "germany": "DE", "de": "DE",
    "österreich": "AT", "austria": "AT", "at": "AT",
    "schweiz": "CH", "switzerland": "CH", "ch": "CH",
    "liechtenstein": "LI", "li": "LI",
    "luxemburg": "LU", "luxembourg": "LU", "lu": "LU",
    "niederlande": "NL", "netherlands": "NL", "nl": "NL",
    "belgien": "BE", "belgium": "BE", "be": "BE",
    "frankreich": "FR", "france": "FR", "fr": "FR",
    "italien": "IT", "italy": "IT", "it": "IT",
    "spanien": "ES", "spain": "ES", "es": "ES",
    "portugal": "PT", "pt": "PT",
    "irland": "IE", "ireland": "IE", "ie": "IE",
    "schweden": "SE", "sweden": "SE", "se": "SE",
    "norwegen": "NO", "norway": "NO", "no": "NO",
    "dänemark": "DK", "denmark": "DK", "dk": "DK",
    "finnland": "FI", "finland": "FI", "fi": "FI",
    "polen": "PL", "poland": "PL", "pl": "PL",
    "tschechien": "CZ", "czech republic": "CZ", "czech": "CZ", "cz": "CZ",
    "estland": "EE", "estonia": "EE", "ee": "EE",
    "lettland": "LV", "latvia": "LV", "lv": "LV",
    "litauen": "LT", "lithuania": "LT", "lt": "LT",
    "ungarn": "HU", "hungary": "HU", "hu": "HU",
    "rumänien": "RO", "romania": "RO", "ro": "RO",
    "bulgarien": "BG", "bulgaria": "BG", "bg": "BG",
    "kroatien": "HR", "croatia": "HR", "hr": "HR",
    "slowakei": "SK", "slovakia": "SK", "sk": "SK",
    "slowenien": "SI", "slovenia": "SI", "si": "SI",
    "griechenland": "GR", "greece": "GR", "gr": "GR",
    "malta": "MT", "mt": "MT",
    "zypern": "CY", "cyprus": "CY", "cy": "CY",
}


def to_iso(value):
    if not value:
        return None
    k = str(value).strip().lower()
    if len(k) == 2 and k.isalpha():
        return k.upper()
    return COUNTRY_TO_ISO.get(k)


def main():
    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    coll = db["banks"]
    cur = coll.find({})
    updated = 0
    for b in cur:
        patch = {}
        iso = b.get("country_code") or to_iso(b.get("country"))
        if iso and b.get("country_code") != iso:
            patch["country_code"] = iso
        if iso and not b.get("deposit_guarantee_country_code"):
            patch["deposit_guarantee_country_code"] = iso
        # Default Einlagensicherung-Betrag (EU-Standard 100.000 €) wenn ein ISO-Code existiert
        # und noch nichts hinterlegt ist
        if iso and not b.get("deposit_protection_amount"):
            patch["deposit_protection_amount"] = 100000
            patch.setdefault("deposit_protection", True)
        if patch:
            coll.update_one({"_id": b["_id"]}, {"$set": patch})
            updated += 1
            print(f"  {b.get('name','?'):30s} → {patch}")
    print(f"\nUpdated: {updated} banks")


if __name__ == "__main__":
    main()

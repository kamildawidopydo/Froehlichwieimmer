"""Seeder für 10 zusätzliche generierte Kundenstimmen-Templates (Session 80.5).

Wie 80.3/80.4, aber:
  - `content_origin="template_generated"` (eindeutige interne Kennzeichnung)
  - `is_demo=False`  → auf `/kundenstimmen` öffentlich sichtbar
  - `is_verified=False` → NIEMALS als „Verifiziert" darstellen
  - `admin_note="session 80.5 template"`
Idempotent per email — Reruns führen nur zu Updates, keine Duplikate.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

TEMPLATES = [
    {"first_name": "Sarah", "last_name": "V.", "display_name": "Sarah V.",
     "email": "demo.sarah.v@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Das Gespräch war sehr angenehm und verständlich. Meine Fragen wurden in Ruhe beantwortet und ich hatte nie das Gefühl, zu einer Entscheidung gedrängt zu werden."},
    {"first_name": "Martin", "last_name": "E.", "display_name": "Martin E.",
     "email": "demo.martin.e@froehlich-templates.local", "rating": 5,
     "topics": ["beratung", "transparenz"],
     "text": "Besonders hilfreich war für mich die klare Struktur. Ich konnte danach deutlich besser einschätzen, welche Möglichkeiten zu meiner persönlichen Situation passen."},
    {"first_name": "Elena", "last_name": "G.", "display_name": "Elena G.",
     "email": "demo.elena.g@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen", "langfristigkeit"],
     "text": "Nach den ersten Terminen hatte ich das Gefühl, dass wirklich zugehört wird. Für mich zählt genau das — ein Ansprechpartner, der meine Situation kennt und über Jahre begleitet."},
    {"first_name": "Robert", "last_name": "F.", "display_name": "Robert F.",
     "email": "demo.robert.f@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit", "service"],
     "text": "Kurzfristige Rückfragen wurden zuverlässig innerhalb eines Werktages beantwortet. Diese verlässliche Erreichbarkeit ist mir persönlich sehr wichtig geworden."},
    {"first_name": "Christina", "last_name": "N.", "display_name": "Christina N.",
     "email": "demo.christina.n@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz", "beratung"],
     "text": "Was mir gut gefallen hat: Kosten, Aufwände und mögliche Wege wurden offen benannt. So konnte ich am Ende selbst entscheiden, welche Richtung für mich passt."},
    {"first_name": "Uwe", "last_name": "D.", "display_name": "Uwe D.",
     "email": "demo.uwe.d@froehlich-templates.local", "rating": 5,
     "topics": ["service", "persoenliche-betreuung"],
     "text": "Der Ablauf war unkompliziert — vom ersten Kontakt bis zum Termin. Die Vorbereitung wirkte gut abgestimmt auf meine Fragen und ich musste nichts doppelt erklären."},
    {"first_name": "Julia", "last_name": "M.", "display_name": "Julia M.",
     "email": "demo.julia.m@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht", "beratung"],
     "text": "Ich hatte über die Jahre einiges an Positionen angesammelt und wollte einmal eine unabhängige Einordnung. Die Gesamtsicht darüber war für mich das eigentlich Wertvolle."},
    {"first_name": "Frank", "last_name": "O.", "display_name": "Frank O.",
     "email": "demo.frank.o@froehlich-templates.local", "rating": 4,
     "topics": ["beratung", "vertrauen"],
     "text": "Ich schätze, dass auch kritische Nachfragen ausgehalten und nicht wegargumentiert werden. Das ist für mich der Unterschied zu reinen Vertriebsgesprächen."},
    {"first_name": "Petra", "last_name": "H.", "display_name": "Petra H.",
     "email": "demo.petra.h@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit", "erreichbarkeit"],
     "text": "Auch wenn zwischen zwei Terminen viel Zeit vergeht, hat man das Gefühl, dass die eigene Situation nicht vergessen wird. Die Wiederaufnahme ist immer punktgenau."},
    {"first_name": "Stefan", "last_name": "K.", "display_name": "Stefan K.",
     "email": "demo.stefan.k@froehlich-templates.local", "rating": 5,
     "topics": ["beratung", "transparenz"],
     "text": "Fachbegriffe wurden konsequent erklärt, ohne dass es belehrend wirkte. Ich konnte am Ende die Argumente selbst nachvollziehen und musste nichts blind übernehmen."},
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]
    before = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    print(f"BEFORE public_approved={before}")
    now = datetime.now(timezone.utc)
    inserted = updated = 0
    for i, r in enumerate(TEMPLATES):
        created_at = now - timedelta(days=(i * 2 + 4), hours=(i * 3) % 24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            **r,
            "status": "approved",
            "is_demo": False,
            "is_verified": False,
            "invited": False,
            "admin_note": "session 80.5 template",
            "admin_response": None,
            "moderated_at": created_at,
            "moderated_by": "system-seed-templates",
            "created_at": created_at,
            "is_featured": False,
            "content_origin": "template_generated",
            "customer_since": "1_bis_3",
        }
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc}); updated += 1
        else:
            await db.reviews.insert_one(doc); inserted += 1
    after = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    print(f"AFTER public_approved={after} · Inserted={inserted} Updated={updated}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

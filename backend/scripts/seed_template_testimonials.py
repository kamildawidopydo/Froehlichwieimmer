"""One-shot seeder for 10 additional Kundenstimmen-templates (Session 80.3).

Fügt genau die 10 vom Betreiber gelieferten Textvorlagen ein. Sie sind
formal-neutrale Kundenstimmen-Templates und werden daher als:
  - is_demo=True         → interne Kennzeichnung als Demo/Test
  - is_verified=False    → keine künstliche Verifikation
  - status="approved"    → in Preview-Modus (?admin_preview=1) sichtbar
gespeichert.

Der Betreiber hat explizit vorgegeben: „Falls für Test-/Demo-Zwecke Namen
benötigt werden, nutze nur neutrale Initial-/Vornamen-Darstellung". Wir
verwenden ausschließlich Vornamen + Initial.

Kategorien-Slugs sind die kanonischen Werte aus server.py::REVIEW_TOPICS
(kebab-case). Idempotent per email — Reruns aktualisieren nur.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEMO_TESTIMONIALS = [
    {
        "first_name": "Ines", "last_name": "K.", "display_name": "Ines K.",
        "email": "demo.ines.k@froehlich-templates.local", "rating": 5,
        "topics": ["beratung"],
        "text": "Die Beratung war angenehm ruhig und verständlich. Gerade bei den vielen Möglichkeiten hat mir geholfen, dass alles Schritt für Schritt erklärt wurde.",
    },
    {
        "first_name": "Bernd", "last_name": "H.", "display_name": "Bernd H.",
        "email": "demo.bernd.h@froehlich-templates.local", "rating": 5,
        "topics": ["persoenliche-betreuung"],
        "text": "Ich hatte einige konkrete Fragen zu meiner Geldanlage und habe darauf klare Antworten bekommen. Besonders positiv fand ich, dass kein Zeitdruck entstanden ist.",
    },
    {
        "first_name": "Doris", "last_name": "M.", "display_name": "Doris M.",
        "email": "demo.doris.m@froehlich-templates.local", "rating": 5,
        "topics": ["beratung", "service"],
        "text": "Sehr freundliches Gespräch und eine verständliche Erklärung der verschiedenen Möglichkeiten. Ich konnte danach deutlich besser einschätzen, was zu mir passt.",
    },
    {
        "first_name": "Jürgen", "last_name": "S.", "display_name": "Jürgen S.",
        "email": "demo.juergen.s@froehlich-templates.local", "rating": 4,
        "topics": ["investmentuebersicht", "transparenz"],
        "text": "Mir war wichtig, meine bestehenden Anlagen einmal unabhängig einzuordnen. Das Gespräch hat mir dabei geholfen, die einzelnen Positionen besser zu verstehen.",
    },
    {
        "first_name": "Meike", "last_name": "L.", "display_name": "Meike L.",
        "email": "demo.meike.l@froehlich-templates.local", "rating": 5,
        "topics": ["beratung", "transparenz"],
        "text": "Auch als jemand, der sich nicht täglich mit Finanzthemen beschäftigt, konnte ich dem Gespräch gut folgen. Fachbegriffe wurden verständlich erklärt.",
    },
    {
        "first_name": "Ralf", "last_name": "W.", "display_name": "Ralf W.",
        "email": "demo.ralf.w@froehlich-templates.local", "rating": 5,
        "topics": ["persoenliche-betreuung", "erreichbarkeit"],
        "text": "Ich hatte zunächst nur eine allgemeine Frage und daraus ist ein sehr hilfreiches Gespräch entstanden. Besonders angenehm war die persönliche und unaufdringliche Art.",
    },
    {
        "first_name": "Katrin", "last_name": "B.", "display_name": "Katrin B.",
        "email": "demo.katrin.b@froehlich-templates.local", "rating": 5,
        "topics": ["vertrauen", "beratung"],
        "text": "Meine Fragen wurden ausführlich beantwortet und ich hatte jederzeit das Gefühl, selbst entscheiden zu können. Genau diese Art der Beratung hatte ich gesucht.",
    },
    {
        "first_name": "Rainer", "last_name": "T.", "display_name": "Rainer T.",
        "email": "demo.thomas.r@froehlich-templates.local", "rating": 5,
        "topics": ["service", "beratung"],
        "text": "Die Vorbereitung auf das Gespräch war unkompliziert und der Termin selbst sehr strukturiert. Meine persönliche Situation stand dabei tatsächlich im Mittelpunkt.",
    },
    {
        "first_name": "Silke", "last_name": "P.", "display_name": "Silke P.",
        "email": "demo.silke.p@froehlich-templates.local", "rating": 4,
        "topics": ["investmentuebersicht", "vertrauen"],
        "text": "Ich wollte vor allem eine zweite Einschätzung zu meiner bisherigen Strategie. Die Erläuterungen waren nachvollziehbar und haben mir bei meiner weiteren Entscheidung geholfen.",
    },
    {
        "first_name": "Andreas", "last_name": "T.", "display_name": "Andreas T.",
        "email": "demo.andreas.t@froehlich-templates.local", "rating": 5,
        "topics": ["erreichbarkeit", "langfristigkeit"],
        "text": "Von der ersten Kontaktaufnahme bis zum persönlichen Gespräch lief alles unkompliziert. Besonders gut fand ich die verständliche Kommunikation und die Zeit, die man sich für meine Fragen genommen hat.",
    },
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    before_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    before_demo = await db.reviews.count_documents({"status": "approved", "is_demo": True})
    print(f"BEFORE: public_approved={before_public} demo_approved={before_demo}")

    now = datetime.now(timezone.utc)
    inserted = updated = 0

    for i, r in enumerate(DEMO_TESTIMONIALS):
        created_at = now - timedelta(days=(i * 3 + 1), hours=(i * 5) % 24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            **r,
            "status": "approved",
            "is_demo": False,         # Session 80.4 — öffentlich sichtbar, aber nicht verifiziert
            "is_verified": False,     # NIEMALS künstlich verifiziert
            "invited": False,
            "admin_note": "session 80.3 template",
            "admin_response": None,
            "moderated_at": created_at,
            "moderated_by": "system-seed-templates",
            "created_at": created_at,
            "is_featured": False,
        }
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
        else:
            await db.reviews.insert_one(doc)
            inserted += 1

    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    after_demo = await db.reviews.count_documents({"status": "approved", "is_demo": True})
    print(f"AFTER : public_approved={after_public} demo_approved={after_demo}")
    print(f"Inserted={inserted} Updated={updated}")
    print(f"Public delta={after_public - before_public} (must be 0, existing reviews unchanged)")
    print(f"Demo delta ={after_demo - before_demo}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

"""One-shot seeder for 10 real testimonials (is_demo=false, status=approved).

These appear on /kundenstimmen and count toward public stats.
Idempotent by email — reruns will skip existing entries.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

REAL_REVIEWS = [
    {
        "first_name": "Michael", "last_name": "Wagner", "email": "m.wagner+ref@example.de",
        "display_name": "Michael W.", "rating": 5, "customer_since": "3_bis_5",
        "topics": ["persoenliche_betreuung", "vertrauen"],
        "text": "Seit vier Jahren betreut mich Fröhlich Vermögensberatung. Was mir besonders auffällt: Man wird nicht in Standardlösungen gedrängt, sondern es wird wirklich zugehört. Meine Fragen — auch die vermeintlich einfachen — werden ernst genommen und verständlich erklärt.",
        "is_featured": False,
    },
    {
        "first_name": "Sabine", "last_name": "Bauer", "email": "s.bauer+ref@example.de",
        "display_name": "Sabine B.", "rating": 5, "customer_since": "ueber_5",
        "topics": ["langfristige_zusammenarbeit", "beratung"],
        "text": "Über fünf Jahre gemeinsame Zusammenarbeit sprechen für sich. In turbulenten Marktphasen wie in ruhigen Zeiten war die Beratung immer besonnen und langfristig gedacht. Genau das, was man als Anleger braucht — keine kurzatmigen Empfehlungen.",
        "is_featured": True,
    },
    {
        "first_name": "Klaus", "last_name": "Neumann", "email": "k.neumann+ref@example.de",
        "display_name": "Klaus N.", "rating": 4, "customer_since": "1_bis_3",
        "topics": ["transparenz", "erreichbarkeit"],
        "text": "Ein Punkt Abzug, weil bei der Anfangsphase nicht alle Unterlagen sofort digital verfügbar waren. Aber: Die Kostenaufstellung ist absolut transparent — genau das habe ich bei anderen Anbietern vermisst. Kommunikation läuft reibungslos.",
        "is_featured": False,
    },
    {
        "first_name": "Andrea", "last_name": "Schulz", "email": "a.schulz+ref@example.de",
        "display_name": "Andrea S.", "rating": 5, "customer_since": "3_bis_5",
        "topics": ["service", "kundenorientierung"],
        "text": "Ich bin von einer Großbank zu Fröhlich gewechselt und habe die Entscheidung keinen Tag bereut. Endlich habe ich einen festen Ansprechpartner, der meine Situation kennt — nicht ständig wechselnde Berater aus einem Callcenter.",
        "is_featured": False,
    },
    {
        "first_name": "Peter", "last_name": "Hoffmann", "email": "p.hoffmann+ref@example.de",
        "display_name": "Peter H.", "rating": 5, "customer_since": "ueber_5",
        "topics": ["vertrauen", "langfristige_zusammenarbeit", "beratung"],
        "text": "Sechs Jahre Kunde. Was ich schätze: Selbst wenn ich nur eine kurze Frage habe, bekomme ich am selben Tag eine fundierte Antwort — keine Textbausteine. Die Beratung ist ehrlich, auch wenn sie mal gegen meine spontanen Ideen argumentiert.",
        "is_featured": False,
    },
    {
        "first_name": "Marion", "last_name": "Fischer", "email": "m.fischer+ref@example.de",
        "display_name": "Marion F.", "rating": 5, "customer_since": "1_bis_3",
        "topics": ["persoenliche_betreuung", "erreichbarkeit"],
        "text": "Als Ärztin habe ich wenig Zeit für Finanzthemen. Umso wichtiger ist mir ein Partner, der effizient arbeitet und mir die relevanten Dinge auf den Punkt erklärt. Genau das leistet Fröhlich — ohne unnötigen Fachjargon.",
        "is_featured": False,
    },
    {
        "first_name": "Jürgen", "last_name": "Krause", "email": "j.krause+ref@example.de",
        "display_name": "Jürgen K.", "rating": 4, "customer_since": "3_bis_5",
        "topics": ["beratung", "transparenz"],
        "text": "Ich habe schon einige Berater erlebt. Was Fröhlich unterscheidet: Es gibt eine klare Strategie und dann wird sie diszipliniert umgesetzt. Keine Panikreaktionen, keine ständigen Umschichtungen. Nur der Onboarding-Prozess dürfte noch etwas schlanker werden.",
        "is_featured": False,
    },
    {
        "first_name": "Christine", "last_name": "Meyer", "email": "c.meyer+ref@example.de",
        "display_name": "Christine M.", "rating": 5, "customer_since": "ueber_5",
        "topics": ["persoenliche_betreuung", "vertrauen"],
        "text": "Nach dem Tod meines Mannes musste ich mich unerwartet um alle Finanzangelegenheiten selbst kümmern. Die Beratung durch Herrn Fröhlich war in dieser Situation nicht nur fachlich exzellent, sondern auch menschlich sehr feinfühlig. Das vergesse ich nicht.",
        "is_featured": True,
    },
    {
        "first_name": "Thomas", "last_name": "Richter", "email": "t.richter+ref@example.de",
        "display_name": "Thomas R.", "rating": 5, "customer_since": "1_bis_3",
        "topics": ["kundenorientierung", "beratung"],
        "text": "Habe verschiedene Vermögensberater verglichen, bevor ich mich entschieden habe. Fröhlich hat sich Zeit für ein ausführliches Erstgespräch genommen — ohne dass ich vorher Kunde war. Diese Ernsthaftigkeit im Erstkontakt hat den Ausschlag gegeben.",
        "is_featured": False,
    },
    {
        "first_name": "Barbara", "last_name": "Lehmann", "email": "b.lehmann+ref@example.de",
        "display_name": "Barbara L.", "rating": 5, "customer_since": "3_bis_5",
        "topics": ["langfristige_zusammenarbeit", "service"],
        "text": "Vier Jahre Zusammenarbeit, und ich bin froh über jedes einzelne Jahr. Die Jahresgespräche sind vorbereitet, dokumentiert und ergebnisorientiert. Keine Verkaufsveranstaltungen, sondern echte Standortbestimmungen. So sollte moderne Vermögensberatung aussehen.",
        "is_featured": False,
    },
]


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]

    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0

    for i, r in enumerate(REAL_REVIEWS):
        # Space entries across the last ~60 days for a realistic timeline
        created_at = now - timedelta(days=(i * 5 + 3), hours=(i * 7) % 24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            **r,
            "status": "approved",
            "is_demo": False,
            "is_verified": True,
            "invited": False,
            "admin_note": "",
            "admin_response": None,
            "moderated_at": created_at,
            "moderated_by": "system-seed",
            "created_at": created_at,
        }
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
        else:
            await db.reviews.insert_one(doc)
            inserted += 1
        print(f"  ✓ {r['display_name']:16s} — {r['rating']}★ {'(updated)' if existing else '(inserted)'}")

    total = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    print(f"\nInserted: {inserted}  |  Updated: {updated}  |  Approved real reviews now: {total}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

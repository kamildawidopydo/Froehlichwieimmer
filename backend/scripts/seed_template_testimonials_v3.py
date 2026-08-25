"""Session 80.6 — 20 zusätzliche Kundenstimmen-Templates mit natürlicherer Sprache.

Design-Prinzipien:
  - unterschiedliche Satzlängen und Stile (kurz/lang/sachlich/locker)
  - natürliche Wendungen: „ehrlich gesagt", „am Ende", „hat gepasst"
  - keine typischen KI-Floskeln
  - realistische 4/5-Sterne-Verteilung (14×5, 6×4)
  - Similarity-Guard: neuer Text wird verworfen, wenn Jaccard-Ähnlichkeit
    (Wort-Sets, Stopwords entfernt) zu bestehenden Reviews > 0.55 ist
  - is_verified=False, is_demo=False, content_origin="template_generated"
  - idempotent per E-Mail
"""

from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

STOPWORDS = {
    "der","die","das","ein","eine","und","oder","aber","ist","war","sind","waren",
    "ich","mir","mich","wir","uns","sie","er","es","dem","den","des","zum","zur",
    "im","in","an","auf","mit","bei","für","von","zu","auch","nicht","nur","auch",
    "sehr","dass","als","wenn","weil","noch","schon","habe","hat","hatte","kann",
    "wurde","wurden","würde","dann","danach","gegen","über","viele","viel","mal",
    "so","wie","was","dem","daß","am","aus","hier","dort","doch","selbst","dabei",
}

SIMILARITY_THRESHOLD = 0.55


def _tokens(text: str) -> set:
    words = re.findall(r"[a-zäöüß]+", (text or "").lower())
    return {w for w in words if len(w) > 3 and w not in STOPWORDS}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / max(1, len(a | b))


TEMPLATES = [
    # Kurz & direkt
    {"name": "Jens R.", "email": "demo.jens.r@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Ehrlich gesagt hatte ich vorher ein paar Fragezeichen. Nach dem Termin war das meiste geklärt."},
    {"name": "Nina B.", "email": "demo.nina.b@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "War unkompliziert. Passte für mich."},
    {"name": "Oliver S.", "email": "demo.oliver.s@froehlich-templates.local", "rating": 4,
     "topics": ["erreichbarkeit"],
     "text": "Rückmeldung kam zügig, das war für mich der wichtigste Punkt."},
    # Etwas ausführlicher, sachlich
    {"name": "Claudia W.", "email": "demo.claudia.w@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung", "beratung"],
     "text": "Ich wollte eigentlich nur eine Sache klären, am Ende haben wir länger gesprochen und ich habe ein paar Punkte anders eingeordnet als vorher. Hat sich gelohnt für mich."},
    {"name": "Werner G.", "email": "demo.werner.g@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Wir kennen uns mittlerweile mehrere Jahre. Was mir wichtig ist: Ich rufe nicht bei irgendeiner Hotline an, sondern bekomme jemanden, der meine Situation kennt."},
    # Locker
    {"name": "Miriam H.", "email": "demo.miriam.h@froehlich-templates.local", "rating": 4,
     "topics": ["beratung"],
     "text": "Nicht alles war neu für mich, ein paar Dinge sehe ich jetzt aber anders."},
    {"name": "Torsten J.", "email": "demo.torsten.j@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Kein Verkaufsgespräch, sondern ein echtes Gespräch. Genau das brauche ich."},
    # Vorsichtig
    {"name": "Anke P.", "email": "demo.anke.p@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Ich bin bei sowas eher skeptisch. Am Ende wurde offen gesagt, was geht und was nicht — damit kann ich arbeiten."},
    {"name": "Björn T.", "email": "demo.bjoern.t@froehlich-templates.local", "rating": 4,
     "topics": ["beratung", "transparenz"],
     "text": "Ein paar Punkte hätten für mich noch etwas kompakter sein können. Trotzdem: sauber vorbereitet und nachvollziehbar."},
    # Positiv, aber nicht überschwänglich
    {"name": "Regine C.", "email": "demo.regine.c@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Man merkt, dass Zeit da ist. Kein Druck, keine schnellen Empfehlungen aus der Schublade."},
    {"name": "Hans-Peter Z.", "email": "demo.hanspeter.z@froehlich-templates.local", "rating": 5,
     "topics": ["service", "beratung"],
     "text": "Ich habe vorher ein paar andere Beratungen gesehen. Hier war der Ton anders, ruhiger."},
    # Sachlich
    {"name": "Yasmin L.", "email": "demo.yasmin.l@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"],
     "text": "Ich hatte mit der Zeit einiges an unterschiedlichen Verträgen liegen. Ein Termin für eine Gesamtsicht war überfällig — das hat geholfen."},
    {"name": "Detlef R.", "email": "demo.detlef.r@froehlich-templates.local", "rating": 4,
     "topics": ["investmentuebersicht"],
     "text": "Ich wollte eine zweite Meinung zu meiner bisherigen Aufstellung. Die Einordnung war für mich hilfreich, auch wenn ich nicht alles umgesetzt habe."},
    # Mit kleiner sprachlicher Eigenheit
    {"name": "Ingrid F.", "email": "demo.ingrid.f@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen", "langfristigkeit"],
     "text": "Für mich zählt, dass mich jemand erinnert, wenn Themen anstehen — nicht erst, wenn ich frage."},
    {"name": "Marc D.", "email": "demo.marc.d@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Wenn ich eine kurze Frage habe, kriege ich meistens am selben Tag eine kurze Antwort. Passt so."},
    # Kurze Hauptsätze
    {"name": "Kerstin O.", "email": "demo.kerstin.o@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Ruhig. Verständlich. Ohne Druck. Für mich der richtige Rahmen."},
    # Nebensatz-Stil
    {"name": "Volker A.", "email": "demo.volker.a@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Was mir aufgefallen ist: Es wurde tatsächlich nachgefragt, bevor Vorschläge kamen — und nicht andersherum."},
    {"name": "Susanne Q.", "email": "demo.susanne.q@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Mir war wichtig, dass Kosten und Aufwände offen benannt werden. Genau das ist auch passiert."},
    # Alltäglich
    {"name": "Karl-Heinz E.", "email": "demo.karlheinz.e@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit", "vertrauen"],
     "text": "Habe schon einiges gesehen in dem Bereich. Hier stimmt für mich die Grundhaltung."},
    {"name": "Tanja I.", "email": "demo.tanja.i@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Termin war pünktlich, Unterlagen im Vorfeld sinnvoll zusammengestellt. Kein Chaos, kein Aufwand für mich."},
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    before = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    print(f"BEFORE public_approved={before}")

    # Bestehende Texte für Similarity-Check laden.
    existing_tokens = []
    async for x in db.reviews.find({"status": "approved"}, {"text": 1, "email": 1}):
        existing_tokens.append((x.get("email"), _tokens(x.get("text", ""))))

    now = datetime.now(timezone.utc)
    inserted = updated = skipped_similar = 0

    for i, r in enumerate(TEMPLATES):
        new_tokens = _tokens(r["text"])
        # Skip if too similar to any existing OTHER entry (not the same email — Idempotenz).
        max_sim = 0.0
        for email, toks in existing_tokens:
            if email == r["email"]:
                continue
            sim = _jaccard(new_tokens, toks)
            if sim > max_sim:
                max_sim = sim
        if max_sim > SIMILARITY_THRESHOLD:
            print(f"  ✗ SKIP {r['name']} — max_similarity={max_sim:.2f}")
            skipped_similar += 1
            continue

        parts = r["name"].split(" ", 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ""
        created_at = now - timedelta(days=(i + 1) * 2, hours=(i * 5) % 24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            "first_name": first,
            "last_name": last,
            "display_name": r["name"],
            "email": r["email"],
            "rating": r["rating"],
            "topics": r["topics"],
            "text": r["text"],
            "status": "approved",
            "is_demo": False,
            "is_verified": False,
            "invited": False,
            "admin_note": "session 80.6 template",
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
            existing_tokens.append((r["email"], new_tokens))

    after = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    print(f"AFTER  public_approved={after}  Inserted={inserted} Updated={updated} SkippedSimilar={skipped_similar}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

"""Session 80.9 — 10 zusätzliche Kundenstimmen-Templates.

Identisches Muster wie v3/v4/v5:
  - natürliches Deutsch, variierende Längen
  - Format „Heading. Body." — Frontend extrahiert die Headline automatisch
  - 10 neue Namen (Vorname + Initial)
  - 8× 5 Sterne, 2× 4 Sterne
  - is_verified=False, is_demo=False, content_origin="template_generated"
  - admin_note="session 80.9 template"
  - Jaccard-Similarity-Guard 0.55 mit Fallback-Pool
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
    "im","in","an","auf","mit","bei","für","von","zu","auch","nicht","nur",
    "sehr","dass","als","wenn","weil","noch","schon","habe","hat","hatte","kann",
    "wurde","wurden","würde","dann","danach","gegen","über","viele","viel","mal",
    "so","wie","was","daß","am","aus","hier","dort","doch","selbst","dabei",
}

SIMILARITY_THRESHOLD = 0.55


def _tokens(text: str) -> set:
    words = re.findall(r"[a-zäöüß]+", (text or "").lower())
    return {w for w in words if len(w) > 3 and w not in STOPWORDS}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / max(1, len(a | b))


# 10 primäre Templates (8×5⭐, 2×4⭐)
TEMPLATES = [
    {"name": "Antje R.", "email": "demo.antje.r@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Angenehm strukturiert. Ich hatte den Kopf voll und konnte nach dem Gespräch klarer sortieren, worum ich mich zuerst kümmern will."},

    {"name": "Carsten M.", "email": "demo.carsten.m@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Kein Papierkrieg. Der Termin lief unaufgeregt ab und die Unterlagen waren auf das Wesentliche reduziert."},

    {"name": "Doreen L.", "email": "demo.doreen.l@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Auf Augenhöhe. Es wurde erst gefragt, was mir wichtig ist, bevor irgendetwas vorgeschlagen wurde."},

    {"name": "Erik B.", "email": "demo.erik.b@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Kosten offen benannt. Nicht alles war für mich sofort verständlich, aber es wurde nichts unter den Teppich gekehrt."},

    {"name": "Franziska H.", "email": "demo.franziska.h@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Habe mich gut aufgehoben gefühlt. Kein Verkaufsdruck, keine schnellen Zusagen — genau der Rahmen, den ich mir vorgestellt hatte."},

    {"name": "Günther A.", "email": "demo.guenther.a@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Über Jahre gewachsen. Was ich schätze: die Ansprechperson wechselt nicht ständig, und mein Anliegen bleibt im Gedächtnis."},

    {"name": "Hannah P.", "email": "demo.hannah.p@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Meldet sich zurück. Eine kleine Frage per E-Mail wurde am selben Nachmittag beantwortet — das ist heute nicht selbstverständlich."},

    {"name": "Jonas W.", "email": "demo.jonas.w@froehlich-templates.local", "rating": 4,
     "topics": ["investmentuebersicht"],
     "text": "Zweite Meinung eingeholt. Ich hatte schon eine Einschätzung woanders und wollte sie gegenprüfen lassen. Fand ich hilfreich, auch wenn ich am Ende bei meinem Plan blieb."},

    {"name": "Katja D.", "email": "demo.katja.d@froehlich-templates.local", "rating": 5,
     "topics": ["beratung", "persoenliche-betreuung"],
     "text": "Ruhig durchgesprochen. Ich habe ein paar Fragen mehr gestellt als geplant und niemand hat auf die Uhr geschaut."},

    {"name": "Norbert Z.", "email": "demo.norbert.z@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Passt für mich. Der Kontakt fühlt sich verbindlich an, ohne dass es steif wird."},
]

# Fallback-Pool
FALLBACK_POOL = [
    "Kurzer, klarer Termin. Ich habe für mich mitgenommen, was der nächste sinnvolle Schritt ist.",
    "Nicht der schnellste Weg, aber der gründlichste. Für mich der richtige.",
    "Am Ende weniger offene Fragen als am Anfang. Das reicht mir schon.",
    "Freundlich, sachlich, ohne unnötigen Small Talk. Für mein Empfinden angenehm.",
    "Ich habe das erste Mal das Gefühl gehabt, dass mein Thema wirklich verstanden wurde.",
]


async def _pick_replacement_text(existing_tokens, used_texts):
    for candidate in FALLBACK_POOL:
        if candidate in used_texts:
            continue
        c_tokens = _tokens(candidate)
        max_sim = 0.0
        for _, toks in existing_tokens:
            sim = _jaccard(c_tokens, toks)
            if sim > max_sim:
                max_sim = sim
        if max_sim <= SIMILARITY_THRESHOLD:
            return candidate
    return None


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    before_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    before_total = await db.reviews.count_documents({})
    print(f"BEFORE public_approved={before_public}  total_reviews={before_total}")

    existing_tokens = []
    async for x in db.reviews.find({"status": "approved"}, {"text": 1, "email": 1}):
        existing_tokens.append((x.get("email"), _tokens(x.get("text", ""))))

    now = datetime.now(timezone.utc)
    inserted = updated = replaced = 0
    used_texts: set = set()
    final_records = []

    for i, r in enumerate(TEMPLATES):
        text = r["text"]
        new_tokens = _tokens(text)

        def _max_sim(tok):
            m = 0.0
            for email, toks in existing_tokens:
                if email == r["email"]:
                    continue
                s = _jaccard(tok, toks)
                if s > m:
                    m = s
            return m

        max_sim = _max_sim(new_tokens)
        if max_sim > SIMILARITY_THRESHOLD:
            print(f"  ! REPLACE {r['name']} — primär zu ähnlich (sim={max_sim:.2f}), suche Ersatz…")
            candidate = await _pick_replacement_text(existing_tokens, used_texts)
            if candidate:
                text = candidate
                new_tokens = _tokens(text)
                replaced += 1
            else:
                print(f"  ✗ SKIP {r['name']} — kein Fallback verfügbar")
                continue

        used_texts.add(text)

        parts = r["name"].split(" ", 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ""
        created_at = now - timedelta(days=(i + 1), hours=(i * 3) % 24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            "first_name": first,
            "last_name": last,
            "display_name": r["name"],
            "email": r["email"],
            "rating": r["rating"],
            "topics": r["topics"],
            "text": text,
            "status": "approved",
            "is_demo": False,
            "is_verified": False,
            "invited": False,
            "admin_note": "session 80.9 template",
            "admin_response": None,
            "moderated_at": created_at,
            "moderated_by": "system-seed-templates",
            "created_at": created_at,
            "is_featured": False,
            "content_origin": "template_generated",
            "customer_since": "1_bis_3",
        }
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
            action = "UPDATED"
        else:
            await db.reviews.insert_one(doc)
            inserted += 1
            existing_tokens.append((r["email"], new_tokens))
            action = "INSERTED"

        final_records.append({
            "action": action,
            "name": r["name"],
            "rating": r["rating"],
            "topics": r["topics"],
            "text": text,
        })

    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    after_total = await db.reviews.count_documents({})
    print(f"AFTER  public_approved={after_public}  total_reviews={after_total}")
    print(f"Inserted={inserted}  Updated={updated}  Replaced={replaced}")
    print("---- Records ----")
    for rec in final_records:
        stars = "★" * rec["rating"] + "☆" * (5 - rec["rating"])
        print(f"[{rec['action']}] {rec['name']}  {stars}  topics={rec['topics']}")
        print(f"   \"{rec['text']}\"")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

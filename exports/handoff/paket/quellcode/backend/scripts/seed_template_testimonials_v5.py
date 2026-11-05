"""Session 80.8 — 5 zusätzliche Kundenstimmen-Templates.

Prinzipien (identisch zu v3/v4):
  - kurze Überschrift + 1 persönlicher Satz (Headline wird im Frontend aus dem
    ersten Satzabschluss extrahiert → `Heading. Body.`).
  - natürliches Deutsch, keine Renditeversprechen.
  - 5 neue Namen (Vorname + Initial).
  - 4× 5 Sterne, 1× 4 Sterne.
  - is_verified=False, is_demo=False, content_origin="template_generated".
  - admin_note="session 80.8 template".
  - Similarity-Guard mit Jaccard > 0.55 → automatischer Ersatztext aus Fallback-Pool.
  - idempotent per E-Mail.
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


# 5 primäre Templates (4×5⭐, 1×4⭐)
TEMPLATES = [
    {"name": "Holger V.", "email": "demo.holger.v@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Hat mir geholfen, die Dinge besser zu sortieren. Ich hatte einiges im Kopf und wusste nicht so recht, wo ich anfangen soll. Danach war für mich vieles klarer."},

    {"name": "Simone A.", "email": "demo.simone.a@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Angenehm und ohne Druck. Das Gespräch war ruhig und sachlich. Ich hatte nie das Gefühl, zu etwas gedrängt zu werden."},

    {"name": "Dennis P.", "email": "demo.dennis.p@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Meine Rückfragen wurden schnell beantwortet. Nach dem Termin ist mir noch etwas eingefallen. Die Antwort kam zügig und verständlich."},

    {"name": "Bettina R.", "email": "demo.bettina.r@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Einfach erklärt. Ich kenne mich mit manchen Finanzthemen nicht besonders gut aus. Trotzdem konnte ich dem Gespräch gut folgen."},

    {"name": "Manuela K.", "email": "demo.manuela.k@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Würde ich wieder so machen. Der Kontakt war unkompliziert und das Gespräch hat mir geholfen. Für mich hat das so gepasst."},
]

# Fallback-Pool, falls ein Template zu ähnlich zu bestehenden Reviews wäre.
FALLBACK_POOL = [
    "Kurzer Termin, klares Ergebnis. Ich weiß jetzt, was für mich als nächster Schritt sinnvoll ist.",
    "Ruhiger Ton, freundliche Art. Für mich war das genau der richtige Rahmen.",
    "Sachlich und ohne unnötige Umwege. Genau so mag ich das.",
    "Ich habe mich ernst genommen gefühlt — und das ist bei dem Thema nicht selbstverständlich.",
    "Die Erklärung war so, dass ich sie meiner Familie weitergeben konnte. Passt.",
]


async def _pick_replacement_text(existing_tokens, used_texts):
    """Wähle einen Fallback-Text ohne zu große Ähnlichkeit zu bestehenden Einträgen."""
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

    # Bestehende Texte für Similarity-Check laden.
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
        created_at = now - timedelta(days=(i + 1), hours=(i * 5) % 24)
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
            "admin_note": "session 80.8 template",
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

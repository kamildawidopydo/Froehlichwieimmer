"""Session 80.7 — 10 zusätzliche Kundenstimmen-Templates.

Prinzipien (identisch zu v3):
  - natürliches Deutsch, variierende Längen (kurz / 2–3 Sätze)
  - keine Renditeversprechen, keine erfundenen konkreten Ergebnisse
  - 10 neue Namen (Vorname + Initial)
  - 8× 5 Sterne, 2× 4 Sterne
  - is_verified=False, is_demo=False, content_origin="template_generated"
  - admin_note="session 80.7 template"
  - Similarity-Guard mit Jaccard > 0.55 → automatischer Ersatztext aus Fallback-Pool
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
    {"name": "Sabrina M.", "email": "demo.sabrina.m@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Bin mit vielen offenen Fragen reingegangen und mit einer klaren Sortierung wieder raus. Genau so hatte ich mir das vorgestellt."},

    {"name": "Rüdiger K.", "email": "demo.ruediger.k@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen", "persoenliche-betreuung"],
     "text": "Man spürt, dass hier zugehört wird, bevor Vorschläge kommen. Das ist bei meinem Thema Gold wert."},

    {"name": "Elke T.", "email": "demo.elke.t@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Alles gut vorbereitet, kein unnötiger Papierkram für mich. Läuft."},

    {"name": "Fabian O.", "email": "demo.fabian.o@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Mir gefällt, dass Kosten und Grenzen offen benannt werden. Zwei Punkte hätte ich mir noch etwas ausführlicher gewünscht — trotzdem in Summe stimmig."},

    {"name": "Konstantin B.", "email": "demo.konstantin.b@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"],
     "text": "Ich hatte über die Jahre einiges parallel laufen. Endlich mal jemand, der das komplett auf den Tisch legt und einordnet."},

    {"name": "Iris B.", "email": "demo.iris.b@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Kurze Rückfragen kriege ich meistens noch am selben Tag beantwortet. Für mich der entscheidende Punkt."},

    {"name": "Andreas W.", "email": "demo.andreas.w@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit", "vertrauen"],
     "text": "Wir arbeiten seit einer Weile zusammen und ich weiß, wen ich anrufe, wenn was ist. Das ist mir mehr wert als jede Broschüre."},

    {"name": "Lena F.", "email": "demo.lena.f@froehlich-templates.local", "rating": 4,
     "topics": ["beratung", "erreichbarkeit"],
     "text": "Ehrlich gesagt war ich beim ersten Termin skeptisch. Am Ende hat es gepasst und die Kommunikation läuft seitdem ruhig weiter."},

    {"name": "Georg P.", "email": "demo.georg.p@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Kein Standard-Skript. Es wird tatsächlich auf meine Situation geschaut."},

    {"name": "Marlene D.", "email": "demo.marlene.d@froehlich-templates.local", "rating": 5,
     "topics": ["kundenorientierung"],
     "text": "Ich mag den ruhigen Ton. Kein Drängen, keine Termine im Zwei-Wochen-Takt, wenn es gerade nichts zu klären gibt."},
]

# Fallback-Pool, falls ein Template zu ähnlich zu bestehenden Reviews ist.
FALLBACK_POOL = [
    "Für mich war wichtig, dass jemand die Zeit nimmt, die richtigen Fragen zu stellen. Genau das habe ich bekommen.",
    "Sachlich, ohne Drama, ohne Verkaufsdruck. Angenehmer Rahmen für so ein Thema.",
    "Ich brauche keine Show, sondern jemanden, der mit mir mitdenkt. Passt bei mir.",
    "Termine finden dann statt, wenn es wirklich etwas zu besprechen gibt. Für meinen Alltag ideal.",
    "Vorher hatte ich das Gefühl, überall nur Bausteine angeboten zu bekommen. Hier wurde erst das Bild sortiert.",
    "Ein Punkt, den ich schätze: Es wird auch gesagt, was gerade nicht sinnvoll ist. Nicht üblich in dem Bereich.",
    "Kurz, freundlich, klar in der Sache. So darf das gerne bleiben.",
    "Ich hätte nicht gedacht, dass so ein Gespräch entspannt sein kann. War aber so.",
    "Die Unterlagen kamen vorab, ich konnte in Ruhe drüber schauen. Genau so mag ich das.",
    "Nachfassen ohne zu nerven — das ist eine Kunst, die hier funktioniert.",
]


async def _pick_replacement_text(existing_tokens, used_texts):
    """Wähle einen Fallback-Text, der zu keinem existierenden Eintrag zu ähnlich ist."""
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
        # Similarity gegen alle anderen E-Mails (Idempotenz: gleiche E-Mail überspringen)
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
            print(f"  ! REPLACE {r['name']} — primär Text zu ähnlich (sim={max_sim:.2f}), suche Ersatz…")
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
        created_at = now - timedelta(days=(i + 1) * 2, hours=(i * 7) % 24)
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
            "admin_note": "session 80.7 template",
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

"""Session 80.14 — 10 zusätzliche Kundenstimmen-Templates.

Identisches Muster wie v3–v7 (Jaccard 0.55, Fallback-Pool, idempotent per E-Mail).
  - 10 neue Namen (Vorname + Initial)
  - 8× 5 Sterne, 2× 4 Sterne
  - is_verified=False, is_demo=False, content_origin="template_generated"
  - admin_note="session 80.14 template"
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


TEMPLATES = [
    {"name": "Peggy W.", "email": "demo.peggy.w@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Ordnung gebracht in einen Berg von Papier. Ich habe verschiedene Verträge über die Jahre gesammelt und wusste selbst nicht mehr, was wofür läuft. Nach dem Termin war der Überblick wieder da."},

    {"name": "Rolf N.", "email": "demo.rolf.n@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Vertrauen wächst mit den Jahren. Nach vier Jahren kann ich sagen: die Empfehlungen, die ich damals bekommen habe, waren tragfähig."},

    {"name": "Silke E.", "email": "demo.silke.e@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Freundlich, aber ohne Umschweife. Für mich der richtige Ton."},

    {"name": "Timo G.", "email": "demo.timo.g@froehlich-templates.local", "rating": 4,
     "topics": ["service"],
     "text": "Ich musste keine Formulare doppelt ausfüllen. Kleinigkeit, aber angenehm."},

    {"name": "Ursel A.", "email": "demo.ursel.a@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Kurze Wege. Bei einer Rückfrage kam abends noch eine Antwort — nicht selbstverständlich, aber sehr angenehm."},

    {"name": "Cornelia D.", "email": "demo.cornelia.d@froehlich-templates.local", "rating": 5,
     "topics": ["transparenz"],
     "text": "Keine versteckten Klauseln. Wenn ich nachhake, bekomme ich eine ehrliche Antwort — auch wenn sie manchmal nicht bequem ist."},

    {"name": "David F.", "email": "demo.david.f@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Erstberatung war schon ergiebig. Nach dem ersten Termin hatte ich einen Fahrplan im Kopf, ohne dass mir etwas verkauft wurde."},

    {"name": "Falk B.", "email": "demo.falk.b@froehlich-templates.local", "rating": 4,
     "topics": ["langfristigkeit"],
     "text": "Nicht immer der schnellste Weg — dafür belastbar. Ein paar Details hätte ich mir gerne kompakter gewünscht."},

    {"name": "Jasmin O.", "email": "demo.jasmin.o@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"],
     "text": "Meine drei Depots wurden nebeneinander gelegt und verglichen. So habe ich das erste Mal gesehen, wo ich doppelt aufgestellt war."},

    {"name": "Lars K.", "email": "demo.lars.k@froehlich-templates.local", "rating": 5,
     "topics": ["service", "vertrauen"],
     "text": "Zuverlässig ohne viel Aufhebens. Termine werden eingehalten, Fragen werden geklärt — mehr brauche ich nicht."},
]


FALLBACK_POOL = [
    "Ich habe mich ernst genommen gefühlt. Das ist bei dem Thema nicht selbstverständlich.",
    "Klare Sprache statt Fachvokabular. So kann ich das nachvollziehen.",
    "Was mich überzeugt hat: es wurde erst gefragt, dann vorgeschlagen.",
    "Vieles läuft im Hintergrund. Ich muss nicht ständig nachhaken.",
    "Für mich stimmt der Rahmen. Ruhig, sachlich, freundlich.",
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
        created_at = now - timedelta(days=(i + 1), hours=(i * 4) % 24)
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
            "admin_note": "session 80.14 template",
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

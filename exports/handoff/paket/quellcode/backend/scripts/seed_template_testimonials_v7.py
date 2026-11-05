"""Session 80.13 — 10 zusätzliche Kundenstimmen-Templates.

Identisches Muster wie v3–v6:
  - natürliches Deutsch, variierende Längen
  - Format „Heading. Body." — Frontend extrahiert die Headline automatisch
  - 10 neue Namen (Vorname + Initial), alle vorab gegen bestehende `display_name`s geprüft
  - 8× 5 Sterne, 2× 4 Sterne
  - is_verified=False, is_demo=False, content_origin="template_generated"
  - admin_note="session 80.13 template"
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


TEMPLATES = [
    {"name": "Achim T.", "email": "demo.achim.t@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Zwei Termine, ein klarer Plan. Ich hatte vorher das Gefühl, mich zwischen zu vielen Optionen entscheiden zu müssen — am Ende blieb ein Weg übrig, der zu mir passt."},

    {"name": "Christian V.", "email": "demo.christian.v@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Ehrlich beraten statt verkauft. Bei Themen, die ich nicht gebraucht hätte, wurde mir das offen gesagt — genau das erwarte ich."},

    {"name": "Ella S.", "email": "demo.ella.s@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Man merkt, dass zugehört wird. Meine Situation ist nicht Standard und trotzdem hatte ich nie den Eindruck, in eine Schublade gesteckt zu werden."},

    {"name": "Ferdinand K.", "email": "demo.ferdinand.k@froehlich-templates.local", "rating": 4,
     "topics": ["service"],
     "text": "Läuft im Hintergrund reibungslos. Ich muss selten nachhaken; das meiste passiert von allein und rechtzeitig."},

    {"name": "Gerlinde M.", "email": "demo.gerlinde.m@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Über die Jahre verlässlich. Was in einem Jahr besprochen wird, ist im nächsten nicht vergessen — das ist mir wichtig geworden."},

    {"name": "Heinz-Otto B.", "email": "demo.heinzotto.b@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Auch bei Kleinigkeiten erreichbar. Kurze Frage, kurze Antwort — und ich weiß, dass sie ankommt."},

    {"name": "Josef R.", "email": "demo.josef.r@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"],
     "text": "Endlich Ordnung im Portfolio. Ich hatte über Jahre einiges parallel aufgebaut; die Zusammenschau war für mich der eigentliche Mehrwert."},

    {"name": "Ludger D.", "email": "demo.ludger.d@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Nichts wird verklausuliert. Ich bin skeptisch, wenn Zahlen im Kleingedruckten verschwinden — hier war das nicht der Fall."},

    {"name": "Mia P.", "email": "demo.mia.p@froehlich-templates.local", "rating": 5,
     "topics": ["beratung", "vertrauen"],
     "text": "Ich habe Fragen gestellt, die mir eigentlich unangenehm waren. Wurden ruhig und ohne Wertung beantwortet."},

    {"name": "Otto L.", "email": "demo.otto.l@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen", "langfristigkeit"],
     "text": "Ohne großes Marketing, dafür verlässlich. Genau die Art Zusammenarbeit, die ich mir wünsche."},
]


FALLBACK_POOL = [
    "Ich schätze, dass ich nicht bedrängt wurde. Zeit für Entscheidungen ist mir wichtig.",
    "Klar formuliert, ohne Fachchinesisch. So kann ich mitgehen.",
    "Wenn ich etwas nicht verstanden hatte, wurde es noch einmal anders erklärt. Passt.",
    "Kein Gefühl von Verkauf. Eher ein Rahmen, in dem ich mich sortieren konnte.",
    "Für meinen Alltag stimmt die Ansprache. Ruhig, sachlich, freundlich.",
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
            "admin_note": "session 80.13 template",
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

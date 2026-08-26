"""Session 80.15 — 10 zusätzliche Kundenstimmen-Templates.

Identisches Muster wie v3–v8 (Jaccard 0.55, Fallback-Pool, idempotent per E-Mail).
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
    {"name": "Astrid H.", "email": "demo.astrid.h@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Endlich Klartext. Ich habe zum ersten Mal das Gefühl gehabt, dass mir jemand die Zusammenhänge in eigenen Worten erklärt — nicht in Broschürensprache."},

    {"name": "Björg L.", "email": "demo.bjoerg.l@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Nach zwei Meinungen zur dritten gekommen. Und die dritte war die, mit der ich am besten leben kann. Das sagt für mich viel."},

    {"name": "Corinna W.", "email": "demo.corinna.w@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Zugehört, mitgedacht, nachgehakt. Die Reihenfolge stimmt hier."},

    {"name": "Enrico P.", "email": "demo.enrico.p@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Abläufe sind eingespielt. Ich merke, dass hier nichts improvisiert wird — Termin, Vorbereitung, Nachfassen, alles rutscht ineinander."},

    {"name": "Frederik M.", "email": "demo.frederik.m@froehlich-templates.local", "rating": 4,
     "topics": ["erreichbarkeit"],
     "text": "Antworten meist am selben Tag. Nur einmal hat es länger gedauert, das wurde aber vorher angekündigt."},

    {"name": "Gudrun S.", "email": "demo.gudrun.s@froehlich-templates.local", "rating": 5,
     "topics": ["transparenz"],
     "text": "Klare Worte, auch zu Kosten. Mir wurde nichts schöngerechnet, und das nehme ich meinem Berater ab."},

    {"name": "Helmut O.", "email": "demo.helmut.o@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Seit sieben Jahren dabei. In dieser Zeit hat sich einiges verändert — die Ansprache ist gleich geblieben."},

    {"name": "Ilona T.", "email": "demo.ilona.t@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"],
     "text": "Meine Aufstellung war zerfahren. Nach der Sichtung wusste ich, wo doppelte Kosten liefen und wo nicht."},

    {"name": "Karsten E.", "email": "demo.karsten.e@froehlich-templates.local", "rating": 4,
     "topics": ["beratung"],
     "text": "Solide Einordnung. Ein Punkt hätte für mich noch etwas konkreter sein dürfen, sonst passt es."},

    {"name": "Verena K.", "email": "demo.verena.k@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen", "service"],
     "text": "Verbindlich in der Sache, warm im Ton. Für mich die Mischung, die ich in diesem Bereich lange gesucht habe."},
]


FALLBACK_POOL = [
    "Ich fühle mich hier weder gedrängt noch übersehen. Passt.",
    "Sachlich, aber freundlich. Kein Drama, kein Verkauf.",
    "Was ich mitnehme: Ruhe im Umgang mit ernsten Themen.",
    "Fragen, die ich schon lange stellen wollte, wurden ernst genommen.",
    "Klar, dass es Grenzen gibt — und die werden auch offen benannt.",
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
            "admin_note": "session 80.15 template",
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

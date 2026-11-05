"""Session 80.16 — 20 zusätzliche Kundenstimmen-Templates.

Identisches Muster wie v3–v9 (Jaccard 0.55, Fallback-Pool, idempotent per E-Mail).
16× 5⭐ + 4× 4⭐. Alle Themen gemischt, keine Renditeversprechen.
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
    {"name": "Adam T.", "email": "demo.adam.t@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Klar aufgezeigt, welche Wege es gibt. Am Ende habe ich mich für eine Variante entschieden, die vorher gar nicht auf meinem Zettel stand."},

    {"name": "Berta N.", "email": "demo.berta.n@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Nach dem ersten Treffen wusste ich, mit wem ich es zu tun habe. Nach dem dritten war ich sicher, dass ich bleibe."},

    {"name": "Bruno S.", "email": "demo.bruno.s@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Kein Papierstau. Die Unterlagen kamen fertig vorbereitet, ich musste nur unterschreiben und Fragen stellen."},

    {"name": "Denise R.", "email": "demo.denise.r@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Es wurde nach mir gefragt, nicht nach meinem Vermögen. Für mich ein wichtiger Unterschied."},

    {"name": "Edith W.", "email": "demo.edith.w@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Kurzfristige Terminverschiebung war kein Problem. Man merkt, dass hier mit menschlichem Maß gearbeitet wird."},

    {"name": "Egon K.", "email": "demo.egon.k@froehlich-templates.local", "rating": 4,
     "topics": ["transparenz"],
     "text": "Alle Kosten wurden aufgeschlüsselt. Ich hätte mir stellenweise noch eine kompaktere Übersicht gewünscht."},

    {"name": "Erika V.", "email": "demo.erika.v@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Fünf Jahre — und die Ansprechperson kennt inzwischen mehr als nur meine Vertragsnummern."},

    {"name": "Georgia L.", "email": "demo.georgia.l@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Ich habe mich das erste Mal mit dem Thema ernsthaft beschäftigt. Der Rahmen hat das leichter gemacht, als ich dachte."},

    {"name": "Heike F.", "email": "demo.heike.f@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Was mir gefällt: Auch unbequeme Antworten werden nicht ausgespart."},

    {"name": "Inge M.", "email": "demo.inge.m@froehlich-templates.local", "rating": 4,
     "topics": ["investmentuebersicht"],
     "text": "Der Überblick über meine bestehenden Anlagen war wertvoll. An einer Stelle hätte ich noch etwas mehr Details gebraucht."},

    {"name": "Isabella C.", "email": "demo.isabella.c@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"],
     "text": "Ich habe nicht das Gefühl, ein Fall von vielen zu sein. Das ist mir mehr wert, als ich vorher gedacht hätte."},

    {"name": "Jörg B.", "email": "demo.joerg.b@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Rundum organisiert. Nach dem Gespräch bekam ich eine Zusammenfassung, die genau das enthielt, was besprochen wurde."},

    {"name": "Judith P.", "email": "demo.judith.p@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"],
     "text": "Sanft gefragt, klar beantwortet. Ich musste nicht rätseln, was gemeint war."},

    {"name": "Kai D.", "email": "demo.kai.d@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"],
     "text": "Wenn ich nicht weiß, wen ich zu welchem Thema erreiche, bin ich raus. Hier weiß ich es — das reicht mir schon."},

    {"name": "Kurt H.", "email": "demo.kurt.h@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"],
     "text": "Über die Jahre kein Wechsel des Ansprechpartners. Für mich ein stiller Qualitätsindikator."},

    {"name": "Melanie A.", "email": "demo.melanie.a@froehlich-templates.local", "rating": 5,
     "topics": ["transparenz"],
     "text": "Kosten und Alternativen wurden nebeneinander gestellt. So konnte ich selbst entscheiden."},

    {"name": "Roland Z.", "email": "demo.roland.z@froehlich-templates.local", "rating": 4,
     "topics": ["beratung"],
     "text": "Fundiert und gut vorbereitet. Ein Punkt wurde für mich erst im zweiten Anlauf klar, sonst rund."},

    {"name": "Sandra E.", "email": "demo.sandra.e@froehlich-templates.local", "rating": 5,
     "topics": ["vertrauen"],
     "text": "Ich habe schon einiges an Beratung gesehen. Das hier hat einen anderen Ton — angenehmer, weniger Verkaufsdruck."},

    {"name": "Sonja T.", "email": "demo.sonja.t@froehlich-templates.local", "rating": 5,
     "topics": ["service"],
     "text": "Termine werden gehalten. Klingt banal, ist aber leider selten geworden."},

    {"name": "Winfried G.", "email": "demo.winfried.g@froehlich-templates.local", "rating": 4,
     "topics": ["investmentuebersicht"],
     "text": "Depotstruktur wurde einmal von oben angeschaut. Ich habe verstanden, was doppelt läuft und was noch fehlt."},
]


FALLBACK_POOL = [
    "Für meinen Alltag stimmt es einfach. Kein Aufwand, keine Überraschungen.",
    "Ehrlich, ruhig, verbindlich. Genau die Kombination, die ich brauche.",
    "Ich habe mich nicht mehr durch Kleingedrucktes kämpfen müssen.",
    "Meine Fragen wurden ernst genommen, auch die, die vielleicht naiv klangen.",
    "Klare Aussagen statt Andeutungen. Das schätze ich.",
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
            "admin_note": "session 80.16 template",
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

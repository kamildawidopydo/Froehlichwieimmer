"""Session 80.17 — 10 Kundenstimmen mit natürlicher Längen- und Sprachvielfalt.

Längenverteilung:
  - 20% sehr kurz (1–2 Sätze): 2 Reviews
  - 45% mittel (3–5 Sätze):    5 Reviews (wir wählen 4 mittel + 1 verschoben → 4-5)
  - 35% ausführlich (6–9 Sätze): 3 Reviews

Diverse Einstiege — bewusst NICHT „Ich habe…" / „Das Gespräch…":
  - „Vor dem ersten Termin…", „Nach unserem Gespräch…", „Wir kennen uns…",
    „Ein paar Tage später…", „Beim Termin selbst…", „Über die Jahre…" usw.

Weiterhin: is_verified=false, is_demo=false, content_origin="template_generated",
admin_note="session 80.17 template", Jaccard 0.55 Guard, idempotent per E-Mail.
"""

from __future__ import annotations
import asyncio, os, re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

STOPWORDS = {"der","die","das","ein","eine","und","oder","aber","ist","war","sind","waren",
    "ich","mir","mich","wir","uns","sie","er","es","dem","den","des","zum","zur",
    "im","in","an","auf","mit","bei","für","von","zu","auch","nicht","nur","sehr","dass",
    "als","wenn","weil","noch","schon","habe","hat","hatte","kann","wurde","wurden","würde",
    "dann","danach","gegen","über","viele","viel","mal","so","wie","was","daß","am","aus",
    "hier","dort","doch","selbst","dabei"}
SIMILARITY_THRESHOLD = 0.55

def _tokens(text): 
    return {w for w in re.findall(r"[a-zäöüß]+", (text or "").lower()) if len(w)>3 and w not in STOPWORDS}
def _jaccard(a,b): return 0.0 if not a or not b else len(a&b)/max(1,len(a|b))


# Längenmix: L=lang(6-9), M=mittel(3-5), S=kurz(1-2)
TEMPLATES = [
    # LANG (3× ≈ 30%)
    {"name": "Xaver M.", "email": "demo.xaver.m@froehlich-templates.local", "rating": 5,
     "topics": ["persoenliche-betreuung"], "length": "L",
     "text": "Vor dem ersten Termin war ich unsicher, wie viel ich überhaupt preisgeben will. Niemand hat mich gedrängt, ins Detail zu gehen. Wir sind zunächst bei den Grundlagen geblieben und haben Schritt für Schritt geschaut, was für meine Situation überhaupt sinnvoll ist. Ein paar Tage später ist mir noch ein Punkt eingefallen; auf eine kurze Nachricht kam noch am selben Tag eine klare Antwort. Beim zweiten Gespräch war das Thema dann schon vorbereitet. Was ich rückblickend am meisten schätze: die Ruhe im Umgang mit einem Thema, das mich vorher nervös gemacht hat. Zeit war nie knapp."},

    {"name": "Nele K.", "email": "demo.nele.k@froehlich-templates.local", "rating": 5,
     "topics": ["beratung", "transparenz"], "length": "L",
     "text": "Der erste Kontakt lief per E-Mail, und schon da hatte ich das Gefühl: hier wird gelesen, nicht überflogen. Beim Termin selbst wurden meine Fragen der Reihe nach durchgesprochen. Wo ich unsicher war, wurde ohne Umweg noch einmal anders erklärt. Vor- und Nachteile lagen offen auf dem Tisch — auch dort, wo die Nachteile eher unbequem waren. Am Ende habe ich mich für einen Weg entschieden, der nicht der bequemste war, aber der zu mir passt. Zwischen den beiden Terminen hatte ich noch Unterlagen geschickt. Beim zweiten Gespräch wurde direkt darauf eingegangen, sodass wir nicht wieder von vorne anfangen mussten. Für mich stimmt hier der Rahmen."},

    {"name": "Waldemar F.", "email": "demo.waldemar.f@froehlich-templates.local", "rating": 5,
     "topics": ["langfristigkeit"], "length": "L",
     "text": "Wir kennen uns inzwischen acht Jahre. In dieser Zeit haben sich mein Job, mein Wohnort und einige Rahmenbedingungen verändert — aber ich musste nie neu bei Null anfangen. Wenn ich anrufe, weiß mein Ansprechpartner, wovon ich rede. Zwischen zwei größeren Terminen liegen manchmal Monate, aber die Wiederaufnahme ist immer punktgenau. Manchmal kommt auch von der anderen Seite ein Hinweis, wenn etwas anliegen könnte. Genau darauf verlasse ich mich."},

    # MITTEL (5× = 50%, leicht über Zielrichtung, aber die Verteilung wirkt natürlicher)
    {"name": "Yvonne R.", "email": "demo.yvonne.r@froehlich-templates.local", "rating": 5,
     "topics": ["erreichbarkeit"], "length": "M",
     "text": "Nach unserem Gespräch hatte ich noch zwei Fragen und habe am nächsten Morgen geschrieben. Die Rückmeldung kam schnell und vor allem so, dass ich sie verstanden habe. Kein neuer Termin nötig, kein Rückruf-Pingpong. Das ist mir im Alltag mehr wert als vieles andere."},

    {"name": "Konrad D.", "email": "demo.konrad.d@froehlich-templates.local", "rating": 4,
     "topics": ["vertrauen"], "length": "M",
     "text": "Ehrlich gesagt war ich vorher skeptisch, weil ich zwei andere Beratungen im Rücken hatte, die mir nicht so gefallen haben. Der Ton hier war ein anderer, ruhiger. Nach dem ersten Termin habe ich nicht sofort unterschrieben — genau das war offenbar auch die Erwartung."},

    {"name": "Merle L.", "email": "demo.merle.l@froehlich-templates.local", "rating": 5,
     "topics": ["transparenz"], "length": "M",
     "text": "Wichtig war mir, dass Kosten und Grenzen offen benannt werden, bevor ich etwas unterschreibe. Genau das ist passiert. Zwei Punkte, die für mich weniger geeignet sind, wurden gleich am Anfang ausgesprochen. Das hat mir viel Zeit gespart, weil ich gar nicht erst in die Richtung nachdenken musste. Danach war der Rest der Beratung deutlich fokussierter."},

    {"name": "Steffen T.", "email": "demo.steffen.t@froehlich-templates.local", "rating": 5,
     "topics": ["beratung"], "length": "M",
     "text": "Vorher hatte ich das Bild eines klassischen Verkaufsgesprächs im Kopf. Stattdessen bekam ich eher eine Einordnung meiner Situation. Kein Baustein wurde erwähnt, bevor die Grundlage stand. Für mich der bessere Weg."},

    {"name": "Rosa V.", "email": "demo.rosa.v@froehlich-templates.local", "rating": 5,
     "topics": ["investmentuebersicht"], "length": "M",
     "text": "Über die Jahre hatte sich einiges parallel aufgebaut, ohne dass ich noch den Überblick behielt. Beim Termin wurden meine Positionen einmal zusammen aufgeschrieben. Doppelte Kosten und Lücken sind mir dabei aufgefallen, ohne dass ich vorher gewusst hätte, wonach ich suchen soll. Verändert habe ich nicht sofort etwas, aber ich weiß jetzt, wo ich stehe."},

    # KURZ (2× = 20%)
    {"name": "Gerald B.", "email": "demo.gerald.b@froehlich-templates.local", "rating": 5,
     "topics": ["service"], "length": "S",
     "text": "Läuft. Ohne viel Aufhebens."},

    {"name": "Selma P.", "email": "demo.selma.p@froehlich-templates.local", "rating": 4,
     "topics": ["service"], "length": "S",
     "text": "Ohne viel Aufhebens, dafür pünktlich."},
]

FALLBACK_POOL = [
    "Nach einer kurzen Rückfrage per Mail hatte ich noch am selben Tag eine Antwort. Nicht selbstverständlich.",
    "Ein Detail fiel mir erst zu Hause auf. Auf Nachfrage kam ohne Umschweife eine klare Einordnung zurück.",
    "Für meinen Alltag stimmt der Umgang. Ruhig, freundlich, verbindlich.",
]

async def _pick_replacement(existing_tokens, used):
    for cand in FALLBACK_POOL:
        if cand in used: continue
        t = _tokens(cand)
        if max((_jaccard(t, tok) for _,tok in existing_tokens), default=0.0) <= SIMILARITY_THRESHOLD:
            return cand
    return None

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]
    before = await db.reviews.count_documents({"status":"approved","is_demo":{"$ne":True}})
    print(f"BEFORE public_approved={before}")
    existing_tokens = []
    async for x in db.reviews.find({"status":"approved"}, {"text":1,"email":1}):
        existing_tokens.append((x.get("email"), _tokens(x.get("text",""))))
    now = datetime.now(timezone.utc)
    inserted=updated=replaced=0
    used_texts=set()
    final=[]
    for i,r in enumerate(TEMPLATES):
        text = r["text"]; toks = _tokens(text)
        max_sim = max((_jaccard(toks, tk) for e,tk in existing_tokens if e != r["email"]), default=0.0)
        if max_sim > SIMILARITY_THRESHOLD:
            print(f"  ! REPLACE {r['name']} sim={max_sim:.2f}")
            cand = await _pick_replacement(existing_tokens, used_texts)
            if cand: text, toks = cand, _tokens(cand); replaced+=1
            else: print(f"  ✗ SKIP {r['name']}"); continue
        used_texts.add(text)
        parts = r["name"].split(" ",1)
        first = parts[0]; last = parts[1] if len(parts)>1 else ""
        created_at = now - timedelta(days=i+1, hours=(i*5)%24)
        existing = await db.reviews.find_one({"email": r["email"]})
        doc = {
            "first_name": first, "last_name": last, "display_name": r["name"],
            "email": r["email"], "rating": r["rating"], "topics": r["topics"], "text": text,
            "status":"approved","is_demo":False,"is_verified":False,"invited":False,
            "admin_note":"session 80.17 template","admin_response": None,
            "moderated_at": created_at, "moderated_by":"system-seed-templates",
            "created_at": created_at, "is_featured": False,
            "content_origin":"template_generated","customer_since":"1_bis_3",
            "length_class": r["length"],
        }
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated+=1; action="UPDATED"
        else:
            await db.reviews.insert_one(doc); inserted+=1
            existing_tokens.append((r["email"], toks)); action="INSERTED"
        n_sent = len(re.findall(r"[.!?]", text))
        final.append((action, r["name"], r["rating"], r["length"], n_sent, r["topics"], text))
    after = await db.reviews.count_documents({"status":"approved","is_demo":{"$ne":True}})
    print(f"AFTER public_approved={after}  Inserted={inserted} Updated={updated} Replaced={replaced}")
    print("---- Records ----")
    for a,n,rating,lc,ns,tps,tx in final:
        stars="★"*rating+"☆"*(5-rating)
        print(f"[{a}] {n} {stars} ({lc}={ns} Sätze) topics={tps}")
        print(f"   \"{tx}\"")
    client.close()

if __name__=="__main__":
    asyncio.run(main())

"""Session 80.69 — Batch 3: weitere 25 Preview-Test-Bewertungen + individuelle Antworten.

Ergänzt Batch 1 (@preview-test.local) und Batch 2 (@preview-test-b2.local) um
weitere 25 einzigartige Reviews. Neuer Email-Suffix `@preview-test-b3.local`.

Neue Themen (bewusst NICHT die Ecken aus Batch 1+2):
Erstberatung ohne Verkaufsdruck · FAQ-Seite · Empfang · Renten­lücke · Sparplan-
Wechsel · Konten­struktur · Abgeltungs­steuer · ETF vs. Fonds · Markt­korrektur ·
Prospekt-Sprache · Steuer­bescheinigung · Newsletter · Report-Grafiken · Verzicht
auf Chatbot · Enkel-Sparen · Renten­bezug · Immobilie als Baustein · Depot fürs
Kind · Rebalancing · Umzug/Wechsel · Übersetzer · freiwillige Rückrufe · Kritik:
veraltete Kontaktdaten · Kritik: Öffnungs­zeiten · Kritik: fehlendes Foto.

Verteilung: 17×5★ · 6×4★ · 2×3★

Idempotent per Email. Keine bestehenden Reviews werden verändert oder gelöscht.
"""

from __future__ import annotations
import asyncio, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


PREVIEW_REVIEWS = [
    {
        "first_name": "Amira", "last_name": "Tabet", "email": "b3.amira.t@preview-test-b3.local",
        "display_name": "Amira T.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Vor dem Erstgespräch hatte ich mir vorgenommen, sofort zu erkennen, wenn mir etwas aufgedrängt wird. Es kam nichts. Statt eines Produkts wurde meine eigene Frage präzisiert.",
        "admin_response": "Präzisieren statt platzieren — das ist unsere Reihenfolge. Danke, dass Sie es genau so wahrgenommen haben.",
    },
    {
        "first_name": "Bastian", "last_name": "Ekert", "email": "b3.bastian.e@preview-test-b3.local",
        "display_name": "Bastian E.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Die FAQ-Seite hat mir vor dem Termin viele Basisfragen abgenommen. Ein oder zwei Antworten waren mir etwas zu allgemein — dafür war das Gespräch danach umso konkreter.",
        "admin_response": "FAQ soll den Termin entlasten, nicht ersetzen. Wo Sie die Antworten allgemein fanden, schärfen wir nach — der Punkt hilft.",
    },
    {
        "first_name": "Clemens", "last_name": "Ohlemann", "email": "b3.clemens.o@preview-test-b3.local",
        "display_name": "Clemens O.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["service"],
        "text": "Anruf am Empfang: freundlich, sachlich, kein Weiter­verbindungs-Karussell. Nach zwei Sätzen war klar, wer sich meldet.",
        "admin_response": "Der erste Kontakt entscheidet den ersten Eindruck. Freut uns, dass Empfang und Zuständigkeit für Sie zusammen funktioniert haben.",
    },
    {
        "first_name": "Dilara", "last_name": "Söylemez", "email": "b3.dilara.s@preview-test-b3.local",
        "display_name": "Dilara S.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Meine Renten­lücke wurde nicht mit einer Standard-Grafik erklärt, sondern mit meinen eigenen Zahlen — Netto heute, gewünschtes Netto später. Konkret wie ein Kontoauszug.",
        "admin_response": "Eine Renten­lücke, die nicht auf Ihren eigenen Zahlen aufsetzt, ist nur eine Werbe­grafik. Danke, dass Sie den Unterschied so klar benennen.",
    },
    {
        "first_name": "Emin", "last_name": "Kavak", "email": "b3.emin.k@preview-test-b3.local",
        "display_name": "Emin K.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Sparplan von Monatlich auf Zwei­monatlich umgestellt. Kleine Änderung, ohne Umwege durchgeführt — bestätigt per Mail.",
        "admin_response": "Änderungen im Sparplan sollten kein eigenes Projekt sein. Schön, dass es so unaufgeregt lief.",
    },
    {
        "first_name": "Frederik", "last_name": "Lohmar", "email": "b3.frederik.l@preview-test-b3.local",
        "display_name": "Frederik L.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Am Anfang war mir nicht klar, welches Konto wofür ist. Das Erklärungs­blatt war einmal notwendig, danach lief es. Ein Diagramm zur Konten­struktur würde vieles direkt sichtbar machen.",
        "admin_response": "Ein Konten-Diagramm ist ein guter Vorschlag — konkret, ohne den Termin aufzublähen. Wir setzen es auf die Standard-Unterlagen.",
    },
    {
        "first_name": "Gesine", "last_name": "Vater", "email": "b3.gesine.v@preview-test-b3.local",
        "display_name": "Gesine V.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["transparenz"],
        "text": "Abgeltungs­steuer und Frei­betrag wurden einmal sauber erklärt und blieben dann hängen. Kein Fach­chinesisch, aber auch nicht vereinfacht bis zur Ungenauigkeit.",
        "admin_response": "Zwischen Fach­sprache und Vereinfachung liegt die eigentliche Beratung. Danke, dass Sie den Punkt so treffend beschreiben.",
    },
    {
        "first_name": "Helga", "last_name": "Wienekamp", "email": "b3.helga.w@preview-test-b3.local",
        "display_name": "Helga W.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["beratung"],
        "text": "ETFs waren mir grundsätzlich fremd. Der Vergleich mit klassischen Fonds wurde ohne Werbe­einschlag geführt — Kosten, Handelbarkeit, was für mich passt und was nicht. Am Ende blieb kein diffuses Gefühl übrig.",
        "admin_response": "ETFs sind kein Selbst­zweck und kein Feind — nur ein weiterer Baustein. Schön, dass Sie am Ende Klarheit hatten statt Marketing.",
    },
    {
        "first_name": "Ingrid", "last_name": "Fritzsche", "email": "b3.ingrid.f@preview-test-b3.local",
        "display_name": "Ingrid F.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit", "beratung"],
        "text": "Während der letzten Markt­korrektur habe ich hier zuerst einen ruhigen Anruf bekommen, bevor ich selbst nervös wurde. Genau das sichert die Beziehung — nicht die Rendite in ruhigen Zeiten.",
        "admin_response": "Kontakt in Korrekturen ist kein Service-Feature, sondern Kern der Beratung. Danke, dass Sie es so einordnen.",
    },
    {
        "first_name": "Jakob", "last_name": "Rademann", "email": "b3.jakob.r@preview-test-b3.local",
        "display_name": "Jakob R.", "rating": 3,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Die Sprache im offiziellen Prospekt ist mir zu formal. Ich verstehe, dass das aufsichtlich so sein muss — aber ein zwei­seitiges Klartext-Beiblatt wäre eine echte Hilfe.",
        "admin_response": "Der Prospekt ist gesetzlich geformt, das Beiblatt aber nicht. Genau so ein zwei­seitiges Klartext-Papier arbeiten wir gerade aus — Ihr Hinweis passt in den Zeit­plan.",
    },
    {
        "first_name": "Kim", "last_name": "Pfaff", "email": "b3.kim.p@preview-test-b3.local",
        "display_name": "Kim P.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Steuer­bescheinigung kam automatisch per E-Mail, ohne dass ich fragen musste. Kleiner Punkt, aber jedes Jahr eine Erleichterung.",
        "admin_response": "Steuer­unterlagen dürfen Sie nicht erinnern müssen. Freut uns, dass es reibungslos lief.",
    },
    {
        "first_name": "Larissa", "last_name": "Melchers", "email": "b3.larissa.m@preview-test-b3.local",
        "display_name": "Larissa M.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Der Newsletter ist selten, aber jedes Mal mit Substanz. Ich lese ihn wirklich — im Gegensatz zu zehn anderen, die ich abbestellt habe.",
        "admin_response": "Selten und substanziell schlagen häufig und beliebig. Danke, dass Sie den Newsletter tatsächlich lesen — genau dafür entsteht er.",
    },
    {
        "first_name": "Marek", "last_name": "Dombrowski", "email": "b3.marek.d@preview-test-b3.local",
        "display_name": "Marek D.", "rating": 4,
        "customer_since": "3_bis_5", "topics": ["transparenz"],
        "text": "Die Grafiken im Report sind sauber, aber teilweise ohne Skalen­beschriftung. Für die geübten Leser reicht das, für alle anderen ist es hakelig.",
        "admin_response": "Ein Diagramm ohne Skala ist eine halbe Aussage. Wir gehen die Report-Vorlagen durch und ergänzen die fehlenden Achsen­beschriftungen konsequent.",
    },
    {
        "first_name": "Nora", "last_name": "Hilgemann", "email": "b3.nora.h@preview-test-b3.local",
        "display_name": "Nora H.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Ich mag, dass Sie sich einen Chatbot sparen. Der bringt bei komplexen Finanz­fragen ohnehin nichts. Ein Mensch am Telefon war schneller.",
        "admin_response": "Ein Chatbot kann Formulare ausfüllen — Beratung nicht. Freut uns, dass unser Verzicht hier als Qualität durchgeht.",
    },
    {
        "first_name": "Olga", "last_name": "Kilian", "email": "b3.olga.k@preview-test-b3.local",
        "display_name": "Olga K.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["beratung"],
        "text": "Ein Sparplan für die Enkel — ich wusste nicht, wo ich anfangen soll. Beim Termin war das nach vierzig Minuten sortiert. Meine Fragen zur Schenkungs­freigrenze wurden nebenbei mit­beantwortet.",
        "admin_response": "Enkel-Spar­pläne sind gefühlt einfach und juristisch oft nicht. Schön, dass sich die Zeit für den Rahmen gelohnt hat.",
    },
    {
        "first_name": "Pauline", "last_name": "Wibbelt", "email": "b3.pauline.w@preview-test-b3.local",
        "display_name": "Pauline W.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit", "vertrauen"],
        "text": "Renten­bezug beantragt, alles vor­bereitet, keine Rück­fragen an mich. Nach so vielen Jahren erwarte ich fast nichts anderes — hier bekomme ich es aber trotzdem verlässlich.",
        "admin_response": "Renten­bezug ist ein Übergang, kein Vorgang. Danke für die lange Weg­strecke, die wir gemeinsam gehen dürfen.",
    },
    {
        "first_name": "Rainer", "last_name": "Bosbach", "email": "b3.rainer.b@preview-test-b3.local",
        "display_name": "Rainer B.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Eine Immobilie als Vorsorge­baustein — ich hatte nicht erwartet, dass darüber neutral gesprochen wird. Weder Werbung noch Ablehnung, sondern eine Rechnung. Am Ende: Ja, aber anders als gedacht.",
        "admin_response": "Immobilien sind weder Heilsbringer noch Feindbild. Freut uns, dass die Rechnung Ihre Entscheidung getragen hat.",
    },
    {
        "first_name": "Simone", "last_name": "Kunath", "email": "b3.simone.k@preview-test-b3.local",
        "display_name": "Simone K.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Depot für die Tochter — mit klaren Grenzen, was mit 18 möglich ist und was nicht. Kein Verklären, kein Verharmlosen. Genau das habe ich gesucht.",
        "admin_response": "Ein Kinder­depot ohne den Blick auf den Volljährigkeits­tag ist unvollständig. Danke, dass Sie diesen Punkt so wichtig genommen haben.",
    },
    {
        "first_name": "Torsten", "last_name": "Grohmann", "email": "b3.torsten.g@preview-test-b3.local",
        "display_name": "Torsten G.", "rating": 4,
        "customer_since": "3_bis_5", "topics": ["service"],
        "text": "Halbjährliches Rebalancing findet statt. Der Vorgang selbst ist sauber, aber die Ankündigungs­mail könnte etwas früher kommen. So bleibt zwischen Mail und Umsetzung wenig Zeit für Nachfragen.",
        "admin_response": "Wenn die Mail zu spät kommt, ist der Puffer für Rückfragen weg — genau das darf nicht passieren. Wir ziehen die Vorlauf­frist nach vorne.",
    },
    {
        "first_name": "Ute", "last_name": "Ramsauer", "email": "b3.ute.r@preview-test-b3.local",
        "display_name": "Ute R.", "rating": 3,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Nach meinem Umzug musste ich zweimal darauf hinweisen, dass die neuen Kontakt­daten noch nicht überall greifen. Die Beratung bleibt gut, aber der interne Daten­fluss hat gehakt.",
        "admin_response": "Ein Umzug darf nicht zweimal angesprochen werden müssen. Wir sehen uns an, wo der Daten­satz stehen bleibt — das ist ein interner Prozess und kein Kunden­thema.",
    },
    {
        "first_name": "Vera", "last_name": "Muth", "email": "b3.vera.m@preview-test-b3.local",
        "display_name": "Vera M.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Ich habe meine Mutter zum Termin mitgenommen — sie spricht wenig Deutsch. Es wurde offen angeboten, die Wichtiges­ten Punkte auf Türkisch nochmal zusammenzufassen. Diese Selbst­verständlichkeit habe ich selten erlebt.",
        "admin_response": "Sprach­rücksicht ist kein Zusatz­angebot, sondern Teil eines respektvollen Termins. Danke, dass Sie und Ihre Mutter uns diesen Weg zugetraut haben.",
    },
    {
        "first_name": "Werner", "last_name": "Kienzler", "email": "b3.werner.k@preview-test-b3.local",
        "display_name": "Werner K.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["service"],
        "text": "Ein freiwilliger Rückruf ohne Anlass, nur zur Nachfrage, wie es mit meiner umgesetzten Empfehlung läuft. Nicht viele machen so etwas.",
        "admin_response": "Ein Rückruf ohne Verkaufs­absicht ist die einfachste Art, Beziehung zu zeigen. Schön, dass Sie es wahrgenommen haben.",
    },
    {
        "first_name": "Yvonne", "last_name": "Franz", "email": "b3.yvonne.f@preview-test-b3.local",
        "display_name": "Yvonne F.", "rating": 4,
        "customer_since": "3_bis_5", "topics": ["service"],
        "text": "Auf der Kontakt­seite steht keine Info zu Feiertags­öffnungs­zeiten. Musste kurz anrufen, um zu klären, ob eine Rückmeldung noch drin ist. Ansonsten alles bestens.",
        "admin_response": "Öffnungs­zeiten an Feiertagen gehören auf die Kontakt­seite — kleiner Punkt, große Wirkung. Kommt in die Über­arbeitung.",
    },
    {
        "first_name": "Zeynep", "last_name": "Cakir", "email": "b3.zeynep.c@preview-test-b3.local",
        "display_name": "Zeynep C.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["persoenliche-betreuung"],
        "text": "Mein Ansprech­partner nennt sich beim Namen, wenn er anruft — kein „Ihr Berater“. Klingt banal, macht aber viel.",
        "admin_response": "Ein Anruf beginnt mit einem Namen, nicht mit einer Rolle. Danke, dass Sie diesen kleinen Unter­schied so wertschätzen.",
    },
    {
        "first_name": "Reto", "last_name": "Sülzberger", "email": "b3.reto.s@preview-test-b3.local",
        "display_name": "Reto S.", "rating": 4,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Auf der Beraterseite fehlt ein Foto. Für mich als Neukunde macht ein Gesicht vor dem ersten Termin einen Unterschied — ich fand die Zusammen­arbeit ansonsten sehr angenehm.",
        "admin_response": "Ein Foto vor dem ersten Termin nimmt Unsicher­heit. Der Punkt ist einfach adressierbar — wir hängen die Profile in den Standard-Willkommens­ablauf.",
    },
]


async def main() -> None:
    assert len(PREVIEW_REVIEWS) == 25, f"expected 25, got {len(PREVIEW_REVIEWS)}"
    names = [r["display_name"] for r in PREVIEW_REVIEWS]
    dupes = [n for n in names if names.count(n) > 1]
    assert not dupes, f"duplicate names within batch: {dupes}"

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]

    before_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    before_names = {d.get("display_name", "") for d in await db.reviews.find(
        {"status": "approved", "is_demo": {"$ne": True}}, {"display_name": 1}
    ).to_list(2000)}
    name_collisions = [n for n in names if n in before_names]
    if name_collisions:
        print(f"  ⚠ display_name collisions with existing (still inserting): {name_collisions}")

    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0

    for i, r in enumerate(PREVIEW_REVIEWS):
        created_at = now - timedelta(days=(i * 5 + 4), hours=(i * 17) % 24, minutes=(i * 23) % 60)
        responded_at = created_at + timedelta(days=1, hours=(i * 6) % 12)

        doc = {
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "email": r["email"],
            "display_name": r["display_name"],
            "rating": r["rating"],
            "text": r["text"],
            "customer_since": r["customer_since"],
            "topics": r["topics"],
            "status": "approved",
            "is_demo": False,
            "is_verified": False,
            "is_featured": False,
            "invited": False,
            "admin_note": "preview test batch 3 — do NOT deploy to prod",
            "admin_response": r["admin_response"],
            "responded_at": responded_at,
            "responded_by": "system-preview-seed-b3",
            "content_origin": "preview_test_v3",
            "moderated_at": created_at,
            "moderated_by": "system-preview-seed-b3",
            "created_at": created_at,
        }

        existing = await db.reviews.find_one({"email": r["email"]})
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
            mark = "(updated)"
        else:
            await db.reviews.insert_one(doc)
            inserted += 1
            mark = "(inserted)"
        print(f"  ✓ {r['display_name']:16s} — {r['rating']}★  {mark}")

    b3_docs = await db.reviews.find({"email": {"$regex": "@preview-test-b3\\.local$"}}).to_list(50)
    b3_texts = [d["text"] for d in b3_docs]
    b3_responses = [d["admin_response"] for d in b3_docs]

    others = await db.reviews.find(
        {"email": {"$not": {"$regex": "@preview-test-b3\\.local$"}}}, {"text": 1, "admin_response": 1}
    ).to_list(2000)
    other_texts = {d.get("text") for d in others if d.get("text")}
    other_responses = {d.get("admin_response") for d in others if d.get("admin_response")}
    text_cross = set(b3_texts) & other_texts
    resp_cross = set(b3_responses) & other_responses

    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})

    stars = {}
    for d in b3_docs:
        stars[d["rating"]] = stars.get(d["rating"], 0) + 1

    print("")
    print("  ===== REPORT =====")
    print(f"  Before (approved public):   {before_public}")
    print(f"  Inserted:                   {inserted}")
    print(f"  Updated:                    {updated}")
    print(f"  After (approved public):    {after_public}   (delta = +{after_public - before_public})")
    print(f"  Batch-3 rows in DB:         {len(b3_docs)}")
    print(f"  Batch-3 unique texts:       {len(set(b3_texts))}/25")
    print(f"  Batch-3 unique responses:   {len(set(b3_responses))}/25")
    print(f"  Text collisions vs DB:      {len(text_cross)}")
    print(f"  Response collisions vs DB:  {len(resp_cross)}")
    print(f"  Rating distribution:        {dict(sorted(stars.items()))}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

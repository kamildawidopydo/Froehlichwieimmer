"""Session 80.68 — Batch 2: weitere 25 Preview-Test-Bewertungen + individuelle Antworten.

Ergänzt Batch 1 (`seed_preview_reviews_25.py`, Email-Suffix @preview-test.local)
um weitere 25 einzigartige Reviews. Neuer Email-Suffix `@preview-test-b2.local`
zur eindeutigen Batch-Zuordnung.

Neue Themen (bewusst NICHT dieselben Ecken wie Batch 1):
Zinsvergleich · Prospekt-Erklärung · Depot-Übergabe · Telefon-Termin · Video-
Beratung · Portal-App · Renten­vorsorge · Bausparen-Alternative · Freibetrag/
Steuer · Fremdwährung · Risiko-Erklärung · Reporting · Feiertag-Erreichbarkeit ·
Vollmacht/Legitimation · Ehepaar-Beratung · Notgroschen · Umschichtung ·
Rendite-Realismus · PDF-Download-Kritik · Login-Reset-Kritik · Kalender-Kritik ·
Wechsel von Direktbank · Fremdsprache · Erste-Termine · Sperr­fristen.

Verteilung Sterne:
  16 × 5★, 7 × 4★, 2 × 3★-konstruktiv

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
        "first_name": "Almut", "last_name": "Grosche", "email": "b2.almut.g@preview-test-b2.local",
        "display_name": "Almut G.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Erst dachte ich, ich müsste vor dem Termin selbst schon zehn Angebote sortiert haben. Stattdessen wurde die Vorauswahl gemeinsam getroffen — mit einer klaren Begründung, warum manche Optionen für meine Situation wegfallen. Danach war die Entscheidung erstaunlich leicht.",
        "admin_response": "Genau diese Vorauswahl gemeinsam zu treffen, spart am Ende Zeit und Fehlversuche. Danke, dass Sie es hier explizit machen.",
    },
    {
        "first_name": "Benno", "last_name": "Riemer", "email": "b2.benno.r@preview-test-b2.local",
        "display_name": "Benno R.", "rating": 4,
        "customer_since": "unter_1", "topics": ["service"],
        "text": "Rückruf hat einen Tag länger gedauert als angekündigt. Als er dann kam, war er dafür gut vorbereitet — inklusive Notizen aus der Mail, die ich vorher geschrieben hatte. Insgesamt in Ordnung.",
        "admin_response": "Die verlängerte Wartezeit ist ein fairer Punkt — Zusagen zu Rückruf­fenstern sollten wir enger halten. Schön, dass das Gespräch selbst dann inhaltlich für Sie gepasst hat.",
    },
    {
        "first_name": "Cordula", "last_name": "Kremer", "email": "b2.cordula.k@preview-test-b2.local",
        "display_name": "Cordula K.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["transparenz"],
        "text": "Was mir gefallen hat: Der Prospekt wurde nicht wortwörtlich vorgelesen, sondern in eigenen Worten übersetzt. Kritische Absätze wurden ausdrücklich markiert. So sollte das eigentlich immer laufen.",
        "admin_response": "Ein Prospekt ersetzt keine Erklärung — er ergänzt sie. Freut uns, dass die Übersetzung in Alltagssprache bei Ihnen ankommt.",
    },
    {
        "first_name": "Detlef", "last_name": "Wienert", "email": "b2.detlef.w@preview-test-b2.local",
        "display_name": "Detlef W.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit"],
        "text": "Nach dem Wechsel meines alten Depots habe ich eigentlich nicht mit einer sanften Übergabe gerechnet. Es lief aber ohne Reibung — inklusive Umbuchung der laufenden Sparpläne. Kein Datenverlust, keine Rückfragen von der abgebenden Bank, die bei mir landeten.",
        "admin_response": "Genau daran messen wir Übergaben: dass sie in Ihrem Alltag nicht auftauchen. Danke, dass Sie das ausdrücklich erwähnen.",
    },
    {
        "first_name": "Elias", "last_name": "Joost", "email": "b2.elias.j@preview-test-b2.local",
        "display_name": "Elias J.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Telefonisch beraten zu werden fühlt sich bei manchen Anbietern nach Callcenter an. Hier war es umgekehrt — mein Anliegen war offenbar vorher schon einmal in Ruhe gelesen worden. Das merkt man in den ersten drei Sätzen.",
        "admin_response": "Vorbereitung ist die halbe Miete am Telefon. Schön, dass Sie den Unterschied direkt zu Beginn gemerkt haben.",
    },
    {
        "first_name": "Fabian", "last_name": "Michalski", "email": "b2.fabian.m@preview-test-b2.local",
        "display_name": "Fabian M.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Video-Termin lief technisch sauber. Nur die Freigabe des Bildschirms hat beim ersten Anlauf gehakt, das war Windows-Update-bedingt bei mir. Danach flüssig. Inhaltlich sehr strukturiert.",
        "admin_response": "Solche Hürden sind selten planbar, aber bei Video-Terminen bauen wir künftig eine kurze Test-Runde vor der Beratung ein — Ihr Hinweis passt dazu.",
    },
    {
        "first_name": "Fenja", "last_name": "Torgau", "email": "b2.fenja.t@preview-test-b2.local",
        "display_name": "Fenja T.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Das Kunden­portal ist unaufdringlich — man findet, was man sucht, und wird nicht mit Bannern beworben. Für ein Finanz­tool ist das eine kleine Wohltat.",
        "admin_response": "Weniger ist im Portal fast immer mehr. Danke, dass Sie den Verzicht auf Werbung als Qualität wahrnehmen — genau so ist es gedacht.",
    },
    {
        "first_name": "Greta", "last_name": "Roßmann", "email": "b2.greta.r@preview-test-b2.local",
        "display_name": "Greta R.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["beratung"],
        "text": "Zum Thema Alters­vorsorge hatte ich lange den Kopf in den Sand gesteckt. Der Einstieg hier war ohne Druck. Kein „jetzt muss aber“, sondern erst einmal Bestandsaufnahme.",
        "admin_response": "Das Thema Alters­vorsorge trägt Ruhe besser als Eile. Freut uns, dass der Einstieg bei Ihnen so möglich war.",
    },
    {
        "first_name": "Hendrik", "last_name": "Salge", "email": "b2.hendrik.s@preview-test-b2.local",
        "display_name": "Hendrik S.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["transparenz", "beratung"],
        "text": "Bausparen war für mich lange die vermeintliche Standard­lösung. Hier wurde ohne Ideologie gegen­gerechnet, was heute realistisch ist und was nicht. Am Ende blieb ein Weg, den ich vorher nicht auf dem Schirm hatte.",
        "admin_response": "Ideologie hat in einer Rechnung nichts zu suchen — nur Annahmen und deren Folgen. Danke, dass Sie das so klar formulieren.",
    },
    {
        "first_name": "Ilona", "last_name": "Prokosch", "email": "b2.ilona.p@preview-test-b2.local",
        "display_name": "Ilona P.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Der Freistellungs­auftrag wurde beim ersten Termin nur kurz erwähnt. Im Nachgang hätte ich mir eine Erinnerung gewünscht, dass ich das noch selbst verteilen muss. Nach kurzem Anruf war das dann geklärt.",
        "admin_response": "Der Punkt gehört ins Nach­gespräch — nicht nur beiläufig in den ersten Termin. Wir nehmen ihn in unser Standard-Follow-up mit auf, danke.",
    },
    {
        "first_name": "Ismail", "last_name": "Kaya", "email": "b2.ismail.k@preview-test-b2.local",
        "display_name": "Ismail K.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung", "vertrauen"],
        "text": "Deutsch ist für mich Zweitsprache. Es wurde nicht schneller gesprochen als nötig, aber auch nicht künstlich langsam. Wenn ein Begriff hakte, wurde er einfach kurz erklärt — ohne Umweg.",
        "admin_response": "Sprache soll nie zwischen einer Empfehlung und Ihrer Entscheidung stehen. Schön, dass diese Balance für Sie stimmte.",
    },
    {
        "first_name": "Jasmin", "last_name": "Wallmann", "email": "b2.jasmin.w@preview-test-b2.local",
        "display_name": "Jasmin W.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Risiken wurden nicht in einem Nebensatz abgehandelt, sondern bewusst mit eigenen Beispielen unterlegt. Für mich als vorsichtige Anlegerin genau die richtige Reihenfolge — Chancen kamen erst danach.",
        "admin_response": "Chancen zuerst zu nennen ist bequem, aber selten fair. Ihre Reihenfolge ist auch unsere — danke fürs Bestätigen.",
    },
    {
        "first_name": "Joris", "last_name": "Lönnecke", "email": "b2.joris.l@preview-test-b2.local",
        "display_name": "Joris L.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["transparenz"],
        "text": "Die Quartals­berichte enthalten neben den Zahlen auch einen kurzen Kommentar. Der ist knapp, aber nie floskelhaft. Genau das habe ich vorher nirgends bekommen.",
        "admin_response": "Ein Bericht ohne Einordnung ist eine verpasste Chance. Es freut uns, dass unser Kurz­kommentar für Sie funktioniert.",
    },
    {
        "first_name": "Karla", "last_name": "Frobenius", "email": "b2.karla.f@preview-test-b2.local",
        "display_name": "Karla F.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["erreichbarkeit"],
        "text": "Zwischen den Feiertagen hatte ich angerufen und wenig erwartet. Die Vertretung war da und wusste, wo mein Vorgang steht. Kein Kaltstart nötig.",
        "admin_response": "Vertretung darf keine Lücke sein. Danke, dass Sie den Übergabe­stand gespürt haben — genau so soll er wirken.",
    },
    {
        "first_name": "Levin", "last_name": "Boysen", "email": "b2.levin.b@preview-test-b2.local",
        "display_name": "Levin B.", "rating": 5,
        "customer_since": "unter_1", "topics": ["service"],
        "text": "Legitimation über Postident kannte ich, hier lief es alternativ digital. War in unter fünf Minuten durch. Für den restlichen Prozess ein großer Zeit­gewinn.",
        "admin_response": "Digitale Legitimation entlastet den ersten Kontakt spürbar — schön, dass es bei Ihnen so schnell durchgelaufen ist.",
    },
    {
        "first_name": "Malte", "last_name": "Klahn", "email": "b2.malte.k@preview-test-b2.local",
        "display_name": "Malte K.", "rating": 4,
        "customer_since": "3_bis_5", "topics": ["service"],
        "text": "Ich habe für meine Frau eine Voll­macht hinterlegt. Der Ablauf war korrekt, aber die Wege dafür sind heute noch sehr formal. Da ist zwischen den Zeilen viel „Bank von damals“ spürbar.",
        "admin_response": "Voll­machts­prozesse sind aufsichtlich stärker geregelt als andere Bereiche — das erklärt den Formalismus, macht ihn aber nicht angenehmer. Wir schauen, wo Zwischen­schritte digital möglich sind.",
    },
    {
        "first_name": "Miriam", "last_name": "Zöllner", "email": "b2.miriam.z@preview-test-b2.local",
        "display_name": "Miriam Z.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["beratung", "langfristigkeit"],
        "text": "Wir haben als Paar beraten lassen. Beide Perspektiven wurden ernst genommen, auch wenn wir bei einem Punkt unterschiedlicher Meinung waren. Am Ende gab es keinen Kompromiss aus Bequemlichkeit, sondern eine Lösung mit klarer Begründung.",
        "admin_response": "Paare mit unterschiedlichen Sichtweisen sind für uns keine Ausnahme, sondern der Regelfall. Danke, dass Sie beide diesen Weg mitgegangen sind.",
    },
    {
        "first_name": "Nils", "last_name": "Hettinger", "email": "b2.nils.h@preview-test-b2.local",
        "display_name": "Nils H.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Beim Thema Notgroschen wurde nicht wie üblich pauschal ein Betrag genannt, sondern anhand meiner monatlichen Fixkosten hergeleitet. Kleiner Unterschied, große Wirkung.",
        "admin_response": "Ein Notgroschen ohne Bezug zu Fixkosten ist eine Zahl aus dem Nebel. Freut uns, dass die Rechnung für Sie greifbar wurde.",
    },
    {
        "first_name": "Oskar", "last_name": "Diefenbach", "email": "b2.oskar.d@preview-test-b2.local",
        "display_name": "Oskar D.", "rating": 3,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Die Beratung war fachlich gut, aber der PDF-Download der Anlage-Zusammen­fassung hat bei mir wieder­holt geklemmt. Auf dem Handy funktioniert es, am Laptop nicht — das wirkt inkonsistent.",
        "admin_response": "Der Punkt ist konkret genug, dass wir ihn reproduzieren können. Wir sehen uns die Datei­auslieferung im Portal an — Ihre Beobachtung Handy vs. Laptop ist der richtige Ansatz­punkt.",
    },
    {
        "first_name": "Petra", "last_name": "Ludenbach", "email": "b2.petra.l@preview-test-b2.local",
        "display_name": "Petra L.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["beratung"],
        "text": "Nach einer kleinen Umschichtung habe ich eine schriftliche Nachbereitung bekommen. Ein Absatz erklärte, warum die Änderung sinnvoll war — und ein Absatz nannte, was sie nicht leisten kann. Beides fand ich fair.",
        "admin_response": "Was eine Empfehlung nicht kann, gehört genauso in die Zusammen­fassung wie das, was sie tut. Danke, dass Sie es so lesen.",
    },
    {
        "first_name": "Ruben", "last_name": "Malinowski", "email": "b2.ruben.m@preview-test-b2.local",
        "display_name": "Ruben M.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Zwei­stellige Rendite­versprechen gab es nicht — dafür realistische Bandbreiten. Erwartungs­management ist selten geworden, umso wichtiger.",
        "admin_response": "Realistische Bandbreiten sind unsere Grundlage — auch dann, wenn eine höhere Zahl kurzfristig überzeugender klingen würde.",
    },
    {
        "first_name": "Silke", "last_name": "Otterbein", "email": "b2.silke.o@preview-test-b2.local",
        "display_name": "Silke O.", "rating": 4,
        "customer_since": "unter_1", "topics": ["service"],
        "text": "Terminvorschläge kamen mit engen Zeit­fenstern. Für Berufstätige mit unregelmäßigen Diensten war das schwierig. Am Ende hat ein Termin auf Abendbasis geklappt.",
        "admin_response": "Enge Zeit­fenster sind gerade bei unregel­mäßigen Diensten ein Ausschluss­kriterium — Ihr Punkt kommt in unsere Terminlogik zurück.",
    },
    {
        "first_name": "Tim", "last_name": "Hübbers", "email": "b2.tim.h@preview-test-b2.local",
        "display_name": "Tim H.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung", "vertrauen"],
        "text": "Von einer Direktbank umgestiegen. Vorher hatte ich das Gefühl, immer selbst der Fachmann sein zu müssen. Jetzt darf ich Kunde sein.",
        "admin_response": "Ein guter Satz. Wir freuen uns, dass Sie die Rolle in Ihrer Anlage nicht mehr allein tragen müssen.",
    },
    {
        "first_name": "Wiebke", "last_name": "Ahnfeldt", "email": "b2.wiebke.a@preview-test-b2.local",
        "display_name": "Wiebke A.", "rating": 3,
        "customer_since": "unter_1", "topics": ["service"],
        "text": "Passwort­reset im Portal war umständlicher als ich erwartet habe — mehrere Schritte, zwei Codes, ein weiterer Anruf. Anschließend lief alles, aber der Weg dahin sollte einfacher werden.",
        "admin_response": "Ein Passwort­reset darf nicht zum eigenen Vorgang werden. Aufsichtlich sind manche Prüf­schritte gesetzt — die Reihen­folge und die Text­hilfen dazwischen sind es aber nicht. Der Punkt geht direkt an unser Portal-Team.",
    },
    {
        "first_name": "Zora", "last_name": "Baumhauer", "email": "b2.zora.b@preview-test-b2.local",
        "display_name": "Zora B.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["persoenliche-betreuung"],
        "text": "Eine Sperr­frist auf einer bestehenden Anlage habe ich vorher gar nicht auf dem Schirm gehabt. Beim Erstgespräch wurde sie proaktiv angesprochen. Das rettete mich vor einer Umschichtung, die teuer gewesen wäre.",
        "admin_response": "Proaktive Hinweise sind uns wichtiger als vollständige Abschluss­quoten. Schön, dass es hier den Unterschied gemacht hat.",
    },
]


async def main() -> None:
    assert len(PREVIEW_REVIEWS) == 25, f"expected 25, got {len(PREVIEW_REVIEWS)}"

    # Verify no name collisions inside this batch
    names = [r["display_name"] for r in PREVIEW_REVIEWS]
    assert len(set(names)) == 25, f"duplicate names within batch: {[n for n in names if names.count(n) > 1]}"

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]

    # Before-count for reporting
    before_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    before_names = {d.get("display_name", "") for d in await db.reviews.find(
        {"status": "approved", "is_demo": {"$ne": True}}, {"display_name": 1}
    ).to_list(2000)}

    # Warn (do not block) if a name would collide with an existing display_name
    collisions = [n for n in names if n in before_names]
    if collisions:
        print(f"  ⚠ display_name collisions with existing (still inserting new docs): {collisions}")

    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0

    for i, r in enumerate(PREVIEW_REVIEWS):
        # Distribute across last ~100 days, staggered
        created_at = now - timedelta(days=(i * 4 + 1), hours=(i * 13) % 24, minutes=(i * 19) % 60)
        responded_at = created_at + timedelta(days=1, hours=(i * 7) % 12)

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
            "admin_note": "preview test batch 2 — do NOT deploy to prod",
            "admin_response": r["admin_response"],
            "responded_at": responded_at,
            "responded_by": "system-preview-seed-b2",
            "content_origin": "preview_test_v2",
            "moderated_at": created_at,
            "moderated_by": "system-preview-seed-b2",
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

    # Duplicate/QA checks
    b2_docs = await db.reviews.find({"email": {"$regex": "@preview-test-b2\\.local$"}}).to_list(50)
    b2_texts = [d["text"] for d in b2_docs]
    b2_responses = [d["admin_response"] for d in b2_docs]

    # Cross-check texts vs. everything else in DB
    others = await db.reviews.find(
        {"email": {"$not": {"$regex": "@preview-test-b2\\.local$"}}}, {"text": 1}
    ).to_list(2000)
    other_texts = {d["text"] for d in others}
    text_cross = set(b2_texts) & other_texts

    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})

    stars = {}
    for d in b2_docs:
        stars[d["rating"]] = stars.get(d["rating"], 0) + 1

    print("")
    print("  ===== REPORT =====")
    print(f"  Before (approved public):   {before_public}")
    print(f"  Inserted:                   {inserted}")
    print(f"  Updated:                    {updated}")
    print(f"  After (approved public):    {after_public}   (delta = +{after_public - before_public})")
    print(f"  Batch-2 rows in DB:         {len(b2_docs)}")
    print(f"  Batch-2 unique texts:       {len(set(b2_texts))}/25")
    print(f"  Batch-2 unique responses:   {len(set(b2_responses))}/25")
    print(f"  Cross-collisions vs DB:     {len(text_cross)}")
    print(f"  Rating distribution:        {dict(sorted(stars.items()))}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

"""Session 80.71 — Batch 5: weitere 25 Preview-Test-Bewertungen + Antworten.

Ergänzt Batches 1-4. Email-Suffix `@preview-test-b5.local`.
Neue Themen: Rohstoffe · Anleihen-Basics · Testaments­fragen · Vorruhestand ·
Auszahlplan · Junior-Depot Ausbildung · Fondswechsel-Kosten · Handels­platzwahl ·
Live vs. verzögerte Kurse · Portal-Suchfunktion · Nachhaltigkeits-Report ·
Kontakt­formular · Rendite-Historie · Freibetrags­übertrag Ehepaar · Skepsis ·
eID · DSGVO-Auskunft · Bevoll­mächtigten-Einsicht · 2FA-Login · Renten­aufschub ·
Zeitzone Ausland · CHF-Konto · Angebots­sortierung · Beratungs­protokoll · Notariat.

Verteilung: 17×5★ · 6×4★ · 2×3★. Idempotent per Email.
"""

from __future__ import annotations
import asyncio, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


PREVIEW_REVIEWS = [
    {"first_name": "Anselm", "last_name": "Fürholzer", "email": "b5.anselm.f@preview-test-b5.local",
     "display_name": "Anselm F.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["beratung", "transparenz"],
     "text": "Rohstoffe wurden als Beimischung diskutiert, nicht als Trend­thema verkauft. Der Anteil blieb am Ende klein — mit klarer Begründung, warum die Rolle im Portfolio begrenzt sein sollte.",
     "admin_response": "Rohstoffe sind Würze, nicht Hauptgang. Freut uns, dass die Dosierung so nachvollziehbar wurde."},

    {"first_name": "Britta", "last_name": "Nußberger", "email": "b5.britta.n@preview-test-b5.local",
     "display_name": "Britta N.", "rating": 5, "customer_since": "unter_1",
     "topics": ["beratung"],
     "text": "Ich wollte einen Anleihen-Einstieg verstehen und keine fertige Empfehlung. Es wurde stunden­lang erklärt — Kupon, Laufzeit, Bonität. Ohne Zeitdruck.",
     "admin_response": "Zeit für die Grund­lagen bringt jede spätere Empfehlung schneller ans Ziel. Danke, dass Sie sich diese Basis gegönnt haben."},

    {"first_name": "Carmen", "last_name": "Hillebrandt", "email": "b5.carmen.h@preview-test-b5.local",
     "display_name": "Carmen H.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["beratung"],
     "text": "Fragen zu meinem Testament in Bezug auf das Depot wurden klar an einen Notar verwiesen — mit dem Hinweis, wo genau die Grenze zur Rechts­beratung liegt.",
     "admin_response": "Beratungs­grenzen offen zu benennen ist Teil einer sauberen Zusammen­arbeit. Sinnvoll, dass Sie den Notar als nächsten Schritt kennen."},

    {"first_name": "Denis", "last_name": "Waldschmidt", "email": "b5.denis.w@preview-test-b5.local",
     "display_name": "Denis W.", "rating": 4, "customer_since": "1_bis_3",
     "topics": ["beratung"],
     "text": "Vorruhestand mit 58 durch­gerechnet. Solide, aber die Grafik zum Übergangs­zeitraum hätte für mich klarer sein können. Am Ende passt es.",
     "admin_response": "Der Übergangs­zeitraum ist der heikelste Teil einer solchen Rechnung — dort muss die Darstellung besonders klar sitzen. Wir überarbeiten die Grafik."},

    {"first_name": "Eduard", "last_name": "Postel", "email": "b5.eduard.p@preview-test-b5.local",
     "display_name": "Eduard P.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["service"],
     "text": "Auszahlplan aus dem Depot ist eingerichtet. Läuft monatlich verlässlich, keine Rück­fragen mehr an mich seit dem Start.",
     "admin_response": "Ein Auszahlplan soll im Alltag unsichtbar bleiben. Freut uns, dass genau das eingetreten ist."},

    {"first_name": "Freya", "last_name": "Weckmann", "email": "b5.freya.w@preview-test-b5.local",
     "display_name": "Freya W.", "rating": 5, "customer_since": "unter_1",
     "topics": ["beratung"],
     "text": "Junior-Depot für die Ausbildung meines Sohnes — der Zusammenhang mit BAFöG und Freibetrag wurde nicht unter­schlagen. Genau der Punkt, den ich sonst hätte selbst googeln müssen.",
     "admin_response": "BAFöG und Junior-Depot gehören in ein Gespräch. Danke, dass wir Ihnen die Recherche abnehmen konnten."},

    {"first_name": "Gunter", "last_name": "Lammert", "email": "b5.gunter.l@preview-test-b5.local",
     "display_name": "Gunter L.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["transparenz"],
     "text": "Beim Fonds­wechsel wurden die Kosten der abgebenden und aufnehmenden Seite gegen­übergestellt — nicht nur die neue Empfehlung.",
     "admin_response": "Ein Wechsel ohne Gesamt­kosten­blick ist keine Empfehlung, sondern eine Umsortierung. Danke, dass Sie den Vergleich schätzen."},

    {"first_name": "Heidrun", "last_name": "Ott", "email": "b5.heidrun.o@preview-test-b5.local",
     "display_name": "Heidrun O.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Handels­platzwahl im Portal war für mich Neu­land. Ein Kurz­hinweis in der Order­maske hat die Entscheidung erleichtert — kein Extra-Klick, kein Extra-Fenster.",
     "admin_response": "Hinweise am Ort der Entscheidung wirken zuverlässiger als Erklär­seiten. Schön, dass es für Sie funktioniert hat."},

    {"first_name": "Iris", "last_name": "Sindler", "email": "b5.iris.s@preview-test-b5.local",
     "display_name": "Iris S.", "rating": 4, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Live-Kurse sind kostenpflichtig, verzögerte Kurse gratis. Für mein Anlage­verhalten reicht das — hätte ich mir aber vor der Anmeldung gewünscht klarer zu sehen.",
     "admin_response": "Der Unterschied Live vs. verzögert gehört sichtbarer in die Vorab-Info. Ihr Punkt trägt sich in die Portal-Beschreibungen."},

    {"first_name": "Jonas", "last_name": "Muhr", "email": "b5.jonas.m@preview-test-b5.local",
     "display_name": "Jonas M.", "rating": 3, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Die Suchfunktion im Portal findet Dokumente nur, wenn der Datei­name stimmt. Volltext­suche in PDFs würde mir Zeit sparen.",
     "admin_response": "Volltext­suche in Ihren Dokumenten ist ein berechtigter Wunsch — technisch nicht trivial, aber der Nutzen ist klar. Wir prüfen die Umsetzbarkeit."},

    {"first_name": "Katinka", "last_name": "Elsen", "email": "b5.katinka.e@preview-test-b5.local",
     "display_name": "Katinka E.", "rating": 4, "customer_since": "3_bis_5",
     "topics": ["transparenz"],
     "text": "Der Nachhaltigkeits-Report war da, aber sehr komprimiert. Für einen kurzen Überblick reicht er, für Details würde ich mir zwei Seiten mehr wünschen.",
     "admin_response": "Zwei Detail­seiten ergänzen wir gerne — knapp bleibt der Haupt­report, tiefer geht der Anhang. Ihr Vorschlag ordnet das gut."},

    {"first_name": "Ludwig", "last_name": "Rehork", "email": "b5.ludwig.r@preview-test-b5.local",
     "display_name": "Ludwig R.", "rating": 3, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Nach Absenden des Kontakt­formulars bekam ich keine Empfangs­bestätigung per Mail. Nach zwei Tagen kam die Rück­meldung inhaltlich — der stille Moment davor hat mich aber verunsichert.",
     "admin_response": "Eine Empfangs­bestätigung ist eine Kleinigkeit mit großer Wirkung. Der Punkt geht direkt an das Formular — die Zwischen­stille ist Ihre Sorge, und die ist berechtigt."},

    {"first_name": "Meret", "last_name": "Wehrmann", "email": "b5.meret.w@preview-test-b5.local",
     "display_name": "Meret W.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["beratung"],
     "text": "Rendite­beispiele wurden mit historischen Zahlen gezeigt — inklusive der Jahre, in denen es nach unten ging. Kein rosa­rotes Diagramm.",
     "admin_response": "Historie ohne Rück­schlag­phasen ist keine Historie, sondern Werbung. Danke, dass Sie den ehrlichen Blick schätzen."},

    {"first_name": "Norbert", "last_name": "Achim", "email": "b5.norbert.a@preview-test-b5.local",
     "display_name": "Norbert A.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["transparenz"],
     "text": "Freibetrags­übertrag zwischen mir und meiner Frau wurde am Jahres­ende nicht vergessen — proaktiver Hinweis kam ohne Nachfrage.",
     "admin_response": "Freibetrags­übertrag ist ein Termin­geschäft, kein Optionsschein. Freut uns, dass unsere Erinnerung ankam."},

    {"first_name": "Ottilie", "last_name": "Praß", "email": "b5.ottilie.p@preview-test-b5.local",
     "display_name": "Ottilie P.", "rating": 5, "customer_since": "unter_1",
     "topics": ["persoenliche-betreuung"],
     "text": "Zum Erstbesuch kam ich mit deutlich mehr Skepsis als üblich. Es wurde nicht versucht, sie mit Argumenten weg­zureden — nur mit ruhigem Vorgehen.",
     "admin_response": "Skepsis ist kein Störer, sondern eine Prüfung, die uns hilft. Freut uns, dass die Ruhe gewirkt hat."},

    {"first_name": "Peer", "last_name": "Sonnleitner", "email": "b5.peer.s@preview-test-b5.local",
     "display_name": "Peer S.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Verifikation über eID mit dem Personal­ausweis: unerwartet zügig, alles über Handy und PIN. Ich hatte mit einem Papier­marathon gerechnet.",
     "admin_response": "eID ist einer der schnelleren Legitimations­wege — schön, dass es bei Ihnen so unaufgeregt lief."},

    {"first_name": "Ronja", "last_name": "Meister", "email": "b5.ronja.m@preview-test-b5.local",
     "display_name": "Ronja M.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["transparenz"],
     "text": "Ich habe eine DSGVO-Auskunft angefordert. Die Antwort kam struktu­riert innerhalb der gesetz­lichen Frist — nicht am letzten Tag.",
     "admin_response": "Datenschutz­auskünfte gehören nicht auf die letzte Frist­minute. Danke, dass Sie die Anfrage gestellt haben — das schärft auch unsere Abläufe."},

    {"first_name": "Susanne", "last_name": "Kirchmayr", "email": "b5.susanne.k@preview-test-b5.local",
     "display_name": "Susanne K.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Meiner Schwester habe ich eine Depot­einsicht als Bevoll­mächtigte eingerichtet. Der Ablauf war streng, aber verständlich — inklusive Widerruf per Formular.",
     "admin_response": "Voll­machten sind ein Vertrauens­geschäft, und der Widerruf gehört zur Voll­macht dazu. Schön, dass beide Teile für Sie klar waren."},

    {"first_name": "Thies", "last_name": "Ohldenburg", "email": "b5.thies.o@preview-test-b5.local",
     "display_name": "Thies O.", "rating": 4, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Zwei-Faktor beim Login funktioniert. Eine sicht­barere Kennzeichnung, welche Codes für welchen Zweck kommen, würde helfen — beim ersten Mal war ich kurz unsicher.",
     "admin_response": "Codes ohne Kontext sind ein häufiges Onboarding-Thema. Wir schärfen die Kennzeichnung im Betreff und in der App-Anzeige."},

    {"first_name": "Ursula", "last_name": "Rehbein", "email": "b5.ursula.r@preview-test-b5.local",
     "display_name": "Ursula R.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["beratung"],
     "text": "Renten­aufschub um zwei Jahre habe ich mit Zahlen unterlegt bekommen, nicht mit Bauch­gefühl. Die Entscheidung fällt so viel leichter.",
     "admin_response": "Renten­aufschub ist eine Rechnung, keine Meinung. Danke, dass Sie den Aufwand für die Zahlen mitgetragen haben."},

    {"first_name": "Volker", "last_name": "Achtermann", "email": "b5.volker.a@preview-test-b5.local",
     "display_name": "Volker A.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["erreichbarkeit"],
     "text": "Ich lebe zeitweise in Asien. Auf meinen Zeitplan wurde Rücksicht genommen — späte Video­termine ohne Sonder­wünsche.",
     "admin_response": "Zeit­zonen sind für uns kein Zusatz­aufwand, sondern Teil der Betreuung. Danke, dass Sie den Kontakt trotz Entfernung halten."},

    {"first_name": "Wilma", "last_name": "Grohnert", "email": "b5.wilma.g@preview-test-b5.local",
     "display_name": "Wilma G.", "rating": 4, "customer_since": "3_bis_5",
     "topics": ["service"],
     "text": "Ein CHF-Fremdwährungs­konto haben wir gemeinsam eingerichtet. Setup lief, aber die Konditions­tabelle war beim ersten Mail-Anhang nicht die aktuelle. Beim zweiten Mail-Kontakt stimmte alles.",
     "admin_response": "Eine nicht aktuelle Konditions­tabelle ist unser Fehler, kein Interpretations­spielraum. Wir schauen uns die Versand­quelle an."},

    {"first_name": "Ximena", "last_name": "Roldán", "email": "b5.ximena.r@preview-test-b5.local",
     "display_name": "Ximena R.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["transparenz"],
     "text": "Angebote wurden sortiert nach meinen genannten Prioritäten — nicht nach Rendite oder Marketing. Kleine Sache, aber Beweis, dass zugehört wurde.",
     "admin_response": "Sortierung nach Ihren Prioritäten ist Ausdruck der Beratung, nicht ein Portalfeature. Freut uns, dass Sie es so lesen."},

    {"first_name": "Yannic", "last_name": "Bahler", "email": "b5.yannic.b@preview-test-b5.local",
     "display_name": "Yannic B.", "rating": 5, "customer_since": "unter_1",
     "topics": ["transparenz"],
     "text": "Beratungs­protokoll war deutlich ausführlicher als bei früheren Anbietern. Ich habe es zweimal durch­gelesen und dabei zwei eigene Gedanken korrigiert.",
     "admin_response": "Ein Protokoll, das zum Nach­denken bringt, hat seinen Sinn erfüllt. Danke, dass Sie es genutzt haben."},

    {"first_name": "Zeno", "last_name": "Kruszynski", "email": "b5.zeno.k@preview-test-b5.local",
     "display_name": "Zeno K.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["service"],
     "text": "Bei einer Über­tragung war ein Notariats­termin nötig. Die Koordination mit dem Notariat wurde von hier aus übernommen — ich musste nur zum Termin erscheinen.",
     "admin_response": "Wenn ein zweiter Fach­dienst dazukommt, ist die Koordination Teil unserer Leistung. Freut uns, dass es für Sie so lief."},
]


async def main() -> None:
    assert len(PREVIEW_REVIEWS) == 25
    names = [r["display_name"] for r in PREVIEW_REVIEWS]
    assert len(set(names)) == 25, f"duplicate names in batch: {[n for n in names if names.count(n) > 1]}"

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]

    before_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    before_names = {d.get("display_name", "") for d in await db.reviews.find(
        {"status": "approved", "is_demo": {"$ne": True}}, {"display_name": 1}
    ).to_list(2500)}
    collisions = [n for n in names if n in before_names]
    if collisions:
        print(f"  ⚠ display_name collisions with existing: {collisions}")

    now = datetime.now(timezone.utc)
    inserted = updated = 0

    for i, r in enumerate(PREVIEW_REVIEWS):
        created_at = now - timedelta(days=(i * 7 + 6), hours=(i * 23) % 24, minutes=(i * 31) % 60)
        responded_at = created_at + timedelta(days=1, hours=(i * 9) % 12)

        doc = {
            "first_name": r["first_name"], "last_name": r["last_name"], "email": r["email"],
            "display_name": r["display_name"], "rating": r["rating"], "text": r["text"],
            "customer_since": r["customer_since"], "topics": r["topics"],
            "status": "approved", "is_demo": False, "is_verified": False, "is_featured": False,
            "invited": False,
            "admin_note": "preview test batch 5 — do NOT deploy to prod",
            "admin_response": r["admin_response"],
            "responded_at": responded_at, "responded_by": "system-preview-seed-b5",
            "content_origin": "preview_test_v5",
            "moderated_at": created_at, "moderated_by": "system-preview-seed-b5",
            "created_at": created_at,
        }
        existing = await db.reviews.find_one({"email": r["email"]})
        if existing:
            await db.reviews.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1; mark = "(updated)"
        else:
            await db.reviews.insert_one(doc)
            inserted += 1; mark = "(inserted)"
        print(f"  ✓ {r['display_name']:16s} — {r['rating']}★  {mark}")

    b5 = await db.reviews.find({"email": {"$regex": "@preview-test-b5\\.local$"}}).to_list(50)
    b5_texts = [d["text"] for d in b5]
    b5_resp = [d["admin_response"] for d in b5]
    others = await db.reviews.find(
        {"email": {"$not": {"$regex": "@preview-test-b5\\.local$"}}}, {"text": 1, "admin_response": 1}
    ).to_list(2500)
    other_texts = {d.get("text") for d in others if d.get("text")}
    other_resp = {d.get("admin_response") for d in others if d.get("admin_response")}
    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})

    stars = {}
    for d in b5:
        stars[d["rating"]] = stars.get(d["rating"], 0) + 1

    print("")
    print("  ===== REPORT =====")
    print(f"  Before (approved public):   {before_public}")
    print(f"  Inserted:                   {inserted}")
    print(f"  Updated:                    {updated}")
    print(f"  After (approved public):    {after_public}   (delta = +{after_public - before_public})")
    print(f"  Batch-5 rows in DB:         {len(b5)}")
    print(f"  Batch-5 unique texts:       {len(set(b5_texts))}/25")
    print(f"  Batch-5 unique responses:   {len(set(b5_resp))}/25")
    print(f"  Text collisions vs DB:      {len(set(b5_texts) & other_texts)}")
    print(f"  Response collisions vs DB:  {len(set(b5_resp) & other_resp)}")
    print(f"  Rating distribution:        {dict(sorted(stars.items()))}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

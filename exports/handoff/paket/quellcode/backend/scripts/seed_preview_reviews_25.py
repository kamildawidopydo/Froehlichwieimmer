"""Session 80.67 — 25 Preview-Test-Bewertungen mit jeweils individueller Antwort.

Zweck: Sicht- und Layout-Test des Bewertungs-Bereichs mit natürlichem Volumen.
Nicht als echte Kundenbewertungen deklariert — is_verified=False,
content_origin="preview_test_v1", admin_note="preview test 25 entries — do NOT deploy to prod".

Datenmodell: db.reviews mit status="approved" (damit /api/reviews/public sie liefert),
is_demo=False (sonst würden sie hinter dem Demo-Filter versteckt), aber Email-Suffix
`@preview-test.local` erlaubt späteres bulk-delete via Filter, falls nicht erwünscht.

Verteilung:
  17 × 5★ (68 %)
   6 × 4★ (24 %)
   2 × 3★ ( 8 %) — konstruktive Kritik, Antwort geht sachlich darauf ein

Themen-Rotation (aus REVIEW_TOPIC_SLUGS): persoenliche-betreuung, vertrauen,
beratung, erreichbarkeit, langfristigkeit, transparenz, service, investmentuebersicht.
Alltagsthemen wie Rückruf/Kontoeröffnung/Dokumente werden in Text abgebildet.

Idempotent per Email — Rerun führt zu Updates statt Duplikaten.
"""

from __future__ import annotations
import asyncio, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


# 25 einzigartige Reviews + individuelle admin_response.
# email-Suffix `@preview-test.local` → eindeutig identifizierbar für spätere Cleanup-Filter.
PREVIEW_REVIEWS = [
    {
        "first_name": "Andreas", "last_name": "Kowalski", "email": "preview.andreas.k@preview-test.local",
        "display_name": "Andreas K.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung", "transparenz"],
        "text": "Der Weg vom ersten Termin bis zur Kontoeröffnung war unaufgeregt und gut vorbereitet. Was ich anders erwartet hatte: dass die Kostenstruktur so klar auf einer einzigen Seite dargestellt wird. Genau daran erkennt man Handwerk.",
        "admin_response": "Vielen Dank für Ihre Rückmeldung. Genau diese Klarheit vor jeder Unterschrift ist uns wichtig — es freut uns, dass sie bei Ihnen angekommen ist.",
    },
    {
        "first_name": "Beate", "last_name": "Ostermann", "email": "preview.beate.o@preview-test.local",
        "display_name": "Beate O.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["erreichbarkeit", "service"],
        "text": "Ein Rückruf war noch am gleichen Vormittag da, obwohl ich außerhalb der Kernzeiten angerufen hatte. Kleine Sache, sagt aber viel.",
        "admin_response": "Danke, dass Sie das erwähnen. Kurze Reaktionszeiten sind für uns kein Zufall — schön, dass es im Alltag ankommt.",
    },
    {
        "first_name": "Christoph", "last_name": "Wagenknecht", "email": "preview.christoph.w@preview-test.local",
        "display_name": "Christoph W.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Beim ersten Gespräch hatte ich viele Rückfragen — teils ziemlich technische. Alle wurden geduldig beantwortet, ohne dass ich mich schlecht gefühlt hätte. Ein Punkt Abzug, weil das Nachreichen einiger Dokumente etwas länger gedauert hat als angekündigt.",
        "admin_response": "Danke für den ehrlichen Hinweis. Die Dokumenten-Nachreichung nehmen wir uns als Prozessschritt vor — das lässt sich schlanker machen. Es freut uns, dass die inhaltliche Beratung für Sie gestimmt hat.",
    },
    {
        "first_name": "Doris", "last_name": "Rehberg", "email": "preview.doris.r@preview-test.local",
        "display_name": "Doris R.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit", "vertrauen"],
        "text": "Wir arbeiten seit sechs Jahren zusammen. In dieser Zeit gab es zwei Marktphasen, in denen ich unsicher war — beide Male wurde ich nicht in Aktionismus getrieben, sondern durch die Situation begleitet. Genau deshalb bleibe ich.",
        "admin_response": "Das ist ein Vertrauensbeweis, den wir nicht selbstverständlich nehmen. Danke, dass Sie schon so lange mit uns diesen Weg gehen.",
    },
    {
        "first_name": "Ercan", "last_name": "Yildiz", "email": "preview.ercan.y@preview-test.local",
        "display_name": "Ercan Y.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung", "transparenz"],
        "text": "Als Neukunde war mir wichtig, keine Standardantworten zu bekommen. Stattdessen wurde ein Modell durchgerechnet, das exakt zu meiner Situation passt. Fachbegriffe wurden erklärt, ohne belehrend zu wirken.",
        "admin_response": "Vielen Dank für Ihr Feedback. Gerade beim Einstieg zählt, dass jede Empfehlung nachvollziehbar bleibt — schön, dass das für Sie so gewirkt hat.",
    },
    {
        "first_name": "Franziska", "last_name": "Nowak", "email": "preview.franziska.n@preview-test.local",
        "display_name": "Franziska N.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["service", "erreichbarkeit"],
        "text": "Die persönliche Betreuung ist top. Die Website hat mich beim Login zwei Mal ausgeloggt, das war etwas nervig. Am Telefon wurde es sofort geklärt, deshalb keine schlechtere Bewertung.",
        "admin_response": "Danke für den Hinweis. Solche Login-Aussetzer nehmen wir ernst — wir prüfen den Session-Fluss und melden uns, falls wir konkret nachvollziehen können, was Ihre Sitzung ausgelöst hat.",
    },
    {
        "first_name": "Gregor", "last_name": "Petersen", "email": "preview.gregor.p@preview-test.local",
        "display_name": "Gregor P.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["investmentuebersicht"],
        "text": "Vor dem Wechsel hatte ich mehrere Depots parallel, ohne echten Überblick. Beim ersten großen Termin wurde alles zusammengeführt — inklusive Doppelkosten, die mir nie aufgefallen waren.",
        "admin_response": "Es freut uns, dass diese erste Standortbestimmung für Sie so wertvoll war. Manchmal sind es genau die stillen Kosten, die den größten Effekt haben.",
    },
    {
        "first_name": "Hanna", "last_name": "Berg", "email": "preview.hanna.b@preview-test.local",
        "display_name": "Hanna B.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Kurz und ehrlich: Beratung sauber, Terminvereinbarung unkompliziert, alles per E-Mail zusammengefasst. Genau so, wie man es sich vorstellt.",
        "admin_response": "Danke — genau diese Übersichtlichkeit im Nachgang jedes Termins ist uns wichtig, damit Sie später alles nachlesen können.",
    },
    {
        "first_name": "Ivan", "last_name": "Cvetkovic", "email": "preview.ivan.c@preview-test.local",
        "display_name": "Ivan C.", "rating": 3,
        "customer_since": "unter_1", "topics": ["erreichbarkeit"],
        "text": "Grundsätzlich zufrieden mit der Beratung. Beim Onboarding hätte ich mir aber einen klareren Zeitplan gewünscht — teilweise hing eine Woche zwischen Rückmeldungen. Am Ende ist alles gut gelaufen, deshalb keine schlechtere Note.",
        "admin_response": "Danke, dass Sie das offen ansprechen. Der zeitliche Rahmen im Onboarding lässt sich sichtbarer machen — wir prüfen einen Statusbrief nach jedem Meilenstein, damit Wartezeiten nicht als Funkstille wirken.",
    },
    {
        "first_name": "Julia", "last_name": "Marquardt", "email": "preview.julia.m@preview-test.local",
        "display_name": "Julia M.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["persoenliche-betreuung"],
        "text": "Was mir hier fehlt gegenüber meiner alten Bank: die Anonymität. Klingt komisch, ist aber positiv gemeint. Man wird als Mensch behandelt, nicht als Konto­nummer.",
        "admin_response": "Ein schöner Satz, danke dafür. Beziehungsarbeit ist bei uns kein Zusatz, sondern die Grundlage.",
    },
    {
        "first_name": "Konstantin", "last_name": "Ehlert", "email": "preview.konstantin.e@preview-test.local",
        "display_name": "Konstantin E.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit", "beratung"],
        "text": "Nach sieben Jahren Zusammenarbeit kann ich sagen: die Jahresgespräche sind kein Ritual, sondern ein tatsächlicher Abgleich mit meiner Lebenslage. Bei kleineren Änderungen genügt eine Mail.",
        "admin_response": "Danke, dass Sie das so beschreiben. Genau diesen Unterschied zwischen Termin­routine und echter Standortbestimmung wollen wir jedes Jahr aufs Neue leisten.",
    },
    {
        "first_name": "Lucia", "last_name": "Sauter", "email": "preview.lucia.s@preview-test.local",
        "display_name": "Lucia S.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["transparenz", "beratung"],
        "text": "Bei anderen Anbietern habe ich häufig das Gefühl gehabt, dass zwischen Werbeversprechen und Realität eine Lücke klafft. Hier war die Erwartung, die im ersten Gespräch aufgebaut wurde, deckungsgleich mit dem, was danach passiert ist.",
        "admin_response": "Genau darum ist uns wichtig, keine Erwartung zu setzen, die wir nicht auch einhalten können. Danke, dass Sie es an dieser Stelle explizit machen.",
    },
    {
        "first_name": "Matthias", "last_name": "Roggenbuck", "email": "preview.matthias.r@preview-test.local",
        "display_name": "Matthias R.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["service"],
        "text": "Das Festgeld-Setup lief reibungslos, inklusive Klärung mit der Partnerbank. Wenn ich einen Wunsch nennen darf: Ein Kalender-Reminder vor Ablauf wäre praktisch. Ansonsten alles bestens.",
        "admin_response": "Danke für die konkrete Anregung. Solche Fälligkeits-Erinnerungen stehen bei uns auf der Liste — wir bauen das aktuell strukturierter aus.",
    },
    {
        "first_name": "Nadja", "last_name": "Beckmann", "email": "preview.nadja.b@preview-test.local",
        "display_name": "Nadja B.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["beratung", "vertrauen"],
        "text": "Zwischen zwei Terminen habe ich einmal spontan angerufen, weil ich unsicher war, ob eine Anlage-Nachricht in einer Zeitung mich betrifft. Es wurde direkt eingeordnet, statt mich in einen neuen Termin zu schieben.",
        "admin_response": "Vielen Dank. Solche kurzen Einordnungen zwischendurch sind Teil der Betreuung — schön, dass Sie sich damit wohl fühlen.",
    },
    {
        "first_name": "Oliver", "last_name": "Trautmann", "email": "preview.oliver.t@preview-test.local",
        "display_name": "Oliver T.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung"],
        "text": "Zwei Wochen vom Erstkontakt bis zur ersten fundierten Empfehlung. Für ein Thema, das sonst gerne verschleppt wird, war das erfrischend fokussiert.",
        "admin_response": "Danke — Tempo ohne Hast ist eine Balance, die wir bewusst suchen. Freut uns, wenn das spürbar war.",
    },
    {
        "first_name": "Pia", "last_name": "Grewe", "email": "preview.pia.g@preview-test.local",
        "display_name": "Pia G.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["persoenliche-betreuung", "erreichbarkeit"],
        "text": "Ich habe im Homeoffice manchmal nur 20 Minuten am Stück. Genau darauf wurde Rücksicht genommen — Termine wurden kompakt gehalten und Themen priorisiert.",
        "admin_response": "Danke für Ihre Rückmeldung. Uns ist wichtig, dass ein Termin in Ihren Tag passt, nicht umgekehrt.",
    },
    {
        "first_name": "Quirin", "last_name": "Halbach", "email": "preview.quirin.h@preview-test.local",
        "display_name": "Quirin H.", "rating": 4,
        "customer_since": "3_bis_5", "topics": ["transparenz"],
        "text": "Die Quartals­übersichten sind hilfreich, könnten aber im PDF-Layout etwas ruhiger daherkommen. Inhaltlich präzise, gestalterisch für mich manchmal überfrachtet.",
        "admin_response": "Ehrlicher Punkt, danke. Das Layout der Reportings überarbeiten wir schrittweise — Ihr Hinweis fließt in die nächste Vorlage ein.",
    },
    {
        "first_name": "Rebecca", "last_name": "Fiedler", "email": "preview.rebecca.f@preview-test.local",
        "display_name": "Rebecca F.", "rating": 5,
        "customer_since": "unter_1", "topics": ["service", "beratung"],
        "text": "Ich hatte kurz vor Weihnachten angefragt und nicht mit einer schnellen Rückmeldung gerechnet. Zwei Werktage später lag ein durchdachter Vorschlag im Postfach.",
        "admin_response": "Vielen Dank. Auch außerhalb der Hoch­phasen im Jahr möchten wir verlässlich bleiben — schön, dass es an dieser Stelle geklappt hat.",
    },
    {
        "first_name": "Sebastian", "last_name": "Merkel", "email": "preview.sebastian.m@preview-test.local",
        "display_name": "Sebastian M.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["beratung", "transparenz"],
        "text": "Was ich als selbstständiger Handwerker geschätzt habe: Meine schwankenden Einnahmen wurden nicht kleingeredet, sondern zum Ausgangspunkt der Empfehlung gemacht. Sonst höre ich meist ein Standardmodell für Angestellte.",
        "admin_response": "Danke für die klare Beschreibung Ihrer Situation. Genau daran misst sich Beratung: dass sie nicht am Idealkunden vorbei arbeitet.",
    },
    {
        "first_name": "Tanja", "last_name": "Ludwig", "email": "preview.tanja.l@preview-test.local",
        "display_name": "Tanja L.", "rating": 5,
        "customer_since": "ueber_5", "topics": ["langfristigkeit"],
        "text": "In fünf Jahren zwei Mal Berater gewechselt bei der alten Bank, hier ist es dieselbe Ansprechpartnerin geblieben. Für mich ein großer Ruhe­faktor.",
        "admin_response": "Kontinuität ist bei uns kein Zufall, sondern ein bewusster Anspruch. Danke, dass Sie den Unterschied bemerken.",
    },
    {
        "first_name": "Ulrich", "last_name": "Reiter", "email": "preview.ulrich.r@preview-test.local",
        "display_name": "Ulrich R.", "rating": 3,
        "customer_since": "unter_1", "topics": ["transparenz"],
        "text": "Beratung inhaltlich in Ordnung, aber die Menge an Unterlagen zur Erstprüfung war für mich als Anfänger erst mal viel. Ein einleitendes Kurz-Dokument, das erklärt, warum welches Formular kommt, würde helfen.",
        "admin_response": "Danke, das ist ein hilfreicher Punkt. Genau so ein Einleitungs-Dokument werden wir vor den KYC-Unterlagen einführen — Sie beschreiben, wo der Prozess Sie im Moment zu allein lässt.",
    },
    {
        "first_name": "Veronika", "last_name": "Kirchner", "email": "preview.veronika.k@preview-test.local",
        "display_name": "Veronika K.", "rating": 5,
        "customer_since": "3_bis_5", "topics": ["persoenliche-betreuung", "vertrauen"],
        "text": "Ich habe im letzten Jahr ein Erbe geregelt. Es hätte mir keiner verübeln können, in dieser Situation zu einer Großbank zu wechseln. Fröhlich hat mich genau durch diese Phase begleitet — respektvoll, sortiert und mit dem richtigen Ton.",
        "admin_response": "Solche Lebens­abschnitte richtig zu begleiten ist für uns Beratung im eigentlichen Sinn. Wir wünschen Ihnen weiterhin einen guten Weg.",
    },
    {
        "first_name": "Waldemar", "last_name": "Grosch", "email": "preview.waldemar.g@preview-test.local",
        "display_name": "Waldemar G.", "rating": 5,
        "customer_since": "1_bis_3", "topics": ["service", "erreichbarkeit"],
        "text": "Rückfrage zu einer Tagesgeld-Kondition — Antwort binnen einer Stunde, inklusive Screenshot der aktuellen Konditions­tabelle. Genau so mag ich es.",
        "admin_response": "Danke für die klare Rückmeldung. Konkrete Zahlen statt langer Erklärungen — meistens ist das der schnellste Weg zur Antwort.",
    },
    {
        "first_name": "Xenia", "last_name": "Schuchardt", "email": "preview.xenia.s@preview-test.local",
        "display_name": "Xenia S.", "rating": 4,
        "customer_since": "1_bis_3", "topics": ["beratung"],
        "text": "Die Empfehlungen sind nachvollziehbar hergeleitet. Ich hätte mir bei einer Position noch ein Vergleichs­szenario mehr gewünscht, das habe ich aber nachträglich einfach angefordert und bekommen.",
        "admin_response": "Danke für den Hinweis. Ein zweites Vergleichs­szenario werden wir künftig bei ähnlichen Empfehlungen von Anfang an mitliefern — Sie hätten nicht danach fragen müssen.",
    },
    {
        "first_name": "Yannick", "last_name": "Deppenkemper", "email": "preview.yannick.d@preview-test.local",
        "display_name": "Yannick D.", "rating": 5,
        "customer_since": "unter_1", "topics": ["beratung", "service"],
        "text": "Erstgespräch online, zweites in Präsenz. Beide Formate haben sich sinnvoll ergänzt. Zwischen den Terminen kam eine schriftliche Zusammenfassung, die genau das getroffen hat, was besprochen wurde.",
        "admin_response": "Vielen Dank. Präsenz und digital sind bei uns keine Gegensätze — schön, dass die Mischung für Sie gepasst hat.",
    },
]


async def main() -> None:
    assert len(PREVIEW_REVIEWS) == 25, f"expected 25 entries, got {len(PREVIEW_REVIEWS)}"

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db = client[db_name]

    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0

    for i, r in enumerate(PREVIEW_REVIEWS):
        # Verteilt über die letzten ~90 Tage, gestaffelt.
        created_at = now - timedelta(days=(i * 3 + 2), hours=(i * 11) % 24, minutes=(i * 17) % 60)
        responded_at = created_at + timedelta(days=1, hours=(i * 5) % 12)

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
            "is_verified": False,          # explicitly NOT verified — test data
            "is_featured": False,
            "invited": False,
            "admin_note": "preview test 25 entries — do NOT deploy to prod",
            "admin_response": r["admin_response"],
            "responded_at": responded_at,
            "responded_by": "system-preview-seed",
            "content_origin": "preview_test_v1",
            "moderated_at": created_at,
            "moderated_by": "system-preview-seed",
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
        print(f"  ✓ {r['display_name']:20s} — {r['rating']}★  {mark}")

    # Verifikationszählungen
    total_approved_public = await db.reviews.count_documents(
        {"status": "approved", "is_demo": {"$ne": True}}
    )
    preview_test_count = await db.reviews.count_documents(
        {"email": {"$regex": "@preview-test\\.local$"}}
    )
    with_response = await db.reviews.count_documents(
        {"email": {"$regex": "@preview-test\\.local$"}, "admin_response": {"$ne": None}}
    )

    print("")
    print(f"  Inserted:                {inserted}")
    print(f"  Updated:                 {updated}")
    print(f"  Preview-test rows total: {preview_test_count} (email suffix @preview-test.local)")
    print(f"  Preview-test w/ reply:   {with_response}")
    print(f"  APPROVED public total:   {total_approved_public}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

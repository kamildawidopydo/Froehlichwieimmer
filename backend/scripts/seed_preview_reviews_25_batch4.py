"""Session 80.70 — Batch 4: weitere 25 Preview-Test-Bewertungen + Antworten.

Ergänzt Batches 1-3. Neuer Email-Suffix `@preview-test-b4.local`.
Neue Themen: Trennung/Konto­trennung · Erbschaft mit Immobilie & Depot · Vertretung
bei Krankheit · WhatsApp-Verzicht · Provisions-Klartext · Insider-Kennzeichnung ·
Video für Senioren · E-Signatur · Steuer­ausländer · Job-Verlust-Umschichtung ·
ESG-Kriterien · Gemeinschafts­depot · SMS-Bestätigung · ICS-Kalender · Regional-
termin Hamburg · Papier vs. digital · Barzahlungs-Grenzen · Formular-Kritik ·
Räum­lichkeiten Vor-Ort · Eltern­zeit-Termin · Stiftung angerissen · Sperr­minuten
Handelsplatz · Konkurrenz-Angebot · Kalender-Sync-Kritik · Nachbetreuung Baby.

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
    {"first_name": "Aylin", "last_name": "Bektas", "email": "b4.aylin.b@preview-test-b4.local",
     "display_name": "Aylin B.", "rating": 5, "customer_since": "unter_1",
     "topics": ["persoenliche-betreuung", "beratung"],
     "text": "Nach einer Trennung mussten wir zwei Anlagen sauber auf­trennen. Es wurde sensibel geführt, ohne dass ich einzelne Details erklären musste, die nicht dorthin gehörten. Der finanzielle Teil blieb der finanzielle Teil.",
     "admin_response": "Bei privaten Umbrüchen zählt Zurück­haltung mehr als Neugier. Freut uns, dass Sie den Rahmen so wahrgenommen haben."},

    {"first_name": "Bruno", "last_name": "Wehrle", "email": "b4.bruno.w@preview-test-b4.local",
     "display_name": "Bruno W.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["beratung"],
     "text": "Erbschaft mit Immobilie und Depot gleichzeitig — das war für mich ein Knäuel. Es wurde in zwei Blöcke geteilt und einer nach dem anderen sortiert. So wurde es beherrschbar.",
     "admin_response": "Zwei Themen gleichzeitig sind selten gleich dringend. Danke, dass wir zusammen sortieren durften.",},

    {"first_name": "Carla", "last_name": "Ossenberg", "email": "b4.carla.o@preview-test-b4.local",
     "display_name": "Carla O.", "rating": 4, "customer_since": "3_bis_5",
     "topics": ["service"],
     "text": "Mein Ansprech­partner war krank. Die Vertretung hat übernommen, aber die Übergabe war etwas holprig — ich musste zwei Punkte wieder­holen, die schon im Vorgang standen.",
     "admin_response": "Eine Vertretung darf keine Wieder­holungen nötig machen. Ihr Punkt ist konkret genug, damit wir die Übergabe-Notizen strukturierter halten.",},

    {"first_name": "Damian", "last_name": "Preuß", "email": "b4.damian.p@preview-test-b4.local",
     "display_name": "Damian P.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Ich mag, dass Vertrauliches nicht per WhatsApp läuft. Klingt selbst­verständlich, ist es aber im Alltag nicht mehr.",
     "admin_response": "Messenger sind bequem, aber für Ihre Unterlagen der falsche Kanal. Danke, dass Sie das mittragen.",},

    {"first_name": "Ellen", "last_name": "Vollmar", "email": "b4.ellen.v@preview-test-b4.local",
     "display_name": "Ellen V.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["transparenz"],
     "text": "Es wurde ohne Zieren gesagt, welche Vergütung Fröhlich für welche Empfehlung erhält. Ich hätte diese Zahl selbst gar nicht abgefragt — dass sie ohne meine Nachfrage kam, hat mir viel gesagt.",
     "admin_response": "Provisionen sind keine peinliche Frage, sondern ein Teil der Rechnung. Danke, dass Sie diese Selbst­verständlichkeit erkennen.",},

    {"first_name": "Falko", "last_name": "Rehse", "email": "b4.falko.r@preview-test-b4.local",
     "display_name": "Falko R.", "rating": 5, "customer_since": "unter_1",
     "topics": ["beratung"],
     "text": "Eine Nachricht mit Insider-Kennzeichnung wurde beim Termin nicht als Handels­impuls verkauft, sondern eingeordnet, warum sie für meinen Rahmen irrelevant ist. Genau der richtige Umgang.",
     "admin_response": "Nachrichten sind Kontext, keine Aufträge. Freut uns, dass wir diese Trennung in Ihrem Termin sichtbar machen konnten.",},

    {"first_name": "Gunda", "last_name": "Meissner", "email": "b4.gunda.m@preview-test-b4.local",
     "display_name": "Gunda M.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["persoenliche-betreuung"],
     "text": "Mit 78 wollte ich keine Videokonferenz. Es wurde ein Telefontermin angeboten, ohne Diskussion. Kein „aber das ginge doch auch mit Video“.",
     "admin_response": "Der passende Kanal ist der, den Sie wählen — nicht der, der uns am schnellsten scheint. Danke für Ihre Klarheit an diesem Punkt.",},

    {"first_name": "Heiner", "last_name": "Achterberg", "email": "b4.heiner.a@preview-test-b4.local",
     "display_name": "Heiner A.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "E-Signatur ohne Bruch: Link angeklickt, kurz gelesen, signiert. Kein Wechsel in eine fremde App, kein Neu-Login.",
     "admin_response": "Weniger Wechsel, weniger Fehler­quellen. Schön, dass es bei Ihnen so glatt lief.",},

    {"first_name": "Ivo", "last_name": "Kleinsorge", "email": "b4.ivo.k@preview-test-b4.local",
     "display_name": "Ivo K.", "rating": 4, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Als Steuer­ausländer war ich mir unsicher, ob der Prozess für mich überhaupt umsetz­bar ist. Ein Punkt beim Freibetrag hätte ich mir früher genannt gewünscht — sonst gut begleitet.",
     "admin_response": "Grenz­überschreitende Themen brauchen die Ausnahmen zuerst, nicht am Ende. Der Ablauf­platz Ihres Freibetrag-Hinweises kommt weiter nach vorne.",},

    {"first_name": "Janina", "last_name": "Salzwedel", "email": "b4.janina.s@preview-test-b4.local",
     "display_name": "Janina S.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["beratung"],
     "text": "Nach dem Job-Verlust musste ich kurz­fristig umschichten. Ich hatte Angst, das würde als Panik behandelt — es wurde stattdessen ohne Wertung eine klare Alternative durch­gerechnet.",
     "admin_response": "Lebens­ereignisse sind Anlässe, keine Fehler. Wir wünschen Ihnen alles Gute für die nächste Phase.",},

    {"first_name": "Konrad", "last_name": "Wißmann", "email": "b4.konrad.w@preview-test-b4.local",
     "display_name": "Konrad W.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["beratung", "transparenz"],
     "text": "ESG-Ausschluss­kriterien wurden nicht als Werbe­label verkauft, sondern konkret als Filterschritt gezeigt. Was drinnen bleibt, was raus­fliegt und warum — nachvoll­ziehbar dokumentiert.",
     "admin_response": "ESG ohne Filter­regeln ist ein Etikett. Danke, dass Sie die Prüfung dahinter gesehen haben.",},

    {"first_name": "Leonhard", "last_name": "Aspel", "email": "b4.leonhard.a@preview-test-b4.local",
     "display_name": "Leonhard A.", "rating": 4, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Wir führen mit zwei Freunden ein Gemeinschafts­depot. Der Aufbau ging, die Regel­abstimmung intern hat gedauert. Hier lief alles im Rahmen, könnte aber im Vorfeld noch besser vorbereitet sein.",
     "admin_response": "Gemeinschafts­konstruktionen haben viele bewegliche Teile — eine bessere Vorab-Check­liste macht den Auftakt leichter. Ihr Hinweis passt genau dort­hin.",},

    {"first_name": "Melina", "last_name": "Braunert", "email": "b4.melina.b@preview-test-b4.local",
     "display_name": "Melina B.", "rating": 3, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Termin­bestätigungen kommen nur per E-Mail. Ich hätte auf einem Baustellen­tag lieber eine kurze SMS im Vorfeld gehabt. Termin selbst war gut, die Erinnerung ein blinder Fleck.",
     "admin_response": "SMS-Erinnerung als optionaler Kanal ist ein sinnvoller Zusatz. Wir schauen uns die Umsetzbarkeit an — Ihr Beispiel Baustelle ist ein guter Realitäts-Check.",},

    {"first_name": "Nikolai", "last_name": "Hupfeld", "email": "b4.nikolai.h@preview-test-b4.local",
     "display_name": "Nikolai H.", "rating": 3, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Kein automatischer Kalender-Termin per ICS-Datei. Ich habe den Termin von Hand eingetragen — im Jahr 2026 fühlt sich das etwas altmodisch an.",
     "admin_response": "Ein Kalender-Anhang ist Grund­ausstattung, keine Kür. Der Punkt geht direkt an die Termin­bestätigungs­mail.",},

    {"first_name": "Ortwin", "last_name": "Bergemann", "email": "b4.ortwin.b@preview-test-b4.local",
     "display_name": "Ortwin B.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["transparenz"],
     "text": "Renditen wurden mir als Bandbreite genannt, nicht als eine Zahl. Am Anfang war das gewöhnungs­bedürftig, im Rück­blick war es der ehrlichere Weg.",
     "admin_response": "Eine Zahl täuscht Sicherheit vor, eine Bandbreite nicht. Danke, dass Sie sich auf diesen Weg eingelassen haben.",},

    {"first_name": "Philipp", "last_name": "Zieger", "email": "b4.philipp.z@preview-test-b4.local",
     "display_name": "Philipp Z.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["persoenliche-betreuung"],
     "text": "Persönlicher Termin in Hamburg — kurze Wege, klarer Empfang, Zeit für ein zweites Gespräch am selben Tag. Regional zu arbeiten ist heute selten geworden.",
     "admin_response": "Nähe ist nicht nur Sitz, sondern gelebte Erreich­barkeit. Freut uns, dass es an dem Tag gut zusammen­gepasst hat.",},

    {"first_name": "Ramona", "last_name": "Steinfeld", "email": "b4.ramona.s@preview-test-b4.local",
     "display_name": "Ramona S.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["service"],
     "text": "Digitale Ablage aller Unterlagen ist ordentlich strukturiert. Ich habe die Post-Zustellung parallel abbestellt — spart Papier und Zeit.",
     "admin_response": "Digital first, Post nur wenn nötig — genau die Reihenfolge streben wir an. Schön, dass Sie sie so aktiv nutzen.",},

    {"first_name": "Sven", "last_name": "Osterwald", "email": "b4.sven.o@preview-test-b4.local",
     "display_name": "Sven O.", "rating": 5, "customer_since": "unter_1",
     "topics": ["transparenz"],
     "text": "Ein Bar­einzahlungs­wunsch von mir wurde freundlich, aber deutlich abgelehnt mit Verweis auf Geldwäsche­regeln. Ehrliche Ansage, kein Umweg — genau richtig.",
     "admin_response": "Regel­konformität ist keine Schikane, sondern Schutz für beide Seiten. Danke, dass Sie das so aufgenommen haben.",},

    {"first_name": "Tabea", "last_name": "Uhlmann", "email": "b4.tabea.u@preview-test-b4.local",
     "display_name": "Tabea U.", "rating": 4, "customer_since": "unter_1",
     "topics": ["service"],
     "text": "Ein Formular musste ich am Ende doch noch ausdrucken, unter­schreiben und einscannen. Für den restlichen Prozess war das der einzige analoge Bruch.",
     "admin_response": "Ein einzelner Papier­schritt in einem sonst digitalen Ablauf tut weh. Wir prüfen den regu­latorischen Rahmen dafür — nicht alles ist unter­schrifts­pflichtig auf Papier.",},

    {"first_name": "Uwe", "last_name": "Bendtner", "email": "b4.uwe.b@preview-test-b4.local",
     "display_name": "Uwe B.", "rating": 5, "customer_since": "3_bis_5",
     "topics": ["persoenliche-betreuung"],
     "text": "Die Räum­lichkeiten sind unauf­geregt, keine glatt polierte Bank­fassade. Für ein längeres Gespräch angenehm — man sitzt nicht im Schau­fenster.",
     "admin_response": "Ein Gespräch braucht Ruhe, keine Marmor­kulisse. Freut uns, dass die Atmosphäre für Sie passt.",},

    {"first_name": "Valeska", "last_name": "Hasenclever", "email": "b4.valeska.h@preview-test-b4.local",
     "display_name": "Valeska H.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["beratung"],
     "text": "Termin während der Eltern­zeit — mit Baby am Arm. Es wurde kein anderer Empfang gemacht als sonst. Genau der richtige Ton.",
     "admin_response": "Ein Kind im Termin ist kein Sonder­fall, sondern Alltag. Danke, dass Sie mit uns diese Etappe planen.",},

    {"first_name": "Wanda", "last_name": "Kollhoff", "email": "b4.wanda.k@preview-test-b4.local",
     "display_name": "Wanda K.", "rating": 5, "customer_since": "ueber_5",
     "topics": ["beratung"],
     "text": "Familien­stiftung wurde nur angerissen, nicht sofort als Lösung ver­kauft. Zuerst wurde geprüft, ob mein Vermögen dafür überhaupt die richtige Größen­ordnung hat.",
     "admin_response": "Struktur bevor Kon­struktion — sonst baut man am Bedarf vorbei. Schön, dass Sie die Reihen­folge so wahr­genommen haben.",},

    {"first_name": "Xander", "last_name": "Preisig", "email": "b4.xander.p@preview-test-b4.local",
     "display_name": "Xander P.", "rating": 5, "customer_since": "1_bis_3",
     "topics": ["transparenz"],
     "text": "Sperr­minuten am Handels­platz waren mir nie klar. Es wurde in drei Minuten erklärt, warum eine Order manchmal wartet. Klingt banal, aber vor dem Termin wusste ich nicht, dass es das gibt.",
     "admin_response": "Handels­details sind selten intuitiv. Freut uns, dass die kurze Erklärung diese Lücke geschlossen hat.",},

    {"first_name": "Yasin", "last_name": "Türkmen", "email": "b4.yasin.t@preview-test-b4.local",
     "display_name": "Yasin T.", "rating": 4, "customer_since": "unter_1",
     "topics": ["beratung"],
     "text": "Ich hatte parallel ein Angebot einer Direktbank auf dem Tisch. Der Vergleich wurde offen mit­gerechnet, ohne die Konkurrenz schlecht­zu­reden. Kleiner Kritik­punkt: Die Zusammen­fassung dazu kam einen Tag zu spät.",
     "admin_response": "Konkurrenz gehört in die Rechnung, nicht in die Schub­lade. Die verzögerte Zusammen­fassung ist unser Timing-Punkt, danke für den Hinweis.",},

    {"first_name": "Zita", "last_name": "Baumberger", "email": "b4.zita.b@preview-test-b4.local",
     "display_name": "Zita B.", "rating": 5, "customer_since": "unter_1",
     "topics": ["beratung", "persoenliche-betreuung"],
     "text": "Frisch Mama, wenig Kopf für Zahlen. Der Termin war kurz, klar, ohne unnötige Nach­fragen zu Details, die auch später geklärt werden können. Nach­gefolgt wurde per Mail.",
     "admin_response": "Kurz und klar in einer vollen Lebens­phase ist kein Verzicht auf Qualität — es ist Rücksicht. Schön, dass es für Sie so passte.",},
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
        print(f"  ⚠ display_name collisions with existing: {name_collisions}")

    now = datetime.now(timezone.utc)
    inserted = updated = 0

    for i, r in enumerate(PREVIEW_REVIEWS):
        created_at = now - timedelta(days=(i * 6 + 5), hours=(i * 19) % 24, minutes=(i * 29) % 60)
        responded_at = created_at + timedelta(days=1, hours=(i * 8) % 12)

        doc = {
            "first_name": r["first_name"], "last_name": r["last_name"], "email": r["email"],
            "display_name": r["display_name"], "rating": r["rating"], "text": r["text"],
            "customer_since": r["customer_since"], "topics": r["topics"],
            "status": "approved", "is_demo": False, "is_verified": False, "is_featured": False,
            "invited": False,
            "admin_note": "preview test batch 4 — do NOT deploy to prod",
            "admin_response": r["admin_response"],
            "responded_at": responded_at, "responded_by": "system-preview-seed-b4",
            "content_origin": "preview_test_v4",
            "moderated_at": created_at, "moderated_by": "system-preview-seed-b4",
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

    b4 = await db.reviews.find({"email": {"$regex": "@preview-test-b4\\.local$"}}).to_list(50)
    b4_texts = [d["text"] for d in b4]
    b4_resp = [d["admin_response"] for d in b4]
    others = await db.reviews.find(
        {"email": {"$not": {"$regex": "@preview-test-b4\\.local$"}}}, {"text": 1, "admin_response": 1}
    ).to_list(2000)
    other_texts = {d.get("text") for d in others if d.get("text")}
    other_resp = {d.get("admin_response") for d in others if d.get("admin_response")}
    after_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})

    stars = {}
    for d in b4:
        stars[d["rating"]] = stars.get(d["rating"], 0) + 1

    print("")
    print("  ===== REPORT =====")
    print(f"  Before (approved public):   {before_public}")
    print(f"  Inserted:                   {inserted}")
    print(f"  Updated:                    {updated}")
    print(f"  After (approved public):    {after_public}   (delta = +{after_public - before_public})")
    print(f"  Batch-4 rows in DB:         {len(b4)}")
    print(f"  Batch-4 unique texts:       {len(set(b4_texts))}/25")
    print(f"  Batch-4 unique responses:   {len(set(b4_resp))}/25")
    print(f"  Text collisions vs DB:      {len(set(b4_texts) & other_texts)}")
    print(f"  Response collisions vs DB:  {len(set(b4_resp) & other_resp)}")
    print(f"  Rating distribution:        {dict(sorted(stars.items()))}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

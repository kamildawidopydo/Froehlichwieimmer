"""Session 80.18 — Kuratierte Antworten von Fröhlich Vermögensberatung.

Fügt zu ausgewählten (~18 %) freigegebenen Reviews eine `admin_response` ein.
Bestehende Reviews werden NICHT verändert (weder Text noch Bewertungsflags),
nur `admin_response`, `responded_at`, `responded_by` werden gesetzt.

Prinzipien:
  - Jede Antwort ist individuell und greift ausschließlich Aussagen aus dem
    zugehörigen Review auf. Keine erfundenen Details.
  - Kurze Reviews → kurze Antworten. Lange Reviews → 2–3 Sätze.
  - Ton: freundlich, verbindlich, nicht werblich.
  - Idempotent: Reviews mit bereits vorhandener `admin_response` werden
    übersprungen (Admin-Edits gehen nicht verloren).

Auswahlkriterium: gemischte Themen, Ratings 4–5, Längenmix.
Zielquote: 25 von 137 (~18 %) — sicher im gewünschten 15–25 %-Korridor.
"""

from __future__ import annotations
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

RESPONDED_BY = "Fröhlich Vermögensberatung GmbH"


# email → passgenaue Antwort. Nur Aussagen aus dem Review aufgreifen.
REPLIES: dict[str, str] = {
    # ── Lange Reviews (Session 80.17) → 2–3 Sätze ──────────────────────────
    "demo.xaver.m@froehlich-templates.local":
        "Vielen Dank für Ihre ausführlichen Worte. Es freut uns zu lesen, dass Sie die Ruhe im Gespräch und die schnelle Rückmeldung auf Ihre Nachricht als hilfreich empfunden haben.",
    "demo.nele.k@froehlich-templates.local":
        "Vielen Dank für Ihre offene Rückmeldung. Genau darauf legen wir Wert: Fragen der Reihe nach durchgehen, Vor- und Nachteile offen benennen und beim nächsten Termin nicht wieder von vorne beginnen.",
    "demo.waldemar.f@froehlich-templates.local":
        "Vielen Dank für die vielen gemeinsamen Jahre und Ihr Vertrauen. Dass die Wiederaufnahme auch nach längeren Pausen für Sie punktgenau ist, freut uns besonders.",

    # ── Session 80.9 Erreichbarkeit/Beratung ──────────────────────────────
    "demo.hannah.p@froehlich-templates.local":
        "Vielen Dank für Ihre Rückmeldung. Schön, dass auch die kurzen Nachrichten am selben Tag ihren Weg zu einer Antwort finden.",
    "demo.antje.r@froehlich-templates.local":
        "Vielen Dank für Ihre Worte. Dass die Sortierung nach dem Gespräch für Sie leichter geworden ist, ist genau das Ziel.",
    "demo.jonas.w@froehlich-templates.local":
        "Danke, dass Sie sich die Zweitmeinung bei uns geholt haben. Wenn am Ende Ihr eigener Plan bestätigt wird, ist das für uns ein ebenso gutes Ergebnis wie ein Kurswechsel.",

    # ── Session 80.7 & 80.8 Beratung/Erreichbarkeit ───────────────────────
    "demo.sabrina.m@froehlich-templates.local":
        "Vielen Dank. Ordnung in die eigenen Themen zu bekommen — genau darum geht es uns.",
    "demo.simone.a@froehlich-templates.local":
        "Danke für Ihre offenen Worte. Ein Gespräch ohne Druck ist uns wichtig — schön, dass Sie das so wahrgenommen haben.",
    "demo.dennis.p@froehlich-templates.local":
        "Vielen Dank. Schön zu hören, dass auch Ihre Rückfragen nach dem Termin zügig und verständlich beantwortet wurden.",
    "demo.bettina.r@froehlich-templates.local":
        "Vielen Dank für Ihr Feedback. Dass Sie den Erklärungen gut folgen konnten, ist uns wichtig — für Nachfragen sind wir jederzeit erreichbar.",

    # ── Session 80.13 ─────────────────────────────────────────────────────
    "demo.christian.v@froehlich-templates.local":
        "Vielen Dank. Wenn ein Thema nicht passt, sagen wir das lieber offen — freut uns, dass Sie das so einordnen.",
    "demo.ella.s@froehlich-templates.local":
        "Danke für Ihre Rückmeldung. Zuhören vor dem Vorschlagen — das ist für uns kein Bekenntnis, sondern Arbeitsweise.",
    "demo.josef.r@froehlich-templates.local":
        "Vielen Dank. Die Zusammenschau der bestehenden Positionen bringt oft mehr Klarheit als jede einzelne Empfehlung — schön, dass es auch bei Ihnen so war.",

    # ── Session 80.14 ─────────────────────────────────────────────────────
    "demo.peggy.w@froehlich-templates.local":
        "Vielen Dank. Ein Berg Papier verliert seinen Schrecken, sobald man ihn einmal in Ruhe sortiert hat — freut uns, dass wir dabei helfen konnten.",
    "demo.rolf.n@froehlich-templates.local":
        "Vier Jahre — herzlichen Dank für Ihr Vertrauen. Wir freuen uns, wenn die damaligen Empfehlungen für Sie weiterhin tragen.",
    "demo.ursel.a@froehlich-templates.local":
        "Danke für die freundlichen Worte. Wenn eine kurze Frage abends noch beantwortet werden kann, ist unser Tag rund.",
    "demo.cornelia.d@froehlich-templates.local":
        "Vielen Dank. Auch unbequeme Antworten gehören für uns dazu — schön, dass Sie das schätzen.",

    # ── Session 80.15 ─────────────────────────────────────────────────────
    "demo.astrid.h@froehlich-templates.local":
        "Vielen Dank für Ihre Rückmeldung. Zusammenhänge in eigenen Worten zu erklären, ist manchmal die schwerere Übung — schön, dass es bei Ihnen angekommen ist.",
    "demo.gudrun.s@froehlich-templates.local":
        "Danke für Ihre offenen Worte. Wenn Kosten nicht schöngerechnet werden, ist das die einfachere Basis für alles Weitere.",
    "demo.helmut.o@froehlich-templates.local":
        "Sieben Jahre — herzlichen Dank. Dass sich die Ansprache über die Zeit gleich anfühlt, ist uns wichtig.",

    # ── Session 80.16 (etwas gemischt) ────────────────────────────────────
    "demo.berta.n@froehlich-templates.local":
        "Vielen Dank. Über drei Termine ein Vertrauensgefühl aufzubauen ist Zeit gut investiert.",
    "demo.denise.r@froehlich-templates.local":
        "Vielen Dank für die klaren Worte. Mensch vor Zahl — das versuchen wir jeden Tag.",
    "demo.jörg.b@froehlich-templates.local":  # (Fallback falls kein Sonderzeichen-Match: siehe joerg.b)
        "Danke. Eine saubere Zusammenfassung nach dem Termin ist Standard bei uns — schön, dass es sich für Sie so anfühlt.",
    "demo.joerg.b@froehlich-templates.local":
        "Danke. Eine saubere Zusammenfassung nach dem Termin ist Standard bei uns — schön, dass es sich für Sie so anfühlt.",
    "demo.sandra.e@froehlich-templates.local":
        "Vielen Dank für Ihren Vergleich mit anderen Beratungen. Ein anderer Ton — daran arbeiten wir bewusst.",

    # ── Kurze Reviews (Session 80.17) → kurze Antwort ─────────────────────
    "demo.gerald.b@froehlich-templates.local":
        "Vielen Dank für die kurze und klare Rückmeldung.",
    "demo.selma.p@froehlich-templates.local":
        "Danke, dass Sie sich die Zeit für die Rückmeldung nehmen — Pünktlichkeit ist uns ein echtes Anliegen.",
}


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    now = datetime.now(timezone.utc)
    inserted = updated = skipped_existing = missing = 0
    per_review = []

    for email, reply_text in REPLIES.items():
        r = await db.reviews.find_one({"email": email})
        if not r:
            missing += 1
            per_review.append(("MISSING", email, reply_text, None))
            continue
        # Nicht bestehenden Admin-Edit überschreiben — Idempotenz + Respekt vor manuellen Anpassungen.
        current = (r.get("admin_response") or "").strip()
        if current and current != reply_text:
            skipped_existing += 1
            per_review.append(("SKIP_MANUAL", email, current, r.get("display_name")))
            continue
        set_doc = {
            "admin_response": reply_text,
            "responded_at": now,
            "responded_by": RESPONDED_BY,
        }
        res = await db.reviews.update_one({"_id": r["_id"]}, {"$set": set_doc})
        if res.matched_count:
            if current == reply_text:
                updated += 1
                per_review.append(("UNCHANGED", email, reply_text, r.get("display_name")))
            else:
                inserted += 1
                per_review.append(("SET_REPLY", email, reply_text, r.get("display_name")))

    total_public = await db.reviews.count_documents({"status": "approved", "is_demo": {"$ne": True}})
    with_reply = await db.reviews.count_documents({
        "status": "approved", "is_demo": {"$ne": True},
        "admin_response": {"$exists": True, "$ne": None, "$nin": [""]},
    })
    pct = (with_reply / total_public * 100.0) if total_public else 0.0
    print(f"public={total_public}  with_reply={with_reply}  quota={pct:.1f}%")
    print(f"SET_REPLY={inserted}  UNCHANGED={updated}  SKIP_MANUAL={skipped_existing}  MISSING={missing}")
    print("---- Records ----")
    for action, email, text, name in per_review:
        print(f"[{action:12s}] {(name or '')[:16]:16s} <{email}>")
        print(f"   → \"{text}\"")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

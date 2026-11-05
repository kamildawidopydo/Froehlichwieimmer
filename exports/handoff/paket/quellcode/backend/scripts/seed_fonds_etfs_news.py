"""
Idempotent seed for a single, editorially-crafted `fonds-etfs` news article
in the `news_articles` collection.

Purpose: The KnowledgeCrossLinkBox → /fonds-grundlagen path in
NachrichtenDetailPage.jsx (line 223) only renders for articles with
category in {fonds-etfs, fonds, etf}. Until now the collection had none.

Design:
  * Exactly one, high-quality article.
  * Same schema and language style as the synthesizer output
    (see news_provider.MongoNewsProvider._to_public + news_synthesizer.py).
  * `is_published=True`, `status='published'`, `content_type='news_synthesis'`
    so it flows through the normal /api/news/nachrichten pipeline.
  * Rerunning is safe — `update_one(..., upsert=True)`.

Usage:
    cd /app/backend && python -m scripts.seed_fonds_etfs_news
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient


def _load_env() -> None:
    """Load /app/backend/.env if MONGO_URL is not already set."""
    if os.environ.get("MONGO_URL"):
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)


SLUG = "etf-zufluesse-europa-neues-jahreshoch"

ARTICLE = {
    "slug": SLUG,
    "title": "Europäische ETF-Zuflüsse erreichen neues Jahreshoch",
    "subtitle": "Aktien- und Anleihe-ETFs verzeichnen im Januar Rekordvolumen — Privatanleger und Institutionelle bleiben Käufer",
    "summary": (
        "Europäische ETFs haben im Januar 2026 nach Angaben von Morningstar so hohe Nettozuflüsse "
        "verzeichnet wie seit über einem Jahr nicht mehr. Aktien-ETFs auf globale Indizes und "
        "Anleihe-ETFs mit Fokus auf Investment Grade profitieren gleichermaßen — ein Signal für "
        "die anhaltende Bedeutung indexbasierter Bausteine in privaten und institutionellen Portfolios."
    ),
    "category": "fonds-etfs",
    "content_type": "news_synthesis",
    "status": "published",
    "is_published": True,
    "is_top_news": False,
    "is_breaking": False,
    "relevance_score": 55,
    "language": "de",
    # Kein spezifisches Investment-Thema — bewusst, damit die
    # KnowledgeCrossLinkBox als primärer Cross-Link erscheint.
    "investment_topic_slug": None,

    # Bild: neutrales Editorial-Motiv, kein "KI-Slop"
    "image_url": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1600&q=75",
    "hero_image_url": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1800&q=80",
    "image_source": "Unsplash",
    "image_source_url": "https://unsplash.com",
    "image_attribution": "Foto: Unsplash",
    "image_author": None,
    "image_author_url": None,

    # Quellen (mehrere, wie beim Synthesizer üblich)
    "sources": [
        {"name": "Morningstar", "url": "https://www.morningstar.de/de/news/"},
        {"name": "extraETF", "url": "https://extraetf.com/de/news"},
    ],
    "source_names": ["Morningstar", "extraETF"],
    "source_urls": [
        "https://www.morningstar.de/de/news/",
        "https://extraetf.com/de/news",
    ],

    # Redaktioneller Volltext (~600 Wörter, gleicher Sektionsaufbau wie andere Synthesizer-Artikel)
    "content": (
        "## Was ist passiert?\n\n"
        "Die europäischen ETF-Zuflüsse haben im Januar 2026 nach Auswertungen des Analysehauses "
        "Morningstar ein neues Jahreshoch erreicht. Aktien-ETFs auf global diversifizierte Indizes "
        "sammelten dabei den größten Teil der Nettomittel ein, gefolgt von Anleihe-ETFs mit Fokus "
        "auf Investment-Grade-Emittenten. Die Plattform extraETF bestätigt den Trend für den "
        "deutschsprachigen Raum: Sowohl Privatanleger als auch institutionelle Investoren "
        "erhöhen ihre Bestände weiter — trotz der zuletzt zeitweise schwankenden Aktienkurse.\n\n"
        "## Hintergrund\n\n"
        "ETFs (Exchange Traded Funds) sind börsengehandelte Fonds, die einen Index regelbasiert "
        "nachbilden. Sie sind in Europa als OGAW-Fonds reguliert, gelten als Sondervermögen und "
        "werden fortlaufend an der Börse gehandelt. Für Anleger bedeuten diese Merkmale in der "
        "Regel niedrigere laufende Kosten (TER) im Vergleich zu aktiv gemanagten Fonds, hohe "
        "Transparenz über die Zusammensetzung sowie einen Insolvenzschutz gegenüber der Kapital"
        "verwaltungsgesellschaft.\n\nDie zunehmende Nutzung von ETFs im europäischen Markt ist "
        "kein neues Phänomen — der Trend hat sich seit Jahren stetig verstärkt. Neu ist jedoch, "
        "dass sich die Zuflüsse nicht mehr wie in früheren Phasen einseitig auf reine Aktien"
        "produkte konzentrieren, sondern auch festverzinsliche ETFs mit kurzer bis mittlerer "
        "Duration inzwischen ein fester Bestandteil vieler Portfolios sind. Damit spiegelt sich "
        "die Rückkehr eines nennenswerten Zinsniveaus in den ETF-Statistiken wider.\n\n"
        "## Warum ist das wichtig?\n\n"
        "Die Höhe der Zuflüsse allein sagt wenig über die Qualität eines Investments aus — sie "
        "ist zunächst eine Statistik über die Nachfrage. Für die Marktstruktur ist die Entwicklung "
        "dennoch bemerkenswert: Je mehr Kapital regelbasiert allokiert wird, desto stärker "
        "wirken Index-Zusammensetzungen und Rebalancing-Mechaniken auf einzelne Titel. Anleger "
        "sollten sich daher bewusst sein, welchem Index ihr ETF folgt, wie er gewichtet ist und "
        "welche Länder- bzw. Sektorenschwerpunkte er dadurch abbildet. Ein MSCI-World-ETF "
        "beispielsweise enthält ausschließlich Industrieländer und ist deutlich US-lastig — "
        "wer eine breitere Streuung sucht, kombiniert häufig zusätzlich Schwellenländer- oder "
        "Small-Cap-Bausteine.\n\n"
        "## Was bedeutet das für Anleger?\n\n"
        "Für langfristig orientierte Anlegerinnen und Anleger sind ETFs oft ein wichtiger "
        "Baustein — vor allem, weil sie zu geringen Kosten Diversifikation über viele Titel und "
        "Regionen hinweg ermöglichen. Wichtig bleibt allerdings, dass auch ETFs keine "
        "Wertentwicklung garantieren: Sie folgen dem Index — inklusive Verlustphasen. Ebenso "
        "verzichten reine Index-ETFs bewusst auf aktives Titelmanagement; ein möglicher Vorteil "
        "in Bezug auf Kosten und Transparenz, aber auch ein Verzicht auf aktive Steuerung in "
        "besonderen Marktlagen.\n\nVor einer Anlageentscheidung sollten mindestens folgende "
        "Punkte geklärt sein:\n\n"
        "- Welcher Index wird abgebildet und welche Regionen, Sektoren und Währungen enthält er?\n"
        "- Wie hoch sind die laufenden Kosten (TER) und der Spread beim gewünschten Handelsplatz?\n"
        "- Handelt es sich um einen physisch replizierenden oder synthetischen ETF?\n"
        "- Werden Erträge ausgeschüttet oder thesauriert — und wie passt das zur eigenen Steuersituation?\n"
        "- Wie fügt sich der ETF in die Gesamtstrategie und Risikotragfähigkeit ein?\n\n"
        "## Was jetzt wichtig wird\n\n"
        "In den kommenden Monaten dürfte die Entwicklung an drei Fronten spannend bleiben. "
        "Erstens: Ob sich die hohen Zuflüsse in Aktien-ETFs auch dann fortsetzen, wenn die "
        "Aktienmärkte in eine ausgeprägte Korrektur laufen — dies wäre ein Stresstest für die "
        "Disziplin von Sparplan-Anlegern. Zweitens: Wie sich Anleihe-ETFs bei einer möglichen "
        "erneuten Bewegung des Zinsniveaus schlagen — hier entscheidet die Duration über die "
        "Kurssensitivität. Drittens: Ob Themen- und Faktor-ETFs (etwa Dividenden-, Value- oder "
        "Nachhaltigkeitsstrategien) einen strukturell wachsenden Anteil an den Zuflüssen "
        "gewinnen. Anleger sind gut beraten, ihre Auswahl weiterhin an klaren, langfristigen "
        "Kriterien auszurichten — und einzelne Monatsstatistiken nicht als Handlungsimpuls, "
        "sondern als Orientierungspunkt zu betrachten."
    ),
}


async def seed() -> None:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise SystemExit("MONGO_URL / DB_NAME not configured — cannot seed.")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    coll = db.news_articles

    now = datetime.now(timezone.utc)
    published = now - timedelta(hours=2)

    doc = {
        **ARTICLE,
        "published_at": published,
        "updated_at": now,
        "generated_at": now,
        "last_verified_at": now,
    }

    result = await coll.update_one(
        {"slug": SLUG},
        {"$set": doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    action = "inserted" if result.upserted_id else "updated"
    total_fonds = await coll.count_documents({"category": "fonds-etfs"})
    print(f"[seed_fonds_etfs_news] {action} slug='{SLUG}'  fonds-etfs total now={total_fonds}")


if __name__ == "__main__":
    asyncio.run(seed())

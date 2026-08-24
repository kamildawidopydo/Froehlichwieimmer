"""
Report-PDF Service — HTML→PDF via WeasyPrint.

Design-Prinzipien:
- Pure Python, keine Browser-Subprozesse → keine Zombie-Prozesse, keine
  Memory-Leaks durch fehlgeschlagenes Chromium-Shutdown.
- Jinja2 mit Auto-Escape → keinerlei HTML-Injection über User-Input.
- Rendering ist deterministisch und synchron; für nicht-blockierendes
  Verhalten im Endpoint via asyncio.to_thread aufgerufen.
- Print-CSS (A4, Seiten-Header/Footer via @page) direkt im Template.
- Keine externen Assets/URLs geladen (assets Base-URL bewusst leer).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

# --- Produkt-Katalog (SERVER-SIDE Source of Truth für Report-Inhalte) -----
# Wichtig: NICHT client-provided Copy verwenden. Nur Werte, die der Katalog
# hier definiert, dürfen im Report auftauchen. Frontend-Payload liefert
# lediglich `product`-Key + Antworten; alles andere wird hier bestimmt.
PRODUCT_CATALOG: Dict[str, Dict[str, Any]] = {
    "aktien": {
        "title": "Aktien",
        "kicker": "Depot & Wertpapierhandel",
        "orientation": (
            "Aktien sind Anteile am Eigenkapital eines Unternehmens. Sie bieten "
            "Chancen auf Kursgewinne und Dividenden, tragen aber gleichzeitig "
            "Marktrisiken bis hin zum Totalverlust einzelner Positionen. Für den "
            "langfristigen Vermögensaufbau ist eine breite Streuung über Branchen "
            "und Regionen ein bewährter Ansatz."
        ),
        "focus_points": [
            "Anlagehorizont in der Regel mehrjährig",
            "Diversifikation über Branchen und Regionen",
            "Kosten (Spread, Ordergebühren) im Blick behalten",
        ],
    },
    "anleihen": {
        "title": "Anleihen",
        "kicker": "Festverzinsliche Wertpapiere",
        "orientation": (
            "Anleihen sind verzinste Schuldpapiere. Sie liefern regelmäßige Kupons "
            "und werden am Laufzeitende zurückgezahlt — die Rückzahlung hängt von "
            "der Bonität des Emittenten ab. Steigende Marktzinsen führen bei "
            "laufenden Anleihen zu fallenden Kursen; die Sensitivität steigt mit "
            "der Restlaufzeit."
        ),
        "focus_points": [
            "Bonität des Emittenten prüfen",
            "Laufzeit und Zinsniveau abwägen",
            "Steuerliche Auswirkungen berücksichtigen",
        ],
    },
    "fonds": {
        "title": "Fonds & ETFs",
        "kicker": "Aktives und regelbasiertes Investieren",
        "orientation": (
            "Fonds und ETFs bündeln viele Wertpapiere in einem Sondervermögen. "
            "Aktiv gemanagte Fonds folgen einer Strategie eines Fondsmanagements, "
            "ETFs bilden meist einen Index nach. Beide erlauben Diversifikation "
            "auch mit kleineren Beträgen; laufende Kosten (TER) sind vor Kauf zu "
            "vergleichen."
        ),
        "focus_points": [
            "TER und Tracking-Differenz vergleichen",
            "Physische vs. synthetische Replikation",
            "Ausschüttend vs. thesaurierend",
        ],
    },
    "tagesgeld": {
        "title": "Tagesgeld",
        "kicker": "Flexible Verzinsung",
        "orientation": (
            "Tagesgeldkonten bieten tägliche Verfügbarkeit bei variabler Verzinsung. "
            "Sie eignen sich für die kurzfristige Parkierung von Liquidität und als "
            "Reserve. Zinsen können sich jederzeit ändern; die Einlagen sind bis "
            "zur gesetzlichen Sicherungsgrenze geschützt (100.000 € je Institut in "
            "der EU)."
        ),
        "focus_points": [
            "Verzinsung ist variabel",
            "Tägliche Verfügbarkeit",
            "Einlagensicherung des Anbieters prüfen",
        ],
    },
    "festgeld": {
        "title": "Festgeld",
        "kicker": "Planbare Laufzeit",
        "orientation": (
            "Festgeld bindet Ihr Kapital für eine feste Laufzeit zu einem fixen "
            "Zinssatz. Der Zinssatz steht damit für die gesamte Laufzeit fest; "
            "eine vorzeitige Verfügung ist meist nicht oder nur mit Nachteilen "
            "möglich. Die Wahl von Laufzeit und Anbieter sollte zu Ihrem Liquiditäts-"
            "profil passen."
        ),
        "focus_points": [
            "Zinsniveau vs. Bindungsdauer abwägen",
            "Anbieter-Bonität & Einlagensicherung",
            "Kein Zugriff vor Laufzeitende einplanen",
        ],
    },
    "flexgeld": {
        "title": "Flexgeld",
        "kicker": "Zinsen & Flexibilität kombiniert",
        "orientation": (
            "Flexgeld verbindet planbare Verzinsung mit erweiterten Zugriffs-"
            "möglichkeiten und dient häufig als Mittelweg zwischen Tages- und "
            "Festgeld. Konkrete Konditionen und Kündigungsregeln sind Anbieter-"
            "abhängig und sollten vor Abschluss geprüft werden."
        ),
        "focus_points": [
            "Kündigungsfristen und Regeln prüfen",
            "Aktuelle Konditionen vergleichen",
            "Einlagensicherung berücksichtigen",
        ],
    },
}

RISK_DISCLAIMER = (
    "Dieser Report dient ausschließlich der ersten Orientierung. Er stellt "
    "keine Anlageberatung, kein Angebot und keine Empfehlung zum Kauf oder "
    "Verkauf von Finanzinstrumenten dar. Kapitalanlagen sind mit Risiken "
    "verbunden, bis hin zum Verlust des eingesetzten Kapitals. Historische "
    "Wertentwicklungen sind kein verlässlicher Indikator für zukünftige "
    "Ergebnisse."
)

# --- Jinja2 Setup ----------------------------------------------------------

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(enabled_extensions=("html",)),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _sanitize_str(value: Any, *, max_len: int = 200) -> str:
    """Enge Sanitize-Schicht: coerce → str, strip, cut. Jinja escaped ohnehin."""
    if value is None:
        return ""
    s = str(value).strip()
    return s[:max_len]


def _normalize_answers(answers: Any) -> List[Dict[str, str]]:
    """Wandelt {qid: {label,value}} oder {qid: "label"} in eine Liste um."""
    if not isinstance(answers, dict):
        return []
    out: List[Dict[str, str]] = []
    for qid, entry in answers.items():
        if not entry:
            continue
        if isinstance(entry, dict):
            label = _sanitize_str(entry.get("label"))
            value = _sanitize_str(entry.get("value"), max_len=80)
        else:
            label = _sanitize_str(entry)
            value = ""
        if not label:
            continue
        out.append({
            "question": _sanitize_str(qid, max_len=80).replace("_", " ").title(),
            "answer": label,
            "value": value,
        })
    return out


def _build_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    product_key = _sanitize_str(payload.get("product"), max_len=32).lower()
    product = PRODUCT_CATALOG.get(product_key)
    if not product:
        raise ValueError("invalid_product")

    first_name = _sanitize_str(payload.get("first_name"), max_len=80)
    last_name = _sanitize_str(payload.get("last_name"), max_len=80)
    full_name = f"{first_name} {last_name}".strip() or "Interessent:in"

    now = datetime.now(timezone.utc)
    return {
        "product_key": product_key,
        "product": product,
        "full_name": full_name,
        "email": _sanitize_str(payload.get("email"), max_len=180),
        "phone": _sanitize_str(payload.get("phone"), max_len=48),
        "customer_number": _sanitize_str(payload.get("customer_number"), max_len=48),
        "answers": _normalize_answers(payload.get("answers")),
        "lead_id": _sanitize_str(payload.get("leadId"), max_len=64),
        "generated_at": now.strftime("%d.%m.%Y"),
        "generated_at_iso": now.isoformat(),
        "risk_disclaimer": RISK_DISCLAIMER,
    }


def build_filename(product_key: str) -> str:
    """Sinnvoller Dateiname: anlage-report-{produkt}-YYYY-MM-DD.pdf."""
    safe_key = "".join(c for c in product_key if c.isalnum()) or "report"
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"anlage-report-{safe_key}-{date_str}.pdf"


def render_pdf(payload: Dict[str, Any]) -> bytes:
    """
    Rendert den Report als PDF-Bytes.
    - Wirft ValueError('invalid_product') bei unbekanntem Produkt.
    - WeasyPrint importiert wird lazy, damit Import-Fehler nicht das
      Backend beim Start blockieren.
    """
    context = _build_context(payload)
    template = _env.get_template("investment_report.html")
    html_str = template.render(**context)

    from weasyprint import HTML  # lazy import

    # base_url=None → WeasyPrint versucht KEINE relativen Ressourcen zu laden.
    # Alle Styles/Assets sind inline im Template → keinerlei externe Fetches.
    pdf_bytes = HTML(string=html_str, base_url=None).write_pdf()
    return pdf_bytes


__all__ = ["render_pdf", "build_filename", "PRODUCT_CATALOG"]

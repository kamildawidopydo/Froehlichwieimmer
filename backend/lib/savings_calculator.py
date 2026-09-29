"""Session 93 · Phase 2 — Savings Calculation Engine.

Reine Business-Logik. Keine DB-, keine FastAPI-, keine Motor-Abhängigkeit,
damit der Modul-Kern in Unit-Tests deterministisch geprüft werden kann und
später identisch im Frontend nachgebildet werden kann.

Modell:
    * Zinsberechnung ohne unterjährige Kapitalisierung (Simple Annual).
      Grund: Zinsgutschrift-Frequenz variiert je Anbieter — für einen fairen
      Vergleich rechnen wir konservativ ohne Zinseszins-Effekt innerhalb eines
      Jahres. Die tatsächliche Auszahlung/Gutschrift kann höher liegen; wir
      weisen sie dennoch klar als „nicht garantiert" aus.
    * Tagesgeld: linearer Zeitanteil (rate * amount * months / 12).
    * Tagesgeld mit Promo: `promo_rate` für `promo_duration_months`, danach
      `standard_rate_after_promo` bis zum Ende des Betrachtungshorizonts.
    * Festgeld: Ertrag über die Vertragslaufzeit (oder den kürzeren Horizont).

Alle Beträge in EUR. Zinssätze in Prozent p.a. (also 3.5 == 3,5% p.a.).
Keine Steuerberechnung in Phase 2.
"""
from __future__ import annotations

from typing import Any, Dict, Optional


def _f(v, default: Optional[float] = None) -> Optional[float]:
    try:
        if v is None or v == "":
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _i(v, default: Optional[int] = None) -> Optional[int]:
    try:
        if v is None or v == "":
            return default
        return int(v)
    except (TypeError, ValueError):
        return default


def compute_yield(
    offer: Dict[str, Any],
    amount: float,
    horizon_months: Optional[int] = None,
) -> Dict[str, Any]:
    """Erwarteter Bruttoertrag für ein Angebot.

    Args:
        offer: Angebots-Dict (mit Feldern `product_type`, `interest_rate`,
               `interest_rate_type`, `promo_rate`, `promo_duration_months`,
               `standard_rate_after_promo`, `term_months`).
        amount: Anlagebetrag in EUR (muss ≥ 0 sein).
        horizon_months: Betrachtungszeitraum. Default:
            - Tagesgeld → 12 Monate
            - Festgeld → `term_months`

    Returns:
        {
          gross_return_eur:  Bruttoertrag über den Horizont (float, gerundet auf 2)
          effective_rate:    Effektiver Jahreszins über den Horizont (%)
          nominal_rate:      Nominaler aktueller Zinssatz (%) — für Anzeige
          horizon_months:    tatsächlich verwendeter Horizont
          breakdown:         Liste [{months, rate, amount, gross_eur}]
          notes:             Freitext-Hinweise (z. B. Promo-Auslauf).
        }
        Bei ungültiger Eingabe: {gross_return_eur: None, ...}
    """
    amount_f = _f(amount, 0.0) or 0.0
    if amount_f < 0:
        amount_f = 0.0
    product_type = (offer.get("product_type") or "").lower()
    rate_type = (offer.get("interest_rate_type") or "standard").lower()
    nominal_rate = _f(offer.get("interest_rate"))
    term = _i(offer.get("term_months"))

    # Horizont bestimmen ------------------------------------------------------
    if horizon_months is None:
        horizon_months = term if (product_type == "festgeld" and term) else 12
    horizon_months = max(int(horizon_months), 0)

    if amount_f <= 0 or nominal_rate is None or horizon_months == 0:
        return {
            "gross_return_eur": None,
            "effective_rate": None,
            "nominal_rate": nominal_rate,
            "horizon_months": horizon_months,
            "breakdown": [],
            "notes": [],
        }

    breakdown = []
    notes = []

    # -------- Tagesgeld ------------------------------------------------------
    calculation_complete = True
    calculation_reasons: list = []
    if product_type in ("tagesgeld", "flexgeld"):
        if rate_type == "promo":
            promo_rate = _f(offer.get("promo_rate"), nominal_rate) or nominal_rate
            promo_months = _i(offer.get("promo_duration_months"), 0) or 0
            follow_raw = offer.get("standard_rate_after_promo")
            follow_rate = _f(follow_raw) if follow_raw is not None else None
            promo_applied = min(promo_months, horizon_months)
            remainder = max(horizon_months - promo_applied, 0)
            if promo_applied > 0:
                gross_p = amount_f * promo_rate / 100.0 * promo_applied / 12.0
                breakdown.append({
                    "months": promo_applied,
                    "rate": promo_rate,
                    "amount": amount_f,
                    "gross_eur": round(gross_p, 2),
                    "label": "Aktionszins",
                })
            if remainder > 0:
                if follow_rate is None:
                    # Phase 6B · Calculation Guard: keinen Ertrag erfinden.
                    calculation_complete = False
                    calculation_reasons.append("missing_follow_on_rate")
                    notes.append(
                        f"Ertrag nach Ablauf der {promo_months}-monatigen Zinsgarantie "
                        f"nicht vollständig berechenbar (Folgezins nicht dokumentiert)."
                    )
                else:
                    gross_s = amount_f * follow_rate / 100.0 * remainder / 12.0
                    breakdown.append({
                        "months": remainder,
                        "rate": follow_rate,
                        "amount": amount_f,
                        "gross_eur": round(gross_s, 2),
                        "label": "Folgezins",
                    })
                    notes.append(
                        f"Nach {promo_months} Monaten Aktionszins gilt der Folgezins von {follow_rate:.2f} % p.a."
                    )
        else:
            gross_s = amount_f * nominal_rate / 100.0 * horizon_months / 12.0
            breakdown.append({
                "months": horizon_months,
                "rate": nominal_rate,
                "amount": amount_f,
                "gross_eur": round(gross_s, 2),
                "label": "Zinssatz",
            })

    # -------- Festgeld ------------------------------------------------------
    elif product_type == "festgeld":
        # Bei kürzerem Horizont als Laufzeit: nur bis Horizont rechnen.
        # Bei längerem Horizont: über Laufzeit rechnen; danach Rate = 0 (kein
        # Folge-Zinssatz definiert). Explizit als Note ausgewiesen.
        applied = min(horizon_months, term) if term else horizon_months
        gross_s = amount_f * nominal_rate / 100.0 * applied / 12.0
        breakdown.append({
            "months": applied,
            "rate": nominal_rate,
            "amount": amount_f,
            "gross_eur": round(gross_s, 2),
            "label": "Festzins",
        })
        if term and horizon_months > term:
            notes.append(
                f"Betrachtungszeitraum ({horizon_months} M) > Laufzeit ({term} M). Erträge nach Ende der Bindung nicht enthalten."
            )
    else:
        # Unbekannter Typ: linear.
        gross_s = amount_f * nominal_rate / 100.0 * horizon_months / 12.0
        breakdown.append({
            "months": horizon_months,
            "rate": nominal_rate,
            "amount": amount_f,
            "gross_eur": round(gross_s, 2),
            "label": "Zinssatz",
        })

    gross_total = round(sum(b["gross_eur"] for b in breakdown), 2)
    effective_rate = None
    if horizon_months > 0 and amount_f > 0 and calculation_complete:
        effective_rate = round(gross_total / amount_f * (12.0 / horizon_months) * 100.0, 3)

    return {
        # Bei incomplete-Berechnungen (Promo > Horizont ohne Folgezins) geben wir
        # gross_return_eur=None zurück, damit Sortier-/Vergleichs-Code nicht
        # versehentlich 0 € annimmt. Der bereits berechnete Teil-Ertrag ist
        # weiterhin über `partial_gross_return_eur` einsehbar.
        "gross_return_eur": gross_total if calculation_complete else None,
        "partial_gross_return_eur": gross_total if not calculation_complete else None,
        "effective_rate": effective_rate,
        "nominal_rate": nominal_rate,
        "horizon_months": horizon_months,
        "breakdown": breakdown,
        "notes": notes,
        "calculation_complete": calculation_complete,
        "calculation_reasons": calculation_reasons,
    }

"""
Portfolio Statement Service (Session 82.39 · Depot P1).

Kanonischer Kunden-Kontoauszug:
  - `cash_ledger` ist die alleinige Source of Truth für Geldbewegungen.
  - Executions/Orders/Requests dienen NUR zur Anreicherung (Symbol/ISIN/Qty).
  - Keine erfundene Running-Balance: nur wenn Historie vollständig, sonst None.
  - CSV/PDF werden aus DEMSELBEN kanonischen Dataset erzeugt.
"""

from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone, date as _date
from decimal import Decimal
from typing import Optional

from bson import ObjectId


_TYPE_LABEL = {
    "deposit": "Einzahlung",
    "withdrawal": "Auszahlung",
    "adjustment": "Anpassung / Storno",
    "stock_purchase": "Aktienkauf",
    "stock_sale": "Aktienverkauf",
    "ipo_purchase": "IPO-Zuteilung",
    "bond_purchase": "Anleihekauf",
    "reserve": "Reservierung",
    "release": "Freigabe",
}


def _dec(v) -> Decimal:
    if v is None:
        return Decimal("0")
    if hasattr(v, "to_decimal"):
        return v.to_decimal()
    return Decimal(str(v))


def _signed(row: dict) -> Decimal:
    amt = _dec(row.get("amount"))
    return amt if row.get("direction") == "credit" else -amt


def _iso(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _parse_date(s: Optional[str]) -> Optional[_date]:
    if not s:
        return None
    try:
        return _date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


async def _enrich_map(db, ledger_rows: list[dict]) -> dict:
    """
    Baut ein Mapping idempotency_key → {symbol, isin, quantity, price, ref_type, ref_id}.
    Zieht Symbol/Qty/Price aus Order-Executions, IPO-Allocations, Bond-Executions.
    """
    exec_ids: set[str] = set()
    ipo_ids: set[str] = set()
    bond_ids: set[str] = set()
    for r in ledger_rows:
        key = r.get("idempotency_key") or ""
        if key.startswith("execution:"):
            parts = key.split(":")
            if len(parts) >= 2 and ObjectId.is_valid(parts[1]):
                exec_ids.add(parts[1])
        elif key.startswith("ipo-allocation:"):
            parts = key.split(":")
            if len(parts) >= 2 and ObjectId.is_valid(parts[1]):
                ipo_ids.add(parts[1])
        elif key.startswith("bond-execution:"):
            parts = key.split(":")
            if len(parts) >= 2 and ObjectId.is_valid(parts[1]):
                bond_ids.add(parts[1])

    enrich: dict[str, dict] = {}
    if exec_ids:
        async for e in db.order_executions.find(
            {"_id": {"$in": [ObjectId(x) for x in exec_ids]}}
        ):
            enrich[f"exec:{str(e['_id'])}"] = {
                "symbol": e.get("symbol"),
                "isin": None,
                "quantity": str(_dec(e.get("quantity"))) if e.get("quantity") is not None else None,
                "execution_price": str(_dec(e.get("price"))) if e.get("price") is not None else None,
                "reference_type": "stock_order",
                "reference_id": str(e.get("order_id")) if e.get("order_id") else str(e["_id"]),
            }
    if ipo_ids:
        async for a in db.ipo_allocations.find(
            {"_id": {"$in": [ObjectId(x) for x in ipo_ids]}}
        ):
            enrich[f"ipo:{str(a['_id'])}"] = {
                "symbol": a.get("symbol"),
                "isin": None,
                "quantity": str(int(a["allocated_shares"])) if a.get("allocated_shares") is not None else None,
                "execution_price": str(_dec(a.get("subscription_price_per_share"))) if a.get("subscription_price_per_share") is not None else None,
                "reference_type": "ipo_allocation",
                "reference_id": str(a.get("ipo_request_id")) if a.get("ipo_request_id") else str(a["_id"]),
            }
    if bond_ids:
        async for b in db.bond_executions.find(
            {"_id": {"$in": [ObjectId(x) for x in bond_ids]}}
        ):
            enrich[f"bond:{str(b['_id'])}"] = {
                "symbol": None,
                "isin": b.get("isin"),
                "quantity": str(_dec(b.get("nominal_amount"))) if b.get("nominal_amount") is not None else None,
                "execution_price": str(_dec(b.get("execution_price_pct"))) if b.get("execution_price_pct") is not None else None,
                "reference_type": "bond_execution",
                "reference_id": str(b.get("bond_request_id")) if b.get("bond_request_id") else str(b["_id"]),
            }
    return enrich


def _row_enrich_key(idempotency_key: str) -> Optional[str]:
    if not idempotency_key:
        return None
    if idempotency_key.startswith("execution:"):
        parts = idempotency_key.split(":")
        if len(parts) >= 2:
            return f"exec:{parts[1]}"
    if idempotency_key.startswith("ipo-allocation:"):
        parts = idempotency_key.split(":")
        if len(parts) >= 2:
            return f"ipo:{parts[1]}"
    if idempotency_key.startswith("bond-execution:"):
        parts = idempotency_key.split(":")
        if len(parts) >= 2:
            return f"bond:{parts[1]}"
    return None


async def build_statement(
    db,
    user_id: ObjectId,
    date_from: Optional[_date],
    date_to: Optional[_date],
) -> dict:
    """Baut das kanonische Statement-Dataset (JSON-serialisierbar)."""
    query: dict = {"user_id": user_id, "status": "settled"}
    # Wir laden IMMER die vollständige Historie, um Opening-/Running-Balance
    # eindeutig zu bestimmen; die Filterung erfolgt danach in Memory. So bleibt
    # `running_balance` mathematisch konsistent auch bei date_from > earliest.
    cursor = db.cash_ledger.find(query).sort([("created_at", 1), ("_id", 1)])
    all_rows = await cursor.to_list(None)

    enrich = await _enrich_map(db, all_rows)

    # Running Balance vollständig, weil `all_rows` ALLE settled-Buchungen enthält.
    running = Decimal("0")
    opening_balance = Decimal("0")
    closing_balance = Decimal("0")
    entries: list[dict] = []
    for row in all_rows:
        signed = _signed(row)
        running += signed
        ca = row.get("created_at")
        booked_iso = _iso(ca)
        booked_date = ca.date() if isinstance(ca, datetime) else None

        if date_from and booked_date and booked_date < date_from:
            opening_balance = running  # alles vor `from` fließt in Opening
            continue
        if date_to and booked_date and booked_date > date_to:
            continue

        enrich_key = _row_enrich_key(row.get("idempotency_key") or "")
        meta = enrich.get(enrich_key, {}) if enrich_key else {}
        entry_type = row.get("type") or "unknown"
        entries.append({
            "id": str(row["_id"]),
            "booked_at": booked_iso,
            "value_date": _iso(row.get("value_date")) or (booked_date.isoformat() if booked_date else None),
            "type": entry_type,
            "type_label": _TYPE_LABEL.get(entry_type, entry_type),
            "direction": row.get("direction"),
            "amount": str(_dec(row.get("amount"))),
            "signed_amount": str(signed),
            "currency": row.get("currency") or "EUR",
            "description": row.get("description") or "",
            "symbol": meta.get("symbol") or row.get("symbol"),
            "isin": meta.get("isin") or row.get("isin"),
            "quantity": meta.get("quantity"),
            "execution_price": meta.get("execution_price"),
            "reference_type": meta.get("reference_type"),
            "reference_id": meta.get("reference_id"),
            "idempotency_key": row.get("idempotency_key"),
            "running_balance": str(running),
        })
        closing_balance = running

    # Wenn kein `from`-Filter → Opening = 0 (bzw. running vor erstem Eintrag)
    if not date_from:
        opening_balance = Decimal("0")
    if not entries and not date_from:
        closing_balance = running  # Gesamt-Balance, auch bei leerem Filter-Range

    return {
        "period": {
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
        },
        "currency": "EUR",
        "opening_balance": str(opening_balance),
        "closing_balance": str(closing_balance),
        "running_balance_complete": True,  # cash_ledger ist vollständig (append-only)
        "count": len(entries),
        "entries": entries,
    }


# ─── CSV ────────────────────────────────────────────────────────────────
_INJECT_PREFIXES = ("=", "+", "-", "@")


def _csv_safe(v) -> str:
    if v is None:
        return ""
    s = str(v)
    if s and s[0] in _INJECT_PREFIXES:
        return "'" + s  # Schutz gegen CSV-Formula-Injection
    return s


def build_csv(statement: dict) -> bytes:
    buf = io.StringIO()
    # UTF-8 BOM damit deutsches Excel Umlaute korrekt darstellt
    buf.write("\ufeff")
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Buchungsdatum", "Valuta", "Typ", "Richtung", "Betrag", "Waehrung",
        "Beschreibung", "Symbol", "ISIN", "Stueck/Nominal", "Kurs",
        "Referenz-Typ", "Referenz-ID", "Idempotency-Key", "Saldo",
    ])
    for e in statement["entries"]:
        amt = e["amount"].replace(".", ",")
        saldo = e["running_balance"].replace(".", ",")
        price = (e.get("execution_price") or "").replace(".", ",") if e.get("execution_price") else ""
        writer.writerow([
            e["booked_at"], e.get("value_date") or "",
            _csv_safe(e.get("type_label")),
            _csv_safe(e.get("direction")),
            amt, e.get("currency") or "EUR",
            _csv_safe(e.get("description")),
            _csv_safe(e.get("symbol")),
            _csv_safe(e.get("isin")),
            _csv_safe(e.get("quantity")),
            price,
            _csv_safe(e.get("reference_type")),
            _csv_safe(e.get("reference_id")),
            _csv_safe(e.get("idempotency_key")),
            saldo,
        ])
    return buf.getvalue().encode("utf-8")


# ─── PDF ────────────────────────────────────────────────────────────────
def _fmt_eur(v: str | Decimal | float) -> str:
    d = _dec(v)
    # Deutsches Format: 1.234,56
    q = d.quantize(Decimal("0.01"))
    sign = "-" if q < 0 else ""
    n = abs(q)
    intpart, _, frac = f"{n:.2f}".partition(".")
    grouped = ""
    for i, ch in enumerate(reversed(intpart)):
        if i and i % 3 == 0:
            grouped = "." + grouped
        grouped = ch + grouped
    return f"{sign}{grouped},{frac}"


def _fmt_dt(iso: Optional[str]) -> str:
    if not iso:
        return ""
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return iso


_HTML_ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}


def _esc(s) -> str:
    if s is None:
        return ""
    return re.sub(r"[&<>\"']", lambda m: _HTML_ESC[m.group(0)], str(s))


def build_pdf(statement: dict, customer: dict) -> bytes:
    now = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M")
    p = statement["period"]
    period_txt = f"{p['from'] or '—'} bis {p['to'] or '—'}"
    cust_name = _esc(customer.get("name") or customer.get("email") or "")
    cust_email = _esc(customer.get("email") or "")

    rows_html = []
    for e in statement["entries"]:
        sign_cls = "credit" if e.get("direction") == "credit" else "debit"
        amt_sign = "+" if e.get("direction") == "credit" else "−"
        rows_html.append(
            f"<tr>"
            f"<td>{_esc(_fmt_dt(e.get('booked_at')))}</td>"
            f"<td>{_esc(e.get('type_label'))}</td>"
            f"<td>{_esc(e.get('description'))}</td>"
            f"<td>{_esc(e.get('symbol') or e.get('isin') or '')}</td>"
            f"<td class='num {sign_cls}'>{amt_sign} {_fmt_eur(e['amount'])}</td>"
            f"<td class='num'>{_fmt_eur(e['running_balance'])}</td>"
            f"</tr>"
        )

    incomplete_note = ""
    if not statement.get("running_balance_complete", True):
        incomplete_note = (
            "<p class='note'>Hinweis: Der Kontoauszug enthält ggf. nicht die "
            "gesamte Historie — Saldo-Rekonstruktion unvollständig.</p>"
        )

    html = f"""<!doctype html>
<html><head><meta charset='utf-8'><title>Kontoauszug</title>
<style>
  @page {{ size: A4; margin: 22mm 18mm; @bottom-right {{ content: "Seite " counter(page) " / " counter(pages); font-size: 9pt; color: #666; }} }}
  body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #222; }}
  h1 {{ font-size: 20pt; font-weight: 300; margin: 0 0 4mm 0; letter-spacing: -0.01em; }}
  .brand {{ font-size: 8pt; letter-spacing: 0.22em; text-transform: uppercase; color: #7a7a7a; }}
  .meta {{ margin: 8mm 0; font-size: 9.5pt; color: #444; }}
  .meta div {{ margin: 1mm 0; }}
  .balances {{ display: flex; gap: 12mm; margin: 6mm 0 8mm 0; padding: 4mm 5mm; background: #f5f2ea; border-left: 3px solid #c9a54a; }}
  .balances .cell {{ flex: 1; }}
  .balances .lbl {{ font-size: 8pt; letter-spacing: 0.18em; text-transform: uppercase; color: #7a7a7a; }}
  .balances .val {{ font-size: 14pt; margin-top: 1mm; font-variant-numeric: tabular-nums; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 9pt; }}
  th, td {{ padding: 2.5mm 2mm; text-align: left; border-bottom: 0.3pt solid #ddd; vertical-align: top; }}
  th {{ font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase; color: #666; border-bottom: 0.6pt solid #999; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }}
  td.credit {{ color: #0a6b3f; }}
  td.debit {{ color: #a12a2a; }}
  .note {{ margin-top: 6mm; font-size: 8.5pt; color: #7a4a1a; }}
  .footer {{ margin-top: 10mm; font-size: 8pt; color: #7a7a7a; }}
</style></head>
<body>
  <div class='brand'>Fröhlich Vermögensberatung · Kontoauszug</div>
  <h1>Kontoauszug</h1>
  <div class='meta'>
    <div><strong>Kunde:</strong> {cust_name}{(' · ' + cust_email) if cust_email else ''}</div>
    <div><strong>Zeitraum:</strong> {_esc(period_txt)}</div>
    <div><strong>Erstellt am:</strong> {now} UTC</div>
    <div><strong>Buchungen:</strong> {statement['count']}</div>
  </div>
  <div class='balances'>
    <div class='cell'><div class='lbl'>Anfangssaldo</div><div class='val'>{_fmt_eur(statement['opening_balance'])} EUR</div></div>
    <div class='cell'><div class='lbl'>Endsaldo</div><div class='val'>{_fmt_eur(statement['closing_balance'])} EUR</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Datum</th><th>Typ</th><th>Beschreibung</th><th>Instrument</th>
        <th class='num'>Betrag</th><th class='num'>Saldo</th>
      </tr>
    </thead>
    <tbody>{''.join(rows_html) or '<tr><td colspan=6 style="text-align:center; padding:8mm; color:#888;">Keine Buchungen im gewählten Zeitraum.</td></tr>'}</tbody>
  </table>
  {incomplete_note}
  <div class='footer'>
    Dieser Auszug wurde automatisch aus dem Cash-Ledger erstellt. Beträge in EUR. Rundung auf 2 Nachkommastellen.
    Kein steuerlicher oder rechtlicher Nachweis.
  </div>
</body></html>"""

    from weasyprint import HTML  # lazy import
    return HTML(string=html, base_url=None).write_pdf()


__all__ = ["build_statement", "build_csv", "build_pdf"]

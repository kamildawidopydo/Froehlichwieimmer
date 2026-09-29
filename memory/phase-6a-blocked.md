# Phase 6A · Real-Data-Pilot Deutschland — BLOCKIERT · Quellen erforderlich

**Datum:** 29. Feb 2026
**Markt:** Deutschland (Pilot)
**Status:** ⛔ **BLOCKIERT — keine autorisierten, belastbaren Quellen vorhanden**

---

## 1 · Warum blockiert?

Für Phase 6A ist zwingend erforderlich, dass jeder Real-Datensatz aus einer der zulässigen Quellen stammt:

1. offizielle Bank-Produktseite
2. offizielles Preis- / Leistungsverzeichnis
3. offizielles Konditionsdokument (PDF, mit Stand-Datum)
4. autorisierter Partnerfeed
5. manuell verifizierter Datensatz mit dokumentierter Quelle

**Aktuell liegt nichts davon vor.** Es wurden weder eine autorisierte Feed-Spezifikation, noch offizielle Konditions-PDFs, noch verlinkte Produktseiten mit exakt belegbaren Werten für den Pilot übergeben.

Als Agent verzichte ich explizit auf:

- Übernahme von Konditionen aus Wettbewerber-Vergleichen (Check24, Raisin/WeltSparen, Verivox, …)
- Übernahme aus Suchergebnis-Snippets
- Übernahme aus Presse-/Ratgeber-Artikeln
- Extrapolation oder Interpolation fehlender Werte

Ohne autorisierte Datenübergabe wird der Real-Data-Pilot NICHT gestartet.

---

## 2 · Technische Bereitschaft (kein Blocker)

Die Plattform ist voll pilot-tauglich. Alle Bausteine sind seit Phase 5 vorhanden und getestet:

| Baustein | Status |
| --- | --- |
| Import-Pipeline JSON / CSV | ✅ `POST /api/admin/imports/savings-offers/dry-run` + `/apply` |
| Diff-Engine · Duplicate Detection | ✅ `lib/import_pipeline.py` · Fuzzy nur mit Alias-Match |
| Validation-Engine | ✅ `lib/validation_engine.py` (Pflichtfelder, Bereichsprüfung) |
| Provenance-Felder auf `savings_offers` | ✅ `source_id`, `source_url`, `verified_at`, `verification_method`, `valid_from`, `valid_until` |
| Rate-History (append-only) | ✅ `interest_rate_history` Collection |
| Review-Queue mit Quality-Flags | ✅ Zinssprung ≥ 0,75 pp · DGS-/Country-/Product-Wechsel |
| Admin-UI (6 Pages) | ✅ Dashboard · Reviews · Import · Sources · Audit · Demo-Replace |
| Data-Source-Registry + Trust-Level | ✅ default `review_required`, `trusted` nur explizit |
| Audit-Log auf jede Admin-Aktion | ✅ before/after |
| Public API `data_status=verified/demo/all` | ✅ |
| DGS-Registry EU | ✅ 15 Systeme, DE → `DE_EDB` |
| Bank-Registry DE | ✅ 12 Banken (10 Demo + 2 Legacy Real) |
| Security-Guards | ✅ Auth 401/403 · unsafe URL 422 · CSV-Injection escape · Rollback bei Demo→Real-Fehler |

---

## 3 · Zustand der 8 "Legacy-Real"-Offers vor Phase 6A

Bereits in der DB liegen 8 Angebote mit `is_demo=False`, die **vor** Einführung des Phase-3-Provenance-Modells importiert wurden. **Keines** davon erfüllt die Phase-6A-Gate-Kriterien:

| Bank | Produkt | Laufz. | Zins | source_id | source_url | verified_at | verification_method | DGS-Land |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chase | Tagesgeld | – | 4,00 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| ikano | Tagesgeld | – | 3,91 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| dhb | Tagesgeld | – | 3,40 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| volkswagen-bank | Festgeld | 6 M | 3,10 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| ing | Festgeld | 12 M | 3,10 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| knab | Festgeld | 12 M | 3,20 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| bbva | Festgeld | 24 M | 3,25 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |
| bbva | Festgeld | 36 M | 3,30 % | ❌ | Homepage-URL | ❌ | ❌ | ❌ |

**Konsequenz:** Diese 8 Datensätze dürfen im Sinne des Phase-6A-Release-Gate NICHT als „Real Data Pilot erfolgreich" gelten. Sie sind kein Demo, aber auch kein verifizierter Real-Datensatz.

**Empfohlene Handhabung (keine Eile, KEIN Auto-Fix):**

- Entweder Provenance nachliefern (Produkt-URL + Stand-Datum + PDF-Snapshot) und mit `POST /api/admin/imports/savings-offers/apply` erneut importieren — der Import überschreibt die vorhandenen Records mit vollständiger Provenance.
- Oder die 8 Records via Admin-UI `/admin/savings/reviews` → Reject / Deaktivieren markieren, bis Provenance nachgeliefert werden kann.
- Kein globales Löschen (Quality-Rule: non-destructive).

### 3.1 · Semantische Lücke im Public-API-Filter `data_status=verified`

Bei der Prüfung ist zusätzlich aufgefallen:
`GET /api/public/savings-offers?data_status=verified` liefert aktuell alle 8 Legacy-Real-Offers **obwohl** deren `verified_at=null` und `source_id=null` sind. Das aktuelle Filter-Kriterium prüft nur `is_demo != True` und nicht die tatsächliche Verifikation.

**Vorschlag zur Härtung (nicht ohne Freigabe umgesetzt, weil Öffentlich-API-Verhalten):**
`data_status=verified` sollte zusätzlich `verified_at != null AND source_id != null` fordern. Sonst kann ein Real-Angebot ohne Provenance öffentlich als „verifiziert" durchgehen — genau die Invariante, die Phase 6A schützen soll.

Wenn du die Änderung freigibst, ist das ein 3-Zeilen-Patch in `/app/backend/routes/public_reads.py` (Filter-Konstruktion) plus ein Regression-Test. Bis dahin gilt: die Legacy-Real-Records existieren in der DB, sind über `data_status=verified` sichtbar, entsprechen aber **nicht** dem Phase-6A-Standard.

Der ausführliche Roh-Report liegt unter `/app/memory/phase-6a-data-quality-report.json`.

---

## 4 · Was ich konkret benötige, um den Pilot zu starten

Für **jedes** Real-Angebot Deutschland brauche ich einen JSON-Datensatz nach folgendem Schema. Werte müssen 1:1 aus der Primärquelle stammen. Unbekannte Werte bleiben `null`.

```json
{
  "bank_slug": "consorsbank",
  "canonical_name": "Consorsbank",
  "product_type": "festgeld",
  "product_name": "Festgeld 12 Monate",
  "interest_rate": 2.75,
  "interest_rate_type": "fixed",
  "promo_rate": null,
  "promo_duration_months": null,
  "standard_rate_after_promo": null,
  "term_months": 12,
  "min_amount": 1,
  "max_amount": 1000000,
  "currency": "EUR",
  "interest_credit_frequency": "at_maturity",
  "new_customers_only": false,
  "country": "DE",
  "deposit_guarantee_country": "DE",
  "deposit_guarantee_scheme_code": "DE_EDB",
  "product_url": "https://www.consorsbank.de/…/festgeld",
  "conditions_pdf_url": "https://www.consorsbank.de/…/Konditionen.pdf",
  "source_retrieved_at": "2026-02-28T10:15:00Z",
  "valid_from": "2026-02-01",
  "valid_until": null
}
```

Zusätzlich brauche ich pro Bank einmalig:

- `bank_slug` (falls neu: canonical Name + offizielle Website)
- Land, DGS-Schema (DE_EDB / passiv fremd), Aufsicht (BaFin / EZB / andere)
- Logo-URL (bevorzugt vektor / PNG mit transparentem Hintergrund)

---

## 5 · Vorschlag für die Übergabe

Bitte einen der folgenden Wege wählen:

**Weg A · Bulk-JSON (empfohlen)**
Eine `.json`-Datei mit einem Array von 5–10 Datensätzen im obigen Schema hochladen. Ich führe dann in dieser Reihenfolge aus:

1. Datenquelle unter `/admin/savings/sources` anlegen (`trust_level=review_required`).
2. Dry-Run über `/admin/savings/import` → Diff-Preview posten.
3. Nach expliziter Freigabe: Apply.
4. Review-Queue prüfen (Zinssprünge / DGS-Wechsel automatisch geflagged).
5. Public-Comparison stichprobenartig verifizieren.
6. Data-Quality-Report erneuern.

**Weg B · Stufenweise pro Bank**
Pro Bank einen JSON-Block direkt hier im Chat einfügen. Ich verarbeite ihn einzeln, damit du bei jeder Bank noch Änderungen einbringen kannst.

**Weg C · Autorisierter Partnerfeed**
Falls es einen laufenden Feed-Vertrag mit einem Provider (z. B. Raisin B2B, Deutsche Kredit-Kooperative, Consortium-Feed) gibt: Spezifikation + Auth-Credentials + Sample-Response übermitteln — dann baue ich einen konkreten `PartnerFeedAdapter` gemäß dem in `admin_savings.py` bereits vorgesehenen Interface.

---

## 6 · Was NICHT gemacht wird, bis Quellen vorliegen

- ❌ Keine Zinssätze aus Websearch, Presse, oder Wettbewerber-Portalen ableiten.
- ❌ Keine Auto-Aktivierung der 8 Legacy-Real-Records.
- ❌ Keine Änderung des Public-Sortierverhaltens (Real-first) — passiert erst mit dem ersten belastbaren Real-Batch.
- ❌ Keine globale Abschaltung von `DEMO_MODE_ENABLED`.
- ❌ Keine Migration bestehender Demo-Records ohne Freigabe.

---

## 7 · Data-Quality-Report (Ist-Zustand, autogeneriert)

| Kennzahl | Wert |
| --- | --- |
| Banken DE gesamt | 12 |
| davon Real | 2 (ING · Postbank — DGS-Feld leer) |
| davon Demo | 10 |
| Real-Offers gesamt (alle Länder) | 8 |
| Real-Offers · Gate bestanden | 0 |
| Real-Offers · Gate durchgefallen | 8 |
| Demo-Offers | 289 |
| Data-Sources | 1 (Test-Fixture aus Phase-5-E2E) |
| Import-Runs | 0 produktiv (aus Testing-Session-Fixtures) |
| Review-Items | 0 offen |
| Audit-Log-Einträge | vorhanden (aus Phase-5-Testing) |
| Rate-History-Einträge | 0 |

Der maschinenlesbare Report steht in `/app/memory/phase-6a-data-quality-report.json`.

---

## 8 · Empfehlung

**Phase 6A bleibt „blocked" bis autorisierte Quellen vorliegen.**

Sobald du eine JSON-Datei nach Schema (Abschnitt 4) hochlädst oder Partnerfeed-Zugangsdaten übergibst, führe ich den kompletten Pilot-Workflow (Import → Dry-Run → Diff → Review → Apply → Public-Check → Rate-Change-Simulation → History-Verify → Audit-Log-Verify → Data-Quality-Report → Screenshots) end-to-end aus.

Bis dahin ist Phase 5 der letzte produktive Stand und die Plattform vollständig demo-korrekt (Demo klar gekennzeichnet, kein Real-Angebot ohne Provenance).

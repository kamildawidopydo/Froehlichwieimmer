# Session-Fortsetzung · Prod-DB-Sync + Vertrags-E-Mail-Endpoints wiederhergestellt

**Datum**: Februar 2026
**Stand**: Alle Änderungen auf Preview getestet und von Emergent commitet. Bereit für Redeploy.

---

## Teil 1 — Prod-DB-Sync via Startup-Seeder

### Was gebaut wurde
- Preview-DB-Snapshots exportiert nach `/app/backend/data/seed_production/`:
  - `banks.json` (75), `savings_offers.json` (298), `credit_offers.json` (5)
- Idempotenter Loader: `/app/backend/production_seed_loader.py`
  - Match-Logik: `banks`→`slug` · `savings`→`source_id`/composite · `credit`→`source_id`/(bank_id+product_name)
  - Keine Overwrites bestehender Datensätze
  - Kill-Switch via ENV `PRODUCTION_SEED_ENABLED=false`
- In `backend/server.py` → `on_startup()` nach `seed_reviews_from_snapshot` eingehängt

### Smoke-Test bestanden
- Leere Test-DB: 75 + 298 + 5 inserted ✅
- Zweiter Lauf: 100% skipped_existing ✅

---

## Teil 2 — Vertrags-E-Mail-Endpoints wiederhergestellt (kritischer Bugfix)

### Problem
Beim Lovable→Emergent Umzug waren **13 Vercel-Edge-Functions** (`send-*-email`) nicht migriert worden. Konsequenz:
- Kunde füllt BBVA/bunq/ING/Postbank/Knab Flex-/Festgeld-Formular aus
- Erfolgs-Screen zeigt sich
- Aber: **weder Admin noch Kunde erhielten E-Mail**, Vertrag landete **nicht** in `contract_form_submissions`

### Lösung
Neuer Router: `/app/backend/routes/contract_submissions.py`
- 12 Vertrags-Endpoints + 1 Contact (`/api/send-email`)
- Pattern: Config-Tabelle + One-Function-Handler + Loop-Registration
- Persistenz in `contract_form_submissions` (vor Mail-Versand → Idempotenz-sicher)
- Admin-Mail an `kundenservice@essenceinvest.com` mit Vertrags-PDF + Signatur-Attachments
- **NEU**: Kunden-Bestätigungsmail mit Vertrag im Anhang (hatte Lovable nicht)
- Rate-Limit (5/min/IP), Validierung via Pydantic

### Branding-Fixes
- `templates/bestandskunden_bestaetigung.html`: Header + Signatur „Kapitalmitte"→"Fröhlich"
- `routes/customer_confirmations.py`: Betreff + Signatur-Zeile
- Backend-weiter Grep auf „Kapitalmitte": 0 Treffer in `templates/`, `routes/`, `services/`

### Alle 13 Endpoints

| Endpoint | Produkt |
|---|---|
| `/api/send-contract-email` | BBVA Flexgeld |
| `/api/send-bunq-contract-email` | bunq NL Flexgeld |
| `/api/send-bunq-de-contract-email` | bunq DE Flexgeld |
| `/api/send-ing-contract-email` | ING Flexgeld |
| `/api/send-postbank-contract-email` | Postbank Flexgeld |
| `/api/send-knab-email` | Knab Flexgeld |
| `/api/send-festgeld-email` | BBVA Festgeld |
| `/api/send-bunq-festgeld-email` | bunq NL Festgeld |
| `/api/send-bunq-de-festgeld-email` | bunq DE Festgeld |
| `/api/send-ing-festgeld-email` | ING Festgeld |
| `/api/send-postbank-festgeld-email` | Postbank Festgeld |
| `/api/send-knab-festgeld-email` | Knab Festgeld |
| `/api/send-email` | Contact-Formular |

### Tests
- Alle 13 Endpoints: HTTP 200 ✅
- Persistierung in Mongo verifiziert ✅
- End-to-End-Mailversand nach Rate-Limit-Cooldown: `adminEmailSent=true`, `customerEmailSent=true` ✅

---

## Nach dem Deploy auf Prod zu prüfen

1. Prod-Backend-Startup-Log muss zeigen: `production_seed: done — {...}`
2. `curl https://finance-platform-v2.emergent.host/api/public/savings-offers | wc -l` → ~297
3. Vertragsformular live absenden → Mail an `kundenservice@essenceinvest.com` + Kunde kommt an
4. Admin-UI „Vertrags-Einreichungen" zeigt den Submission

---

## Verbleibende Backlog-Items

### P1 — DNS-Umzug
- Essenceinvest.com-Registrar auf CNAME-Record für Emergent-Deployment umstellen
- Erst nach erfolgter Prod-Validierung

### P2 — Qualitätssprünge
- Admin-Button „Als verifiziert markieren" in Angebotsliste
- „Was ist neu?"-Widget auf Startseite
- Sparalarm per E-Mail bei Zinsänderungen
- Rate-Limit-Mocks für Backend-Tests (429-Flakyness)

---

## Dateien dieser Session (NEU/GEÄNDERT)

- `/app/backend/production_seed_loader.py` (NEU)
- `/app/backend/data/seed_production/banks.json` (NEU)
- `/app/backend/data/seed_production/savings_offers.json` (NEU)
- `/app/backend/data/seed_production/credit_offers.json` (NEU)
- `/app/backend/routes/contract_submissions.py` (NEU)
- `/app/backend/server.py` (zwei Hooks + Router-Registrierung)
- `/app/backend/templates/bestandskunden_bestaetigung.html` (Branding)
- `/app/backend/routes/customer_confirmations.py` (Branding)
- `/app/memory/PRD.md` (aktualisiert)
- `/app/memory/SESSION_CONTINUATION.md` (diese Datei)

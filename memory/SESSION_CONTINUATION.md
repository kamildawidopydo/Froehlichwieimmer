# Session-Fortsetzung · Prod-DB-Sync Deployment

**Datum**: Februar 2026
**Status**: Redeploy läuft (job_id `4cb1a3eb-243a-47a8-a2cd-9c32d6e04c42`)

## Was in dieser Session gemacht wurde

1. **Preview-Zustand gezeigt** über 5 Screenshots:
   - `/` Homepage (News-Portal)
   - `/comparison` (297 Sparangebote, 15 Länder)
   - `/kredit` (Kreditvergleich-Lead)
   - `/banken` (75 Institute mit Flaggen)
   - `/leistungen` (Lovable-Design)

2. **Prod-DB-Sync-Mechanismus eingebaut**:
   - Snapshots aus Preview-DB exportiert nach `/app/backend/data/seed_production/`:
     - `banks.json` (75 Datensätze, 65 KB)
     - `savings_offers.json` (298 Datensätze, 330 KB)
     - `credit_offers.json` (5 Datensätze, 6 KB)
   - Loader-Modul: `/app/backend/production_seed_loader.py`
   - In `backend/server.py` → `on_startup()` nach `seed_reviews_from_snapshot` eingehängt (Zeilen 4682–4683).
   - Match-Logik:
     - `banks` → `slug`
     - `savings_offers` → `source_id`, Fallback composite (`bank_slug` + `product_type` + `term_months` + `product_name`)
     - `credit_offers` → `source_id`, Fallback (`bank_id` + `product_name`)
   - Keine Overwrites bestehender Datensätze (Admin-Edits bleiben)
   - Kill-Switch: ENV `PRODUCTION_SEED_ENABLED=false`

3. **Smoke-Test gegen temporäre leere Test-DB bestanden**:
   - Erster Lauf: 75 + 298 + 5 inserted ✅
   - Zweiter Lauf: 0 inserted / alle skipped_existing ✅

4. **Redeploy angestoßen** via `emergent__send_to_deployer` (intent=deploy)

## Nach dem Deploy prüfen

- Prod-Backend-Startup-Log muss zeigen: `production_seed: done — {...}`
- `curl https://finance-platform-v2.emergent.host/api/public/savings-offers | wc -l` sollte ~297 Angebote liefern
- Prod-Banken-Count sollte 75 betragen

## Verbleibende Backlog-Items (unverändert)

### P1 — DNS-Umzug
- Essenceinvest.com-Registrar auf CNAME-Record für Emergent-Deployment umstellen
- Erst nach erfolgter Prod-Validierung durchführen

### P2 — Weitere Qualitätssprünge
- Admin-Button „Als verifiziert markieren" direkt in Angebotsliste
- „Was ist neu?"-Widget auf Startseite
- Sparalarm per E-Mail bei Zinsänderungen
- Automatisierte Scraping-Pipeline (nach rechtlicher Prüfung)
- Rate-Limit-Mocks für Backend-Tests (429-Flakyness)

## Wichtige Dateien dieser Session

- `/app/backend/production_seed_loader.py` (NEU)
- `/app/backend/data/seed_production/banks.json` (NEU)
- `/app/backend/data/seed_production/savings_offers.json` (NEU)
- `/app/backend/data/seed_production/credit_offers.json` (NEU)
- `/app/backend/server.py` (verändert — Loader im `on_startup` eingehängt)
- `/app/memory/PRD.md` (aktualisiert)

## Letzte Commits (git log)

```
cb8d278 ## Prod-DB-Sync via idempotenten Startup-Seeder deployed
eb8b015 ## ✅ Prod-DB-Sync-Mechanismus bereit und getestet
```

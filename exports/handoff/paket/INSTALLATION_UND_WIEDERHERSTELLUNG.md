# Installation, lokaler Start und Wiederherstellung

## 1. Voraussetzungen
- Node.js 18 oder 20 und Yarn 1.x (Frontend)
- Python 3.11 (Backend)
- MongoDB 6 oder 7 (Datenbank)

## 2. Lokaler Start
```bash
# Datenbank
docker run -d --name mongo -p 27017:27017 mongo:7

# Backend
cd quellcode/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
cp ../../konfiguration/backend.env.example .env   # Werte selbst eintragen (siehe unten)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (zweites Terminal)
cd quellcode/frontend
cp ../../konfiguration/frontend.env.example .env  # REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start                                         # http://localhost:3000
```
Alle Backend-Routen beginnen mit `/api`. Das Frontend ruft das Backend immer über `REACT_APP_BACKEND_URL` auf.
Für den Betrieb hinter einer Domain muss ein Reverse Proxy (z. B. nginx) `/api/*` an Port 8001 und alles andere an das gebaute Frontend weiterleiten (`yarn build` erzeugt `build/`).

## 3. Konfiguration (.env)
Die Beispieldateien in `konfiguration/` enthalten nur die Variablennamen, keine Werte.
Pflicht für den Start: `MONGO_URL`, `DB_NAME`, `JWT_SECRET` (lange Zufallszeichenkette), `CORS_ORIGINS`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (erstes Admin-Konto).
Optional, je nach genutzter Funktion: siehe `TECHNOLOGIEN.md` → externe Dienste.

## 4. Wiederherstellung auf einem anderen Server (vollständige Sicherung)
**Wichtig: Das ZIP enthält den Quellcode, aber keine Datenbankinhalte.**
Kundendaten, Konten, Depots, Aufträge, Dokumente, News-Artikel, Angebote und Kurse liegen in der MongoDB der Live-Umgebung und sind bewusst nicht im Paket.
Für eine vollständige Wiederherstellung brauchen Sie zusätzlich:
1. **Datenbank-Backup der Live-Umgebung** (z. B. `mongodump --uri "<Live-MONGO_URL>" --out backup/`). Dieses Backup muss beim Hosting- bzw. Datenbankanbieter angefordert oder erstellt werden; aus der Vorschau-Umgebung ist kein Zugriff auf die Live-Datenbank möglich.
   Wiederherstellen: `mongorestore --uri "<neue MONGO_URL>" backup/`
2. **Hochgeladene Dateien** (Bewerbungsunterlagen, Kundendokumente), sofern sie außerhalb der Datenbank gespeichert sind (Verzeichnis gemäß Backend-Konfiguration bzw. Objektspeicher). Nicht im Paket.
3. **Alle API-Schlüssel** der externen Dienste (siehe `TECHNOLOGIEN.md`) – neu beantragen oder aus Ihren Unterlagen übernehmen.
4. **Geplante Aufgaben (Cron-Jobs)**: siehe `konfiguration/crons.yml`. Auf einem eigenen Server müssen diese als Cron-Jobs eingerichtet werden, die die genannten `/api/cron/...`-Endpunkte per POST mit `Authorization: Bearer <WEBHOOK_CRON_SECRET>` aufrufen.
5. **Domain/DNS/SSL** für die neue Adresse sowie E-Mail-Absenderdomain (Resend) neu einrichten.
6. **Datenbankstruktur**: `datenbank/schema.json` (Sammlungen, Felder, Indizes). Viele Indizes und Startdaten legt das Backend beim Start selbst an (`server.py` Startup, `services/bond_seed.py`, `seeds/`). Skripte in `quellcode/backend/scripts/` sind einzelne Migrations-/Pflegeskripte.

## 5. Hinweise
- Die mit `emergentintegrations` umgesetzten KI-Funktionen (News-Synthese, Assistent) benötigen einen eigenen Schlüssel eines KI-Anbieters; der Emergent-Universal-Key funktioniert nur auf der Emergent-Plattform.
- E-Mail-Versand nutzt Resend; ohne Schlüssel werden keine E-Mails versendet.

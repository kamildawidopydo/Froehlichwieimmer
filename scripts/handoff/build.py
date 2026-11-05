"""Baut das Übergabepaket (Quellcode, Doku, Daten, Screenshots) als ZIP.
Aufruf nach crawl.py: python build.py /app/exports/handoff
"""
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

from pymongo import MongoClient
from dotenv import dotenv_values

OUT = Path(sys.argv[1])
PKG = OUT / "paket"
TODAY = time.strftime("%Y-%m-%d")
crawl = json.loads((OUT / "crawl.json").read_text(encoding="utf-8"))
BASE = crawl["base"]
HOST = urlparse(BASE).netloc
REDACTIONS = []
EXCLUDED = []

SECRET_RX = re.compile(
    r"(sk_(?:live|test)_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|\bre_[A-Za-z0-9]{20,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|xox[bp]-[A-Za-z0-9-]+|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|mongodb(?:\+srv)?://[^\s'\"]+@[^\s'\"]+"
    r"|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})")
PW_RX = re.compile(r"""((?:password|passwort|kennwort|secret|api_key|apikey|token)["']?\s*[:=]\s*["'])((?=[^"'\s]*\d)[^"'\s]{8,})(["'])""", re.I)
TEXT_EXT = {".js", ".jsx", ".ts", ".tsx", ".py", ".json", ".md", ".html", ".css", ".txt", ".yml", ".yaml", ".mjs", ".cjs", ".csv", ".toml", ".ini", ".sh", ".svg"}
SKIP_DIRS = {"node_modules", "build", "__pycache__", ".git", "exports", "tests", ".pytest_cache", "lovable_import", "seed_production", "uploads"}
SKIP_FILES = {".env", ".env.local", ".env.production", "reviews_snapshot.json", "test_credentials.md"}


def copy_tree(src: Path, dst: Path):
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            sp = Path(root) / f
            rel = sp.relative_to(src)
            if f in SKIP_FILES or f.startswith(".env"):
                EXCLUDED.append(str(Path(src.name) / rel))
                continue
            dp = dst / rel
            dp.parent.mkdir(parents=True, exist_ok=True)
            if sp.suffix in TEXT_EXT and sp.stat().st_size < 5_000_000:
                t = sp.read_text(encoding="utf-8", errors="replace")
                n1 = len(SECRET_RX.findall(t))
                t = SECRET_RX.sub("<ENTFERNT>", t)
                t, n2 = PW_RX.subn(lambda m: m.group(1) + "<ENTFERNT>" + m.group(3), t)
                if n1 or n2:
                    REDACTIONS.append(f"{Path(src.name) / rel}: {n1 + n2} Wert(e) ersetzt")
                dp.write_text(t, encoding="utf-8")
            else:
                shutil.copy2(sp, dp)


def env_examples():
    for name, p in (("backend.env.example", "/app/backend/.env"), ("frontend.env.example", "/app/frontend/.env")):
        keys = [l.split("=", 1)[0] for l in Path(p).read_text().splitlines() if "=" in l and not l.startswith("#")]
        (PKG / "konfiguration" / name).write_text("\n".join(f"{k}=" for k in keys) + "\n", encoding="utf-8")


def db_schema():
    env = dotenv_values("/app/backend/.env")
    db = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]
    out = {}
    for c in sorted(db.list_collection_names()):
        fields = defaultdict(set)
        for d in db[c].find({}, limit=50):
            for k, v in d.items():
                fields[k].add(type(v).__name__)
        out[c] = {"indexes": [{"name": i["name"], "key": list(i["key"].items()), "unique": i.get("unique", False)}
                               for i in db[c].list_indexes()],
                  "fields": {k: sorted(v) for k, v in sorted(fields.items())}}
    (PKG / "datenbank" / "schema.json").write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")
    return len(out)


def public_api():
    seen, saved = set(), []
    d = PKG / "daten" / "oeffentliche_api"
    d.mkdir(parents=True, exist_ok=True)
    for c in crawl["api_calls"]:
        u = c["url"]
        if u in seen or c["status"] != 200 or "json" not in c["type"] or urlparse(u).netloc != HOST:
            continue
        seen.add(u)
        if re.search(r"track|visitor|session|auth|me$|login|analytics|live", u, re.I):
            continue
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"Accept": "application/json"}), timeout=20) as r:
                body = json.loads(r.read().decode("utf-8"))
        except Exception:  # noqa: BLE001
            continue
        name = re.sub(r"[^a-zA-Z0-9]+", "_", urlparse(u).path.replace("/api/", ""))[:100] or "root"
        (d / f"{name}.json").write_text(json.dumps({"quelle": u, "abgerufen_am": TODAY, "daten": body},
                                                   ensure_ascii=False, indent=1), encoding="utf-8")
        rows = body if isinstance(body, list) else next((v for v in body.values() if isinstance(v, list)), None) if isinstance(body, dict) else None
        if rows and isinstance(rows[0], dict) and re.search(r"saving|offer|bank|rate|zins|festgeld|tagesgeld|bond|anleih|product|produkt|ipo", u, re.I):
            keys = sorted({k for r in rows for k, v in r.items() if not isinstance(v, (dict, list))})
            with open(PKG / "daten" / f"angebote_{name}.csv", "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=keys + ["quelle", "abgerufen_am"], extrasaction="ignore")
                w.writeheader()
                for r in rows:
                    w.writerow({**{k: r.get(k) for k in keys}, "quelle": u, "abgerufen_am": TODAY})
            saved.append(f"angebote_{name}.csv ({len(rows)} Zeilen)")
    return sorted(seen), saved


def pages_and_links():
    with open(PKG / "seiten" / "SEITEN.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["pfad", "art", "seitentitel", "http_status", "endgueltiger_pfad", "weiterleitung", "screenshots", "zustaende", "fehler"])
        for p in crawl["pages"]:
            w.writerow([p["path"], p["kind"], p.get("title"), p.get("http_status"), p.get("final_path"),
                        "ja" if p.get("final_path") and p.get("final_path") != p["path"] else "",
                        " | ".join(p["screens"].values()), len(p["states"]), " | ".join(p.get("errors", []))])
    with open(PKG / "seiten" / "WEITERLEITUNGEN.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["von", "nach", "quelle"])
        for a, b in sorted(crawl["redirects"].items()):
            w.writerow([a, b, "React-Router (App.js)"])
    with open(PKG / "seiten" / "URL_LISTE_dynamische_seiten.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["vorlage", "url", "screenshot_beispiel"])
        for tpl, urls in sorted(crawl["templates"].items()):
            if not urls:
                w.writerow([tpl, "(beim Crawl keine verlinkte URL gefunden)", ""])
            for i, u in enumerate(urls):
                w.writerow([tpl, BASE + u, "ja" if i == 0 else ""])
    links = {}
    for p in crawl["pages"]:
        src = OUT / "inhalte" / "seiten" / (re.sub(r"[^a-zA-Z0-9]+", "_", p["path"].strip("/")) or "startseite")[:120]
        f = src.with_suffix(".json")
        if not f.exists():
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        for region in ("header_links", "footer_links"):
            for l in data[region]:
                key = (region, l["text"], l["href"])
                links.setdefault(key, set()).add(p["path"])
        md = [f"# {data['title']}", f"URL: {data['url']}", ""]
        for b in data["blocks"]:
            md += [f"## Abschnitt {b['index']} · <{b['tag']}> {b['heading'] or ''}".rstrip(), b["text"], ""]
        tdir = PKG / "inhalte" / "texte"
        tdir.mkdir(parents=True, exist_ok=True)
        (tdir / f"{src.name}.md").write_text("\n".join(md), encoding="utf-8")
    with open(PKG / "seiten" / "MENUE_UND_FOOTER_LINKS.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["bereich", "linktext", "ziel", "intern_extern", "vorkommen_auf_seiten"])
        for (region, text, href), pages in sorted(links.items()):
            ext = "extern" if urlparse(href).netloc not in ("", HOST) else ("mail/telefon" if href.startswith(("mailto:", "tel:")) else "intern")
            w.writerow(["Kopfbereich/Menü" if region == "header_links" else "Footer", text, href, ext, len(pages)])
    (PKG / "seiten" / "HAUPTMENUE_ZUSTAENDE.json").write_text(json.dumps(crawl["header_menus"], ensure_ascii=False, indent=1), encoding="utf-8")
    with open(PKG / "seiten" / "EXTERNE_LINKS.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(crawl["external_links"] + crawl["other_links"]))


def images():
    rows, seen = [], set()
    ext_dir = PKG / "assets" / "extern"
    ext_dir.mkdir(parents=True, exist_ok=True)
    for f in sorted((OUT / "inhalte" / "seiten").glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for i in data["images"]:
            src = i["src"] or ""
            if not src or (src, data["url"]) in seen:
                continue
            seen.add((src, data["url"]))
            host = urlparse(src).netloc
            local = host in ("", HOST)
            lic = ("Unsplash-Lizenz (laut Herkunft)" if "unsplash" in host else "Pexels-Lizenz (laut Herkunft)" if "pexels" in host
                   else "keine Quellen-/Lizenzangabe auf der Website vorhanden")
            file = ""
            if local:
                file = "quellcode/frontend/public" + urlparse(src).path
            elif src.startswith("http"):
                name = re.sub(r"[^a-zA-Z0-9.]+", "_", host + urlparse(src).path)[-120:]
                if not (ext_dir / name).exists():
                    try:
                        urllib.request.urlretrieve(src, ext_dir / name)
                    except Exception:  # noqa: BLE001
                        name = "(Download fehlgeschlagen)"
                file = f"assets/extern/{name}"
            rows.append([data["url"], src, i["alt"], i["title"], i["width"], i["height"], "lokal" if local else host, lic, file])
    with open(PKG / "inhalte" / "BILDER.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["seite", "bildquelle", "alt_text", "titel", "breite", "hoehe", "herkunft", "lizenz_hinweis", "datei_im_paket"])
        w.writerows(rows)
    pdfs = sorted(str(p.relative_to("/app/frontend/public")) for p in Path("/app/frontend/public").rglob("*.pdf"))
    (PKG / "inhalte" / "PDF_DATEIEN.txt").write_text("Alle PDFs liegen unter quellcode/frontend/public/\n" + "\n".join(pdfs), encoding="utf-8")
    return len(rows), len(pdfs)


def dynamic_content():
    by_page = defaultdict(set)
    for c in crawl["api_calls"]:
        by_page[c["page"]].add(urlparse(c["url"]).path)
    lines = ["# Dynamische Inhalte je Seite", "",
             "Diese Seiten laden Inhalte zur Laufzeit vom eigenen Backend (FastAPI + MongoDB). Die API-Pfade zeigen, welche Bereiche aus der Datenbank bzw. aus externen Diensten (News, Kurse) kommen.", ""]
    for p, apis in sorted(by_page.items()):
        lines += [f"## {p}", *[f"- `{a}`" for a in sorted(apis)], ""]
    (PKG / "inhalte" / "DYNAMISCHE_INHALTE.md").write_text("\n".join(lines), encoding="utf-8")


def identity():
    pats = r"Fr(?:ö|oe|o)hlich|Essence\s?Invest|essenceinvest|Kapitalmitte|kapital-direkt24|Kapital\s?Direkt|Vermögensberatung"
    rx = re.compile(pats, re.I)
    mail = re.compile(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", re.I)
    phone = re.compile(r"\+\d{2}[\d \-/()]{7,}\d")
    rows = []
    for base in ("/app/frontend/src", "/app/frontend/public", "/app/backend"):
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                p = Path(root) / f
                if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".pdf", ".gif"}:
                    if rx.search(f) or re.search(r"logo|favicon|siegel|seal|og-image", f, re.I):
                        rows.append([str(p).replace("/app/", "quellcode/"), "", "Datei (Bild/Logo/PDF)", f])
                    continue
                if p.suffix not in TEXT_EXT or f.startswith(".env") or p.stat().st_size > 3_000_000:
                    continue
                for n, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                    for kind, r in (("Firmenname/Marke", rx), ("E-Mail", mail), ("Telefon", phone)):
                        for m in r.finditer(line):
                            rows.append([str(p).replace("/app/", "quellcode/"), n, kind, m.group(0)])
    with open(PKG / "firmenanpassung" / "FUNDSTELLEN_FIRMENIDENTITAET.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["datei", "zeile", "art", "fundstelle"])
        w.writerows(rows)
    meta = []
    for p in crawl["pages"]:
        if p.get("title") and rx.search(p["title"]):
            meta.append([p["path"], "Seitentitel", p["title"]])
        for k, v in (p.get("meta") or {}).items():
            if v and rx.search(str(v)):
                meta.append([p["path"], f"Meta {k}", v])
    with open(PKG / "firmenanpassung" / "FUNDSTELLEN_METADATEN_LIVE.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["seite", "feld", "wert"])
        w.writerows(meta)
    return len(rows), len(meta)


def forms_doc():
    lines = []
    for f in sorted((OUT / "inhalte" / "seiten").glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        if not d["forms"] and not d["inputs"]:
            continue
        lines += [f"## {urlparse(d['url']).path}", ""]
        for i, fm in enumerate(d["forms"], 1):
            lines.append(f"**Formular {i}** – Buttons: {', '.join(fm['buttons']) or '–'}")
            for x in fm["fields"]:
                opt = f" · Optionen: {', '.join(x['options'])}" if x.get("options") else ""
                lines.append(f"- {x['tag']} `{x['type']}` {x.get('label') or x.get('placeholder') or x.get('name') or ''}{' (Pflicht)' if x.get('required') else ''}{opt}")
            lines.append("")
        if d["inputs"]:
            lines.append("**Eingaben außerhalb von Formularen (Filter, Rechner, Suche)**")
            for x in d["inputs"]:
                opt = f" · Optionen: {', '.join(x['options'])}" if x.get("options") else ""
                lines.append(f"- {x['tag']} `{x['type']}` {x.get('label') or x.get('placeholder') or x.get('testid') or ''}{opt}")
            lines.append("")
    return lines


def technologies():
    pkg = json.loads(Path("/app/frontend/package.json").read_text())
    req = Path("/app/backend/requirements.txt").read_text().split()
    lines = ["# Technologien und Abhängigkeiten", "",
             "## Architektur", "- Frontend: React 19 (Create React App mit CRACO), Tailwind CSS, shadcn/ui (Radix UI), lucide-react, Recharts",
             "- Backend: Python 3.11, FastAPI, Motor/PyMongo (MongoDB), Pydantic",
             "- Datenbank: MongoDB", "- Hosting bisher: Emergent-Plattform (Kubernetes), Routing `/api` → Backend Port 8001, Rest → Frontend",
             "", "## Schriftarten", "- IBM Plex Sans, IBM Plex Mono, Newsreader (Google Fonts, eingebunden in `public/index.html` bzw. CSS) – Lizenz: SIL Open Font License",
             "", "## Externe Dienste (für einen voll funktionsfähigen Nachbau)",
             "| Dienst | Zweck | Variable(n) |", "|---|---|---|",
             "| Resend | E-Mail-Versand (Kontakt, Benachrichtigungen, Passwort-Reset) | RESEND_API_KEY, SENDER_EMAIL, EMAIL_FROM_NAME, EMAIL_REPLY_TO |",
             "| Kursdaten (Yahoo Finance, Finnhub, Twelve Data, Alpha Vantage) | Aktienkurse, Charts | TWELVE_DATA_KEY, TWELVEDATA_API_KEY, ALPHA_VANTAGE_KEY |",
             "| EZB / Wechselkurse | Währungsumrechnung | – |",
             "| Marketaux / RSS-Feeds | News-Rohdaten | MARKETAUX_KEY |",
             "| KI-Anbieter (Claude/OpenAI/Gemini über emergentintegrations) | News-Synthese, Assistent | EMERGENT_LLM_KEY (nur Emergent) – eigener Anbieter-Schlüssel nötig |",
             "| Unsplash | Bildsuche für News | UNSPLASH_ACCESS_KEY |",
             "| Sentry | Fehlerüberwachung (optional) | SENTRY_DSN |",
             "| Cron-Dienst | geplante Aufgaben (`konfiguration/crons.yml`) | WEBHOOK_CRON_SECRET |",
             "", "## Frontend-Abhängigkeiten (package.json)", *[f"- {k} {v}" for k, v in sorted(pkg["dependencies"].items())],
             "", "## Backend-Abhängigkeiten (requirements.txt)", *[f"- {r}" for r in req]]
    (PKG / "TECHNOLOGIEN.md").write_text("\n".join(lines), encoding="utf-8")


def readme(s):
    t = f"""# Übergabepaket essenceinvest.com → Nachbau für Aqona Capital GmbH

Erstellt am {TODAY}. Crawl der Live-Website {s['base']} ohne Anmeldung am {s['crawled_at']}.
Quellcode: aktueller Stand der Vorschau-Umgebung (kann neuere Änderungen enthalten als die Live-Website).

## Inhalt
| Ordner/Datei | Inhalt |
|---|---|
| `quellcode/frontend` | Vollständiger Frontend-Quellcode (alle Seiten, Komponenten, Styles, `public/` mit Bildern, Logos, Icons, PDFs), Projektkonfiguration (package.json, yarn.lock, tailwind/craco/postcss) |
| `quellcode/backend` | Vollständiger Backend-Quellcode (FastAPI), Skripte, Startdaten ohne Kundendaten |
| `konfiguration/` | `.env`-Beispiele (nur Variablennamen), `crons.yml` |
| `datenbank/schema.json` | Datenbankstruktur: {s['n_coll']} Sammlungen mit Feldern, Datentypen und Indizes (keine Inhalte) |
| `seiten/SEITEN.csv` | {s['n_pages_fixed']} feste öffentliche Seiten + {s['n_examples']} Beispielseiten der Vorlagen: URL, Titel, Status, Weiterleitung, Screenshots |
| `seiten/URL_LISTE_dynamische_seiten.csv` | {s['n_dynamic_urls']} beim Crawl gefundene URLs automatisch erzeugter Seiten, je Vorlage |
| `seiten/WEITERLEITUNGEN.csv`, `EXTERNE_LINKS.txt`, `MENUE_UND_FOOTER_LINKS.csv`, `HAUPTMENUE_ZUSTAENDE.json` | Weiterleitungen, externe Ziele, alle Menü-/Footer-Links, Hauptmenü geöffnet |
| `seiten/ABFRAGEN_BESUCHER_COOKIE.json` | Besucher-/Wohnsitz- und Cookie-Abfrage mit allen Optionen |
| `screenshots/desktop-1440`, `tablet-810`, `mobile-390` | Ganzseiten-Screenshots jeder erfassten Seite |
| `screenshots/zustaende/` | {s['n_states']} geöffnete Zustände (Tabs, Aufklappbereiche, mobile Navigation) + Hauptmenü |
| `screenshots/abfragen/` | Besucher- und Cookie-Abfrage in allen Zuständen |
| `inhalte/texte/*.md` | Seitentexte je URL, nach Abschnitten gegliedert |
| `inhalte/seiten_rohdaten/*.json` | Rohdaten je Seite: Abschnitte, Links, Bilder, Formulare, Meta-Angaben |
| `inhalte/BILDER.csv`, `PDF_DATEIEN.txt`, `assets/extern/` | {s['n_img']} Bildverwendungen mit Alt-Text und Lizenzhinweis, {s['n_pdf']} PDFs, heruntergeladene externe Bilder |
| `inhalte/DYNAMISCHE_INHALTE.md` | Welche Seiten Inhalte aus Datenbank/externen Diensten laden |
| `daten/` | Öffentliche Angebote/Konditionen als CSV + JSON mit Quelle und Abrufdatum: {', '.join(s['offers']) or 'keine'} |
| `dokumentation/FUNKTIONEN.md` | Alle öffentlichen Funktionen und Abläufe + erfasste Eingabefelder je Seite |
| `firmenanpassung/` | Aqona-Daten, „noch zu ergänzen“-Liste, {s['n_id']} Fundstellen im Code, {s['n_meta']} Fundstellen in Titeln/Metadaten |
| `INSTALLATION_UND_WIEDERHERSTELLUNG.md` | Lokaler Start, Server-Wiederherstellung, benötigte Backups |
| `TECHNOLOGIEN.md` | Technologien, Schriftarten, externe Dienste, Abhängigkeiten |

## Vollständig dokumentiert
Seitenliste, Menü-/Footer-Links, Weiterleitungen, Seitentexte, Bilder/PDFs, Ganzseiten-Screenshots in drei Breiten, Besucher-/Cookie-Abfrage, Formularfelder, Datenbankstruktur, Quellcode.

## Fehlt bzw. eingeschränkt
- **Datenbankinhalte und hochgeladene Dateien**: nicht enthalten (Kundendaten, vertraulich). Für eine Sicherung zusätzlich ein Live-Datenbank-Backup beim Hosting anfordern (siehe Installation).
- **Kunden- und Adminbereich**: keine Screenshots. Ihr Auftrag nennt sie als nicht erforderlich und schließt interne Admininformationen und Kundendaten aus; Screenshots dieser Bereiche würden solche Daten zeigen. Der Quellcode beider Bereiche ist enthalten.
- **Ergebnisse nach dem Absenden von Formularen**: nicht live geprüft (keine echten Daten, keine Transaktionen); aus dem Quellcode beschrieben.
- **Interaktive Zustände**: automatisch erfasst wurden Tabs, Aufklappbereiche, Hauptmenü und mobile Navigation. Rechner-Ergebnisse mit eigenen Eingaben und einzelne Filterkombinationen sind nicht für jede Seite als Screenshot vorhanden.
- **Vorlagen ohne Beispiel**: {s['n_templates_no_example']} Seitenvorlagen hatten beim Crawl keinen öffentlichen Link (z. B. Vorschauseiten); siehe `URL_LISTE_dynamische_seiten.csv`.
- **Seiten mit Fehlern beim Erfassen**: {s['n_errors']} (Spalte „fehler“ in `SEITEN.csv`).
- **Lizenzangaben**: Die Website führt zu den meisten Bildern keine Quellen-/Lizenzangaben; vorhandene Herkunft (Unsplash/Pexels/eigene Dateien) ist in `BILDER.csv` vermerkt. Partnerbank-Logos und Bankdokumente sind Eigentum der jeweiligen Banken.
- **Schriftdateien**: Schriften werden von Google Fonts geladen, nicht als Dateien mitgeliefert.

## Für einen funktionsfähigen Nachbau zusätzlich anzubinden
Siehe `TECHNOLOGIEN.md` → externe Dienste (E-Mail, Kurs- und Newsdaten, KI, Cron), eigenes Backend + MongoDB für Angebote, Formulare, Bewertungen und News. Framer allein kann diese Funktionen nicht abbilden.

## Sicherheit
Ausgeschlossen: alle `.env`-Dateien, Tests mit Zugangsdaten, Produktions-Startdaten, Exporte/Backups, Bewertungs-Snapshot.
Automatisch geschwärzte Werte (Schlüssel/Passwörter im Code): {len(s['redactions'])} Dateien.
""" + "\n".join(f"- {r}" for r in s["redactions"])
    (PKG / "README.md").write_text(t, encoding="utf-8")


def main():
    if PKG.exists():
        shutil.rmtree(PKG)
    for d in ("quellcode", "konfiguration", "datenbank", "seiten", "inhalte", "firmenanpassung", "daten", "dokumentation"):
        (PKG / d).mkdir(parents=True, exist_ok=True)
    copy_tree(Path("/app/frontend"), PKG / "quellcode" / "frontend")
    copy_tree(Path("/app/backend"), PKG / "quellcode" / "backend")
    shutil.copytree(OUT / "screenshots", PKG / "screenshots")
    shutil.copytree(OUT / "inhalte" / "seiten", PKG / "inhalte" / "seiten_rohdaten")
    (PKG / "seiten" / "ABFRAGEN_BESUCHER_COOKIE.json").write_text(json.dumps(crawl["consent_states"], ensure_ascii=False, indent=1), encoding="utf-8")
    env_examples()
    n_coll = db_schema()
    apis, offers = public_api()
    pages_and_links()
    n_img, n_pdf = images()
    dynamic_content()
    n_id, n_meta = identity()
    stats = {
        "n_pages_fixed": sum(1 for p in crawl["pages"] if p["kind"] == "fest"),
        "n_examples": sum(1 for p in crawl["pages"] if p["kind"] != "fest"),
        "n_dynamic_urls": sum(len(v) for v in crawl["templates"].values()),
        "n_templates_no_example": sum(1 for v in crawl["templates"].values() if not v),
        "n_errors": sum(1 for p in crawl["pages"] if p.get("errors")),
        "n_states": sum(len(p["states"]) for p in crawl["pages"]),
        "n_coll": n_coll, "apis": apis, "offers": offers, "n_img": n_img, "n_pdf": n_pdf,
        "n_id": n_id, "n_meta": n_meta, "redactions": REDACTIONS, "excluded": EXCLUDED,
        "crawled_at": crawl["crawled_at"], "base": BASE,
    }
    (PKG / "dokumentation" / "_formulare_auto.md").write_text("\n".join(forms_doc()), encoding="utf-8")
    docs = Path(__file__).parent / "docs"
    (PKG / "dokumentation" / "FUNKTIONEN.md").write_text(
        (docs / "FUNKTIONEN.md").read_text(encoding="utf-8") + "\n" + "\n".join(forms_doc()), encoding="utf-8")
    (PKG / "dokumentation" / "_formulare_auto.md").unlink()
    shutil.copy2(docs / "INSTALLATION_UND_WIEDERHERSTELLUNG.md", PKG / "INSTALLATION_UND_WIEDERHERSTELLUNG.md")
    shutil.copy2(docs / "FIRMENANPASSUNG.md", PKG / "firmenanpassung" / "FIRMENANPASSUNG.md")
    shutil.copy2("/app/.emergent/crons.yml", PKG / "konfiguration" / "crons.yml")
    technologies()
    readme(stats)
    zip_path = Path("/app/exports/packages") / f"Uebergabepaket_essenceinvest_{TODAY}.zip"
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    subprocess.run(["zip", "-rq", "-9", str(zip_path), "."], cwd=PKG, check=True)
    stats["zip"] = str(zip_path)
    stats["zip_mb"] = round(zip_path.stat().st_size / 1_048_576, 1)
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in stats.items() if k not in ("apis", "excluded")}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

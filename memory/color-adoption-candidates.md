# Farb-Adoption-Kandidaten (Session 80.43)

Kandidatenliste für gezielte Nutzung von **Gold**, **Champagne** und **Sage**.
Wird **nicht** automatisch ausgerollt — jede Stelle wird einzeln geprüft und
mit Blick auf das Color-Budget entschieden.

## Priorität A — hoher Nutzen, geringes Risiko

### Gold
1. **Home / Marktdaten-Strip** — Gold-Punkt (`text-bank-gold`) für „Marktdaten zeitverzögert" statt Coral. *Aktuell schon so — verifiziert.*
2. **Home Investment-KPI** — Wenn ein Vermögens-Kennzahlen-Slot existiert (z. B. „Ø Portfolio-Rendite"), auf `.kpi-figure.kpi-gold` migrieren.
3. **`/themen/aktien` Hero-Kicker** — kleiner Gold-Kicker für „Kapitalmärkte" statt Petrol.
4. **Wissen-Artikel · Investment-Grundlagen** — 2 px Gold-Hairline (`card-accent-top-gold`) auf „Fonds-Grundlagen"-Card.

### Champagne
1. **`/wissen` Landing-Header** — warme Champagne-Fläche als Editorial-Section-Break unterhalb des Hero.
2. **Strategy-Detail-Seiten** — Section-Break zwischen „Grundprinzip" und „Bausteine" mit Champagne-Tint.
3. **FinanzwissenArtikel · Sidebar** — Champagne-Tint um „Weiterführende Themen"-Widget.

### Sage
1. **`/strategie/nachhaltigkeit`** — sage-akzentuierte Cluster-Icon-Badge + card-accent-top-sage.
2. **Themen-Landing „Nachhaltig investieren"** — accent="sage" + editorialAccent="champagne".
3. **Generationen-/Familie-Vermögen** — kleiner Sage-Akzent auf Stabilitäts-Aussagen (nicht ersetzt coral).

## Priorität B — mittelfristig, mit Redesign

- **News-Detail „Was bedeutet das?"** — wenn `impact.color === 'gold'` künftig für Investment-Impact, neuen Slot in `WasBedeutetDasBlock` ergänzen (`gold: 'text-bank-gold-strong' | 'card-accent-top-gold'`).
- **Admin Dashboard KPIs** — Investment-Volumen-KPI auf `kpi-gold`.
- **Comparison** — Zusatz-Marker „Aktueller Spitzenzins" mit Gold-Tag (`tag-gold`) — **darf Ranking nicht beeinflussen**.

## Priorität C — Editorial-Feinschliff (langfristig)

- **Rhythmus über Long-Form-Pages** — Sekundäre Sections auf `bg-bank-champagne-tint/50` (30 % Opacity) — braucht Screenshots-Test.
- **Print-Style CSS** — Alle drei Slots als druckfreundliche Grautöne mappen (später).

## Bewusst NICHT migrieren

- **Comparison-Ranking-Karten** — Petrol bleibt exklusive Zinsfarbe (Ranking-Neutralität).
- **MarketSnapshot Up/Down** — Petrol/Coral bleiben (Semantik-Standard).
- **FloatingAssistant Launcher** — Petrol bleibt (Marken-Signatur).
- **Auth-Seiten** — neutraler Editorial-Ton, keine neuen Akzente.
- **Admin Handoff Inbox** — funktionale Status-Farben (Amber/Blue/Emerald) bleiben.

## Migration-Regeln

Vor jeder Adoption:
1. Farbpaar in `ALLOWED_ACCENT_PAIRS` erlaubt? Wenn nein → Regel erweitern oder abbrechen.
2. Screenshots Vor/Nach in Light + Dark + Mobile.
3. Kontrast-Check laufen lassen (`check-contrast.py`).
4. Prüfen: bringt die Farbe **Bedeutung**, oder nur Dekoration? Nur bei Bedeutung annehmen.

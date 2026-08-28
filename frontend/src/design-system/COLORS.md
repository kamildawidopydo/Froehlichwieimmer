# Fröhlich Color System – Governance (Session 80.43)

Single source of truth für alle semantischen Akzentfarben der Plattform.
Diese Datei dokumentiert Semantik, erlaubte Kombinationen, Anwendungsbeispiele
und Do/Don'ts. Neue Farben oder Regeländerungen **hier** hinzufügen und dann
`accents.js` synchronisieren.

## Farb-Slots

| Slot        | Semantik                                                                | Erlaubt für                                              | Verboten für                            |
|-------------|-------------------------------------------------------------------------|----------------------------------------------------------|------------------------------------------|
| `navy`      | Autorität, Headlines, Haupttext                                         | Text, Nav, Footer, dominante Flächen                     | Kicker, Chart-Positiv                    |
| `petrol`    | Vertrauen, Beratung, **Zinsen**, positive funktionale States            | Zins-KPIs, Comparison-Ranking, primary CTA, Assistant    | Warnungen                                |
| `coral`     | Marke, menschliche CTA-Momente, negative Market-Moves                   | Konto eröffnen, Down-Move-Indikator, Kinder/Familie      | Wealth/Investment (nutze **Gold**)       |
| `amber`     | Ruhestand, Vorsorge, langfristige Planung                               | `/themen/ruhestand-vorsorge`, Altersvorsorge-Strategie   | Kurzfristige Zins-Themen                 |
| `violet`    | Wissen, komplexe Themen, Finanzierung                                   | `/wissen/*`, Anlagestile, Finanzierung                   | Positive Marktdaten                      |
| `info`      | Marktdaten, analytische Information                                     | MarketSnapshot-Neutral, Charts, Analyse-Blöcke           | Emotionale CTAs                          |
| `rose`      | Editorial-Marker, Takeaways, Testimonials                               | Blush-Signaturen auf Home, Zitate                        | Marktzahlen, Fehler-States               |
| **`gold`**  | Vermögen, Investment, Premium-Kennzahlen                                | Investment-KPI, Premium-Marker, Commodity-Kicker         | CTAs (kein solid-Gold-Button), Warnungen |
| **`champagne`** | Editorial-Flächen, Wissen, Section-Breaks, Premium-Hintergründe     | Wissen-Section-Background, Break zwischen Hauptteilen    | Dominante CTA, Chart-Serien              |
| **`sage`**  | Nachhaltigkeit, Stabilität, langfristiger Vermögensaufbau               | ESG-Seiten, Generationen-Vermögen, Stabilitäts-Blöcke    | Funktional-positive Zustände (das ist Petrol!) |

## Erlaubte Farbpaare (Primär + Editorial-Sekundär)

Definiert in `ALLOWED_ACCENT_PAIRS` (siehe `accents.js`). Werden diese
Paarungen überschritten, warnt der Layout-Layer in DEV per `console.warn`.

| Primär       | Erlaubte Sekundäre         | Beispiel                                       |
|--------------|----------------------------|------------------------------------------------|
| petrol       | champagne, sage, info      | `/themen/zinsen-sparen` (petrol + champagne)   |
| amber        | gold, champagne            | `/themen/ruhestand-vorsorge` (amber + gold)    |
| gold         | champagne, navy            | Investment-Hub (gold + champagne)              |
| champagne    | navy, gold, violet         | Wissen-Landing (champagne + violet)            |
| sage         | petrol, champagne          | Nachhaltigkeitsseite (sage + champagne)        |
| coral        | rose, champagne            | Family-CTA (coral + rose)                      |
| violet       | champagne, gold            | Anlagestile (violet + champagne)               |
| info         | petrol, navy               | Marktanalyse (info + navy)                     |
| rose         | coral, champagne           | Home-Blush (rose + champagne)                  |
| navy         | gold, champagne, petrol    | Editorial-Master (navy + gold)                 |

## Color-Budget-Regel

- 80–85 % neutraler Grund (Navy / Weiß / Creme).
- 15–20 % semantische Akzente.
- **Pro Viewport**: max. 1 dominanter Akzent + 1 unterstützender editorialer Akzent.
- Wenn eine Seite zu bunt wirkt → **Farbe reduzieren**, keine neuen neutralen Töne dazwischenwerfen.

## Utility-Klassen

Alle Slots definieren dasselbe Klassenset (siehe `ACCENT_TOKENS` in `accents.js`):
`text`, `ink`, `top`, `border`, `tint`, `ring`, `icon`, `kpi`, `tag`.

Beispiel Gold-KPI:
```jsx
<div className="card-accent-top card-accent-top-gold border border-bank-gold-border bg-white p-5">
  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-gold-strong">Vermögens-KPI</p>
  <p className="kpi-figure kpi-gold text-4xl">4,2 %</p>
</div>
```

## Do / Don't

### Gold
- ✅ Ein einzelner Investment-KPI, hairline auf Vermögens-Card, Premium-Kicker
- ✅ `outline-gold` Button für seltene Wealth-CTAs
- ❌ **Kein** solid-Gold-Button (kein `bg-bank-gold` als CTA-Fill)
- ❌ Kein Metallic-Effekt, keine Gold-Gradients, keine grellen Gold-Flächen
- ❌ Nicht als Ranking-Signal auf Comparison — Petrol bleibt Zinsfarbe

### Champagne
- ✅ Section-Break-Hintergrund (`bg-bank-champagne-tint` mit `-mx-6 rounded-xl`)
- ✅ Editorial-Karten mit `card-accent-top-champagne`
- ❌ **Nie** als dominante CTA-Farbe
- ❌ Nicht als Text-Farbe auf weißem Grund (Kontrast zu schwach)

### Sage
- ✅ Nachhaltigkeits-Section, ESG-Marker, Stabilitäts-Icon-Badge
- ✅ Als **inhaltliche** editoriale Farbe für Nachhaltigkeit
- ❌ **Nicht** als Ersatz für Petrol's positive-State-Semantik (positive Marktbewegung, Erfolgs-Toast → bleibt Petrol!)

## Chart & Data-Viz Mapping

Feste semantische Zuordnung — die UI-Palette wird **nicht** als zufällige Chart-Palette missbraucht.

| Datenrolle                        | Farbe        | Klasse                     |
|-----------------------------------|--------------|----------------------------|
| Positive Market-Bewegung          | Petrol       | `text-bank-petrol-strong`  |
| Negative Market-Bewegung          | Coral        | `text-bank-coral-strong`   |
| Neutral / Referenz-Linie          | Info         | `text-bank-info-strong`    |
| Wealth / Investment / Commodity   | **Gold**     | `text-bank-gold-strong`    |
| ESG / Nachhaltigkeit / Stabilität | **Sage**     | `text-bank-sage-strong`    |
| Ruhestand / Vorsorge              | Amber        | `text-bank-amber-strong`   |
| Sekundäre Serie (bis 2 max.)      | Navy 60 %    | `text-bank-ink/60`         |

Für Multi-Serie-Charts gilt: **max. 3 Farben pro Chart**. Bei mehr Serien werden Nuancen der Primärfarbe (opacity 100/70/40) verwendet, nicht neue Slots.

## Wartung

- Neue Token-Werte → `index.css` + `tailwind.config.js` + `accents.js` **synchron** anpassen.
- Kontrast-Check ausführen: `python3 /app/frontend/scripts/check-contrast.py`.
- Screenshots erneuern: siehe `/app/memory/color-adoption-candidates.md`.

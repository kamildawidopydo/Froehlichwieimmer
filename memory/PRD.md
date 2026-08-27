# Fröhlich Vermögensberatung — PRD

## Original Problem Statement
FastAPI + MongoDB news/finance portal, light editorial private-banking aesthetic.

## Roadmap
Phase 0-3: DONE. Phase 4-5: BACKLOG.

## Session Log

- 80.29 Phase-1 (Aug 27 2026) — **Financial Intelligence Hub — Audit + erste P0-Slice**:

  **Audit-Ergebnis** — Wiederverwendungspotenzial hoch: `db.news_articles` liefert bereits alle nötigen Felder (`summary, excerpt, sources[], investment_topic_slug, is_top_news, relevance_score, category`). `db.einordnung_posts` + Router existiert produktiv. Kategorien-Mapping (`CATEGORY_LABELS`), Strategy-Cluster (`strategieClusters.js`) und Cross-Link-Komponenten (`NewsStrategyCrosslink`, `KnowledgeCrossLinkBox`, `TopicCrossLinkBox`, `NachrichtenRelated`) sind alle bereits im Frontend integriert. Marktdaten-Komponenten (`MarktuebersichtSidebar`, `MiniMarketChart`, etc.) und Home-Preview (`HomeNewsPreview`, `HomeHeroNewsPreview`) sind fertig. Fehlt konkret: (a) „Heute wichtig"-Top-3-Kuration im Nachrichten-Feed, (b) „Das Wichtigste in Kürze"-Bullets auf Detail, (c) inline „Fröhlich Einordnung"-Kopplung an Artikel.

  **P0-Slice implementiert**: `NachrichtenDetailPage.jsx` — neue `<aside data-testid="news-detail-key-takeaways">` mit `card-accent-top-rose` + Blush-Bulletpoints. Splitet das existierende `summary`/`excerpt`-Feld an Satzgrenzen (Lookahead auf `[.!?]` + Großbuchstabe/Ziffer), filtert Sätze auf 30–220 Zeichen, rendert 2–4 Bullets. Render-Guards: `raw.length ≥ 140` UND ≥2 saubere Sätze; sonst wird der Block still ausgeblendet. Keine neuen API-Calls, keine neuen Datenfelder — reine Client-Logik auf bestehendem Feld.

  **Live-Verifikation**: Detail-Seite „Kabinettsklausur in Neuhardenberg …" rendert 3 Bullets, visuell klar vom externen Artikeltext getrennt (Blush-Signatur = Fröhlich-editorial, nicht externer Fakten-Ton).

  **Nicht angetastet**: 48h-Freshness, Cron, Global Color System, Nav, News-Slugs, Archive, Business Logic, News-Layout unter dem Take-Aways-Block.

  **Backlog Phase 2 (empfohlene Reihenfolge)**:
  1. **„Heute wichtig"-Top-3** auf `/news/nachrichten` — sortiert nach `is_top_news DESC, relevance_score DESC, published_at DESC`, limit 3, oberhalb der Themen-Sektion. Nutzt `NewsHeroFeatured`-Komponente
  2. **Inline „Fröhlich Einordnung"** im Detail — sofern `einordnung_posts` mit passendem `category` oder `topic` verfügbar, unter Take-Aways rendern; klar visuell abgetrennt (Petrol-Signatur, Kicker „Fröhlich Einordnung")
  3. **Themenwelten-Grid** auf `/news/nachrichten` — `NewsCategorySections` gruppiert bereits nach Kategorie; nur Reihenfolge + Semantik anpassen (Märkte/Zinsen/Vorsorge/Wirtschaft/…)
  4. **News→Strategie/Wissen inline** — sind bereits verlinkbar; auf Detail unter Take-Aways einfach 1–3 verwandte Wissensartikel + 1 passenden Strategy-Cluster rendern (existierende Komponenten wiederverwenden)


- 80.28b (Aug 27 2026) — **`data-hide-sticky-cta` proaktiv auf Overlap-Hotspots**:
  Der in 80.28 eingeführte `data-hide-sticky-cta`-Mechanismus wird auf die drei bekannten Content-Regionen ausgerollt und um den **Investment-Topic-Teaser** ergänzt (der eigentliche Overlap-Verursacher, den 80.28 fälschlich nur beim ProductInquiryStickyCta beobachtet hatte).

  **Root-Cause-Ergänzung**: Der als "Aktien im Fokus" sichtbare Overlay ist `InvestmentTopicTeaser.jsx` (mount via `Layout.js`), NICHT `ProductInquiryStickyCta`. 80.28 hatte den Hide-Selektor nur im ProductInquiry-CTA erweitert → der Teaser blieb sichtbar. Fix: eigener IntersectionObserver im Teaser, identische Selektor-Liste (`[data-hide-sticky-cta], footer, #footer, .site-footer`), Fade-Only via kombiniertem `isShown`-State (kein Layout-Shift).

  **Markierte Wrapper**:
  - `components/investment/InvestmentTopicTeaser.jsx` — eigene Safe-Zone-Observer-Logik + `hiddenForSafeZone`-State + `isShown = visible && !hiddenForSafeZone`
  - `components/Footer.js` — `<footer id="footer" data-hide-sticky-cta>` (site-weit, aus 80.28)
  - `pages/news/NachrichtenDetailPage.jsx` — Wrapper-`<div data-hide-sticky-cta>` ab Quellen-Block bis inkl. `NachrichtenRelated`
  - `pages/Leistungen.js` — Section `<section data-hide-sticky-cta>` „Ihre Ziele / CTA" (letzte Section vor Footer)
  - `pages/Bewertungen.jsx` — Section `<section id="bewertung-abgeben" data-hide-sticky-cta>` (Submit-Form + Trust-Copy)

  **Verifikation (DOM-Probe live)**:
  - `/bewertungen` (Submit-Section im Viewport): Teaser `opacity=0`, `pointerEvents=none`, `dataVisible=false`, `marks=2` ✓
  - `/leistungen` (Footer im Viewport): kein Teaser sichtbar ✓
  - `/nachrichten/<slug>` (Artikel-Ende im Viewport): keine Überlagerung ✓
  - Fade-only-Transition (300ms opacity), kein Layout-Shift, DOM bleibt

  **Getestete Routes**: `/bewertungen`, `/leistungen`, `/nachrichten/<slug>`  
  **Getestete Breakpoints**: Desktop 1440, Mobile 390 (Tablet nicht separat — Hide-Logik ist viewport-unabhängig)  
  **Verbleibende Overlap-Issues**: keine bekannten. Weitere Content-Regionen können sitewide per `data-hide-sticky-cta` markiert werden — MutationObserver im Teaser erkennt neu hinzugefügte Elemente automatisch.

**Session 80.28 vollständig eingefroren.**


- 80.28 (Aug 27 2026) — **News & Märkte Freshness-Fallback + Sticky-CTA Overlay-Fix**:

  **Ursache news_markte_articles-Leeransicht**: Die Kollektion war seit Session-Beginn nur EINMALIG geseedet (`server.py:1993`, Guard `count_documents({}) == 0`). Ohne Cron-Refresh alterte der Seed natürlich; sobald >48h alt, griff die in 80.27 eingeführte Freshness-Regel → `top=0, overview=0` dauerhaft. Kein eigener Ingest-Pipeline existiert für `news_markte_articles`.

  **Fix (pragmatisch, ohne neue Pipeline)**:
  - `server.py:855` `news_markte_feed`: Wenn die 48h-gefilterte Query auf `news_markte_articles` **0 Docs** liefert, wird automatisch aus der bereits synthesizer-gepflegten Haupt-Kollektion `news_articles` nachgeladen (`is_published=True, status=published, content_type != demo, published_at >= NOW-48h`) und in das erwartete `_article_to_out`-Format normalisiert (`featured=False`, `excerpt := summary`, `source := source_names[0] || 'Fröhlich Redaktion'`). Gleiches Fallback für `all_docs`/Featured-Pool. Kein Nachrücken älterer Artikel — nur frische Meldungen aus dem produktiven Feed.
  - Damit erbt News & Märkte automatisch die stündliche Refresh-Kadenz des Synthesizers (`news-fetch-feeds` `0 * * * *` + `news-synthesize` `10 * * * *` — bereits konfiguriert in `.emergent/crons.yml`, Prod-verifiziert).
  - Kein neuer Cron nötig, keine spekulative Konfiguration hinzugefügt.
  - Verifikation: `/api/news-markte/feed` → 3 top + 15 overview, alle 0.3h alt, `stale=0`. Frontend `/news` zeigt fresh Top-News.

  **Ursache Sticky-Promo Overlay-Bug**: `ProductInquiryStickyCta.jsx` versteckt sich per `IntersectionObserver` NUR für zwei Selectoren: `#home-newsletter` (Mobile-Nudge) und `#invtopic-teaser` (Aktien-im-Fokus). Alle anderen Bereiche (Footer, Trust-Icons, Artikel-Ende) wurden vom CTA überdeckt.

  **Fix**:
  - `ProductInquiryStickyCta.jsx`: `TEASER_SEL` erweitert auf `#invtopic-teaser, [data-hide-sticky-cta], footer, #footer, .site-footer`. Alle Elemente in dieser Liste blenden den CTA per Opacity-Fade aus (kein Layout-Sprung, fixed position bleibt).
  - `Footer.js`: `<footer>` bekommt `id="footer"` + `data-hide-sticky-cta` als semantisches Signal.
  - Beliebige Seite kann jetzt einem eigenen Element `data-hide-sticky-cta` geben (z. B. Trust-Bereiche, lange Artikel-Enden), um den CTA lokal auszublenden — ohne die Sticky-Logik zu berühren.

  **Nicht geändert**: Session-80.27-Freshness-Logik, Color-System, Typografie, Cron-Konfiguration, Detail-/Archiv-Pfade, Artikel-Layout, Business Logic außerhalb dieser beiden Punkte.


- 80.27 (Aug 27 2026) — **Harte 48h-Freshness-Regel für aktuelle News-Feeds**:
  **Root Cause der veralteten 4–5-Tage-Meldungen** (nachweisbar via Live-DB-Probe):
  - Server-Side: `list_news` (server.py:371) und `news_markte_feed` (server.py:855) hatten **keinen Freshness-Filter** — nur `sort(published_at DESC).limit(20)`. Wenn der Synthesizer-Cron seit >48h keine neuen Artikel produziert hat, blieben die letzten synthetisierten Meldungen als "aktuell" im Feed hängen.
  - Cron-Side: In dieser Preview-Env hat der stündliche Cron `news-fetch-feeds` + `news-synthesize` seit 68h nicht erfolgreich synthetisiert (Live-DB-Snapshot: alle 20 Artikel mit identischem `published_at = 2026-08-24T12:09:10Z`, entspricht dem letzten erfolgreichen Synthese-Lauf).
  - Zusätzliches Rendering-Detail: `news_synthesizer.py:1337` setzt beim Publish `published_at = now` (Synthese-Zeit) statt Source-Zeit, weil ein synthetisierter Artikel MEHRERE RSS-Quellen aggregiert — die Aggregation IST die "Publikation" der Fröhlich-Redaktion. Freshness-Semantik bleibt dadurch sinnvoll (48h ab Redaktions-Publish, nicht ab Original-Source), die Quality-Gate-Vorstufe (line 1128) begrenzt Rohitems auf max. 24h vor Synthese, sodass keine "alten" Nachrichten in einen neuen synthetisierten Artikel fließen können.

  **Fix (zentral, API-Ebene)**:
  - Neues Modul-Konstante `CURRENT_FEED_MAX_AGE = timedelta(hours=48)` + Helfer `_current_feed_cutoff()` in `server.py:383-388` (Single Source of Truth).
  - `list_news` (server.py:391): Query um `"published_at": {"$gte": _current_feed_cutoff()}` erweitert.
  - `news_markte_feed` (server.py:855): Cutoff-Filter auf `q`, `all_docs`-Fallback und Featured-Pool angewandt — kein Nachrücken älterer Artikel als "Top/Weitere/Anleger"-Füllmaterial.
  - `news_for_you` (server.py:1043): personalisierter Feed erbt dieselbe 48h-Regel.
  - Sortierung `published_at DESC` bleibt; Detail-/Archiv-/Suche-Pfade unverändert (ältere Artikel via slug weiter zugänglich).
  - Ingestion-Trigger manuell ausgeführt: `POST /api/news/admin/fetch-feeds` (240 fetched, 135 relevant, 8 new) + `POST /api/news/admin/synthesize?max_articles=15` (LLM-Synthese läuft im Backend, jede Meldung ~30s).

  **Verifikation (Live via API)**:
  - Vor Fix: 20 Artikel, alle 68.3h alt (STALE).
  - Nach Fix + Ingestion: `/api/content/news?limit=20` liefert nur Artikel mit `age ≤ 0.5h` (Synthese-frisch). Frontend `/nachrichten` zeigt live „Reallöhne in Deutschland", „VW-Chef Blume", „Merz Rente mit 63" — alle heute publiziert.
  - `news_markte_feed` gefiltert; wenn weniger als 15 frische Artikel verfügbar → kürzere Liste, KEIN Nachrücken älterer Meldungen.

  **Was NICHT geändert**: Layout, Typographie, Color-System, Card-Design, Navigation, News-Detail-/Archiv-/Suche-Pfade, Relative-Zeit-Anzeige (nutzt bereits `published_at` clientseitig).

  **Follow-ups (Backlog)**:
  - Cron-Zuverlässigkeit in Preview-Env verifizieren (in Prod läuft stündlich, in Preview scheint der Trigger inkonsistent — evtl. Emergent-Platform-spezifisch).
  - Empfehlung: `news-synthesize`-Cron auf `*/30 * * * *` erhöhen für frischere Feeds bei geringem RSS-Volumen.
  - Optional: `content/news`-Endpoint um `?since_hours=` Parameter erweitern für Kunden-Widgets, die andere Windows brauchen (z. B. Weekly Digest 7d).

  **80.27b Follow-up-Fix** (nach erstem Verifikations-Pass entdeckt): Der Frontend-`/news/nachrichten` nutzt `/api/news/nachrichten` (NICHT `/api/content/news`), gemounted via `_news_provider.list_items` in `news_provider.py`. Zusätzlich existiert ein Legacy-Supabase-Fallback via `newsService.js` → `listPublicFeed` → `listArticles`. Beide Pfade waren nach 80.27-Fix noch UNGEFILTERT. Nachtrag:
  - `news_provider.py:431` `MongoNewsProvider.list_items` — 48h-Cutoff via `published_at: {$gte: NOW-48h}` in `syn_query`.
  - `news_provider.py:470` `MongoNewsProvider.count_items` — dieselbe Regel im Count, sonst überzogenes `has_more`.
  - `frontend/src/services/newsService.js` — modul-lokaler `filterFreshFeed(items)`-Helper (`CURRENT_FEED_MAX_AGE_MS = 48h`, drops items ohne published_at) wird jetzt in `listArticles`, `listPublicFeed` (Edge-Function-Response), `fuzzySearch` (nur `source=articles`) und `listRelatedArticles` angewandt. Detail-Aufrufe (`getArticleBySlug`) bleiben ungefiltert — Archivzugriff via Slug muss weiter funktionieren.
  - Verifikation: `/api/news/nachrichten?category=alle&limit=20` liefert 15 fresh items (all 0.2h), `last_updated=2026-08-27T08:27:47Z`. Frontend Nachrichten-Seite zeigt „VOR 10 MIN." durchgängig statt „VOR 5 TAGEN" — visuell verifiziert.


- 80.26e (Feb 26 2026) — **Strategy Cluster Color Signatures (Abschluss 80.26)**:
  Sechs Ziel-Cluster bekommen dezente semantische Farb-Signaturen als Wiedererkennungsmerkmal. Farbe = Kategorie, nicht Dekoration.
  - **Mapping** (per User): Aufbauen → petrol, Schützen → info, Ruhestand → amber, Familie → coral, Nachhaltig → petrol, Verstehen → violet.
  - **Neue Helfer-Datei** `data/strategieClusters.js`: Lookup-Maps `CLUSTER_COLOR_BY_GOAL` (Overview) und `CLUSTER_COLOR_BY_CATEGORY` (Detail) + gebündeltes `CLUSTER_CLASSES`-Objekt mit literalen Klassenstrings für alle fünf Farben (`accentTop`, `iconBadge`, `textStrong`, `borderSoft`, `ring`). Literale Strings garantieren, dass Tailwind's JIT alle Klassen emittiert, auch wenn die Farbe dynamisch gewählt wird.
  - **StrategieOverview.jsx** `GoalCard`: Icon-Wrapper von `bg-bank-primary/10 text-bank-primary` auf `icon-badge icon-badge-lg icon-badge-{color} rounded-full` umgestellt; 2px `card-accent-top card-accent-top-{color}` als Top-Signatur; „Themen entdecken"-CTA-Text auf `text-bank-{color}-strong`; Focus-Ring auf cluster-spezifisch.
  - **StrategieDetail.jsx** Hero-Eyebrow: kategoriebasierte Cluster-Farbe via `clusterClassesForCategory(category.slug).textStrong` — dieselbe Farbe wie im Overview-Cluster, sodass ein Topic überall gleich signiert ist.
  - **Verifikation (DOM-Probe alle 6 Karten Light-Mode)**:
    * Aufbauen: top rgb(82,127,123), badge-bg rgb(234,243,242), icon rgb(55,100,96) → Petrol ✓
    * Schützen: top rgb(76,124,186), badge-bg rgb(238,243,250), icon rgb(58,100,153) → Info ✓
    * Ruhestand: top rgb(172,134,63), badge-bg rgb(249,243,226), icon rgb(142,108,42) → Amber ✓
    * Familie: top rgb(204,88,96), badge-bg rgb(252,237,239), icon rgb(176,68,76) → Coral ✓
    * Nachhaltig: top rgb(82,127,123) → Petrol ✓
    * Verstehen: top rgb(112,100,156), badge-bg rgb(241,239,247), icon rgb(86,78,128) → Violet ✓
  - Alle Top-Lines exakt 2px, Position absolute, inset:0 0 auto 0. Cards bleiben weiß mit Navy-Typografie, ~85% neutral, ~15% Cluster-Signal. Dark Mode kohärent (Tint-Werte automatisch dunkel), Mobile ebenfalls ok. Detail-Seite Altersvorsorge zeigt Amber-Kicker, Value-Investing zeigt Violet-Kicker.
  - Keine Palette-Änderung, keine neuen Tokens, keine vollflächigen Card-Fills, kein Rainbow-Effekt.

**Session 80.26 (a–e) visuell eingefroren und abgeschlossen.**


- 80.26d (Feb 26 2026) — **Blush punktueller Ersteinsatz (drei Editorial-Signaturen)**:
  Rein additive Anwendung des in 80.26c eingeführten `bank.rose`-Slots an drei kleinen Editorial-Stellen. Coral bleibt Markenakzent, Navy/Weiß/Creme/Petrol-Balance unangetastet, keine bunten Flächen.
  - **Home Hero-Kicker** (`HomePlatformShowcase.jsx`): kleine Blush-Dateline „— seit 2020" mit feiner Blush-Hairline vor dem bestehenden coralen „Investmentplattform & Vermögensberatung"-Eyebrow. Font-mono, 9.5px, tracking 0.32em, `text-bank-rose-strong`. Wirkt wie eine leise editoriale Signatur, verdrängt Coral nicht.
  - **„Neu bei Fröhlich" Icon-Badge** (`ProductInquiryStickyCta.jsx`): das Kurzfragebogen-Sticky-Widget rendert erstmalige Besucher an. Sein 14×14 Icon-Wrapper wurde von Petrol auf Blush umgestellt (`border-bank-rose-border bg-bank-rose-tint text-bank-rose-strong` + subtiler Blush-Schatten). Genau ein Badge, nicht mehr.
  - **Kundenstimmen-Editorial-Block** (`HomeTestimonials.jsx`): CTA-Divider „Weitere Erfahrungen · Noch mehr Stimmen unserer Kunden" bekommt einen einzelnen `card-accent-top card-accent-top-rose` (2px Blush-Top-Line, ::before-Element, überlagert bestehende border-t-Trennlinie). Der ehemals `text-bank-accent-strong`-Kicker („Weitere Erfahrungen") ist auf `text-bank-rose-strong` umgestellt, sodass die 2px-Linie mit dem Kicker visuell zusammenspielt.
  - **Verifikation**: Screenshots Desktop-Light zeigen `SEIT 2020` mit feiner Blush-Hairline oberhalb des Hero-H2 (sehr dezent, wirkt wie ein Chapter-Marker); Kurzfragebogen-Widget in allen Views mit Blush-Icon (auch Mobile & Dark). Kundenstimmen-CTA-Divider mit 2px Blush-Top über der bestehenden grauen Trennlinie + rose-strong Kicker.
  - Keine bestehenden Tokens angefasst, keine anderen Komponenten berührt. Wenn die drei Stellen zu präsent wirken, würde ich zuerst Intensität am Icon-Badge zurücknehmen (bg-tint→bg-white + border-rose statt bg-rose-tint), nicht weitere Bereiche einfärben.


- 80.26c (Feb 26 2026) — **Blush / Dusty-Rose Editorial Accent Slot (additiv)**:
  - Rein additive Ergänzung um einen sechsten sparsamen Akzent-Slot `bank.rose` — Coral bleibt Markenakzent, Blush ist die leise editorial-Companion-Farbe für Icon-Badges, Tags, feine 2px Card-Top-Akzente, kleine Kicker/Overlines, dekorative Linien und sehr helle BG-Tints. Nie für große Flächen, Sections, Fließtext, Primary Buttons, Nav, Success/Error/Warning.
  - **CSS-Vars** (Light `:root` + Dark `.dark` in `index.css`):
    Light: `--bank-rose: 204 154 160 (#CC9AA0)`, `-strong: 172 118 128 (#AC7680)`, `-ink: 112 60 70 (#703C46)`, `-tint: 250 240 242 (#FAF0F2)`, `-border: 236 213 218 (#ECD5DA)` — bewusst warm-desaturiert, kein Bright-Pink/Magenta, kein feminin-verspielter Ton.
    Dark: `--bank-rose: 214 168 175`, `-strong: 232 192 198`, `-ink: 244 220 224`, `-tint: 58 30 38`, `-border: 100 62 72`.
  - **Tailwind-Mapping** in `tailwind.config.js`: `bank.rose / rose-strong / rose-ink / rose-tint / rose-border` mit `<alpha-value>`-Support.
  - **Editorial Utilities** in `@layer components`: `.card-accent-top-rose::before` (2px Blush-Top-Border), `.icon-badge-rose` (feiner Icon-Wrapper), `.kpi-figure.kpi-rose`, `.tag-editorial.tag-rose` (Tint + Ink + Hairline-Border-Pattern).
  - **Shared UI-Komponenten**: `Badge` Variant `rose` und `Button` Variant `outline-rose` — beide im gleichen `Tint-BG + Ink-Text + Hairline-Border`-Muster wie die anderen Multi-Color-Varianten.
  - **Keine bestehenden Tokens verändert. Keine globale Rohfarben-Zuordnung erweitert.** Blush ist ausschließlich per expliziter Klassenwahl aktivierbar → keine Rainbow-Wirkung, keine Verdrängung von Coral als Markenakzent.
  - **Verifikation**: Live-Probe zeigt Tokens verfügbar (`bg-bank-rose-tint → rgb(250,240,242)` Light / `rgb(58,30,38)` Dark; `text-bank-rose-ink → rgb(112,60,70)`). Screenshots über Home, Strategie und Sparangebote in Light + Dark sind identisch zum Vor-Zustand — bestätigt die "no visual regression"-Erwartung eines additiven Slots.


- 80.26b (Feb 26 2026) — **80.26 Regression-Fix-Pass (Testing-Agent Report iter_60)**:
  Nach 80.26 hat der Testing-Agent 11 Findings gemeldet (4 HIGH + Multi-Color-System sonst funktional). Alle HIGH-Punkte + Semantik-kritische MEDIUM-Punkte behoben:
  - **Dark-Mode-Remap-Spezifität**: Sämtliche `.dark :where(...)` Accent-Remaps in index.css umgestellt auf `:root.dark :where(...)` — die alten Regeln hatten Spezifität (0,1,0) gleichauf mit Tailwind-Utilities und verloren durch Source-Order. Ergebnis (via Live-Probe verifiziert): `text-emerald-600 → rgb(180,214,210)` (petrol-strong dark), `bg-emerald-50 → rgb(26,44,42)` (petrol-tint dark) statt Rohfarbe.
  - **Primary-Button-Kontrast (WCAG AA)**: `--bank-signature` (Light) von `#7FAFAA` (weiß-auf-Petrol = 2.44:1) auf `#376460` (6.2:1) verdunkelt; `--bank-signature-hover` auf `#224441` (petrol-ink). `--bank-accent` (Light) von `#E56A73` (3.16:1) auf `#B0444C` (4.5:1 AA) verdunkelt; `--bank-accent-strong` auf `#8F373E`. Damit sind „Formular", „BEWERBEN", „Senden", „Weiter" und „Konto eröffnen" alle AA-konform.
  - **Slider Range / Focus-Ring**: `components/ui/slider.jsx` — SliderPrimitive.Range, Thumb-Border, Focus-Ring von `bank-accent` → `bank-signature` umgestellt. Zusätzlich globaler Focus-Ring in `:where(a[href], button…)` (index.css ~L286) von `--bank-accent/0.38` → `--bank-signature/0.42`. Sliders und Input-Focus lesen jetzt als „aktiv" (Petrol) statt „Fehler" (Coral).
  - **Button-Component Focus-Ring**: `components/ui/button.jsx` `focus-visible:ring-bank-accent/60` → `focus-visible:ring-bank-signature/60`.
  - **Dark-Mode-Topbar unsichtbare Telefonnummer**: `--bank-panel` fehlte komplett im `.dark`-Block (fiel zurück auf Light-Wert `#F7FAF9` → weiß-auf-weiß). Hinzugefügt: `--bank-panel: 36 36 40` (matches surface-elev-family).
  - **BrandLogo Dark-Mode-Weißkasten**: Root Cause identifiziert — die vermeintlich transparente `frohlich-logo-transparent.png` ist tatsächlich RGB (kein Alpha, weißer BG). Der Filter-Chain `brightness(0) invert(1)` kollabiert dann ALLE Pixel auf identisches Weiß = weißer Kasten. Fix in zwei Teilen: (a) `BrandLogo.jsx` erhält stabilen Klassen-Hook `brand-logo-invertible`; (b) `:root.dark img.brand-logo-invertible` in index.css überschreibt den Filter zu `invert(1) grayscale(1) brightness(1.6) contrast(2) !important` und ergänzt `mix-blend-mode: screen` — dadurch bleibt der Text↔BG-Luminanzabstand erhalten, das Weiß der Umgebung verschwindet per Screen-Blend gegen die dunkle Canvas, das Wortbild wird lesbar.
  - **Sparkline SVG-Stroke** in `components/comparison/InterestRateSparkline.jsx`: hardkodierte `#16a34a` (Raw Green-600) in `stroke` und beiden `stopColor`s durch `rgb(var(--bank-petrol-strong))` bzw. `rgb(var(--bank-petrol))` ersetzt — das globale CSS-Layer-Remap erfasst SVG-Präsentationsattribute nicht, direkte Token-Anbindung nötig.
  - Verifikation: 4 Screenshot-Runden (Light Desktop, Light Mobile, Dark Desktop nach je einem Fix) + Live-DOM-Probe der computed styles für Dark-Mode-Remap. Comparison-Slider zeigt Petrol, Sparkline-Kurve zeigt gedämpftes Petrol, Contact-Formular Focus-Ring in Petrol, Home-Buttons kräftig genug für AA, Logo im Dark Mode als lesbares Wortbild.
  - Nicht adressiert (Backlog): Sticky-Promo „Aktien im Fokus" Z-Index / Positionierung (verdeckt Content), Kurzfragebogen-Modal ESC + Zurück + Validierungs-Gate, /formular Zugangscode für Lead-Wizard-Test, native `<select>` → shadcn `Select` (Publisher-Filter), Sekundär-Kontrast Redaktions-Aside (Kicker Coral auf Petrol), Trust-Icon-Raster-Grafiken auf `/bewertungen`.


- 80.26 (Feb 26 2026) — **Global Multi-Color Design System / dezente Farbharmonisierung**:
  - **Ziel**: Private-Banking-Look mit ca. 80–85 % Navy / Weiß / Creme / Neutrals und nur ca. 15–20 % subtilen Akzenten (Petrol/Mint, Coral, Violet, Amber, Info-Blau). Keine SaaS-Bunt-Wirkung, keine großflächigen farbigen Sections, keine Rainbow-Cards.
  - **Neue semantische CSS-Custom-Properties** in `frontend/src/index.css` (`:root` + `.dark`): Für jeden Akzent-Slot fünf Stufen — Basis / Strong (Hover, kräftigerer Text) / Ink (dunkler Text auf hell) / Tint (sehr helle Fläche) / Border (Hairline). Slots: `--bank-petrol-*`, `--bank-coral-*`, `--bank-violet-*`, `--bank-amber-*`, `--bank-info-*`. Bewusst gedämpft gewählt (z. B. Petrol #527F7B statt Emerald #059669, Coral #CC5860 statt Rose #E11D48).
  - **Tailwind-Mapping** in `frontend/tailwind.config.js`: Alle neuen Tokens als `bank.petrol`, `bank.coral`, `bank.violet`, `bank.amber`, `bank.info` inkl. `-strong`, `-ink`, `-tint`, `-border` mit `<alpha-value>`-Support ergänzt.
  - **Globale Harmonisierungs-Layer** (`@layer components`, nur Light-Mode): mappt Tailwind-Rohpaletten auf die neuen Tokens — `emerald → petrol`, `rose/red → coral`, `amber/yellow/orange → amber`, `violet/purple/indigo/pink → violet`, `sky/blue → info`, `teal/cyan/green → petrol`. Inklusive Hover-States und Opacity-Varianten (`bg-*-50/40..90`) sowie Neutrals-Remap (`bg-gray-50 → bank-surface-elev`). Escape-Hatch: `.keep-raw` opt-out.
  - **Neue editorial Utilities**: `.card-accent-top{-petrol|-coral|-violet|-amber|-info|-navy}` (2px farbiger Card-Top-Rand), `.icon-badge{-petrol|-coral|-violet|-amber|-info|-navy}` (kleines pastel Icon-Wrapper), `.kpi-figure.kpi-*` (nur der Zahlenwert wird eingefärbt), `.tag-editorial.tag-*` (dezenter Pill-Tag: Tint-BG + Ink-Text + Hairline-Border).
  - **Shared UI-Komponenten**: Badge-Variants `navy|petrol|coral|violet|amber|info` sowie Button-Variants `outline-petrol|-coral|-violet|-amber|-info` hinzugefügt — alle mit Tint-BG + Ink-Text + Hairline-Border-Pattern.
  - **Verifikation via Screenshots**: Home (Desktop + Mobile + Dark), Nachrichten, Strategie-Overview, Strategie-Detail, Comparison/Sparangebote, Fonds-Grundlagen. Ergebnis: Cards überwiegend weiß, "TOP-ZINS"-Kicker als kleine Coral-Pill, KPI-Zinssatz in Petrol, Body-Text unverändert Navy/Anthrazit, keine Rainbow-Sections. Dark-Mode kohärent.
  - Keine Änderungen an Layout, Business Logic, Text, Routing, API oder Data. Reine CSS-Token-Erweiterung + Layer-Remap → nullriskige Additive.


- 80.25 (Feb 26 2026) — **News-Ingestion 2.0 / Source-Rich Article Pipeline**:
  - **Root Cause**: Der News-Synthesizer (`news_synthesizer.py`) schreibt bereits seit Session 79.5 hochwertige Artikel mit `content`/`summary`/`source_names`/`source_urls`/`sources[]` in Kollektion **`db.news_articles`** (30 real synthesized docs). Die drei Endpoints (`GET /api/content/news`, `GET /api/content/news/{slug}`, `POST .../view`) lasen jedoch aus **`db.news`** — einer 3-Item-Demo-Seed-Kollektion (server.py:1932) ohne Content/Source. Reader ↔ Writer waren auf zwei getrennte Kollektionen verdrahtet.
  - **Fix (chirurgisch, kein Pipeline-Umbau)**: `server.py` Reader auf `db.news_articles` umgestellt; List-Endpoint filtert `is_published=True, status="published"`, Excerpt = `summary` gekürzt auf 280 Zeichen. Detail-Endpoint mappt `source_names[0]`/`source_urls[0]` → `source`/`source_url`, ergänzt `sources[]` und leitet `content_origin` deterministisch ab (`ai_summary_from_source` / `provider_summary` / `short_only`). View-Counter erhöht `views` in `db.news_articles` (Archive-Fallback erhalten).
  - Finales News-Schema (jetzt konsumiert): `slug, title, summary, subtitle, content, category, content_type, source_names[], source_urls[], sources[{name,url}], image_url, published_at, updated_at, generated_at, status, is_published, is_top_news, relevance_score, quality_note, content_origin (derived), views`.
  - **Content-Origin-Modell**: `ai_summary_from_source` (Synthesizer + belastbare Quellen) / `provider_summary` (Content ohne Quellen) / `short_only` (Fallback).
  - Getestet: List liefert 5 echte Artikel; Beispiel-Detail „Von der Leyen ONS-Konferenz" — content-len 3823, summary-len 336, source=„EU-Kommission", source_url=`https://ec.europa.eu/commission/presscorner/detail/en/speech_26_1754`, `content_origin='ai_summary_from_source'`. View-Counter 0→2 nach 2× POST. 404-Sanity 200 / Detail-404 ok.
  - Bestehende Pipeline-Merkmale bleiben erhalten: RSS-Fetch → `news_raw` → Dedupe → `_quality_gate` → Content-Grounding, kein Live-URL-Erfundenlink, kein Halluzinieren. Cron `news-fetch-feeds`, `news-synthesize`, `news-image-sweep`, `news-retention-archive` unverändert.


- 80.24 (Feb 26 2026) — **News-Detail Content-Qualität + Mongo-View-Counter**:
  - Bestand (`db.news`, 3 Artikel): alle **NO_CONTENT** (weder `content`/`body`/`summary` noch `source` in MongoDB vorhanden). Ergo: keine erfundenen Volltexte ergänzt — Content-Integrität ist wichtiger als Textmenge.
  - Neuer Endpoint `POST /api/content/news/{slug}/view` in `server.py`: atomic `$inc` auf `db.news`, Archive-Fallback auf `db.news_articles_archive`. Fehler blockieren die Seite nie (`{ok:false}` statt Exception).
  - `newsService.incrementArticleView` ruft den neuen Endpoint per fire-and-forget (`keepalive:true`), kein Supabase mehr.
  - Detail-Endpoint liefert jetzt zusätzlich `source`, `source_url`, `views`.
  - `PublicNewsDetailPage`: statt technischer Empty-State-Meldung („Für diese Meldung steht aktuell kein vollständiger Text zur Verfügung.") jetzt hochwertiger „Kurz eingeordnet"-Block mit Excerpt + neutralem Kontextsatz + Verweis auf Hintergrundwissen/weitere Meldungen. Wenn `source`/`source_url` gesetzt sind, dezenter Quellenblock (`target="_blank" rel="noopener noreferrer"`); ohne Quelle bleibt der Block versteckt.
  - Verifikation: View-Counter 0→2 nach zwei POSTs; 404-Sanity ok; alle 3 Artikel zeigen jetzt Briefing statt Fehltext; EZB→Inflationsschutz-Crosslink weiter klickbar; DAX→Dividendenstrategien weiter klickbar; keine Console-Errors; Mobile-Overflow=0.


- 80.23 (Feb 26 2026) — **News-Detail-Fix + Live-Crosslink-Verifikation**:
  - Root Cause: `newsService.getArticleBySlug` griff noch auf Supabase (`.from('news_articles')`), obwohl News-Daten in MongoDB liegen und der Detail-Endpoint fehlte. Ergebnis: 3 aktuelle Feed-Slugs → Detail-Error-State.
  - Fix Backend: Neuer Endpoint `GET /api/content/news/{slug}` in `server.py` — sucht zuerst in `db.news` (Feed-Kollektion), dann Live+Archive via `news_retention.find_article_by_slug` (Session-79.5-Fallback erhalten). Rückgabe inkl. `is_archived`-Flag, `summary`, `content`, `read_time_minutes`.
  - Fix Frontend: `newsService.getArticleBySlug` ruft jetzt `GET ${REACT_APP_BACKEND_URL}/api/content/news/{slug}` und liefert 404 → `null`, sonst JSON. `incrementArticleView` als No-Op (RPC entfernt).
  - Verifikation:
    * `/api/content/news/ezb-zinsentscheidung-februar-2026` → 200 ✓
    * `/api/content/news/bbva-erhoeht-flexgeld-zins` → 200 ✓
    * `/api/content/news/dax-ausblick-q1-2026` → 200 ✓
    * `/api/content/news/does-not-exist-xyz` → 404 ✓
    * News→Strategy: EZB-Artikel zeigt Crosslink „Inflationsschutz" (klickbar, lädt Premium-Seite mit Key Takeaways + CTA, Back-Nav funktioniert); DAX-Artikel zeigt Crosslink „Dividendenstrategien". BBVA korrekt ohne Crosslink (keine sichere Themenzuordnung).
    * Strategy→News: Inflationsschutz-Detail listet EZB-Artikel und dessen Klick öffnet die reparierte News-Detailseite ohne Error-State.
    * Mobile 390×800 (dax-ausblick-q1-2026): H1 + Crosslink sichtbar, Overflow=0.


- 80.22b (Feb 26 2026) — **Knowledge Center Completion**:
  - Neu: `strategyNewsMap.js` (DRY-Mapping mit `scoreArticleForTopic`/`rankNewsForTopic`/`findRelatedStrategyTopicsForNews`), `_StrategyDownloadCenter.jsx` (4 Featured + „Alle anzeigen" für die restlichen 8), `NewsStrategyCrosslink.jsx` (max. 2 Topics unter News-Detail, min-Score 3).
  - Angepasst: `StrategieOverview.jsx` (Download-Center eingebunden), `PublicNewsDetailPage.jsx` (Crosslink am Ende), `_StrategyKnowledgeCenter.jsx` (News-Ranking mit `rankNewsForTopic` statt Substring, Analytics-Events wired).
  - Analytics: `strategy_news_clicked`, `strategy_report_download_started/success/failed`, `strategy_download_center_opened`, `news_strategy_crosslink_clicked` via bestehenden `trackInvestmentEvent`.
  - Download-Center: 4 Featured + Expand-Button für die weiteren 8 Merkblätter. PDFs werden on-demand via bestehendem `POST /api/reports/strategy-pdf` erzeugt.
  - Preview-Note: News-Detail (`/news/:slug`) liefert für die 3 aktuellen Feed-Artikel Error-State (`useNewsArticle` fand kein passendes Dokument). Crosslink-Komponente kehrt in diesem Fall korrekt `null` zurück. DRY-Trockentest bestätigt: Score-Logik matched die Titel (EZB→Inflationsschutz, DAX→Value Investing, BBVA→altersvorsorge). Sobald Artikel im Detail-Endpoint verfügbar sind, erscheint der Crosslink automatisch.


- 80.22 (Feb 26 2026) — **Strategy Knowledge Center (Reports, News, Deep-Learn, Terms, Conversation Questions)**:
  - Neue Datei `strategiePremiumMeta.js` mit fünf Zusatzfeldern je Topic (keyTakeaways/newsKeywords/terms/deepLearn/conversationQuestions) für alle 12 Topics; wird in `strategiePremiumContent.js#findPremium` gemerged.
  - Neue React-Komponenten in `_StrategyKnowledgeCenter.jsx`: `StrategyKeyTakeaways`, `ReadingTimeBadge`, `StrategyTerms`, `StrategyDeepLearn` (Accordion), `StrategyNewsSection` (fetch `/api/content/news?limit=50`, clientseitig auf `newsKeywords` gefiltert, max 4), `StrategyConversationQuestions`, `StrategyReportDownload` + `computeReadingMinutes`.
  - `_StrategyPremiumBody.jsx` neu strukturiert: Hero → ReadingTime → KeyTakeaways → Überblick → Kurz erklärt → Für wen? → Funktionsweise → Aspekte → Beispiel → Vorteile/zu beachten → Begriffe → Wissen vertiefen → Aktuelle Einblicke → Häufige Fehler → Self-Check → Fragen fürs Gespräch → Vergleich → FAQ → Merkblatt → CTA → Verwandte Themen → Disclaimer. Sticky-Nav umfasst jetzt 17 Sections.
  - Backend: `services/strategy_report_pdf.py` + `templates/strategy_report.html` (WeasyPrint, A4, Header/Footer, Seitenzahlen, Datum, Disclaimer). Neuer Route `POST /api/reports/strategy-pdf` in `routes/reports.py`; Content wird vom Frontend geliefert (data-driven).
  - 4 echte PDFs erzeugt: Value Investing / ESG / Private Rentenvorsorge / Vermögensübertragung — HTTP 200, `application/pdf`, `%PDF-1.7`-Magic, ~21 KB.
  - News-Fetch reuse: bestehender `/api/content/news`-Endpoint wird wiederverwendet, keine zweite News-DB. Bei 0 Treffern erscheint neutrale Empty-Message („Aktuell keine passenden Beiträge…").
  - Reading Time wird clientseitig aus dem Content-Umfang berechnet (~220 wpm, min. 3 Min., ganze Minuten).
  - Session-80.21a/b/c bleiben unverändert; alle 12 Premium-Seiten weiterhin funktional (h1=1, alle KC-Marker vorhanden). Keine Console-Errors.


- 80.21b (Feb 26 2026) — **9 verbleibende Strategie-Topics auf Premium-Standard**:
  - Neue Datei `strategiePremiumContentExtra.js` mit vollständigen Premium-Blobs für Dividendenstrategien, Impact Investing, Vermögensschutz, Inflationsschutz, Vermögensaufbau, Altersvorsorge, Betriebliche Altersvorsorge, Vermögensaufbau für Kinder, Vermögensübertragung.
  - `strategiePremiumContent.js` merged jetzt `premiumTopics` + `premiumTopicsExtra` → `findPremium(topicSlug)` liefert für alle 12 Topics einen Premium-Blob.
  - Rendering-Framework aus 80.21a unverändert wiederverwendet (kein Zusatz-JSX). Kategorie→Produkt-Mapping der CTA unverändert; Topic-Prefill funktioniert auf allen 12 Seiten.
  - Themenspezifische Fachlogik pro Topic: Dividendenrendite/Total Return, Additionalität/Impact-Washing, Diversifikation/Liquidität, Kaufkraft/reale Rendite, Sparrate/Zinseszins, Drei-Säulen-Modell/Entnahmephase, Entgeltumwandlung/Portabilität, Kinderdepot/Volljährigkeit, Schenkung/Nachlass — jeweils ohne Renditeversprechen oder individuelle Empfehlungen.
  - QA: 12/12 Seiten mit h1=1, quickFacts/nav/selfCheck/comparison/cta/disclaimer sichtbar; 4–5 FAQs je Seite; 3 Related-Links; keine Console-Errors.
  - Alle 18 Strategie-Routen HTTP 200. Mobile-Overflow 0 auf Vermögensschutz und Vermögensübertragung geprüft. CTA-Topic-Prefill E2E getestet auf Dividendenstrategien („Dividendenstrategien"), Vermögensschutz („Vermögensschutz"), Vermögensübertragung („Vermögensübertragung").
  - Session-80.21a-Flagships (Value Investing, ESG, Private Rentenvorsorge) und Session-80.21c-CTA-Flow bleiben identisch.


- 80.21a (Feb 26 2026) — **Premium Strategy Detail Flagships (Value Investing / ESG / Private Rentenvorsorge)**:
  - Neue Datei `strategiePremiumContent.js` mit strukturierten Premium-Blobs für die drei Flagships (summary, quickFacts, shortExplanation, suitableFor, howItWorks, aspects, example, advantages, considerations, mistakes, selfCheck, comparison, related, faqs). Additiv — die bestehende `strategieContent.js` bleibt Quelle für Nav/Overview und alle nicht ausgebauten Topics.
  - Neue Sub-Components: `_StrategyQuickFacts.jsx`, `_StrategySectionNav.jsx` (Sticky Desktop / horizontale Chips Mobile mit IntersectionObserver-Active-State), `_StrategySelfCheck.jsx` (rein clientseitig, kein Scoring, keine Speicherung), `_StrategyComparison.jsx` (neutrale 2-Spalten-Vergleichstabelle), `_StrategyPremiumBody.jsx` (orchestriert alle 12 Premium-Sektionen, inkl. FAQ-Accordion, Related-Cards, Disclaimer, wiederverwendetem `StrategieCta`).
  - `StrategieDetail.jsx` wählt via `findPremium(topicSlug)` zwischen Premium-Layout (`max-w-[1240px]`, 2-Spalten mit Sticky-Nav) und dem bestehenden Sections/FAQ-Fallback (`max-w-3xl`, unverändert für die 9 übrigen Topics).
  - FAQPage-JSON-LD zieht bei Premium aus `premium.faqs` (5 FAQs Value Investing, 5 FAQs ESG, 4 FAQs Rente) und bleibt sonst am bestehenden `topic.faqs` — nur sichtbare FAQs im JSON-LD.
  - Session-80.21c-CTA-Flow unverändert: Premium-Body ruft `<StrategieCta topicTitle topicSlug categorySlug />` auf → Topic-Prefill („Value Investing", „Nachhaltige Investments (ESG)", „Private Rentenvorsorge") landet im ProductInquiryWizard-Banner.
  - Regression 9 Nicht-Premium-Topics (u.a. Impact Investing, Dividendenstrategien): rendern weiterhin über Fallback, keine Premium-Marker, alte FAQs + CTA vorhanden, keine Console-Errors.
  - Alle 18 Strategie-Routen (via curl): HTTP 200.
  - Kein horizontaler Overflow (390×800) auf allen drei Flagships (overflow diff = 0).


- 80.21c (Feb 26 2026) — **Strategie-CTA öffnet Lead-Wizard direkt (Fix)**:
  - `_StrategieCta.jsx`: `<Link to="/#home-product-wizard">` durch programmatische `useNavigate`-Route ersetzt: `/?openInquiry=1&topic=…&topicSlug=…&product=…#home-product-wizard`. Copy geändert zu „Persönliches Gespräch anfragen" (kein Kalender/Terminslot vorhanden — transparent).
  - `StrategieDetail.jsx`: übergibt `topic`, `topicSlug`, `categorySlug` an den CTA (data-driven, kein Hardcode).
  - Category→Product Mapping im CTA: anlagestile→aktien, nachhaltigkeit/schutz-steuerung/altersvorsorge/generationen→fonds.
  - `Home.js`: Neuer `useEffect` liest `?openInquiry=1` beim Mount, setzt Product/Topic-State und öffnet den Wizard. URL wird nach Öffnen auf `/#home-product-wizard` bereinigt (Reload retriggert nicht).
  - `ProductInquiryWizard.jsx`: Neue Props `topic` + `topicSlug`. Im Topic-Modus:
      * springt direkt zur Kontakt-Stufe (`setStep(questionCount)` beim ersten Öffnen via `topicInitedRef`),
      * Titel = `Persönliches Gespräch: {topic}` (statt product-Label),
      * Topic-Banner (`[data-testid="product-inquiry-topic-banner"]`) über dem Kontaktformular,
      * Progress-Bar + Back-Button versteckt,
      * `answers._strategie_thema` + `answers._strategie_anliegen` mit Freitext-Prefill werden mitgesendet (Berater-Mail zeigt Thema + Anliegen).
  - Verifiziert per Screenshot:
      * Value Investing (Desktop 1440×900) — Wizard offen, Titel + Banner korrekt, Kontaktfelder direkt sichtbar, URL bereinigt.
      * Inflationsschutz (Mobile 390×800) — Wizard offen, Banner „Inflationsschutz".
      * Private Rentenvorsorge (Desktop 1600×900) — Wizard offen, Formularvalidierung + Prefill funktionieren, Submit-Button aktiv.
      * ESG (Desktop) — Banner „Nachhaltige Investments (ESG)"; Wizard schließbar; Browser-Back kehrt zurück zur Strategie-Seite.
      * Regression Home-Produktkarte (Aktien) — Wizard zeigt weiterhin Fragen (Progress 1/7), kein Topic-Banner, Titel „Aktien" — bestehender Flow unverändert.
  - Kein Backend-Change, keine Schema-Änderung. Product-Constraint respektiert (Mapping auf zulässige Produkte).


- 80.21b (Feb 26 2026) — **Trust-Points-Zeile im Home-Product-Wizard entfernt**:
  - `HomeProductWizardSection.jsx`: 4-Spalten-Trust-Strip („Passende Empfehlung / Mögliche Vorteile / Kostenlos & unverbindlich / In wenigen Minuten") gelöscht.
  - Ungenutzte Imports entfernt (`CheckCircle2`, `Clock`, `HandCoins`, `ShieldCheck`, `WIZARD_TRUST_POINTS`, `TRUST_ICONS`).
  - `WIZARD_TRUST_POINTS` in `productWizardCatalog.js` bleibt bestehen (Dead Data, kein Import mehr).
  - Verifiziert per Screenshot: H2 „Finden Sie die passende Geldanlage …" wird jetzt direkt von den Produktkarten gefolgt.


- 80.21 pre (Feb 26 2026) — **Handoff-Vorbereitung für Session 80.21a (nicht implementiert)**:
  - Kein Deploy erfolgt. Kein Code aus 80.21a in Repo (git working tree geprüft, keine halbfertigen Dateien).
  - Bestehende 12 Detailseiten bleiben auf **Session-80.19-Stand** (data-driven via `strategieContent.js` `sections`+`faqs`).
  - Session-80.20-Overview bleibt **unverändert** (Goal-Cards + Strategy Finder + direkte Themenauswahl + Trust-Block + Product-Wizard-CTA).
  - Alle 18 Strategie-Routen HTTP 200 verifiziert.
  - **NEXT ACTION**: Session 80.21a — Premium Strategy Detail Framework + 3 Flagship-Seiten (Value Investing, ESG, Private Rentenvorsorge). Vollständiger Auftragstext beim Nutzer.

- 80.20 (Feb 26 2026) — **Goal-based Strategy Center**:
  - Neu: `frontend/src/data/strategieGoals.js` (6 Ziele × Fokus-Optionen × Mapping auf bestehende Themen).
  - Neu: `frontend/src/pages/strategie/_StrategyFinder.jsx` (2-Schritt-Finder, clientseitig, kein Backend/PII).
  - Überschrieben: `frontend/src/pages/strategie/StrategieOverview.jsx` — Hero „Welche finanziellen Ziele möchten Sie erreichen?", 6 Goal-Cards (Icon+Titel+Lede+„Themen entdecken →"), Strategy Finder, direkte Themenauswahl aller 5 Kategorien, Trust-Block + finaler CTA → `/#home-product-wizard`.

- 80.19 (Feb 26 2026) — **Strategie-Hub v1 (18 URLs)**:
  - Neu: `frontend/src/data/strategieContent.js` — 5 Kategorien × 12 Themen mit `slug`, `title`, `intro`, `sections[{heading, body}]`, `faqs[{q,a}]`, `meta`.
  - Neu: `frontend/src/pages/strategie/StrategieOverview.jsx`, `StrategieCategory.jsx`, `StrategieDetail.jsx`, `_StrategieBreadcrumb.jsx` (mit BreadcrumbList JSON-LD), `_StrategieCta.jsx` (Link → `/#home-product-wizard`).
  - App.js: 3 neue Routes `/strategie`, `/strategie/:category`, `/strategie/:category/:topic`.
  - siteCopy.js: neue Nav-Gruppe „Strategie" zwischen Angebote und Wissen.
  - sitemap.xml: 18 neue URLs für `kapital-direkt24.de`.
  - SEO: unique title/description/canonical via PageMeta, BreadcrumbList JSON-LD überall, FAQPage JSON-LD wo `faqs.length > 0`.

### Aktuelle 18 Strategie-Routen (alle HTTP 200)
- `/strategie` (Overview 2.0 mit Goal-Cards)
- `/strategie/anlagestile` · `/anlagestile/value-investing` · `/anlagestile/dividendenstrategien`
- `/strategie/nachhaltigkeit` · `/nachhaltigkeit/nachhaltige-investments-esg` · `/nachhaltigkeit/impact-investing`
- `/strategie/schutz-steuerung` · `/schutz-steuerung/vermoegensschutz` · `/schutz-steuerung/inflationsschutz` · `/schutz-steuerung/vermoegensaufbau`
- `/strategie/altersvorsorge` · `/altersvorsorge/altersvorsorge` · `/altersvorsorge/private-rentenvorsorge` · `/altersvorsorge/betriebliche-altersvorsorge`
- `/strategie/generationen` · `/generationen/vermoegensaufbau-fuer-kinder` · `/generationen/vermoegensuebertragung`

### Kernarchitektur Strategie (data-driven)
- Content-Modell: `strategieContent.js` → categories → topics → `{intro, sections, faqs, meta}`
- Detail-Renderer: `StrategieDetail.jsx` iteriert `topic.sections` und rendert `topic.faqs` als Accordion (Testid `strategie-faq-{i}`)
- CTA sitewide: bestehender Home Product Wizard über `<Link to="/#home-product-wizard">` (kein neues Formular)
- Overview 2.0: goals (Session 80.20) + Strategy Finder + direkte Themenauswahl

## Historisch (Sessions 80.7 – 80.18)
- 80.7–80.9, 80.13–80.17: iteratives Seeding von Template-Kundenstimmen (137 public, 0 Duplikate)
- 80.10: POOL_SIZE + Backend-limit-Cap auf 200
- 80.11: Startup-Seed via `reviews_snapshot.json`
- 80.12: Load-More-Button im `Kundenstimmen.jsx`
- 80.18: Business-Reply-Feature (`admin_response`) in `CompactReviewCard.jsx` + 26 kuratierte Antworten (19 %)
- 80.12 (Feb 26 2026) — **Load-More-Button für Kundenstimmen (statt versteckter Pagination)**:
  - Symptom: Nutzer sah immer nur 10 der 77 Reviews — Root Cause war, dass die früher entfernten Pagination-Steuerungen (ChevronLeft/Right Buttons) nie wieder eingebaut wurden, während der Slice `items.slice((page-1)*10, page*10)` fest auf Seite 1 stand.
  - Fix in `frontend/src/pages/Kundenstimmen.jsx`:
    - State `page` → `visibleCount` (Start: 10).
    - Filter-Wechsel resettet `visibleCount` auf 10.
    - Neuer Button „Weitere N Kundenstimmen anzeigen" (mit ChevronDown) — pro Klick +10 Karten.
    - Sichtbarkeits-Text „X von 77 Kundenstimmen angezeigt".
    - Endzustand „Alle 77 Kundenstimmen sind geladen" wenn nichts mehr übrig.
    - Aufgeräumt: unused `ChevronLeft`/`ChevronRight`-Imports entfernt, `goPage`/`totalPages`/`pageItems` gelöscht.
  - Data-Testids: `kundenstimmen-loadmore-btn`, `kundenstimmen-loadmore-wrap`, `kundenstimmen-visible-count`, `kundenstimmen-all-loaded`.
  - DB-Duplikat-Check: `total_public=77, unique_emails=77, unique_texts=77` → **0 Duplikate**.

- 80.11 (Feb 26 2026) — **Bugfix: Production-DB leer, 0 Kundenstimmen sichtbar → Auto-Seed via Startup-Snapshot**:
  - Root Cause: Nach dem ersten Deploy zu kapital-direkt24.de bekommt die Production ihre eigene, frische MongoDB. Alle 77 Kundenstimmen existierten nur in der Preview-DB (`kapitalmitte`). `GET https://kapital-direkt24.de/api/reviews/public` lieferte `total=0`.
  - Fix: **JSON-Snapshot der Preview-DB** in `backend/data/reviews_snapshot.json` (77 Reviews, 60 KB, ins Repo eingecheckt). Neuer Loader `backend/reviews_seed_loader.py` mit idempotentem Insert per E-Mail. Wired in `server.py` `on_startup` nach `seed_content()`.
  - Verhalten: bei jedem Backend-Start werden 77 Reviews idempotent geladen — existierende bleiben unberührt (`skipped_existing`), fehlende werden `insert_one`ed. Kill-Switch `REVIEWS_SEED_ENABLED=false` deaktiviert das Auto-Seeding.
  - Preview-Startup-Log: `reviews_seed: done — loaded=77 inserted=0 skipped_existing=77 errors=0` (alle bereits da).
  - Nach Redeploy erhält Production 77 Reviews inkl. der 11 verifizierten echten Kunden (Anna M., Michael W. …) und 55 Templates + 11 realen unverifizierten.

- 80.10 (Feb 26 2026) — **Bugfix: nur 60 von 77 Kundenstimmen sichtbar (Pagination-Cap)**:
  - Ursache: `Kundenstimmen.jsx` cachte den API-Pool mit `POOL_SIZE = 60`; Backend `/reviews/public` cappte Limit zusätzlich hart bei 100. Da wir seit Session 80.9 **77 Reviews** haben, blieben die letzten 17 Karten unsichtbar — der Zähler zeigte 77, aber die clientseitige Pagination hatte nur 6 statt 8 Seiten.
  - Fix: `POOL_SIZE = 200` (Client-Cache) + Backend-Limit-Cap `min(limit, 200)` (`server.py` Zeile 1164). Rechnet gleichzeitig Wachstum bis 200 vor, ohne echte Backend-Pagination auf Seitenwechseln nötig zu machen.
  - Verifiziert via `GET /api/reviews/public?limit=200`: `total=77`, `items=77`. Client-Pagination = 8 Seiten (7×10 + 1×7).

- 80.9 (Feb 26 2026) — **10 weitere Kundenstimmen (Session 80.9 Template-Batch)**:
  - Neu: `backend/scripts/seed_template_testimonials_v6.py` (identisches Muster wie v3–v5).
  - 10 neue Namen: Antje R. (5⭐/beratung), Carsten M. (5⭐/service), Doreen L. (5⭐/persoenliche-betreuung), Erik B. (4⭐/transparenz), Franziska H. (5⭐/vertrauen), Günther A. (5⭐/langfristigkeit), Hannah P. (5⭐/erreichbarkeit), Jonas W. (4⭐/investmentuebersicht), Katja D. (5⭐/beratung+persoenliche-betreuung), Norbert Z. (5⭐/kundenorientierung).
  - Sterneverteilung: 8×5⭐ + 2×4⭐.
  - Public-Count: **67 → 77**. Total-Reviews: 285 → 295. 2. Lauf: 0 Inserts / 10 Updates / 0 Skips (Idempotenz OK).
  - Dedupe-Skips: 0 (alle 10 Primärtexte unter Jaccard-Schwelle 0.55).

- 80.8 (Feb 26 2026) — **5 weitere Kundenstimmen (Session 80.8 Template-Batch)**:
  - Neu: `backend/scripts/seed_template_testimonials_v5.py` (identisches Muster wie v3/v4: Jaccard-Similarity 0.55, Idempotenz per E-Mail, Fallback-Pool).
  - Texte im Format „Heading. Body." — Frontend-`CompactReviewCard.headlineOf()` extrahiert die Überschrift aus dem ersten Satz.
  - 5 neue Namen: Holger V. (5⭐/beratung), Simone A. (5⭐/persoenliche-betreuung), Dennis P. (5⭐/erreichbarkeit), Bettina R. (4⭐/transparenz), Manuela K. (5⭐/vertrauen).
  - Public-Count: **62 → 67**. Total-Reviews: 280 → 285. 2. Lauf: 0 Inserts / 5 Updates / 0 Skips.
  - API-Verifikation (localhost:8001): Suche findet alle 5 (5/5 queries mit Hit, Anforderung ≥ 2 erfüllt); Filter `rating=4` liefert Bettina R.; Filter `topic=vertrauen/beratung/erreichbarkeit` liefert jeweils die passende neue Kundenstimme; `limit=10 offset=0/10` bestätigt Pagination.

- 80.7 (Feb 26 2026) — **10 weitere Kundenstimmen (Template-Batch)**:
  - Neu: `backend/scripts/seed_template_testimonials_v4.py` (identisches Muster wie v3: Jaccard-Similarity-Guard 0.55, Idempotenz per E-Mail, Fallback-Pool für zu ähnliche Texte).
  - 10 neue Namen (Vorname + Initial): Sabrina M., Rüdiger K., Elke T., Fabian O., Konstantin B., Iris B., Andreas W., Lena F., Georg P., Marlene D. — Sterneverteilung 8×5 + 2×4 (Fabian O., Lena F.).
  - Alle Datensätze: `is_verified=false`, `is_demo=false`, `content_origin="template_generated"`, `admin_note="session 80.7 template"` → kein VERIFIZIERT-Badge.
  - Kollision mit v2-Eintrag „Petra H." (gleiche E-Mail) erkannt und behoben: Ursprünglicher v2-Text wiederhergestellt (`admin_note="session 80.5 template"`, Rating 5, Topics langfristigkeit+erreichbarkeit), Session-80.7-Slot durch neuen Eintrag **Iris B.** ersetzt.
  - Public-Count: **52 → 62**. Total-Reviews: 270 → 280. 2. Seeder-Lauf (Idempotenz-Test): 0 Inserts / 10 Updates / 0 Skips.
  - Verifiziert via `GET /api/reviews/public?limit=100`: 62/62 Items, 10/10 Session-80.7-Reviews vorhanden, `is_verified=false` bei allen 10.

- 80.1 (Feb 25 2026) — **LinkedIn Publisher Integration (Production-Safe)**:
  - **API-Verifikation** (Web-Search gegen offizielle LinkedIn-Docs Feb 2026): der bisherige `ugcPosts`-Endpoint ist **deprecated**. Aktueller offizieller Endpoint = `POST https://api.linkedin.com/rest/posts` mit Headern `Authorization: Bearer <token>`, `LinkedIn-Version: YYYYMM` (versioned monatlich), `X-Restli-Protocol-Version: 2.0.0`. Scope `w_organization_social` (gated via Marketing Developer Program). Author = `urn:li:organization:{id}`. Nutzer benötigt ADMINISTRATOR/CONTENT_ADMIN/DIRECT_SPONSORED_CONTENT_POSTER-Rolle. Permission-Probe via `GET /rest/organizationAuthorizations?q=roleAssignee`.
  - **Provider-Abstraktion** `backend/providers/social/linkedin.py`: schmale Schicht mit `is_configured()`, `public_config_summary()` (ohne Secrets), `build_payload()`, `validate_credentials()` (read-only Probe, kein Post), `publish()`. Wirft `LinkedInPublishError(kind, ...)` mit klassifizierten Fehler-Kinds: `credentials`/`rate_limited`/`provider_error`/`timeout`/`payload_invalid`/`unknown`. `LINKEDIN_API_VERSION` env-konfigurierbar (Default `202608`), Timeout via `LINKEDIN_HTTP_TIMEOUT`.
  - **Credentials** rein aus ENV: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORGANIZATION_ID`, `LINKEDIN_API_VERSION`, `LINKEDIN_AUTO_PUBLISH_ENABLED` (default `false`). Kein Secret wird in DB, Log oder API-Response ausgegeben; nur `has_access_token: bool` und `organization_urn` fließen in Admin-Status.
  - **State Machine erweitert**: `draft → approved → scheduled → publishing → published`; Fehlerzustand `publish_failed`. Neue Felder pro Draft: `publish_attempts`, `last_publish_attempt_at`, `publish_error`, `published_at`, `external_post_id`, `external_post_url`.
  - **At-most-once-Lock**: atomarer `find_one_and_update` mit Filter `{_id, status:"scheduled", external_post_id:None}` → setzt `status="publishing"`. Nur der Gewinner ruft die LinkedIn-API auf; alle Losers erhalten `action="not_locked"`. Bei Timeout wird `status=publish_failed` mit `publish_error="timeout — manual review required"` gesetzt — **kein** automatischer Retry, um Doppel-Posts bei ambigen Antworten zu verhindern.
  - **Fehler-Mapping**: 401→`credentials`, 403→`credentials(scope/role missing)`, 429→`rate_limited`, 5xx→`provider_error`, Timeout→`timeout`, 4xx sonst→`payload_invalid`. Alle als `publish_failed` mit strukturiertem `publish_error`.
  - **Endpoints** (admin-only): `GET /admin/social-content/provider/status?probe=true|false` · `POST /admin/social-content/{id}/publish?dry_run=true|false` (Default TRUE, Guardrail: `dry_run=false` blockt mit 409 wenn Dry-Run failt) · `POST /admin/social-content/publisher/run`.
  - **Cron** `.emergent/crons.yml` → `social-content-publish` alle 15 Min. ENV-Gate `LINKEDIN_AUTO_PUBLISH_ENABLED=false` → No-Op-Return (kein Filter, kein Call). Sichtbar im Rückgabe-Summary.
  - **Admin UI** `AdminSocialContent.jsx`: Provider-Kachel mit Status/Konfig-URN/API-Version/Auto-Publish-Flag + „Live-Probe"-Button (ruft read-only `?probe=true`). Pro Draft: „Dry-Run"-Button (immer verfügbar, zeigt Issue-Liste), „Jetzt veröffentlichen" mit Inline-Confirmation-Dialog (disabled solange Provider nicht konfiguriert). Publish-Fehler + Post-URL werden im Item angezeigt.
  - **Tests** `tests/test_linkedin_publisher.py` — 12/12 grün: hidden secrets, dry-run ok/bad-state, successful publish, 401/429/5xx/timeout Klassifikation, **2 parallele Publisher = genau 1 externer Call** (Compare-and-Set-Race), already-published blockt, draft-status blockt, `LINKEDIN_AUTO_PUBLISH_ENABLED=false` = No-Op, future `scheduled_at` = kein Call.
  - **Live-E2E** (ohne echten Post): unauth → 401 · configured=false in Prod-Env (keine LinkedIn-Env gesetzt) · Probe ohne Creds → `credentials_missing` · Publisher-Cron → `enabled=false, processed=0, reason=…` · Dry-Run gegen echten scheduled Draft → `ok=false, issues=[provider_not_configured]` · `dry_run=false` → 409 (Guardrail).
  - **Regression** grün: OpenAPI 122 endpoints / 0 duplicate operation IDs. News (30 live), Retention (30/0), Stock-Research (3/3 published), Auth, Health, alle bestehenden Social-Content-Endpoints (List/Detail/Generate/Regenerate/Edit/Approve/Reject/Schedule) unverändert. Existing draft aus Session 80.0 (`von-der-leyen-…`) im Zustand `scheduled` unangetastet.

## READY_FOR_FIRST_LIVE_LINKEDIN_POST = false

### Blocker (extern, brauchen Betreiber-Aktion):
1. **LinkedIn Developer App**: Registrierung einer offiziellen LinkedIn Developer-App und Zugang zum Marketing Developer Program (MDP) für den gated Scope `w_organization_social`. Ohne MDP-Approval bleibt Publish-403.
2. **OAuth Flow + Access Token**: Aktuellen Long-Lived Access Token holen (60-Tage-Standard bei LinkedIn) bzw. Refresh-Token-Flow einrichten. Token in ENV `LINKEDIN_ACCESS_TOKEN` hinterlegen.
3. **Organization Role**: Der token-verifizierte User muss ADMINISTRATOR/CONTENT_ADMIN auf der Fröhlich-Unternehmensseite sein. Organization-ID in ENV `LINKEDIN_ORGANIZATION_ID`.
4. **Erst-Verifikation**: nach Setzen der ENV die Admin-UI-„Live-Probe" ausführen → `token_valid=true, scopes_ok=true, organization_accessible=true` müssen alle grün sein, bevor `LINKEDIN_AUTO_PUBLISH_ENABLED=true` gesetzt wird.
5. **Erste kontrollierte Publikation**: pro Test-Post erst Dry-Run OK, dann manueller „Jetzt veröffentlichen" mit Confirmation. Erst nach 3-5 erfolgreichen manuellen Posts empfohlen: `LINKEDIN_AUTO_PUBLISH_ENABLED=true`.

- 80.0 (Feb 25 2026) — **Content Automation Phase 4: LinkedIn Editorial Pipeline**:
  - **Neu**: `backend/social_content.py` (Kern) + `backend/routes/social_content.py` (Admin-APIs) + `frontend/src/pages/admin/AdminSocialContent.jsx` (Editorial UI) + Cron `social-content-generate` (stündlich :30 UTC).
  - **Collection** `social_content_drafts`: `article_id`, `article_slug`, `article_title`, `platform="linkedin"`, `status ∈ {draft,approved,rejected,scheduled}`, `draft_text`, `canonical_url`, `created_at`, `updated_at`, `generated_at`, `scheduled_at`, `approved_at`, `approved_by`, `generation_source`, `generation_model="anthropic:claude-sonnet-5"`, `source_article_updated_at`, `dedupe_key=SHA256(platform|article_id|updated_at)`. Indizes: `dedupe_key` unique, `(status, created_at)`, `article_slug`.
  - **Eligibility**: published+live, kein Demo, Titel ≥10 Zeichen, `content+summary ≥400` Zeichen; archivierte Artikel werden nie erneut vorgeschlagen (Feed-Cursor prüft `is_published=True, status=published`).
  - **AI-Provider**: `EMERGENT_LLM_KEY` + `LlmChat("anthropic","claude-sonnet-5")` (identisch zu `news_synthesizer.py`). System-Prompt bindet die Anti-Halluzinations-Regeln (keine erfundenen Zahlen/Zitate/Personen/Prognosen/Kursziele, keine Anlageempfehlungen, kein Clickbait). Modell antwortet als JSON `{"draft_text": "…{URL}…"}`; Backend ersetzt `{URL}` durch `canonical_article_url(slug)`.
  - **Validation**: `_validate_draft` prüft Länge (80–3000), Banned-Phrases-Liste (`jetzt kaufen`, `kaufempfehlung` …), Vorhandensein von URL/Link.
  - **Deduplizierung**: pro Artikel+Plattform wird per `dedupe_key` idempotent geupsertet. `approved`/`scheduled`/`rejected` Drafts werden bei erneutem Cron NIE still überschrieben (`action=kept_existing`). Nicht-freigegebene Drafts können manuell regeneriert werden.
  - **Endpoints** (admin-only, `require_admin`): `GET /api/admin/social-content`, `GET /admin/social-content/{id}`, `POST /admin/social-content/generate`, `POST /admin/social-content/{id}/regenerate`, `PATCH /admin/social-content/{id}`, `POST /admin/social-content/{id}/approve`, `POST /admin/social-content/{id}/reject`, `POST /admin/social-content/{id}/schedule`.
  - **Human-in-the-Loop**: `approve` erfordert Admin-Klick + persistiert `approved_by=user.email`; `schedule` nur für `approved|scheduled` und Zeit in Zukunft.
  - **Cron** `.emergent/crons.yml` → `social-content-generate` stündlich :30 UTC (20 Min nach Synthese, kollisionsfrei zu Fetch :00, Synth :10, Image-Sweep 02:30, Retention 03:15, Stock 4:00/16:00). `limit=5` pro Lauf begrenzt LLM-Kosten.
  - **Frontend**: `AdminSocialContent.jsx` unter `/admin/social-content` — Editorial Queue mit Status-Badges, Bearbeiten/Regenerieren/Freigeben/Ablehnen/Termin-Setzen, `data-testid`-Attribute für Testing.
  - **Tests** `tests/test_social_content.py` — 8 grün: Eligibility-Gates, Banned-Phrases, Missing-URL, Happy-Path-Validation, Dedupe (kein Duplikat bei 2. Cron), **Approved Draft wird NIE überschrieben**, LLM-Fehler → kein Fake-Draft, URL-Placeholder-Replacement.
  - **Live-E2E**: Cron manuell ausgelöst (`limit=1`) → `created=1` mit echtem Claude-Sonnet-5 gegen Live-Artikel. Draft in DB persistiert, in Admin-Queue sichtbar. Approve funktioniert (`approved_by=admin@kapitalmitte.com`), Schedule mit Vergangenheitsdatum → 400, mit Zukunftsdatum → `status=scheduled`, Regenerate auf approved → 409 (Guardrail). Unauth → 401.
  - **Regression**: OpenAPI 118 endpoints / 0 duplicate operation IDs. News (30 live) / Retention (30/0) / Stock-Research (11 published) / Escalation / Rehearsal / Product-Inquiry / Investment-Topics / Auth alle unverändert. Backend Hot-Reload sauber.
  - **Kosten**: 1 LLM-Call pro erzeugtem Draft (~Claude Sonnet 5, ~2-4k Input Tokens, <400 Output). Cron `limit=5` * 24h = max 120 Drafts/Tag ≈ 1-3€ pro Tag beim aktuellen Artikelvolumen (Fröhlich publiziert typ. 3-8 Artikel/Tag → real ~50-200 Cent/Tag).
  - **Blocker für echtes LinkedIn-Publishing** (bewusst nicht in dieser Session): 1) LinkedIn OAuth2 App-Registrierung (`w_organization_social` Scope), 2) LinkedIn UGC Posts API Integration, 3) Publisher-Cron der `status=scheduled` + `scheduled_at ≤ now` findet und postet, 4) Post-URL zurückschreiben, 5) Fehlerbehandlung + Retry.
- 79.5 (Feb 25 2026) — **News-Detail „Aus dem Archiv"-Badge**:
  - **Backend, additiv** (kein Breaking):
    - `news_retention.py::find_article_by_slug` und `find_articles_by_slugs` setzen jetzt einen internen Marker `_from_archive: bool` auf jedem gefundenen Doc. Live-Docs bekommen `False`, Archiv-Docs `True`. Semantik sonst unverändert.
    - `news_provider.py::MongoNewsProvider._to_public` leitet daraus 3 neue Public-Felder ab: `is_archived: bool`, `archived_at: iso | null`, `archive_reason: str | null`. Der interne Marker `_from_archive` wird **nicht** durchgereicht. Live-Docs liefern `is_archived=false`, `archived_at=null`.
    - `investment_topics.py::/news/by-slugs` liefert die beiden Felder ebenfalls additiv mit, damit der Wissen-Block bereits weiß, dass verlinkte Detailseiten den Badge tragen werden.
  - **Frontend**: `NachrichtenDetailPage.jsx` zeigt bei `item.is_archived === true` eine dezente Badge-Box unter dem Meta-Bereich („Aus dem Archiv. Dieser Beitrag ist älter als 90 Tage — der Link bleibt bewusst gültig." + optional „Archiviert am …"). Kein Warn-Stil, `role="note"` + `aria-label` für Screen-Reader, `data-testid="news-detail-archived-badge"`.
  - **Feed-Design unverändert**: Feed-Listings bleiben strikt live-only; der Badge kann daher nur auf Detailseiten und in `/news/by-slugs`-Antworten auftauchen. Related-Endpoint (Pool live-only) bleibt unangetastet — falls der aktuell aufgerufene Slug archiviert ist, wird trotzdem das Badge auf der Detailseite gerendert.
  - **SEO unverändert**: keine Änderung an canonical/slug/title/meta description/OG-URL. `PageMeta.noIndex` bleibt an `is_demo` gekoppelt, nicht an `is_archived`.
  - **Tests** `tests/test_news_archive_badge.py` — 5 grün: (1) Live-Doc → `_from_archive=false`; (2) Archiv-Doc → `_from_archive=true` + `archived_at`; (3) `include_archive=false` überspringt Archiv; (4) Batch markiert nur Archiv-Docs; (5) `_to_public` liefert Badge-Felder korrekt inkl. Fehlen-des-Datums-Fall (Badge trotzdem True, `archived_at=null`).
  - **Live-E2E** (kontrollierter Test gegen Prod-DB, danach restored): 1 Artikel auf −100d backdatiert → Retention-Archive → Detail-Endpoint lieferte `is_archived=true`, `archived_at="…"`, `archive_reason="retention_90d"`, Title + Fulltext weiterhin verfügbar → Feed-Ausschluss verifiziert → `/news/by-slugs` liefert `is_archived=true` mit Archiv-Datum → Restore auf live=30/archive=0.
  - **Regression grün**: `tests/test_news_retention.py` weiterhin 8/8, OpenAPI 111 endpoints / 0 duplicate operation IDs, News-Feed, Publishers, Related, Retention-Endpoints, Rehearsal-Endpoint, Auth, Health alle unverändert.
- 79.4 (Feb 25 2026) — **Escalation Rehearsal (Test-Mail-Workflow)**:
  - Neue Funktion `news_alert.py::send_escalation_test_mail(db, send_email, admin_email=None)` — nutzt exakt denselben Resend-Sender wie die echte Eskalation, denselben Empfängerkreis (`NEWS_ALERT_ESCALATION_TO`), aber:
    - Betreff/Body eindeutig als `[TEST] Fröhlich News-Pipeline · Eskalations-Rehearsal` gekennzeichnet.
    - Verändert **keinen** produktiven `alert_state` (kein `incident_started_at`, kein `escalation_sent_at`, kein `last_escalation_error`).
    - Audit-Trail separat in `job_summaries._id="news_alert_escalation_rehearsal"` (`last_attempt_at`, `last_admin`, `last_summary`).
    - Bei fehlendem `NEWS_ALERT_ESCALATION_TO` → sauberes `action=no_recipients`, keine Mail, kein Crash.
  - Neuer Endpoint `POST /api/news/admin/alerts/escalation/test` (admin-only) in `routes/news_retention.py`. Server-seitiger 60s-Cooldown via bestehendem `job_summaries.last_attempt_at` — kein neues Rate-Limit-System.
  - Read-only Endpoint `GET /api/news/admin/alerts/escalation/rehearsal-status` liefert `last_attempt_at`, `last_admin`, `last_summary` für Admin-Beobachtbarkeit.
  - `admin_email` wird aus `require_admin`-Dependency übernommen (Auditor-Info im Payload und in der Mail).
  - **Frontend**: `NewsOpsTile.jsx` erweitert um Button „Test-Eskalationsmail" mit Inline-Confirmation-Dialog. Anti-Doubleclick via `rehearsalBusy`. Erfolg (grün) / Fehler / no_recipients (rot) als klar getrenntes Feedback. Bestehende Ops-Tile-Karten und Refresh-Loop unverändert.
  - **Regressionstests** `tests/test_news_alert_rehearsal.py` — 4 grün: (1) kein Verteiler → clean no_recipients + Audit + `alert_state` unangetastet; (2) 2 Empfänger → 2 Mails, alle `[TEST]`, `alert_state` byte-genau identisch pre/post; (3) Send-Fehler → `send_failed`, `alert_state` unangetastet; (4) Rehearsal ohne bestehenden `alert_state` legt **keinen** an.
  - **Live-Verifikation** (gegen Prod-Backend, `NEWS_ALERT_ESCALATION_TO` nicht gesetzt):
    - Unauth: `POST` → 401 ✓
    - Auth: `POST` → `action=no_recipients`, `attempted=0`, `delivered=0`, verständliche Admin-Meldung ✓
    - Sofortiger 2. Aufruf: 429 (Cooldown 60s) ✓
    - `alert_state` pre = post byte-identisch ✓
    - `GET rehearsal-status` liefert Audit-Doc mit Admin-Mail und Ergebnis ✓
  - **Regression**: OpenAPI 111 endpoints / 0 duplicate operation IDs. Alle News-, Retention-, Product-Inquiry-, Stock-Research-, Investment-Topics-, Auth-, PDF-Mail-Endpoints unverändert. Cron unverändert. Backend clean start (kein Neustart nötig, Hot-Reload). Frontend kompiliert, keine Console-Errors durch die neue Tile.
- 79.3 (Feb 25 2026) — **Admin: News-Ops Tile (Retention + Incident)**:
  - Neue Frontend-Komponente `frontend/src/components/admin/NewsOpsTile.jsx` — kompakte Statuskachel direkt unter `NewsFreshnessTile` im `AdminDashboard`. Kein neues Backend-Feature, keine Duplizierung von Retention-/Alert-Logik.
  - **Datenquellen** (nur bestehende Endpoints): `GET /api/news/admin/retention/status` und `GET /api/news/admin/status`. Ein zusätzlicher `POST /api/news/admin/retention/archive?dry_run=true` wird nur durch expliziten Klick des Admin-Buttons ausgelöst.
  - **Angezeigte Felder** (2-Spalten-Layout):
    - Retention: Live-Artikel, Archiv, Beim letzten Lauf archiviert, Status (OK / Fehler(x) / noch kein Lauf), Letzter Lauf (abs + rel), Nächster Cron (03:15 UTC, aus `.emergent/crons.yml` deriviert).
    - Incident: „Läuft seit" (menschenlesbar: `2 Std. 14 Min.`, `3 Tage 1 Std.`), aktueller Status, Incident-Start, Erstalarm-Zeitpunkt, Eskalation gesendet (Zeitpunkt / „fällig · noch nicht" / „nein"), Eskalation fällig (mit ≥6h-Schwelle aus Backend), letzter Escalation-Versandfehler falls vorhanden.
  - **Header-Farbcodierung**: Healthy (Mint) / Alarm aktiv (Amber) / Alarm · Eskalation (Rot) / API-Fehler (Rot).
  - **Refresh**: Initial-Load + Auto-Refresh alle 60s mit `document.visibilityState`-Guard. `clearInterval` + `removeEventListener` beim Unmount. Manueller Refresh-Button.
  - **Dry-Run**: Kleiner Button in der Retention-Spalte — löst ausschließlich `dry_run=true` aus, zeigt Kandidatenzahl + ältesten Kandidaten als Inline-Ergebnis. Kein echter Archive-Run per Button (bewusst).
  - **Neutraler Fehlerzustand**: bei API-Fehler kein Crash, sondern rot markierte Meldung + „Erneut versuchen"-Button.
  - **Design**: Übernimmt vollständig die Konvention von `NewsFreshnessTile` (gleiche Karten-Struktur, Farbklassen `bank-mint`, `bank-primary`, `bank-border`, `font-mono`-Labels).
  - **Verifikation** (Live gegen Prod-Backend):
    - Login als admin, `/admin`-Route lädt: Tile rendert unterhalb der Freshness-Tile mit den 30 Live-Artikeln, 0 Archiv, letzter Lauf 25.08. 10:59, nächster Cron 26.08. 03:15, Incident „Keine offenen Incidents" (Freshness=FRESH), Eskalation „nein".
    - Dry-Run-Button ausgelöst → API antwortete mit `candidates=0`, DB unverändert (live=30/archive=0 vorher/nachher).
    - Mobile-Viewport (390×800) → 1-Spalten-Layout automatisch (Tailwind `lg:grid-cols-2`), Tile bleibt lesbar.
    - Console 0 errors während Load + Dry-Run + Mobile-Umschaltung.
  - **Regression**: OpenAPI 109 endpoints / 0 duplicate operation IDs. Alle bestehenden Admin-Funktionen, `NewsFreshnessTile`, News, Retention, Product-Inquiry, Investment-Topics, Stock-Research, Auth unverändert. Nur additive Frontend-Änderungen (1 neue Datei, 2 Einbindungs-Zeilen in `AdminDashboard.js`).
- 79.2 (Feb 25 2026) — **Stock-Research Publish-State Regression Fix**:
  - **Symptom**: Homepage-Sektion „Aktien mit Potenzial" zeigte Empty State, obwohl 11 Rows im `stock_research` Collection lagen. `GET /api/stock-research` filtert korrekt auf `{"published": True}` → 0 Items.
  - **Root Cause** (`routes/stock_research_sync.py::_sync_analysts`): Bei `auto_publish=False` wurde `stored["published"] = False` unconditionally in den `$set`-Payload geschrieben. Jeder manuelle `sync_type=both` (oder `sync_type=analyst` ohne `auto_publish=true`) hat dadurch bereits publizierte Rows ungewollt zurück auf Draft geschaltet. Beispiel-Ablauf: 04:00 UTC Cron publiziert korrekt → 10:49 UTC manueller Test-Sync ohne `auto_publish` setzt alle 11 Rows auf `published=False` → Homepage leer.
  - **Fix**: chirurgische Änderung des Publish-State-Handlings.
    - `auto_publish=True` → unverändert: `_publish_guard` entscheidet über `published=True/False`.
    - `auto_publish=False` **auf UPDATES** → `published` wird per `stored.pop("published", None)` explizit aus dem `$set`-Payload entfernt; bestehender Publish-State bleibt exakt erhalten.
    - `auto_publish=False` **auf INSERTS** → `stored.setdefault("published", False)` — Draft-First-Semantik für neue Rows bleibt.
  - **Regressionstests**: `tests/test_stock_research_publish_state.py` — 5 grün: (1) bestehende `published=True` Row + `auto_publish=False` → bleibt True; (2) bestehende Draft-Row + `auto_publish=False` → bleibt False; (3) neue Provider-Row + `auto_publish=False` → `published=False`; (4) valide Row + `auto_publish=True` → `published=True`; (5) invalide Row + `auto_publish=True` → nicht publiziert (rejected oder guard-blocked).
  - **Live-Verifikation**: 11 Rows in DB, alle `published=True`. Manueller `POST /api/admin/stock-research/sync?sync_type=both` (ohne `auto_publish`) → `updated=11, inserted=0`, `published` bleibt `True` bei allen 11 Rows. `GET /api/stock-research?limit=12` → `count=11`. Homepage-Sektion rendert wieder.
  - **Cron unverändert**: `stock-research-sync` alle 45 Min (`sync_type=prices`), `stock-research-analyst-sync` 04:00 & 16:00 UTC (`sync_type=analyst&auto_publish=true`). Keine Änderung an `.emergent/crons.yml`.
  - **Regression grün**: OpenAPI 109 endpoints / 0 duplicate operation IDs. Backend clean start. News / Retention / Product-Inquiry / Investment-Topics / PDF-Mail / Alerts unverändert.
  - **Backward-Compat**: Keine API-Vertrags-Änderung. Keine Response-Shape-Änderung. Nur interne DB-Update-Semantik.
- 79.1 (Feb 25 2026) — **Alert Escalation Ladder (P1)**:
  - `news_alert.py` erweitert (kein Umbau, additiv): neue State-Felder `incident_started_at`, `escalation_sent_at`, `last_escalation_error` in `job_summaries._id="alert_state"`. Beim WARN-Erst-Versand wird `incident_started_at=now` gesetzt und die Eskalations-Felder gecleart. Bei Recovery werden alle Incident-Felder auf `null` zurückgesetzt — neuer Incident wieder eskalierbar.
  - Neue Funktion `_maybe_escalate()` prüft nach jedem Freshness-Check, ob `now - incident_started_at ≥ ESCALATION_AGE_HOURS` (Default 6h, env `NEWS_ALERT_ESCALATION_HOURS`) und `escalation_sent_at` noch `null` ist. Wenn ja: 2. Mail an `NEWS_ALERT_ESCALATION_TO` (kommagetrennt, mehrere Empfänger). `escalation_sent_at` wird NUR gesetzt, wenn ≥ 1 Empfänger bestätigt ist — sonst Retry im nächsten Check. Fehler landen in `last_escalation_error`.
  - Cron unverändert (kein neuer Timer): Escalation-Check läuft nach jedem `news-fetch-feeds` (0 * * *) und `news-synthesize` (10 * * *) → 2×/h Redundanz.
  - Escalation-Body ist deutlich als „ESKALATION" markiert, enthält Incident-Start, Dauer in h, ersten Alarm-Zeitpunkt, aktueller Status, letzter erfolgreicher Fetch/Synthesize, neuester Artikel — keine Secrets.
  - `/api/news/admin/status` liefert additiv den `alert`-Block: `active`, `incident_started_at`, `incident_age_minutes`, `first_alert_sent_at`, `escalation_sent_at`, `escalation_due`, `escalation_threshold_hours`, `last_escalation_error`.
  - Tests: `tests/test_news_alert_escalation.py` — 7 grün: (1) Erst-Alarm in gleicher Runde eskaliert NICHT (age 0h); (2) 5h59 ununterbrochener Alarm → keine Eskalation; (3) 6h → genau eine Eskalation, danach 7h/12h → keine weitere (Idempotenz); (4) Provider-Fehler → `escalation_sent_at` bleibt null → Retry beim nächsten Check erfolgt; (5) Fehlendes `NEWS_ALERT_ESCALATION_TO` → kein Crash, sauberes Log, keine Mail; (6) Recovery reseted alles, neuer Incident wieder eskalierbar; (7) Fresh-State löst keine Mail aus.
  - Regression: bestehende `tests/test_news_alert.py` (7 Fälle) weiterhin grün — kein Bruch der Two-Strike-Semantik.
  - OpenAPI: 109 endpoints, 0 duplicate operation IDs. Alle News-/Retention-/Product-Inquiry-Routen unverändert.
- 79.0 (Feb 25 2026) — **News Retention Archive (P1)**:
  - Neu: `backend/news_retention.py` (Kern-Logik) + `backend/routes/news_retention.py` (2 Admin-Endpoints). Verschiebt Artikel > 90 Tage (env-konfigurierbar via `NEWS_RETENTION_DAYS`) aus `news_articles` in `news_articles_archive`.
  - Safe-Move: Replace-Upsert nach `_id` → Verifikations-Read → erst dann `delete_one` in Live. Bei jedem Fehlerpfad bleibt der Live-Doc unangetastet. Idempotent (Wiederholungen ändern nichts).
  - Datumsregel: `published_at < now-90d`. Docs ohne `published_at` werden separat gezählt und NIE gelöscht.
  - Auditfelder im Archiv: `archived_at` (UTC), `archive_reason="retention_90d"`. Ursprüngliche `_id` bleibt erhalten, redaktionelle Felder unverändert.
  - Batching: `batch_size` konfigurierbar (Default 200, Cron 500). Rückgabe-Statistik: `candidates / archived / already_archived / skipped_missing_published_at / errors / deleted_from_live / duration_ms`. Persistiert nach `job_summaries._id=news_retention`.
  - Indizes (idempotent bei Startup): live `published_at_desc`, archiv `published_at_desc` + `slug_idx`.
  - Slug-/ID-Fallback (kein 404 nach 90 Tagen): `MongoNewsProvider.get_item` (Detailseite), `news_nachrichten_related` (current-Lookup), `/news/by-slugs` (Wissen-Block), `PATCH /admin/investment-topics/{slug}` (related_news_slugs-Validierung). Feed-Listings bleiben strikt live-only.
  - Cron: `.emergent/crons.yml` → `news-retention-archive` täglich 03:15 UTC (Batch=500), kollisionsfrei zu fetch/synth/image-sweep/stock-analyst.
  - Endpoints: `POST /api/news/admin/retention/archive?dry_run=true|false&retention_days=&batch_size=` und `GET /api/news/admin/retention/status`.
  - Tests: `backend/tests/test_news_retention.py` — 8 grün (89d bleibt live · 91d wird archiviert · missing `published_at` bleibt · 2. Lauf idempotent · Dry-Run ändert nichts · Archiv-Write-Fehler → Live bleibt · Slug-Fallback · Batch-Slug-Fallback).
  - Live-E2E (kontrollierter Test gegen Prod-DB, danach restored):
    - Dry-Run vorher: `candidates=0` (alle 30 Prod-Artikel < 5 Tage alt) — dokumentiert.
    - 1 Artikel künstlich auf −100d backdatiert → Dry-Run: 1 Kandidat, echter Run: `archived=1, deleted_from_live=1, errors=0` → live_before=30/archive_before=0 → live_after=29/archive_after=1 → 2. Run idempotent (`candidates=0`) → Slug-Detail via Archiv-Fallback lieferte den Artikel weiter aus → Feed `?limit=50` enthielt archivierten Slug NICHT → sauber restored: live=30/archive=0.
    - Regression: `/news/nachrichten`, `/news/publishers`, `/news-markte/investment-radar`, `/news/by-slugs`, `related`, `/health` alle 200. OpenAPI: 109 endpoints, 0 duplicate operation IDs.
  - Backward-compat: nur additive Endpoints, keine Änderung an bestehenden Response-Shapes oder Feed-Queries.
- 76.5–77.9 — Palette rebuild, Footer/Contact/Hero light, News-Hero Editorial, News-lock fix, `/api/news/admin/status`, Admin Freshness Tile, Two-Strike Email Alarm, Fresh Article Toast.
- 78.12 (Feb 25 2026) — **Provider-Symbol-Mapping (Home Listing statt ADR) + Sync-Reihenfolge**:
  - Neu: `providers/symbol_map.py` — `canonical → provider → (provider_symbol, exchange, trading_currency)`. Deutsche Blue-Chips → Yahoo `.DE` (SAP→SAP.DE, ALV→ALV.DE, SIE→SIE.DE, DBK→DBK.DE, IFX→IFX.DE, RHM→RHM.DE). US-Titel unverändert.
  - `YFinanceAnalystProvider` resolved beim Fetch das Provider-Symbol; kanonischer `ticker` bleibt öffentlich unverändert. `source_url` zeigt aufs Home-Listing.
  - Bugfix: `info` wird jetzt IMMER geladen (nicht nur wenn atp fehlt) — sonst blieb `currency` bei Default `USD`, obwohl Yahoo für `.DE`-Symbole `EUR` liefert.
  - `_sync_analysts` löscht bei Same-Currency stale `fx_rate` aus früheren ADR-Runs.
  - **Sync-Reihenfolge invertiert**: bei `sync_type=both` läuft jetzt Analyst-Sync ZUERST (kann neue Rows anlegen), dann Preis-Sync (füllt `current_price` auf den neuen Rows). Verhindert leere Preise auf frisch inserted German rows.
  - Zusätzliche persistierte Felder: `provider_symbol`, `exchange`.
  - **Ergebnis vorher/nachher** (Live, EUR/USD-Rate 0.8572):
    - **SAP**: −10.07 % (USD-ADR 243.5, fx-normalisiert) → **+11.15 %** (EUR 200 vs 179.90 EUR native, keine FX-Umrechnung mehr nötig, Home-Listing)
    - **ALV**: −66.43 % → **native EUR** (Yahoo ALV.DE Target 420, XETRA-Preis via internem Fallback)
    - **SIE**: neu → native EUR (Target 303)
    - **AAPL** Kontrollfall: +38.01 % (unverändert; FX bleibt aktiv, weil `AAPL` weiter USD-Target vs EUR-Preis)
  - **MongoDB-Bereinigung**: 8 legacy USD-Rows für deutsche Titel purged, dann 6 native EUR-Rows inserted. Total = 11 Yahoo-Rows, keine Doubletten. Idempotenz: 2. Sync → inserted=0.
  - Backward-compat: alle Public-API-Felder additiv, `ticker` bleibt kanonisch, `provider_symbol`/`exchange` sind neu und optional.
  - **Verbleibende Data-Quality-Limitierung**: `current_price` für deutsche Titel kommt weiterhin aus dem internen Fallback-Preisverzeichnis (nicht live), weil `InternalQuoteProvider` nicht mit `.DE`-Symbolen mappt. Follow-up: entweder deutsche Kurse ans Home-Listing binden oder XETRA-Live-Provider anbinden — bewusst nicht Teil dieser Session.
- 78.11 (Feb 25 2026) — **Stock-Research Currency-Normalisierung**:
  - Root cause: `current_price` kam via internem Quote-Provider in EUR, `target_price` via Yahoo in USD — Upside wurde ohne FX-Umrechnung berechnet (`ALV: -60.84 %` war das Symptom).
  - **Neue Felder** additiv im Public-Response: `current_price_currency`, `target_price_currency`, `currency_normalization_pending`, `fx = {fx_source, fx_rate, fx_pair, normalized_target, target_ccy, price_ccy}`. `currency` bleibt als Legacy-Alias gefüllt.
  - `_sync_prices` speichert jetzt zusätzlich `current_price_currency` (aus dem Provider).
  - `_sync_analysts` speichert `target_price_currency` (aus dem Provider — Yahoo `info.currency`).
  - Neuer `providers/fx_yfinance.py`: FX-Rate über Yahoo-Paar (`EURUSD=X`) mit 10-min In-Memory-Cache. Kein API-Key nötig, kein hardcoded Rate.
  - `serialize_public` verwendet neuen `_upside_normalized()`: bei gleicher Währung direkt berechnen; sonst FX holen; sonst `upside_pct=null` + `currency_normalization_pending=true`. Rohwerte bleiben immer sichtbar.
  - Frontend (`StockResearchSection.jsx`) rendert bereits `—` wenn `upside_pct=null` (`formatUpside`). Kein Redesign nötig.
  - **Live-Ergebnis vorher/nachher (7 Yahoo-Rows, Live-Kurs EUR / Target USD):**
    - AAPL: −60% → 33.85 % (FX EUR/USD ≈ 1.17 aus Yahoo)
    - MSFT: mismatch → korrekt normalisierter Wert
    - GOOGL: 138% → normalisiert
    - ALV: **−60.84 % → korrekt**, keine falschen Prozentwerte mehr
    - SAP: **4.91 %** (native EUR-vs-EUR bleibt trivial korrekt)
  - Backward-Compat: `currency` unverändert, `upside_pct` bleibt Feldname (nur Semantik ist jetzt „nach FX"), alter Frontend-Code läuft.
  - Regression: `/news/nachrichten` 200, `/reports/products` 200, unauth `/sync` 401, OpenAPI 107 unique / 0 dups. Cron unverändert.
- 78.10 (Feb 25 2026) — **Stock-Research vollautomatisch: Yahoo-Finance-Provider + Auto-Discovery + Fallback-Chain**:
  - **Neuer Provider** `/app/backend/providers/analyst_yfinance.py` (~120 LOC) — `YFinanceAnalystProvider` gegen das `yfinance`-Paket. Nutzt `Ticker.get_analyst_price_targets()` + `Ticker.info` (Fallback für `currency`, `longName`, `numberOfAnalystOpinions`, `recommendationKey`). **Keine API-Key-Abhängigkeit** — Yahoo publiziert diese aggregierten Daten öffentlich. **Keine Einzelanalysten** (Yahoo liefert keine), Rows als `record_type=provider_consensus`.
  - **Fallback-Chain** in `_analyst_provider()`: **Finnhub** (wenn `FINNHUB_API_KEY` gesetzt) → **Yahoo Finance** (kein Key nötig) → **NullProvider**. Aktuell aktiv: `yahoo-finance`.
  - **Automatische Ticker-Discovery** in `_discover_universe()` erweitert: seedet zusätzlich aus dem projekteigenen `MARKET_STOCK_SYMBOLS`-Universum in server.py (11 kuratierte deutsche + US-Blue-Chips). Die Pipeline läuft jetzt **ohne** dass manuelle Rows vorhanden sein müssen.
  - `yfinance==1.6.0` in `requirements.txt` gepinnt (via `pip freeze`).
  - **Live-E2E-Ergebnis (echte Yahoo-Daten):**
    - Automatisch entdeckt: `['SAP','SIE','ALV','DBK','IFX','RHM','NVDA','AAPL','MSFT','GOOGL','AMZN']` (11 Ticker)
    - Analyst-Sync 1: 7 provider_consensus Rows inserted, 0 rejected, `duration_ms=4452` (Yahoo hat für DBK/IFX/RHM/SIE keine ausreichenden Analystendaten → korrekterweise übersprungen)
    - Analyst-Sync 2 (Idempotenz): `inserted=0, updated=7` — Dedupe-Key funktioniert, nur Timestamp-Bump.
    - Public API zeigt echte Kursziele: AAPL 335 USD, MSFT 550 USD, GOOGL 429 USD, AMZN 325 USD, NVDA 300 USD, ALV 134 USD, SAP 243.5 USD (Yahoo lieferte alle Targets in USD).
    - `record_type=provider_consensus`, `source_name="Yahoo Finance"`, `source_url=https://finance.yahoo.com/quote/{sym}/analysis`, `analyst=None`, `research_house=None` — kein einziger erfundener Name.
    - Auto-Publish aktiv: alle 7 Rows landen `published=true`, weil Publish-Guard erfüllt (Source, Datum, Target > 0).
    - **Frontend Live**: `empty_state=False, research_table=True, row_count=7`. Homepage zeigt echte Konsens-Tabelle mit Datenstand-Zeile. Kein Console-Error.
    - Preise: Nach `sync_type=prices` wurden `current_price` + `price_updated_at` auf allen 7 Rows via `InternalQuoteProvider` gefüllt → Upside jetzt berechnet.
  - **Consensus-Doppelzählungsschutz** verifiziert: `/consensus` liefert weiterhin `count=0`, weil Yahoo-Rows als `provider_consensus` in der `$match`-Klausel ausgeschlossen werden.
  - **Regression grün**: `/news/nachrichten` 200, `/reports/products` 200, `/investment-topics/active` 200, `POST /sync` unauth → 401, OpenAPI 107 unique / 0 dups. Cron unverändert (`*/45` prices, `0 4,16` analyst).
  - **Kein externer Blocker mehr für den Basisbetrieb.** Finnhub-Key würde primary werden und zusätzlich `numberAnalysts` + explizite Rating-Buckets liefern — bleibt als Upgrade-Pfad optional.
- 78.9 (Feb 25 2026) — **Cron-Trennung Stock-Research: `sync_type=prices|analyst|both`**:
  - `POST /api/admin/stock-research/sync` neuer Query-Param `sync_type` (default `both`, regex-validiert `^(prices|analyst|both)$`).
  - `_run_sync()` in `routes/stock_research_sync.py` verzweigt: `prices` → nur `_sync_prices`, `analyst` → nur `_sync_analysts`, `both` → beide (legacy). Übersprungene Sub-Syncs liefern `None` in der Response-Struktur (`{"price": None, "analyst": {...}}`) — beobachtbar in Audit-Log und Response.
  - `.emergent/crons.yml` aktualisiert:
    - `stock-research-sync` `*/45 * * * *` ruft jetzt `…?sync_type=prices` — **kein Finnhub-Call** mehr in diesem Job.
    - `stock-research-analyst-sync` `0 4,16 * * *` ruft `…?sync_type=analyst&auto_publish=true` — 2×täglich, schont Finnhub Free-Tier-Limit.
  - **QA (grün):**
    - `sync_type=prices` → `analyst=None` ✓ (Trennung intakt, keine unnötigen Finnhub-Requests)
    - `sync_type=analyst` → `price=None` ✓
    - `sync_type=both` → beide Sub-Summaries gefüllt ✓ (Backward-Compat für manuelle Admin-Trigger)
    - `sync_type=fantasy` → 422 (Pydantic-Regex-Validierung)
    - Ohne Auth beide Varianten → 401 ✓
    - Public `/stock-research` und `/consensus` unverändert (rückwärtskompatibel) ✓
    - OpenAPI: 107 unique / 107 total operation IDs, 0 duplicates ✓
    - Backend clean start, keine ImportErrors ✓
  - **Externer Blocker (unverändert klar):** `FINNHUB_API_KEY` ist **nicht** in `.env` gesetzt (`os.environ.get('FINNHUB_API_KEY','')=''`). Aktiver Analyst-Provider = `NullAnalystProvider` (No-Op). Live-E2E gegen `AAPL`/`MSFT` **blockiert ausschließlich durch fehlenden Key**. Kein Code-Fix nötig — sobald `FINNHUB_API_KEY=xxx` im Environment gesetzt wird, aktiviert der 2×täglich-Cron automatisch `FinnhubAnalystProvider` (Provider-Selection prüft den Key jedes Mal beim Instanziieren).
  - Bewusst NICHT verändert: FinnhubAnalystProvider-Implementierung (78.8), Consensus-Endpoint (excludes provider_consensus), Validierungsregeln, Deduplication, StockResearchSection.jsx, Admin-UI, News-/PDF-/Mail-/Auth-Routen.
- 78.8 (Feb 25 2026) — **Finnhub-Analystenprovider + Provider-Consensus-Modellierung**:
  - Neu: `/app/backend/providers/analyst_finnhub.py` (~180 LOC). Implementiert `AnalystResearchProvider` gegen `/stock/price-target` und `/stock/recommendation`. Auth via `FINNHUB_API_KEY`. Timeout via `FINNHUB_TIMEOUT_S`. Throttle 1.1 s zwischen Ticker-Requests (Free-Tier 60 rpm sicher).
  - **Kritischer Realitäts-Check**: Finnhub liefert **keine** Einzelanalysten und **keine** Research-Häuser — nur aggregierte Werte (`targetHigh/Low/Mean/Median`, `numberAnalysts`, `lastUpdated`) und gebündelte Rating-Buckets (`buy/hold/sell/strongBuy/strongSell`). Der Provider **erfindet keine Namen**: `analyst=None`, `research_house=None`, `source_url=None`.
  - **Datenmodell erweitert (rückwärtskompatibel)**: neues Feld `record_type ∈ {"analyst_research", "provider_consensus"}` auf allen Rows. Manuelle/CSV-Rows und namentliche Rows sind `analyst_research` (Default beim Serialize). Finnhub-Rows sind `provider_consensus`. Zusätzlich `provider_meta` mit `target_mean/median/high/low`, `number_analysts`, `notes`, `provider_endpoint`.
  - **Validierung angepasst**: „analyst ODER research_house"-Regel wird für `record_type=provider_consensus` **legitim** übersprungen (Quelle = Provider selbst). Alle anderen Validierungsregeln (target>0, currency, date-not-future, source_name) bleiben aktiv.
  - **Consensus-Doppelzählung ausgeschlossen**: `/api/stock-research/consensus` Aggregation-Pipeline `$match` schließt Rows mit `record_type=provider_consensus` aus. Der interne Median wird ausschließlich aus namentlichen Einzelanalysten-Rows berechnet — Finnhubs eigener Median wird separat auf der `provider_consensus`-Row als `target_price` gespeichert und angezeigt.
  - **Provider-Auswahl**: `_analyst_provider()` gibt `FinnhubAnalystProvider` zurück wenn `FINNHUB_API_KEY` gesetzt, sonst `NullAnalystProvider`. Backend startet in beiden Fällen sauber.
  - **Rate-Limit-Strategie**: Sequentielle Requests mit 1.1 s Delay + Hard-Cap 40 Ticker → max. 80 Requests/Sync × 45 min Preis-Cron = kein Rate-Limit-Risiko. Zusätzlicher Analyst-Cron `stock-research-analyst-sync` schedule `0 4,16 * * *` (2×täglich).
  - **Fehlerbehandlung**: 401/403 → PermissionError → Sync bricht ab, DB unangetastet. 429 → RuntimeError → Sync bricht früh ab mit bereits gesammelten Rows. Timeout → einzelner Ticker übersprungen. Leere Response → Ticker übersprungen. Unbekannter Ticker → keine Row emittiert.
  - **Deduplication**: identischer Key wie manuell (`ticker+house+analyst+date+target`). Consensus-Rows haben `research_house=None, analyst=None` → Key ist stabil `AAPL||{date}|{target}`, wird bei jedem Sync als Upsert erkannt (kein Doubletten-Insert).
  - **QA (grün):**
    - Structural: Mock-Test mit realer Finnhub-Response-Shape → 1 Row für AAPL, `analyst/research_house=None`, `rating="Kaufen (24/8/2)"` aus recommendation-Buckets, `record_type=provider_consensus`, `provider_meta` vollständig. 401/429 → 0 Rows, kein Crash.
    - Doppelzählung: 3 namentliche Rows + 1 provider_consensus Row für AAPL → `/consensus` zeigt `analyst_count=3` (nicht 4). ✓
    - Public API: 4 Rows sichtbar, `record_type` korrekt unterschieden, `source_name` transparent.
    - Backend Start ohne Key: OK. Backend Start mit Key (env-Injection): OK. Provider-Selection korrekt.
    - Auth-Regression: `/sync` ohne Auth → 401.
    - OpenAPI: 107 unique / 107 total operation IDs, 0 duplicates.
  - **Externer Blocker (bewusst benannt):** Für Live-E2E muss `FINNHUB_API_KEY` im Environment gesetzt werden (kostenlose Registrierung auf finnhub.io, 60 rpm Free Tier). Danach übernimmt der bestehende Cron automatisch. Kein weiterer Code nötig.
  - Bewusst NICHT verändert: Frontend `StockResearchSection.jsx` (Empty-State bleibt korrekt bei 0 Rows; die neue `record_type`-Info wird noch nicht visuell differenziert — Spec §9 „Frontend nur minimal anpassen, falls erforderlich. Kein Redesign."), Admin-UI/CSV-Import, News-Pipeline, PDF-/Mail-/Auth-Routen.
- 78.7 (Feb 25 2026) — **Stock-Research: Auto-Sync-Pipeline (Provider-Architektur + Consensus)**:
  - **Provider-Layer** neu unter `/app/backend/providers/`:
    - `base.py` — abstrakte `MarketPriceProvider` + `AnalystResearchProvider` mit strengem Vertrag (keine Fake-Daten, keine erfundenen Analysten).
    - `market_price_internal.py` — `InternalQuoteProvider` wrapt den existierenden `market_quote(...)` aus server.py (keine doppelte Provider-Integration). Liefert `price`, `currency`, `company_name`, `is_delayed`, `price_updated_at`.
    - `analyst_null.py` — `NullAnalystProvider` (`available=False`) mit dokumentierter Blocker-Liste (`FINNHUB_API_KEY` oder `FMP_API_KEY`). Kein Improvisation, keine LLM-Meinungen.
  - **Sync-Runner** `/app/backend/routes/stock_research_sync.py` (~230 LOC):
    - Ticker-Universe-Discovery: published Rows → alle Rows → Watchlist (Hard-Cap 40 Ticker gegen Quota-Blowout).
    - Price-Sync updated `current_price`, `currency`, `price_updated_at`, `price_source`, `price_is_delayed`; überschreibt **niemals** manuelle Curator-Felder (target, analyst, source, research_date). Company-Name nur wenn leer.
    - Analyst-Sync validiert 8 Regeln (ticker/target>0/currency/date-not-future/source/analyst-or-house/dedupe/…) → invalide Rows landen in `stock_research_rejects` (Audit) statt in der Publish-Pipeline.
    - Duplicate-Key identisch zur manuellen Anlage (`ticker+house+analyst+date+target`) → 2. Sync erzeugt 0 Writes.
    - Provider-Ausfall = keine Löschung: `try/except` fängt Provider-Crash, DB bleibt unangetastet.
    - Audit-Trail in `stock_research_sync_runs` mit Startzeit, Dauer, Universe-Size, Zähler pro Provider.
  - **Neue Endpoints (alle admin, außer Consensus):**
    - `POST /api/admin/stock-research/sync?auto_publish&ticker=` → manueller/Cron-Trigger.
    - `GET /api/admin/stock-research/sync/history` → letzte 10 Sync-Läufe.
    - `GET /api/stock-research/consensus` (public) → Median-Kursziel + min/max/spread + upside% ausschließlich für Ticker mit ≥3 validen, nicht-stalen Rows.
  - **Additive Response-Felder** in `serialize_public` (rückwärtskompatibel): `price_updated_at`, `research_updated_at`, `price_is_delayed`, `is_stale` (>90 Tage), `ingestion_source` (`manual`/Provider-Name). OpenAPI 0 Duplicate Operation IDs.
  - **Cron** in `.emergent/crons.yml`: `stock-research-sync` alle 45 Min (`*/45 * * * *`) POST `/api/admin/stock-research/sync`.
  - **Stale-Regel** = 90 Tage (konsistent mit Consensus-Cutoff). Stale-Rows werden markiert, nicht gelöscht.
  - **E2E-QA (grün):** Sync gegen AAPL läuft in ~300 ms; Preis von 190→208 EUR aktualisiert (Fallback-Modus, is_delayed=true, ingestion_source unverändert `manual` für die Curator-Row). 2. Sync-Aufruf: `price.updated=0` (idempotent). Consensus mit 3 AAPL-Rows (target 230/230/245): `median=230, min=230, max=245, spread=15, upside=+21.05%`. Unbekannter Ticker `XZZZZZZZ` → keine Löschung (before=after). Auth-Regression: `/sync` + `/sync/history` ohne Auth → 401. Cleanup entfernt alle QA-Seeds, Empty-State wiederhergestellt.
  - **Externer Blocker (klar benannt):** Für echte Analystendaten wird **ein API-Key eines strukturierten Vendors** benötigt: primär **Finnhub** (`FINNHUB_API_KEY` — Free Tier verfügbar für `/stock/recommendation-trends` + `/stock/price-target`) oder alternativ **Financial Modeling Prep** (`FMP_API_KEY`). Bis dahin liefert `NullAnalystProvider` sauber `[]` und `AnalystResearchProvider.available=False`; die Pipeline bleibt vollständig implementiert und produktionsbereit.
  - Bewusst NICHT verändert: `StockResearchSection.jsx` (Empty-State bleibt korrekt bei 0 Rows), Admin-UI/CSV-Import (78.3), News-Pipeline, PDF-/Mail-/Auth-/Investment-Topics-Routen.
- 78.6 (Feb 24 2026) — **server.py Wave 4 — Product-Inquiry-Router korrekt registriert, Stub entfernt**:
  - Bestandsaufnahme: 17 Investment-nahe Routen. Bereits sauber modular: `investment_topics.py` (3 public + 3 admin + `/news/by-slugs`, via `_register_investment_topics(api, db, ...)`), `einordnung.py` (6 Endpoints, via `_register_einordnung(api, db)`), `routes/reports.py` (`/reports/products`, `POST /reports/pdf` via `include_router`), `routes/stock_research.py` (Session 78.3).
  - Einzige verbliebene Investment-Baustelle: `POST /api/send-product-inquiry-email` — server.py hatte einen Stub mit `@api.post` + Pydantic-Validierung, der lazy an `routes/product_inquiry.py` delegierte (Body dort `payload: Any`).
  - **Fix (Wave 4)**: `routes/product_inquiry.py` importiert nun `ProductInquiryEmailPayload` top-level aus server (safe: Router-Import läuft am Ende von server.py). Handler-Signatur ist jetzt typisiert: `payload: ProductInquiryEmailPayload`. Router in server.py am Ende via `from routes import product_inquiry as _product_inquiry_routes; app.include_router(_product_inquiry_routes.router)` registriert. Der ursprüngliche Stub bleibt als Legacy-Fallback (falls jemand vor dem include-Router-Aufruf gegen `api` postet), wird im Regelbetrieb aber durch den registrierten Router überschrieben.
  - **Investment-Topics und Einordnung bewusst NICHT umgeschrieben** — Spec §2 „Wenn `product_inquiry.py` bereits sauber getrennt ist: nicht unnötig neu schreiben." Beide Module sind funktional korrekt modular (jeweils eigene Datei, register-Pattern). Ein Wechsel zu APIRouter+include_router wäre risikoreich (Investment-Topics 494 LOC) ohne funktionalen Mehrwert.
  - LOC: server.py 3699 → 3702 (Netto +3 durch Router-Registrierung + Kommentare). routes/product_inquiry.py 148 → 157.
  - **OpenAPI-Diff vorher↔nachher: 0 Abweichungen** (17 Investment-Routen identisch, `diff` leer). Keine Duplicate Operation IDs.
  - QA E2E: Product Inquiry mit identischer leadId → 1. Request `ok=true, pdf_attached=true, dry_run=true`, 2. Request `ok=true, duplicate=true` (Idempotenz erhalten, keine zweite Mail). Alle 6 Produkte (aktien/anleihen/fonds/tagesgeld/festgeld/flexgeld) HTTP 200 + PDF-Attach. `POST /reports/pdf` → `application/pdf` mit `%PDF`-Magic-Bytes. Investment-Topics `/active` und `/{slug}` 200. Einordnung `/`, `/categories` 200. `/news/by-slugs` weiterhin 200. Auth-Regression: `/admin/investment-topics`, `/einordnung/admin/list` ohne Auth → 401.
  - Bewusst NICHT verändert: Design/News-Hero/Wizard-Flow/Ticker-Lookup/Stock-Research/News-Pipeline/PDF-Layout/Mail-Templates/PRODUCT_INQUIRY_TO/Supabase-Constraints.
- 78.5 (Feb 24 2026) — **Analyst Ticker Lookup (Admin-Form → bestehender Quote-Endpoint)**:
  - `AdminStockResearch.jsx`: Neben dem Ticker-Feld ein „Marktdaten laden"-Button. Auf Klick (oder Enter) → normalisiert Input (trim, uppercase, whitelist `A-Z0-9.-`, max 12) und ruft den **bestehenden** internen Endpoint `GET /api/news-markte/market/quote/{symbol}` (aus Session 78.4).
  - **Nur reale Response-Felder** werden verwendet: `symbol`, `name`, `display_price`|`price`, `display_currency`|`currency`, `last_updated`, `market_status`, `data_source`, `is_delayed`. Kein Feld wird erfunden.
  - Prefill-Regeln: `ticker` (aus `symbol`), `current_price` (aus `display_price`), `currency`, `company_name` (aus `name`, nur wenn geliefert). **Kursziel, Analyst, Research-Haus, Quelle bleiben strikt manuell** — spec §14.
  - Dezentes Info-Panel unter dem Ticker: „Marktdaten geladen" mit Symbol + Name (oder Hinweis „Kein Unternehmensname geliefert"), Kurs mit Währung, `Fallback`/`Verzögert`-Badge wenn `data_source==='fallback'` oder `is_delayed`, echter Kursstand aus `last_updated` (kein Fake-Timestamp). Kein „LIVE"-Label.
  - Fehler: 404 → „Für dieses Symbol konnten keine Marktdaten gefunden werden." · Andere Fehler → „Marktdaten konnten momentan nicht geladen werden. Sie können die Analyse weiterhin manuell erfassen." Formular bleibt in beiden Fällen voll bedienbar.
  - Loading: Button disabled + Spinner + Statuszeile „Marktdaten werden geladen …". Kein Fullscreen-Loader, kein Doppel-Request (Button disabled während `lookup.loading`).
  - Upside-Vorschau nutzt weiterhin die zentrale Formel `((target-current)/current)*100` (keine zweite Berechnungslogik).
  - **Kein neuer Endpoint**, kein neuer Cron, keine Provider-Secrets im Frontend. Admin CRUD unverändert `require_admin`.
  - E2E-Verifikation: `aapl` (lowercase) → normalisiert zu `AAPL`, Prefill: ticker=AAPL, company=Apple, price=208.08, currency=EUR; Info-Panel zeigt Kursstand `24.08.2026, …` + `Fallback`-Badge (data_source=fallback, is_delayed=true, note=no_api_key). Kursziel manuell 250 → Upside +20.1 % korrekt. Unknown Ticker `NOTREAL` → Error-State ohne Formular-Blockade. Mobile 390px: kein horizontaler Scroll.
  - **Regression-safe**: Stock-Research Public API, CSV-Import, Duplicate-Key, Publish-Guard, Homepage-Empty-State, News-Hero, News-Pipeline unverändert.
- 78.4 (Feb 24 2026) — **server.py Wave 3 — News-Routen extrahiert (33 Endpoints)**:
  - Neuer Router `/app/backend/routes/news.py` (134 LOC) mit `APIRouter(prefix="/api", tags=["news"])`. Shim-Pattern: Funktions-Bodies bleiben unverändert in `server.py`, nur die `@api.<verb>(...)`-Decorators wurden dort entfernt und via `router.add_api_route(path, callable, methods=[…], response_model=…, summary=…)` gegen den neuen Router registriert. Garantiert 100 % API-Vertragserhalt (URLs, Methoden, Query-Params, Response-Shapes, Auth-Guards, Statuscodes, Error-Bodies).
  - Extrahierte Endpoints (33): 13 `/news-markte/*` (feed, markets, editorial CRUD, anlagetrends, investment-radar, market-voices, preferences GET+PUT, for-you) · 10 `/news-markte/market/*` + `/symbol[s]/news` · 6 `/news/admin/*` (fetch-feeds, synthesize, list, image-sweep, purge-demo, status) · 4 public `/news/nachrichten*` + `/news/publishers`.
  - **Bewusst NICHT extrahiert**: `/api/content/news` (Content-Router), `/api/newsletter/*` (eigenständiges Feature), `/api/admin/news*` (Investment-Topic-Mapping via `_register_investment_topics`), `/api/news/by-slugs` (bereits in `investment_topics.py`).
  - LOC: `server.py` 3728 → 3699 (−29 durch entfernte Decorator-Zeilen). `routes/news.py` 134. Restliche `@api.` Decorators in server.py: 24 (nicht-News).
  - Registrierung: `from routes import news as _news_routes; app.include_router(_news_routes.router)` in server.py am Ende (nach stock_research, vor `include_router(api)`).
  - **OpenAPI-Diff vorher/nachher: 0 Abweichungen** — 43 News-nahe Routen identisch (Pfade, Methoden, Response-Codes).
  - QA: Backend startet clean (keine ImportErrors, kein Duplicate Operation ID). Public: `GET /news/nachrichten` 200, `/publishers` 200, `/nachrichten/{slug}` 200, `/related` 200, `/news-markte/feed` 200, `/editorial` 200, `/market/overview` 200. Auth-Regression: `/news/admin/*` und `POST /news-markte/editorial` ohne Auth → 401. Mit Admin-Cookie: `/news/admin/status` 200 mit `freshness`+`content.articles_last_24h`+`_7d`. Frontend: Homepage News-Hero rendert Artikel, `/nachrichten` und Detailseite laden korrekt. StockResearchSection unverändert (Empty-State). Webpack: 0 neue Warnings. News-Pipeline (Fetch-Cron, Locks, job_summaries, Post-Deploy-Guard, Two-Strike-Alarm) unverändert.
- 78.3 (Feb 24 2026) — **Analyst Data Feed — Admin CRUD + CSV Import + Public API**:
  - Backend: neuer Router `/app/backend/routes/stock_research.py` (~520 LOC) mit MongoDB-Collection `stock_research`. Endpoints: `GET /api/admin/stock-research`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/publish`, `POST /:id/unpublish`, `POST /bulk`, `POST /import/preview` (multipart CSV), `POST /import/confirm`, sowie **public** `GET /api/stock-research` (nur `published=true`, limit ≤12, sortiert `research_date DESC`).
  - Admin-Endpoints via `require_admin`. Public-Endpoint filtert interne Felder (`notes`, `created_by`, `created_at`, `updated_at`, `dedupe_key`) heraus.
  - Upside-Prozentwert wird zentral serverseitig serialisiert: `((target - current) / current) * 100` (Division-by-zero-safe, auf 2 Dezimalstellen).
  - Publish-Guard: Ohne `source_name`, `research_date`, valide Kurse → 400 „Für die Veröffentlichung ist eine nachvollziehbare Research-Quelle erforderlich."
  - Duplicate-Key: SHA256 aus `ticker + research_house + analyst + research_date + target_price` → 409 bei manueller Anlage / CSV.
  - CSV: `_sniff_reader` (Komma/Semikolon/Tab), UTF-8/Latin-1, Max 512 KB, Max 500 Zeilen. Formula-Injection-Guard (`=`, `+`, `-`, `@` werden mit `'` neutralisiert). Preview → Confirm-Zwei-Schritt-Workflow. CSV-`published=true` wird **ignoriert** (Draft-First-Regel §10) und als Warnung ausgegeben.
  - Bulk-Aktionen (`publish`|`unpublish`|`delete`) mit Revalidierung bei Bulk-Publish (§11).
  - Frontend: neue Admin-Seite `/app/frontend/src/pages/admin/AdminStockResearch.jsx` (~600 LOC) mit Liste, Manuellem Anlage-/Bearbeitungs-Modal (mit inline Upside-Vorschau), CSV-Import-Wizard (Upload → Preview mit Fehler-/Warn-/Gültig-Zählern → Bestätigung), Bulk-Toolbar, Row-Actions (Bearbeiten/Publish/Unpublish/Löschen mit Confirm), Statusfilter „veröffentlicht/Entwurf".
  - Route in `App.js`: `/admin/stock-research`. Nav-Eintrag „Aktienanalysen" in `AdminDashboardLayout.jsx` unter „Produkte & Inhalte".
  - `StockResearchSection.jsx`: fetcht `/api/stock-research` bei Mount. Wenn `items>0` → `ResearchTable`; sonst weiterhin bestehender Empty-State. Datenstand-Zeile („Datenstand: … · Quellen: Analysten-/Research-Angaben der jeweils genannten Anbieter") nur bei echten Daten sichtbar. Rendert `source_url` als klickbaren Link. Disclaimer unverändert.
  - E2E-QA (curl): Login → Draft-Create (nicht public) → Publish (public sichtbar) → Unpublish (public leer) → 401 ohne Auth → Delete OK. CSV mit 6 Zeilen (2 valide, 4 Fehler: Ticker/Quelle/Datum/Kurs, 1 Warnung published=true) → 2 als Drafts importiert, Duplicate-Preview → 0 importable. Bulk-Delete Cleanup. Preview endet mit leerer Collection + Empty-State auf der Homepage. Kein horizontaler Scroll @390px. Webpack 0 neue Warnings.
- 78.2 (Feb 24 2026) — **Homepage „Aktien mit Potenzial" — Stock Research Section (Empty-State)**:
  - Neue Datei `/app/frontend/src/components/home/StockResearchSection.jsx` (~330 LOC): Editorial Research-Bereich mit Eyebrow „EXKLUSIVE ANALYSEN", H2 „Aktien mit Potenzial", Empty-State (`Aktuell liegen keine verifizierten Analysteneinschätzungen vor.`), Table-Header-Vorschau, 3 Info-Karten (Fundamentale Stärke / Experten-Know-How / Risikobewusst Investieren), Disclaimer.
  - `Home.js`: Import + JSX von `HomeInvestmentSpectrum` durch `StockResearchSection` ersetzt (an gleicher Stelle).
  - Komponente akzeptiert bereits `rows` Prop mit Feldern (company, ticker, currentPrice, priceTarget, upsidePct, analyst, asOfDate, source, currency) — sobald echte Daten anliegen, rendert automatisch die vollständige `ResearchTable` (Desktop-Table + Mobile-Cards, `Intl.NumberFormat` für EUR + Datum) anstelle des Empty-States.
  - STRIKT keine Fake-Daten. Empty-State ist bewusst editorial gestaltet (Mint-Icon-Kreis, dezente Skelett-Andeutung, keine Warnfarben).
  - QA: Webpack 0 neue Warnings; `home-investment-spectrum` DOM-abwesend; `home-stock-research`, `stock-research-empty-state`, `stock-research-info-cards` DOM-präsent; kein horizontaler Scroll @390px.
- 78.0 (Feb 28 2026) — **Server.py Modularisierung Wave 2 — Auth extrahiert**:
  - Neue Datei `/app/backend/routes/auth.py` (175 LOC) mit `APIRouter(prefix="/api", tags=["auth"])` und den 8 Auth-Endpoints. Alle Helper (`db`, `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `set_auth_cookies`, `clear_auth_cookies`, `public_user`, `get_current_user`, `check_lockout`, `record_failed_login`, `clear_login_attempts`, `_as_aware`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_MINUTES`) sowie Pydantic-Modelle (`RegisterInput`, `LoginInput`, `UpdateMeInput`, `ForgotInput`, `ResetInput`) top-level aus `server` importiert — safe weil `from routes import auth` am Ende von server.py steht.
  - `server.py`: 8 alte `@api.post/get/patch(...)`-Decorators im Auth-Block (früher Z. 334–455) entfernt und durch Kommentar-Anchor ersetzt. `app.include_router(_auth_routes.router)` am Ende registriert.
  - Server-LOC: 3840 → 3724 (-116 Zeilen). Routes/auth.py: 175 Zeilen.

## Auth-Endpoints (alle exakt gleiche URL, Methode und Response-Shape wie vorher)
1. POST /api/auth/register — 200 + cookies / 409 duplicate
2. POST /api/auth/login — 200 + cookies / 401 invalid
3. POST /api/auth/logout — 200 (require_user via get_current_user)
4. GET /api/auth/me — 200 / 401
5. PATCH /api/auth/me — 200 (update name/avatar_url)
6. POST /api/auth/refresh — 200 / 401
7. POST /api/auth/forgot-password — always 200 (anti-enumeration)
8. POST /api/auth/reset-password — 200 / 400 (invalid/used/expired token)

## Cookie-Regression (verified via Set-Cookie header)
`HttpOnly; Max-Age=86400 (access) / 2592000 (refresh); Path=/; Secure; SameSite=None; Partitioned` — identisch zu vorher.

## Blockers
- P1: Supabase `product_inquiry_leads_product_check` (DBA)
- P2: Alpha Vantage + Unsplash API-Keys (User)

## Files of Reference
- `/app/backend/server.py` — Auth-Block entfernt, Router-Include am Ende
- `/app/backend/routes/auth.py` (NEU) — 8 Endpoints per APIRouter
- `/app/backend/routes/product_inquiry.py` (bestehend)
- `/app/backend/routes/reports.py` (bestehend)

## Backlog
- News-Routen extrahieren (~28 Endpoints)
- Investments-Routen extrahieren
- News Retention Archive (>90 Tage)
- Phase 4/5

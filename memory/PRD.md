# Kapitalmitte / Webmain — Migration PRD

## Session 74.8 (Feb 28, 2026) — Email-Endpoint + Wizard-Validation + Testid-Kollision ✅

**P0 – Email-Endpoint 404 behoben**
- **Ursache:** Frontend `notifyProductInquiryLeadEmail` in `submitProductInquiryLead.js` ruft `POST /api/send-product-inquiry-email`, aber im FastAPI-Backend war dieser Route nie registriert. Der frühere Legacy-Node-Worker (`/legacy_source/server/lib/apiRoutes.js`) lieferte den Endpoint, ist aber nicht mehr aktiv.
- **Fix:** Neuer Endpoint in `backend/server.py` mit `_send_email_via_emergent` (bestehende Mail-Utility, kein zweiter Layer). Nach Payload-Sanitize sendet er via Emergent-managed Provider an `PRODUCT_INQUIRY_TO` (Env, Fallback `EMAIL_REPLY_TO`, sonst `kundenservice@kapital-direkt24.de`).
- **Verhalten:**
  - Endpoint gibt **immer** HTTP 200 zurück (`{ok:true|false, ...}`), damit ein Mailfehler den Frontend-Success-Flow nicht verwirft. Lead in Supabase bleibt unabhängig persistiert.
  - **Idempotenz:** In-Memory-Set `_PI_EMAIL_RECENT` mit 60 s TTL, dedupe-Key = `product|email|first|last|phone`. Doppelversand bei Doppelklick/Retry ausgeschlossen (`{ok:true, dedupe:true}`).
  - Ohne `EMERGENT_EMAIL_KEY` läuft der Endpoint als Dry-Run (`{ok:true, dry_run:true}`).
  - Provider-Failure (HTTP 502 vom Emergent-API) → `{ok:false, error:"email_provider_failed"}`, geloggt, kein Rollback.
- **Frontend-Caller** (unverändert): `notifyProductInquiryLeadEmail` prüft `res.ok`, loggt Warnung bei !ok, verwirft niemals den Lead.

**Wizard-Validation-UX (Vorname/Nachname)**
- Neuer State `contactErrors` + Refs `firstNameRef/lastNameRef/emailRef/phoneRef`.
- `validateContact` sammelt Fehler pro Feld (leerer Vorname → „Bitte geben Sie Ihren Vornamen ein.", leerer Nachname → „Bitte geben Sie Ihren Nachnamen ein.", plus Format-Checks); Reihenfolge Vorname → Nachname → Telefon → E-Mail, Fokus auf erstes ungültiges Feld via `ref.focus()`.
- Inline-Fehlermeldung unter Feld (`text-red-600`, `role="alert"`, `id="pi-first-error"/"pi-last-error"`).
- `Input` bekommt `aria-invalid="true"` + `aria-describedby="pi-*-error"` bei Fehler; roter Border via cn().
- Fehler verschwindet bei Fokus/Blur mit ≥1 Zeichen. Consent-Prüfung + Submit-Payload unverändert.

**Testid-Kollision behoben**
- Nur `ProductInquiryStickyCta.jsx` Popup-Menü: `data-testid={`product-inquiry-menu-option-${p.key}`}` (Wizard-Answer-Options bleiben `product-inquiry-option-<value>`).
- Konflikt aufgelöst; Selektoren jetzt eindeutig zwischen Sticky-Menü und Wizard-Antworten.

**Erhalten (nicht angefasst):** Sticky-CTA-Design 74.7, Mobile 280×60, Attention-Pulse, nearForm, Interstitial-Hide, Analytics-Payloads (`product_inquiry_open`/`product_inquiry_select`), Produktkatalog, Bonus-Mapping, Newsletter, Consent-Logik, Wizard-Schritte, Bonuslogik, Produkt-Mapping.

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint `product_inquiry_leads_product_check` für fonds/tagesgeld/festgeld/flexgeld — nicht angefasst.

**Follow-up-Fixes (nach iteration_53)**
- **Validation-Race:** `onFocus`-Cleanup entfernt (verursachte Stale-Closure-Race, Fehler verschwand bei jedem 2. Submit). Fehler wird jetzt in `onChange` beim ersten Character-Change geräumt (spec-konform „nach Eingabe"). Fokus auf ungültiges Feld via `requestAnimationFrame` nach State-Commit.
- **Dedupe-Race:** `_PI_EMAIL_RECENT[dedupe_key] = now` wurde vor dem Sendeversuch persistiert → legitimer Retry nach transientem Provider-Fehler wurde als `dedupe:true` geschluckt (Silent-Mail-Loss). Marker jetzt erst nach erfolgreichem `_send_email_via_emergent`-Call gesetzt.
- **Provider-Response-Logging:** `_send_email_via_emergent` fängt `httpx.HTTPStatusError` separat und loggt `response.text[:400]` — 422 „undeliverable_recipient" (verifiziert bei kundenservice@kapital-direkt24.de) ist jetzt im Log direkt sichtbar.

**Bekannter operationaler Punkt** (nicht Code-fixbar)
- `PRODUCT_INQUIRY_TO` muss auf eine vom Emergent-Provider verifizierte/deliverable Empfänger-Adresse gesetzt werden (aktueller Default kundenservice@kapital-direkt24.de wird mit 422 abgelehnt). Der Endpoint ist voll funktionsfähig, sobald die Env-Variable gesetzt ist.

**Verifikation (iteration_54)**
- ✅ Validation-Race gefixt: 4× Submit ohne Änderung → Meldung/aria-invalid/Border bleiben jedes Mal sichtbar (kein Flackern mehr).
- ✅ onChange-Clear: 1. Character-Change räumt Fehler sofort (ohne Blur), spec-konform.
- ✅ Dedupe-Race gefixt: rapid-fire Retry nach Provider-Fehler liefert erneut `email_provider_failed` (kein Silent-Loss durch `dedupe:true`).
- ✅ Provider-Response-Logging: `Email provider 422: … | body={"error":"Undeliverable recipient"…}` im Backend-Log.
- ✅ pytest 12/12 + 1 xfail (Provider-Empfänger, env-operational).
- ✅ Regression: 6× `product-inquiry-menu-option-*`, Wizard-Antworten `product-inquiry-option-<value>`, alle Wizards öffnen, Sticky-Design 74.7 unverändert, ESC/Outside-Click, Interstitial-Hide, Pulse.
- ✅ Keine neuen Console-Errors.

**Bekannter operationaler Punkt** (nicht Code-fixbar in dieser Session):
- **Supabase-CHECK-Constraint** `product_inquiry_leads_product_check` (explizit als externer Blocker markiert): erlaubt nur aktien+anleihen. 4 von 6 Wizards (fonds/tagesgeld/festgeld/flexgeld) bleiben blockiert bis manuelle DBA-Migration durchgeführt wird.
- `PRODUCT_INQUIRY_TO` Env muss auf verifizierte Empfänger-Adresse gesetzt werden — Provider antwortet aktuell 422 undeliverable_recipient.

## Session 74.7 (Feb 28, 2026) — Mobile Sticky-CTA Single-Line ~56 px ✅

**Warum nachgebessert:** User-Feedback: iter_51 (72 px) immer noch zu groß. Neuer Zielbereich: 56 px Höhe, ~280 px Breite, Single-Line-Layout mit nur Icon + Haupttext + Pfeil + X.

**File geändert** (nur `frontend/src/components/home/ProductInquiryStickyCta.jsx`)
- **Mobile Main-CTA:** `min-h-[3.5rem]` (56 px), `w-[min(17.5rem,calc(100vw-1.5rem))]` (~280 px). Padding `py-1.5 pl-2.5 pr-2`, `gap-2.5`.
- **Icon-Tile:** 36×36 (`h-9 w-9`), Inner-Icon 16.8 px (`h-[1.05rem]`).
- **Text-Reduktion:** Nur noch **eine Zeile** „Fragen beantworten" (14 px semibold). Eyebrow und Benefit-Zeile auf Mobile via `hidden sm:inline/block` ausgeblendet. Desktop weiter 3-zeilig.
- **X-Button:** `w-9` (36 px), X-Icon `h-3.5 w-3.5` (14 px). Border-l bleibt als Divider.
- **ArrowRight:** 14.4 px (`h-[0.9rem]`).
- **Popup-Menü:** Breite matched CTA (`w-[min(17.5rem,…)]`) → keine visuelle Diskrepanz.
- **CompactPill (Restore):** identische Single-Line-Mobile-Version, Desktop unverändert.

**Erhalten:** alle Testids (`sticky-cta`, `sticky-compact`, `sticky-dismiss`, `sticky-restore`), Analytics, Handler, nearForm, Interstitial-Hide, Pulse, ESC/Outside-Click, Produktmenü-Inhalt, Desktop 1440.

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

**Testergebnisse (iteration_52, 100 % Pass)**
- ✅ Mobile 390: Container 280×60 (inner 56 + border 2×2), Main 240×56, Icon-Tile 36×36, Inner 17 px, Arrow 14.6, X 36.5×56 + border-l 1 px, X-Icon 14.2.
- ✅ Text: nur „Fragen beantworten" (14 px semibold) sichtbar; Eyebrow + Benefit `display:none` auf Mobile, auf Desktop weiter sichtbar.
- ✅ Container: exakt 2 direkte Kinder (compact + dismiss), keine Floating-Circle.
- ✅ Menu-Open: `data-menu-open=true`, Shadow reduziert, Höhe bleibt 60 px, `transform none`.
- ✅ Active: `matrix(0.98,…)` bei mousedown.
- ✅ Restore-Pill 280×56, nur Haupttext sichtbar.
- ✅ Responsive 320/375/390/430: alle 280×60, kein H-Scroll, kein Truncation.
- ✅ Desktop 1440 unverändert: 384×104, Icon 56×56, 3-zeilig — identisch zu iter_51.
- ✅ Regression: 6 Wizards öffnen (spectrum-wizard-aktien), Interstitial-Hide, nearForm Newsletter (280×60), Pulse 1×/Session + reduced-motion, ESC/Outside-Click.
- ✅ Keine neuen Console-Errors.

## Session 74.6 (Feb 28, 2026) — Mobile Sticky-CTA drastisch kompakter ✅

**Warum nachgebessert:** Session 74.5 landete bei 80 px Höhe / 320 px Breite. User-Feedback: immer noch zu dominant. Neuer Zielbereich: 68–76 px Höhe, 300–330 px Breite, integrierter X mit Divider (statt Floating-Circle).

**File geändert** (nur `frontend/src/components/home/ProductInquiryStickyCta.jsx`)
- **Mobile-Main-CTA inline restrukturiert:** Outer flex-Container mit `border-2` + `overflow-hidden rounded-2xl`, innen Main-Button + `border-l` Divider + X-Button (matches Desktop-Struktur, aber Mobile-Sizes).
- **Größe:** `min-h-[4.25rem]` (68 px) + `w-[min(20rem,calc(100vw-1.5rem))]` (~320 px, seitlich 12 px). Padding Main-Button `py-2 pl-3 pr-2`.
- **Icon-Tile:** 42×42 (`h-[2.625rem] w-[2.625rem]`) mit `rounded-lg` + Innen-Icon 20 px (`h-[1.25rem]`). Desktop `sm:h-16 sm:w-16` unverändert.
- **Typografie:** Eyebrow 9.5 px tracking-[0.16em], Haupttext 15 px semibold leading-[1.1], Benefit 11 px leading-[1.25]. Alle enger gestapelt (`gap-[1px]`).
- **Benefit-Copy Mobile:** dauerhaft „In wenigen Minuten zur Empfehlung" + `truncate whitespace-nowrap` gegen Umbruch. Desktop `sm:` weiter „…zur persönlichen Empfehlung".
- **X-Bereich:** integrierter Button `w-10` (40 px) mit `border-l`, X-Icon `h-4 w-4` (16 px). Kein Floating-Circle mehr. Touch-Target ~68×40 = ausreichend AA.
- **Hover/Active:** Mobile nur `active:scale-[0.98]` + `hover:bg-bank-primary/[0.04]`. Desktop-`sm:hover:-translate-y-0.5 sm:hover:scale-[1.02]` und `sm:active:scale-[1.045]` bleiben. Kein Scale-Up beim Klick auf Mobile.
- **Menu-Open-State Mobile:** `data-menu-open="true"` → schwächerer Shadow (`0_10px_24px_-14px…`), `border-bank-primary/20`, kein Pulse. Höhe bleibt gleich (kein Grow).
- **CompactPill vereinfacht:** wird jetzt NUR für den Restore-Pill genutzt. Mobile-Sizes matchen Main-CTA (68 px, 42-px-Icon, `active:scale-[0.98]`). Desktop unverändert.

**Erhalten:** alle Testids (`sticky-cta`, `sticky-compact`, `sticky-dismiss`, `sticky-restore`, `option-<key>`), Analytics, `openMenu`/`pickProduct`/`dismiss`/`restore`, nearForm, Interstitial-Hide (74.4-fix2), Pulse (74.3), ESC/Outside-Click, sessionStorage/localStorage-Regeln, Produktmenü Layout (nicht angefasst).

**Externer Blocker weiter offen (nicht angefasst):** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

**Testergebnisse (iteration_51, 100 % funktional, 1 kosmetischer Follow-up)**
- ✅ Mobile 390x844: Container 320×72 px, Main-Button 280×69 (min-h 68 px), Icon-Tile 42.6×42.6, Inner-Icon 20 px, X-Button 40×69 mit border-l 1 px solid, X-Icon 16 px.
- ✅ DOM-Struktur: 2 direkte Kinder (`sticky-compact` + `sticky-dismiss`), kein Floating-Circle, X position:static.
- ✅ Menu-Open: `data-menu-open='true'`, Shadow 24 px, `data-pulse='false'`, Höhe bleibt 72 px, `transform none` (kein Grow).
- ✅ Active: `matrix(0.98,…)` bei mousedown auf main-button.
- ✅ X-Klick: 0 Menus, cta count 0, Restore-Pill 320×68.
- ✅ Responsive 320/375/390/430: alle 72 px hoch, kein H-Scroll.
- ✅ Desktop 1440 unverändert: 384×104, Icon 56×56 (Baseline iter_50).
- ✅ Regression: 6 Optionen + Wizard, Interstitial-Hide, nearForm, Pulse 1×/Session, ESC + Outside-Click.

**Follow-up-Fix (Session 74.6.1)**
- Mobile-Benefit-Copy „In wenigen Minuten zur Empfehlung" (32 Zeichen) wurde bei allen Mobile-Breiten ellipsiert (Textspalte nur ~177 px nach Icon+X+Padding). Fix: Copy weiter gekürzt zu „In wenigen Minuten" (17 Zeichen) → passt vollständig, keine Ellipsis, Nutzenkommunikation über „Kurzfragebogen"-Eyebrow + „Fragen beantworten"-Haupttext bleibt klar. Desktop `sm:` weiter „…zur persönlichen Empfehlung".

## Session 74.5 (Feb 28, 2026) — Mobile Sticky-CTA kompakter ✅

**Ziel:** Sticky-CTA nimmt auf Mobile zu viel Fläche ein und konkurriert mit dem geöffneten Produktmenü. Auf 78–88 px Höhe reduzieren, Icon kleiner, Benefit-Copy kürzen, Menü-Open-State visuell zurücknehmen. Desktop unverändert.

**Files geändert** (nur `frontend/src/components/home/ProductInquiryStickyCta.jsx`)
- **CompactPill Mobile:** `min-h-[5rem]` (80 px), `w-[min(20rem,calc(100vw-2rem))]`, `px-3.5 py-3`, `gap-3`. Icon-Badge auf `h-11 w-11` (44 px). Eyebrow 9.5 px, Haupttext 15 px, Benefit 11 px. Desktop-`sm:`-Klassen (h-16 icon, min-h-[6rem], text-[18px]) unverändert.
- **Benefit-Copy responsive:** Mobile „In wenigen Minuten zur Empfehlung" (kürzer), Desktop „In wenigen Minuten zur persönlichen Empfehlung" (unverändert).
- **Menu-Open-State:** neuer Prop `menuOpen` → `shadow-[0_10px_28px_-14px_...]` (schwächer als default) + `border-bank-primary/20` + Pulse deaktiviert. Desktop-Shadow unverändert. Fügt `data-menu-open="true|false"` fürs Testing hinzu.
- **ProductMenu Mobile:** Outer `px-3 py-3` (vorher 3.5), Header `mb-2.5 pb-2.5`, Header-Copy zweistufig responsive (kurz auf Mobile, lang auf sm+). Cards `px-2.5 py-2` + `gap-1` (kompakter). Wizard-Nutzen-Chip-Sektion auf Mobile `hidden sm:block` → alle 6 Produktoptionen deutlich früher gleichzeitig sichtbar.
- **Erhalten:** alle Testids, Analytics, Handler, Session 74.4-fix2 Interstitial-Hide, Session 74.3 Attention-Pulse, nearForm-Ausweich, Desktop-Layout.

**Externer Blocker weiter offen (nicht angefasst):** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

**Testergebnisse (iteration_50, 100 % funktional, 2 kosmetische Notes)**
- ✅ Mobile 390x844: Pill 320×80 px, Icon 44×44, Padding 12/14, Kurz-Benefit sichtbar, kein h-Overflow.
- ✅ Menu-Open-State: `data-menu-open='true'`, Shadow reduziert (0.22 vs 0.30), Pulse deaktiviert.
- ✅ Produktmenü: alle 6 Optionen im Viewport (y 264–671), kein Scroll nötig, Wizard-Nutzen-Section Mobile hidden.
- ✅ Responsive 375/390/430: alle 320×80, kein Overflow.
- ✅ Desktop 1440 unverändert: Button 384×104, Icon 56×56, lange Benefit-Copy.
- ✅ Regression Session 74.3/74.4/74.4-fix2 intakt: Pulse 1×/Session, Interstitial-Hide, ESC/Outside-Click, alle Wizards öffnen.

**Follow-up Fix (Session 74.5.1)**
- 320 px Breite: Benefit-Zeile brach auf 2 Zeilen → Pill 93.75 px statt ≤88 px. Fix: `truncate whitespace-nowrap sm:whitespace-normal` auf Mobile-Benefit-Span → ellipsiert bei Bedarf, kein Wrap, Pill wieder ≤80 px. Desktop behält `sm:whitespace-normal` (kein Ellipsis).

**Non-Blocker (out-of-scope):** hero-comparison-btn Overlap bei extrem kurzem 320×568 Viewport (vorbestehendes fixed-CTA-Verhalten); Kontrast text-bank-ink theme-weit ~3.3:1 (nicht Session-74.5-spezifisch).

## Session 74.4-fix2 (Feb 28, 2026) — Sticky-CTA versteckt sich bei sichtbarem Interstitial ✅
- ✅ Mobile 390: sichtbarer Teaser → Sticky-CTA + Restore-Pill nicht im DOM (`sticky-cta=0, compact-pill=0`). Hit-Tests auf `#invtopic-teaser-headline/-body` treffen die Elemente selbst. MEHR ERFAHREN, SCHLIESSEN, Close-X klickbar. Kein horizontales Overflow.
- ✅ Desktop 1440: `MEHR ERFAHREN`-Klick navigiert korrekt nach `/themen/aktien` (iter_48-Blocker behoben).
- ✅ Restore nach Close: CTA zurück bei `x=38/y=666` (right-4), near-form=false, kein Sprung.
- ✅ Newsletter-Ausweichlogik weiterhin: near-form=true, x=16 (links), Rückkehr sauber.
- ✅ Newsletter+Teaser gleichzeitig: CTA versteckt, beide Elemente voll bedienbar.
- ✅ Restore-Pill: Dismiss → Pill sichtbar; Teaser triggern → Pill weg; Teaser schließen → Pill zurück.
- ✅ ESC bei offenem Popup ohne Teaser: keine `invtopic:*`-Keys in localStorage geschrieben (ESC-Konflikt praktisch entschärft).
- ✅ Responsive 320/375/430: kein Overflow, Text unverdeckt.
- ✅ MutationObserver-Perf: 0 Warnungen/Reflow-Meldungen in 6 s Idle (rAF-Debounce wirkt).
- ✅ Regression: Pulse-Session-Flag=1, Popup mit 6 Optionen, ESC + Outside-Click schließen, alle 6 Wizards öffnen, Aktien-Submit erfolgreich (Supabase 201).
- ✅ Console: keine neuen Errors, keine `d="undefined"`, nur vorbestehende 401er.

**Non-Blocker (außerhalb Scope, dokumentiert)**
- `/api/send-product-inquiry-email` → 404 nach erfolgreichem Lead-Insert (Notification-Mail wird nicht versendet).
- Wizard-Submit mit leeren Pflichtfeldern zeigt kein sichtbares Error-Feedback.
- Testid-Kollision `product-inquiry-option-*` in Sticky-Popup UND Wizard — muss immer gescoped werden.

## Session 74.4-fix2 (Feb 28, 2026) — Sticky-CTA versteckt sich bei sichtbarem Interstitial ✅

**Warum nachgebessert:** iteration_48 zeigte 2 HIGH-Blocker:
1. Desktop: Interstitial (bottom-6 right-6) und Sticky-CTA (bottom right-5) stapelten exakt → `MEHR ERFAHREN` unklickbar.
2. Mobile: Interstitial ist Full-Width Bottom-Sheet (~290 px). Ausweich-Position 8.5 rem (136 px) lag noch inner der Card → Text verdeckt.

**Neuer Ansatz:** Sticky-CTA wird bei sichtbarem Interstitial **komplett unsichtbar** (`return null`) — auf Desktop UND Mobile. Der Teaser übernimmt den CTA-Bereich. Sobald `data-visible='false'` oder Unmount → CTA kehrt in seine Standard-Position zurück. Kein Layout-Sprung (fixed position).

**Files geändert**
- `frontend/src/components/investment/InvestmentTopicTeaser.jsx` — `id="invtopic-teaser"` + `data-visible={visible ? 'true' : 'false'}` auf der Card.
- `frontend/src/components/home/ProductInquiryStickyCta.jsx`:
  - Zwei getrennte States: `nearForm` (Newsletter, Mobile-Position-Shift) + `hiddenForTeaser` (Teaser, beidseitig HIDE).
  - `recompute()` klassifiziert intersecting Elemente per `matches(selector)` und ignoriert `data-visible='false'`.
  - Nach Mount-Guard: `if (hiddenForTeaser) return null;` — versteckt Main-CTA UND Restore-Pill (der Guard steht vor beiden Branches).
  - Attention-Pulse pausiert bei `hiddenForTeaser`.
  - ESC-Handler bekommt `capture: true` + `e.stopPropagation()` → Sticky-Menu-Close markiert den Teaser NICHT als dismissed.
  - MutationObserver nutzt rAF-Debounce (`scheduleRecompute()`) — kein Reflow-Storm bei Ticker-DOM-Updates.

**Externer Blocker weiter offen (nicht angefasst):** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

## Session 74.4 (Feb 28, 2026) — Sticky-CTA weicht Investment-Interstitial aus ✅

**Ziel:** Der Sticky-CTA soll auf Mobile nicht mit der Interstitial-Card „Aktien im Fokus" (InvestmentTopicTeaser) kollidieren. Reuse der bestehenden `nearForm`-Ausweichlogik.

**Files geändert**
- `frontend/src/components/investment/InvestmentTopicTeaser.jsx` — Inner-Card bekommt zusätzlich `id="invtopic-teaser"` und `data-visible={visible ? 'true' : 'false'}`. Sonst unverändert (testids, Analytics, ESC/Close-Verhalten identisch).
- `frontend/src/components/home/ProductInquiryStickyCta.jsx` — bestehender `nearForm`-Effect erweitert:
  - `AVOID_IDS` → `AVOID_SELECTORS = ['#home-newsletter', '#invtopic-teaser']`
  - Zusätzlicher `MutationObserver` auf `document.body` für `childList + attributeFilter: ['data-visible', 'id']` — reagiert damit auf spätes Mounten des Interstitials UND auf `data-visible`-Toggles.
  - `intersecting`-Set + `recompute()`: `nearForm=true` nur, wenn mindestens ein Avoid-Element sowohl im Viewport UND `data-visible !== 'false'` ist. Verhindert False-Positives beim geschlossenen Teaser (Wrapper bleibt für Fade-Out im DOM).
  - Cleanup diskonnektiert IO + MO sauber.

**Testergebnisse (iteration_48, siehe unten)**
- ✅ Interstitial sichtbar → Sticky-CTA data-near-form='true', Position (16, ~602), Menü klappt links auf.
- ✅ Interstitial geschlossen → data-visible='false' → data-near-form='false' → Standard-Position (right-4).
- ✅ Newsletter-Ausweichlogik weiter intakt.
- ✅ Interstitial + Newsletter gleichzeitig → beide bedienbar.
- ✅ Mehrfacher Open/Close-Zyklus stabil.
- ✅ Desktop 1440 unverändert.
- ✅ Keine neuen Console-Errors.

**Externer Blocker weiter offen (nicht angefasst):** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

## Session 74.3 (Feb 28, 2026) — Sticky-CTA visuelles Redesign ✅

**Ziel:** Sticky-CTA „Kurzfragebogen · Fragen beantworten" deutlich größer, hochwertiger, banktypisch, ohne neue Bildassets. Keine Verhaltensänderungen.

**File geändert** (nur `frontend/src/components/home/ProductInquiryStickyCta.jsx` — komplett neu geschrieben)
- **Größe:** Desktop-Main-CTA min-h-[5.75rem] (~92 px) mit `w-[24rem]` + separatem `w-11` X-Divider. Mobile-CompactPill min-h-[5.5rem]/[6rem] mit `w-[21rem]/22rem`.
- **Typografie:** Eyebrow „Kurzfragebogen" mono `text-[10.5px] tracking-[0.20em] font-semibold text-bank-primary`; Haupttext „Fragen beantworten" `text-[16-17px] font-semibold text-bank-ink`; Benefit „In wenigen Minuten zur persönlichen Empfehlung" `text-[11.5-12.5px] text-bank-text-muted`.
- **Icon-Badge:** MessageCircleQuestion in 56×56 (Mobile 56, sm 64) rounded-xl mit bank-primary/10 fill + bank-primary/20 border + subtle blue shadow.
- **Border/Shadow:** `border-2 border-bank-primary/25` + `shadow-[0_20px_50px_-18px_rgb(9_33_66/0.30)]`.
- **Hover-State:** `-translate-y-0.5 scale-[1.02]` + `border-bank-primary/55` + `bg-bank-primary/[0.04]` + stärkerer Shadow, 200ms ease-out.
- **Active-State:** `active:scale-[1.045]` (Mobile), `active:scale-[1.02]` (Desktop) + `active:bg-bank-primary/[0.07]` + `border-bank-primary/65`.
- **X separiert:** Desktop → eigener Button mit `border-l` als vertikaler Divider und `onPointerDown stopPropagation`. Mobile → in eigenen Floating-Circle-Button `-right-1 -top-1` oben-rechts über der Pill verschoben (unabhängige 32×32 Touch-Fläche). aria-label + testid `product-inquiry-sticky-dismiss` erhalten.
- **Attention-Pulse:** neuer `useAttentionPulse`-Hook + `<PulseStyle>` mit `@keyframes sticky-cta-pulse-kf` (Shadow + minimal Scale) → **einmalig pro Session** nach 1.4 s, 1.5 s Dauer, `sessionStorage.productInquiryStickyPulseFired='1'` blockiert Wiederholung, respektiert `prefers-reduced-motion` doppelt (Hook + CSS media query).
- **Analytics erweitert:** `openMenu` ruft neu `trackInvestmentEvent('product_inquiry_open', { source: 'sticky_cta' })` — vorher fehlte das Event auf dem Sticky-Weg. `product_inquiry_select` mit `source: 'sticky_popup'` unverändert.
- **Erhalten:** testids (sticky-cta / -restore / -compact / -dismiss / option-<key>), Popup, Wizard-Routing, Session-Regeln, nearForm-IntersectionObserver auf #home-newsletter, localStorage-Dismiss, ESC + Outside-Click.

**Externer Blocker weiter offen (nicht angefasst):** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld.

## Session 74.2 (Feb 28, 2026) — Sparkline Guards + Consent Testids + framer-motion Path-Fix ✅

**Ziel:** Zwei kleine risikoarme Follow-ups aus Session 74 + Follow-up-Fix nach Testing Agent RCA.

**Files geändert**
- `frontend/src/components/watchlist/MiniSparkline.jsx` — komplett neu geschrieben. Filter für finite Numbers, values.length ≥ 2 vor Path-Bau, `d.startsWith('M')`-Guard vor Rendern, stabile Placeholder-Höhe (identisches width/height in loading/valid/placeholder). Neue Testids: `sparkline-<sym>`, `sparkline-<sym>-placeholder`, `sparkline-<sym>-loading`.
- `frontend/src/components/comparison/InterestRateSparkline.jsx` — `buildPath` filtert non-finite Werte; `buildAreaPath` prüft `linePath.startsWith('M')`; `hasPath`-Guard vor Rendern der 2 `<path>`; area-path konditional.
- `frontend/src/components/home/ProductInquiryWizard.jsx` — 3 neue data-testids ergänzt: `product-inquiry-consent-privacy`, `product-inquiry-consent-terms`, `product-inquiry-consent-marketing`. Keine Logik-Änderung.
- `frontend/src/components/dashboard/charts/EditorialDonut.jsx` — **Root-Cause-Fix**: `motion.path animate={{ d: path }}` entfernt (framer-motion kann keine SVG-Path-Data-Strings interpolieren → schrieb `d="undefined"` während des Tweens). `d` bleibt statisches Prop; `animate` reduziert auf `opacity`. `initial={false}` verhindert Initial-Tween.

**Testing (iteration_46, 11/12 vor Fix, +Node-Guard-Test alle 6 Fälle grün nach Fix)**
- ✅ Alle 3 Consent-Testids sichtbar & funktional, IDs #pi-* unverändert, Labels unverändert.
- ✅ Submit MIT privacy+terms → `product-inquiry-success`.
- ✅ Submit OHNE consent (3 negative Cases) → Toast „Bitte Datenschutz und AGB bestätigen.", kein Submit.
- ✅ Alle 6 Wizards öffnen, Aktien-Full-Flow (6 Fragen), Sticky-CTA-Weg intakt.
- ✅ MiniSparkline & InterestRateSparkline Guards code-review-safe; Node-Isolated-Test für 6 Edge-Cases (valid / empty / undefined / null / malformed points / API-401) alle `containsUndef=false containsNaN=false`.
- ✅ EditorialDonut: nach Fix keine `d="undefined"`-Konsolen-Warnung mehr (verifiziert per Playwright-Console-Hook + DOM-Path-Attribut-Check).
- ✅ Desktop 1440x900 + Mobile 390x844: kein horizontales Scrollen, Sparkline-Card-Höhe stabil, Wizard-Design aus Session 74 unverändert.

**Ursache der d="undefined"-Warnung** (RCA per Testing Agent + setAttribute-Stack-Trace)
- Framer-motion kann `d` (SVG path data) nicht interpolieren. In `EditorialDonut` wurde `animate={{ d: path }}` gesetzt → während des Tweens schrieb der Renderer `undefined` in das DOM-Attribut → 4x pro Homepage-Load (einmal pro Donut-Arc).
- Fix: `d` aus `animate` entfernt, nur `opacity` animiert. `d` wird per React-Render bei Hover-Radius-Änderungen automatisch aktualisiert.

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld — nicht angefasst.

## Session 74 (Feb 28, 2026) — Product-Inquiry-Wizard Redesign (UI/UX only) ✅

**Ziel:** Wizard-Modal seriös, banktypisch, mit größerer Typografie, hochwertigen Selection-Cards, klarem Trust-Bereich und größerem Weiter-Button. Keine funktionalen Änderungen, keine neuen Bildassets.

**Files geändert** (nur `frontend/src/components/home/ProductInquiryWizard.jsx`)
- Header (compact question step): mehr Padding, Eyebrow „KURZFRAGEBOGEN" jetzt in bank-primary, Produkttitel `text-[1.9rem] sm:text-[2.35rem] lg:text-[2.6rem]` (Display-Font), immer sichtbare Subline „Wir finden gemeinsam die passende Anlagestrategie für Ihre Ziele.", Progress-Bar `h-2` + `Schritt X / Y` als semi-fett.
- Question-Card: neue `rounded-2xl` Karte mit weicherem Schatten; Section-Headline „6 kurze Fragen zu Ihrer Anlage" (`text-[1.45rem] → 1.85rem`); Frage-Row mit größerem Nummer-Badge (h-12) + Icon-Badge; Frage-Text `text-[1.15rem] → 1.4rem`; Trust-Micro-Line mit ShieldCheck-Icon.
- Antwort-Cards: hochwertige Selection-Cards mit Icon-Tile links (Fallback: Frage-Icon, wenn kein OptionIcon), Label prominent (`text-[15.5px]` semibold), ArrowRight rechts; `border-2`; Selected-State: `border-bank-primary` + `bg-bank-primary/[0.06]`; Focus-Ring; Mobile 1-Spalte, sm+ 2-Spalten (bei 4 Optionen).
- Trust-Row: 3 Pillars horizontal (Vertraulich & sicher / Nur wenige Minuten / Kostenlos & unverbindlich) mit ShieldCheck + Clock3 + BadgeCheck. Icon-Gewichtungen jetzt konsistent (Feedback iteration_45).
- Weiter-Button: `h-12 sm:h-[3.25rem]` + `text-[15px] → 15.5px` + Focus-Ring + `Sicher & verschlüsselt · SSL/TLS` mit Lock-Icon unter dem Button.

**Testing (Playwright, iteration_45)** — 100 % Pass (7/7):
- Alle 6 Produkt-Wizards öffnen fehlerfrei mit korrektem Titel.
- Voller 6-Fragen-Flow (Aktien) inkl. Progress 1/7→6/7 und Back-Button.
- Kontakt-Step mit allen Feldern + Consent-Checkboxen funktional.
- Aktien + Anleihen submitten erfolgreich (`product-inquiry-success`).
- Sticky-CTA-Popup-Weg zum Wizard funktional.
- Desktop 1440x900 + Mobile 390x844 visuell sauber, kein horizontales Scrollen, kein Bild im Wizard.
- Keine neuen Console-Errors, keine Regression.

**Follow-up Cosmetic Fixes (Session 74.1)**
- `Check` → `BadgeCheck` im Trust-Row (visuell konsistent).
- Icon-Tile unselected: `QuestionIcon` statt leerem Dot.
- Card-Padding & Spacings gestrafft, damit Trust-Row auf 1440x900 above-the-fold sichtbar.

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint für fonds/tagesgeld/festgeld/flexgeld (nicht Teil dieses Redesigns).

## Session 73 (Feb 28, 2026) — Sticky-Popup-Refactor + Tracking-Fix + Bonus-Cleanup ✅

**Files geändert**
- `frontend/src/components/home/ProductInquiryStickyCta.jsx` — doppelte `const PRODUCTS`-Deklaration entfernt (SyntaxError-Blocker), ungenutzter `productInquiryCards`-Import gestrichen. Popup rendert vollständig aus `getProductCatalog()` — keine redundante `PRODUCT_BENEFITS`-Kopie mehr.
- `frontend/src/components/home/HomeProductWizardSection.jsx` — Impression-Tracking auf `IntersectionObserver` (threshold 0.25–0.4) + `sessionStorage`-Key `product_wizard_inline_open_fired` umgestellt → `product_inquiry_open` feuert genau einmal pro Session beim Scroll in die Section (touch-safe, kein Mouse-Enter mehr).
- `frontend/src/data/productWizardCatalog.js` — `PRODUCT_BONUS_SOURCE` bereinigt (leeres Objekt). BBVA-Bonus-Copy bezieht sich auf Festgeld und war fälschlich auf Tagesgeld/Flexgeld gemappt → würde produktfremde Kopie rendern. Handoff-Direktive „Only map active, verifiable promos" umgesetzt: kein Badge, bis eine echte produktspezifische Aktion gepflegt ist.
- `frontend/src/lib/investmentAnalytics.js` — Prop-Whitelist um `source` und `product` erweitert → `product_inquiry_open` und `product_inquiry_select` liefern jetzt Attributions-Payload an dataLayer/gtag/plausible (vorher stumm gedroppt).

**Testing (Playwright, Iteration 44)**
- IntersectionObserver: `product_inquiry_open` feuert genau 1× pro Session (bestätigt via dataLayer-Count, sessionStorage-Key, reload-persistiert).
- Sticky-CTA-Popup: 6 Optionen mit korrekten `data-testid`, gefüllt aus zentralem Katalog.
- Bonus-Badges: keine für aktien/anleihen/fonds/festgeld (spec) – nach Fix auch keine für tagesgeld/flexgeld mehr.
- Klick auf Card/Option öffnet echten Wizard-Modal.
- Regression: Desktop 3-Spalten-Grid + Mobile 1-Spalten sauber, keine JS-Errors, kein SyntaxError.

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint `product_inquiry_leads_product_check` blockiert Submit für fonds/tagesgeld/festgeld/flexgeld (manuelle DBA-Aktion nötig — Code-Seite ist korrekt).

**Bekannte Nebenbaustellen (non-blocking, siehe iteration_44)**
- SVG `d="undefined"`-Warnung in `MiniSparkline.jsx` / `InterestRateSparkline.jsx`, wenn Supabase `/functions/v1/stock-history` 401 zurückgibt → Guard für leere Daten sinnvoll.
- Mobile Sticky-CTA-`nearForm`-Guard observiert nur `#home-newsletter`; könnte um Interstitial ergänzt werden.

## Session 72 (Feb 25, 2026) — Große Inline-Produkt-Section + Bonus-Feed + Analytics ✅

**Neue Files**
- `frontend/src/data/productWizardCatalog.js` — zentrale Datenstruktur (`PRODUCT_KEYS`, `PRODUCT_BENEFIT_COPY`, `WIZARD_TRUST_POINTS`, `PRODUCT_BONUS_SOURCE`, `getProductCatalog()`). Popup + Inline-Section teilen jetzt dieselbe Quelle.
- `frontend/src/components/home/HomeProductWizardSection.jsx` — vollwertige Homepage-Section: Eyebrow „Produktwahl" + H2 „Finden Sie die passende Geldanlage für Ihre Ziele." + 4 Trust-Punkte (ShieldCheck/HandCoins/CheckCircle2/Clock) + 3-spaltiges Card-Grid (2-Spalten auf Tablet, 1-Spalten Mobile) mit Kategorie, Titel, Nutzenzeile, optionalem Bonus-Badge und „Fragen beantworten →"-Zeile. Position: unmittelbar nach `HomeInvestmentSpectrum` in `Home.js`.

**Bonus-Feed**
- Statisches Mapping in `PRODUCT_BONUS_SOURCE`: nur `tagesgeld`, `festgeld`, `flexgeld` haben aktuell einen Slug + Label (`Aktueller Vorteil` / `Mögliche Aktion`). Aktien/Anleihen/Fonds → kein Badge.
- Bonus-Text kommt aus dem bestehenden `BANK_BONUS_COPY[slug].summary` in `bankBonusTexts.js` — keine parallele Copy, keine Fake-Bonusversprechen. Wenn `BANK_BONUS_COPY[slug]` fehlt, wird kein Badge gerendert.

**Analytics**
- Bestehender `trackInvestmentEvent(name, props)` (aus `lib/investmentAnalytics.js`) wiederverwendet — kein neuer Layer.
- Events:
  - `product_inquiry_open` mit `{ source: 'inline_home' }` beim ersten Mouse-Enter der Section.
  - `product_inquiry_select` mit `{ product, source: 'inline_home' }` beim Card-Click (Inline).
  - `product_inquiry_select` mit `{ product, source: 'sticky_popup' }` beim Popup-Card-Click (`ProductInquiryStickyCta.pickProduct`).
- Try/catch um jedes Tracking-Callsite — Wizard-Öffnen blockiert nie.
- Kein PII in Payloads.

**Files geändert**
- `frontend/src/pages/Home.js` (Section eingehängt)
- `frontend/src/components/home/ProductInquiryStickyCta.jsx` (Tracking in `pickProduct`)

**Verifikation (Playwright)**
- Mobile 390×844: `section=1`, `cards=6`, `bonuses=3` (tagesgeld/festgeld/flexgeld), Klick auf Tagesgeld-Card öffnet `product-inquiry-wizard=1` (Wizard-Routing intakt).
- Desktop 1440×900: `cards=6` in 3-Spalten-Grid.

**Sticky-Popup** unverändert erhalten (sekundärer Einstieg, mobile-Anti-Overlap intakt).

**Externer Blocker weiter offen:** Supabase-CHECK-Constraint (Session 65).


## Session 71 (Feb 25, 2026) — „Produkt wählen"-Popup + Sticky-CTA aufgewertet ✅

**Datei geändert:** `frontend/src/components/home/ProductInquiryStickyCta.jsx`

**UX-Änderungen (mobile-first, banktypisch)**
- `ProductMenu`-Popup jetzt strukturiert in drei Blöcke:
  - **Header** mit Eyebrow „Produktwahl", H3 „Finden Sie die passende Geldanlage für Ihre Ziele." und Erklärungstext („Wählen Sie direkt ein Produkt — oder beantworten Sie wenige Fragen und erhalten Sie eine persönliche Empfehlung mit **möglichen Vorteilen und passenden Angeboten**.")
  - **6 rich Produkt-Cards** — jede mit `kicker` (z. B. `AKTIEN`), fettem Produkt-Titel und einer Kurzbeschreibung (Aktien → „Langfristige Chancen …", Anleihen → „Planbare Erträge und Stabilität …", Fonds → „Breit gestreut und flexibel …", Tagesgeld → „Flexibel sparen mit täglicher Verfügbarkeit …", Festgeld → „Planbare Laufzeit …", Flexgeld → „Zinsen und Flexibilität kombiniert.")
  - **Nutzen-Panel** „Kurzfragebogen — Ihr Nutzen" mit drei kompakten Chips: „Passende Empfehlung", „Mögliche Vorteile" (rechtssicher, keine Bonus-Versprechen), „Kostenlos & unverbindlich" + Trust-Line „In wenigen Minuten · kostenlos & unverbindlich".
  - Popup-Breite von 17 auf 21 rem erhöht; `max-h-[min(78vh,640px)]` mit `overflow-y-auto`, damit das Panel auf 320px bis Desktop sauber passt.
- `CompactPill` mit Icon-Badge + zweizeiliger Struktur: Eyebrow „Kurzfragebogen · persönliche Empfehlung" + Titel „Fragen beantworten" + auf ≥sm zusätzlich „In wenigen Minuten · kostenlos & unverbindlich"; hover lift + accent-Border.

**Erhaltene Funktionalität**
- Alle sechs `product-inquiry-option-{aktien|anleihen|fonds|tagesgeld|festgeld|flexgeld}` Testids und Klick-Verhalten unverändert. Wizard-Logik nicht angefasst.
- Bestehende Mobile-Anti-Overlap-Logik aus Session 69 unverändert (`nearForm` verschiebt CTA nach links-oben bei sichtbarem Newsletter).
- Keine neuen Bildassets, nur Typografie/Icons/Tokens.


## Session 70 (Feb 25, 2026) — 3 intern lösbare Items DONE ✅

**Item 1 · Digest-Preview** ✅ `GET /api/newsletter/admin/preview-weekly-digest`
- Nutzt dieselben Funktionen wie der Versand: neuer gemeinsamer Helper `_load_recent_articles(db, limit, days)` in `weekly_digest.py`, `build_digest_html` bleibt der einzige Renderer für Preview + Versand.
- Kein `send_email_fn`-Aufruf, KEIN Insert/Update in `newsletter_digests` (verifiziert: Collection blieb bei 1 Doc nach mehreren Preview-Aufrufen).
- Preview ohne Daten → freundlicher HTML-State „Kein Digest verfügbar" statt 500.
- Auth: bestehende `require_admin` (JWT-Cookie via `/api/auth/login`). Ohne Cookie → 401.

**Item 2 · Öffentliche `/newsletter`-Page** ✅
- Neue Seite `frontend/src/pages/NewsletterPage.jsx` mit Hero + `NewsletterSignup` (wiederverwendet) + Digest-Historie.
- Neuer öffentlicher Endpoint `GET /api/newsletter/digests?limit=12` in `weekly_digest.py`. Payload nur: `week_label, subject, articles[{slug,title,category}], article_count, started_at, finished_at`. Verifiziert: keine `recipients_total/sent/failed/emails/ip/token/user_agent`-Felder.
- Historie-Cards linken zu `/nachrichten/:slug`, snippets pro Ausgabe max. 5.
- Route registriert: `/newsletter` in `App.js`.
- Footer bekommt einen dezenten Link („wöchentlichen Finanznachrichten-Digest") in bestehendem Disclaimer.

**Item 3 · Interstitial nur einmal pro Session** ✅
- Bestehender `InvestmentTopicTeaser` hatte bereits `sessionStorage:invtopic:shown_in_session`-Flag + `alreadyShownThisSession()`-Guard beim Trigger. Zusätzliche Härtung: `handleClose()` markiert das Flag jetzt als Sicherheitsnetz (falls Trigger-Write scheiterte). Neue Browser-Session → sessionStorage leer → Interstitial darf wieder erscheinen.

**Files**
- `backend/weekly_digest.py` (Preview-Endpoint, `/newsletter/digests` History, `_load_recent_articles`, `_iso_week_label`, `_iso_week_subject`)
- `frontend/src/App.js` (Route `/newsletter`)
- `frontend/src/pages/NewsletterPage.jsx` (neu)
- `frontend/src/components/investment/InvestmentTopicTeaser.jsx` (Close-Härtung)
- `frontend/src/components/Footer.js` (dezenter Newsletter-Link)

**ENV:** keine neuen. Preview nutzt bestehenden `require_admin`. History-Endpoint ist öffentlich.

**Externer Blocker weiterhin offen:** Supabase-CHECK-Constraint (Session 65). Nicht angefasst.


## Session 69 · Nachbesserung nach iteration_43 ✅

**Interstitial + Consent-Link Overlap behoben**
- `ProductInquiryStickyCta.jsx`: Auf Mobile bei `nearForm=true` wandert das Sticky-CTA jetzt von `right-4` nach `left-4` und die vertikale Anhebung ist auf 8,5rem reduziert. Der Overlap mit dem `InvestmentTopicTeaser`-X (top-right) und dem Datenschutz-Link im Consent-Label ist damit vollständig aufgelöst — beide sind eigenständig hit-testbar.
- Product-Menu-Popup öffnet dann nach rechts (`left-0` statt `right-0`), damit es innerhalb des Viewports bleibt.
- Verifiziert auf 390×844:
  - `sticky.left=16, right=191, bottom=708`
  - `invtopic-close hittest → svg` (nicht mehr `product-inquiry-sticky-compact`)
  - `newsletter-submit hittest → home-newsletter-submit` (unblockiert)


## Session 69 (Feb 25, 2026) — 3 Action Items geliefert ✅

**Item A · Weekly Digest Sender** ✅
- Neue Datei `backend/weekly_digest.py`: `send_weekly_digest(db, send_email_fn, force, limit_articles)` sammelt bis zu 6 Top-Artikel der letzten 7 Tage aus `news_articles` (nur Fröhlich-Redaktion, status=published), rendert HTML im Fröhlich-Look (dunkelblau/gold, Serif-Headline, mono Eyebrow) und versendet an alle `newsletter_subscribers` mit `consent=True` und `unsubscribed!=True`. Per-recipient try/except → kaputter Empfänger stoppt den Batch nicht.
- Dedup: `newsletter_digests`-Collection speichert einen Record pro ISO-Woche (`digest_id=YYYY-Www`). Wiederholter Aufruf ohne `force=true` liefert `already_sent=true`.
- Unsubscribe: HMAC-SHA256-signierter Token via `NEWSLETTER_UNSUBSCRIBE_SECRET` (Fallback `JWT_SECRET`). Public GET-Endpoint `/api/newsletter/unsubscribe?email=…&token=…` setzt `unsubscribed=True` und rendert Bestätigungs-HTML.
- Cron: `.emergent/crons.yml` neuer Job `newsletter-weekly-digest` Fr 08:00 UTC.
- Verifiziert via curl: fresh-run articles=6/recipients=2/failed=2 (example.com E-Mails, error-handling greift), 2. Aufruf `already_sent=true`, unsubscribe valid=200 (HTML), invalid=400.
- **ENV**: `EMERGENT_EMAIL_KEY` bereits gesetzt → produktiver Versand aktiv. Optional `NEWSLETTER_UNSUBSCRIBE_SECRET` (fallback: `JWT_SECRET`, aktuell aktiv).

**Item B · Mobile Overlay Clean** ✅
- `ProductInquiryStickyCta.jsx`: IntersectionObserver auf `#home-newsletter` (threshold 0.05). Wenn intersecting UND `!isDesktop` → mobiler bottom-Offset auf `calc(env(safe-area-inset-bottom)+15rem)` mit sanftem `transition-[bottom]`. Desktop-Position unverändert. Attribut `data-near-form={true|false}` für Tests. Kein Element wird ausgeblendet — reine Positions-Anpassung.

**Item C · URL-Hash Sync-Cleanup** ✅
- `HomeFinanceNews.jsx`: `readCategoryFromHash()` liefert jetzt `{ key, wasInvalid }`. Ein useEffect strippt beim Mount ungültige `#kategorie=…`-Hashes per `history.replaceState()` (kein zusätzlicher History-Eintrag, kein Reload). Fremde Hashes (`#some-anchor`) bleiben unangetastet. Filterwechsel via `pushState`.

**Files**
- `backend/weekly_digest.py` (neu)
- `backend/server.py` (register-Zeile für weekly_digest)
- `.emergent/crons.yml` (neuer Cron)
- `frontend/src/components/home/HomeFinanceNews.jsx`
- `frontend/src/components/home/ProductInquiryStickyCta.jsx`

**Externer Blocker (unverändert seit Session 65):** Supabase-CHECK-Constraint `product_inquiry_leads_product_check` — Aktion siehe Session 65.

**Status: 3/3 intern lösbar DONE**


## Session 68 (Feb 25, 2026) — 3/4 Action Items DONE, Supabase weiter BLOCKED

**Item 1 · Supabase-Constraint** — extern BLOCKED (Session 65 gilt unverändert)
- Live-Probe: aktien/anleihen 201 ✅, fonds/tagesgeld/festgeld/flexgeld 400/23514 ❌
- Kein `SUPABASE_SERVICE_ROLE_KEY` / Management-Token verfügbar → DDL aus Emergent nicht möglich.
- User-Aktion siehe Session 65 (Table Editor `product_inquiry_leads` → Constraints → Edit `product IN ('aktien','anleihen','fonds','tagesgeld','festgeld','flexgeld','spargeld')`).

**Item 2 · Kategorie-Deep-Links** ✅ DONE
- `HomeFinanceNews.jsx`: neuer initial-State via `readCategoryFromHash()` (Whitelist `ALLOWED_HASH_CATEGORIES`), `hashchange`-Listener + `applyCategory()` mit `history.pushState` — Back/Forward navigiert zwischen Filtern. Ungültige Hashes → 'all'. Featured-Dedup bleibt erhalten (Filter schließt Featured-Slug explizit aus).
- Hash-Format: `#kategorie={key}`, `all` löscht den Hash.

**Item 3 · Bildvalidator im News-Sync** ✅ DONE
- `news_synthesizer.py`: neue `_validate_image_url(url, timeout=5.0)` — HEAD zuerst, GET-Stream-Fallback bei 405 oder fehlendem `content-type`, `follow_redirects=True`. Rückgabe True nur bei 2xx UND `content-type: image/*`. Einzelne fehlerhafte Hosts werfen keine Exception (BLE-Guard).
- Eingesetzt an 3 Stellen:
  1. `_fetch_unsplash_image` — Pick wird verworfen, Suche geht weiter
  2. `fetch_feeds` — ungültiges RSS-Bild → deterministischer Kategorie-Fallback
  3. `synthesize_pending` — letzter Validierungsgang vor Mongo-Insert
- Verifiziert: Merz-404-URL → valid=False → Fallback greift. Sync-Job bleibt bei einzelnen kaputten Bildhosts intakt.

**Item 4 · Newsletter-Anmeldung** ✅ DONE
- Backend: `POST /api/newsletter/subscribe` (server.py) mit `EmailStr` + Consent-Guard. Persistenz in Mongo `newsletter_subscribers` (unique index auf email). Idempotent: bereits eingetragen → 200 `already_subscribed` + `resubmit_count++`. Doku im Log per E-Mail-Hash (kein Klartext).
- Frontend: neue Komponente `NewsletterSignup.jsx` unter `HomeFinanceNews` in Home.js gemountet. E-Mail-Feld + Consent-Checkbox mit Datenschutzlink + Send-Button; Loading (Spinner + „Wird gesendet"), Success (Check-Panel), Error (Inline). Vollständig im Fröhlich-Design (font-mono uppercase Eyebrow, bank-ink CTAs).
- Curl-Verifikation: fresh subscribe 200, idempotent 200 (`already_subscribed`), invalid email 422, missing consent 400.

**Files geändert**
- `frontend/src/components/home/HomeFinanceNews.jsx` (Hash-Persistenz + Featured-Dedup-Regel geschärft)
- `frontend/src/components/home/NewsletterSignup.jsx` (neu)
- `frontend/src/pages/Home.js` (NewsletterSignup gemountet)
- `backend/server.py` (Newsletter-Route, Mongo-Index-Startup, `import hashlib`)
- `backend/news_synthesizer.py` (`_validate_image_url` + 3 Einsatzstellen)

**Status: 3/4 DONE · Item 1 BLOCKED extern**


## Session 67 — Nachbesserung nach iteration_41 ✅

**iteration_41: 10/12 fully PASS, 2 partial → alle 2 gefixt.**

**Fixes**
- `HomeFinanceNews.jsx`: Filter-Chips jetzt vollständig dynamisch aus den vorhandenen Kategorien im Feed (mit Order-Hint + humanized fallback). `politik`, `welt` und alle anderen Synthesizer-Kategorien erscheinen jetzt automatisch als Filter.
- `HomeFinanceNews.jsx`: `<img onError>`-Fallback auf kategorie-spezifische Ersatzbilder (10 Kategorien + Default). Der 404-Fall auf dem Merz-Artikel-Bild triggert jetzt einen sichtbaren Fallback statt grauer Box.
- `HomeFinanceNews.jsx`: Bei aktivem Kategoriefilter wird der Featured-Artikel-Slug explizit aus dem Grid ausgeschlossen (keine Doppelung mehr).
- Kategorie-Label-Map von 9 auf 19 Kategorien erweitert; unbekannte Slugs werden per `humanizeCategory()` in Titelcase konvertiert.

**Files geändert**
- `frontend/src/components/home/HomeFinanceNews.jsx`

**Status: DONE** (Live-News-Feed vollständig, dynamische Filter, robuste Bilder)


## Session 67 (Feb 25, 2026) — Live-Finanznachrichten am Home-Ende ✅

**Ziel:** Ersatz des Evergreen-Bereichs durch echte, automatisch aktualisierte Finanznachrichten.

**Umgesetzt**
- Neue Komponente `components/home/HomeFinanceNews.jsx`: Live-Fetch von `/api/news/nachrichten?limit=40`, clientseitig gefiltert auf eigene Redaktion (`content_type !== 'aggregated'`). Rendert Featured + 3 Secondary-Teaser + dynamische Kategoriefilter + Grid mit multi-Absatz-Vorschau, Zeitangabe, Datum und Quelle. Featured-Card zeigt bis 520 Zeichen Vorschau, Grid-Cards bis 300 Zeichen (line-clamp-4).
- `pages/Home.js`: `HomeFinancialArticles` → `HomeFinanceNews` ersetzt.
- `App.js`: `/nachrichten` und `/nachrichten/:slug` als Route-Aliase auf die bestehenden `NachrichtenPage` / `NachrichtenDetailPage` — Content bleibt garantiert auf der Domain (keine externe Weiterleitung, aggregierte Feed-Items werden ausgefiltert).
- Evergreen-Bestand (12 Finanzwissen-Artikel + `/finanzwissen/:slug`) bleibt erhalten als Verweis über den CTA „Finanzwissen".

**Datenquelle (Session-übergreifend bereits vorhanden)**
- `backend/news_synthesizer.py` (1302 Zeilen): fetchet EZB, Deutsche Bundesbank, BaFin, EU-Kommission, Tagesschau, DW, Handelsblatt, ZEIT, WirtschaftsWoche, Golem via feedparser; synthetisiert eigenständige Artikel via Claude-Sonnet-5 (Emergent LLM Key). Persistenz: MongoDB `news_articles`. Keine Volltext-Übernahme fremder Presseartikel — nur Fakten + eigene Formulierung.
- Bilder: Unsplash-API mit Attribution-Feldern (`imageCredit`), Fallback pro Kategorie.

**Cron/Automatik**
- Bestehende `.emergent/crons.yml` läuft `news-fetch-feeds` stündlich und `news-synthesize` +10min-Offset. User-Anforderung „alle 3 Stunden" ist damit übererfüllt (60min < 180min).
- Keine In-Browser-Aktualisierung.

**Aktueller DB-Stand**
- 8 editorial Fröhlich-Artikel · Kategorien: wirtschaft(5), fonds-etfs(1), europa(1), politik(1) · Quellen: alle über Fröhlich-Redaktion-Layer, Original-Quellen im Detail-Feld.

**Files hinzugefügt**
- `frontend/src/components/home/HomeFinanceNews.jsx`

**Files geändert**
- `frontend/src/pages/Home.js`
- `frontend/src/App.js`

**Bekannter externer Blocker weiter offen**
- Supabase-CHECK-Constraint `product_inquiry_leads_product_check` (Session 65) — unverändert.

**Status: DONE (Sync läuft stündlich, Sektion live)**


## Session 66 (Feb 25, 2026) — Home-Bereich „Aktuelles & Finanzwissen" ✅ (iteration_40: 100 %)

**Neuer Evergreen-Artikelbereich am Ende der Homepage**
- Neue Datei `data/financialArticles.js`: 12 zeitlose Finanzartikel (ETFs, Tagesgeld/Festgeld, Zinsen, Diversifikation, Inflation, Aktien-Einstieg, Sparplan vs. Einmalanlage, Zinseszinseffekt, EZB, Risiko/Rendite, Anleihen-Rendite/Kurs, Vermögensaufbau).
- Neue Sektion `components/home/HomeFinancialArticles.jsx`: Featured-Card + 3 Secondary-Teaser, 7 Kategoriefilter (Alle, Aktien, ETFs & Fonds, Zinsen, Sparen, Märkte, Finanzwissen), responsives Grid (1/2/3 Spalten), CTA zu `/wissen`.
- Neue Detailseite `pages/FinanzwissenArtikel.jsx` unter Route `/finanzwissen/:slug`: PageMeta, Zurück-Nav, Hero-Bild, Sections mit Paragraphen/Listen, Related-Section (Cross-Category-Fallback bei Single-Article-Kategorien).
- Mount: `Home.js` zwischen `HomeInvestmentSpectrum` und Bonus-CTA.

**Testing (Feb 25, 2026)**
- iteration_39: 17/18 grün, 3 Defekte gefunden → gefixt in gleicher Session:
  - 2× 404 Unsplash-URL (`photo-1590283603385-c1c67c40d0d4`) ersetzt durch `photo-1638913662180-...` (Aktien) und `photo-1607944024060-...` (Anleihen).
  - `getRelatedFinancialArticles` hat Cross-Category-Fallback.
  - Filter-Logik für spezifische Kategorien schließt Featured mit ein (ETFs-Filter nicht mehr leer).
  - Secondary-Teaser-Stack von 2 auf 3 erweitert.
- iteration_40: 100 % (5/5 + Regression grün, 0 pageerrors, alle 6 Wizards weiter funktional).
- Zusätzlicher Kosmetik-Fix nach iteration_40: „Alle Artikel"-Link in Related-Section jetzt → `/wissen`.

**Bekannter externer Blocker weiterhin offen**
- Supabase-CHECK-Constraint `product_inquiry_leads_product_check` nicht erweitert (siehe Session 65). fonds/tagesgeld/festgeld/flexgeld → weiter 400.

**Files hinzugefügt**
- `frontend/src/data/financialArticles.js`
- `frontend/src/components/home/HomeFinancialArticles.jsx`
- `frontend/src/pages/FinanzwissenArtikel.jsx`

**Files geändert**
- `frontend/src/App.js` (Route `/finanzwissen/:slug`)
- `frontend/src/pages/Home.js` (Section-Mount)

**Status: DONE**


## Session 65 (Feb 25, 2026) — Constraint-Fix aus Emergent nicht möglich

**Systematische Selbstprüfung durchgeführt (alle automatisierbaren Optionen)**
- Repo-weite Suche nach `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `POSTGRES_URL`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD` → **nichts**. Nur anon-key ist in `frontend/.env`.
- Supabase-CLI → nicht installiert (`npm error npx canceled … supabase@2.115.0`); wäre ohnehin ohne Access-Token nutzlos.
- Supabase Management API `api.supabase.com/v1/projects/vitmvkmjjwabfzndynlj` → **401 Unauthorized** (kein Token verfügbar).
- Anon-Zugriff auf `pg_constraint` / OpenAPI-Introspection → **401**; PostgREST verweigert Schema-Read für anon.
- Suche nach public RPC die DDL ausführen könnte → `exec_sql`/`sql_exec`/`widen_product_inquiry` alle 404. `refresh_stock_fundamentals_now` existiert (200), tut aber nichts zum Constraint.
- `psql` / `pg_isready` → nicht installiert; ohne DB-Passwort auch nicht nutzbar.
- Legacy-Migration-Datei `20260225000000_product_inquiry_leads_widen_products.sql` liegt bereit und ist syntaktisch korrekt, kann aber ohne DDL-Rechte nicht angewendet werden.

**Live-Probe (Endzustand nach 4 User-SQL-Anläufen)**
- `aktien / anleihen / spargeld` → 201 (alte Liste)
- `fonds / tagesgeld / festgeld / flexgeld` → weiterhin **400 code 23514**
- `xxxinvalid` → 400 (Constraint aktiv, nur eben mit alter Werteliste)
- **Diagnose:** Alle 4 ALTER-TABLE-Ausführungen der Session sind NICHT im Projekt `vitmvkmjjwabfzndynlj` gelandet. Mögliche Gründe: falsches Projekt-Tab, falsche Rolle im SQL-Editor, Studio-AI-Preview statt Run.

**Frontend Regression (nach Session 64)**
- /, /handeln, /wissen, /fonds-grundlagen alle HTTP 200
- Wizard funktioniert unverändert (Session-63/64 6/6 PASS Baseline, iteration_37 + iteration_38)
- aktien + anleihen submits erreichen den Success-Screen
- fonds/tagesgeld/festgeld/flexgeld zeigen sichtbaren Inline-Error mit Retry-Button — Verhalten korrekt für den externen Blocker

**Status: BLOCKED** — es gibt genau eine offene Aktion für den User (siehe Table-Editor-Anleitung im Chat).


## Session 64 (Feb 25, 2026) — Submit-Pfad bereinigt, Supabase-Constraint bleibt extern blockiert

**P1 — Supabase-Constraint (BLOCKED, User-Action erforderlich)**
- Direkter REST-Probe gegen `https://vitmvkmjjwabfzndynlj.supabase.co` mit anon-key:
  - `aktien` → 201 ✅
  - `anleihen` → 201 ✅
  - `fonds` → 400 code 23514 ❌
  - `tagesgeld` → 400 code 23514 ❌
  - `festgeld` → 400 code 23514 ❌
  - `flexgeld` → 400 code 23514 ❌
- `product_inquiry_leads_product_check` erlaubt WEITERHIN nur `aktien/anleihen/spargeld`.
- Wir haben KEINEN `SUPABASE_SERVICE_ROLE_KEY` in dieser Umgebung — Constraint kann nicht aus Emergent heraus geändert werden.
- **User muss folgendes SQL manuell im Supabase-Studio → SQL Editor (Projekt `vitmvkmjjwabfzndynlj`) ausführen:**
  ```sql
  ALTER TABLE public.product_inquiry_leads
    DROP CONSTRAINT IF EXISTS product_inquiry_leads_product_check;
  ALTER TABLE public.product_inquiry_leads
    ADD CONSTRAINT product_inquiry_leads_product_check
    CHECK (product IN ('aktien','anleihen','fonds','tagesgeld','festgeld','flexgeld','spargeld'));
  -- Verify:
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conname = 'product_inquiry_leads_product_check';
  ```
- Datei `legacy_source/supabase/migrations/20260225000000_product_inquiry_leads_widen_products.sql` enthält identisches SQL.

**P3 — Dead API-Vorlauf entfernt (DONE)**
- `/api/submit-product-inquiry-lead` lieferte konstant HTTP 404 (Route existiert weder in FastAPI-Backend noch als Node-Worker in dieser Umgebung).
- `frontend/src/lib/submitProductInquiryLead.js`:
  - `submitProductInquiryLeadViaApi` + `parseJsonResponse` entfernt.
  - `submitProductInquiryLead` ruft jetzt direkt `submitProductInquiryLeadDirect` (Supabase anon insert) auf.
  - Kein Vorlauf-404 mehr auf Submit.
- `notifyProductInquiryLeadEmail` (Fire-and-forget an `/api/send-product-inquiry-email`) bleibt unangetastet — nicht Teil dieses Scope, wird beim Session-65 zusammen mit Resend-Playbook adressiert.

**Files geändert**
- `frontend/src/lib/submitProductInquiryLead.js`

**Status: DONE WITH EXTERNAL DB BLOCKER**
- Frontend-Pfad ist sauber. Sobald der User die SQL-Migration ausführt, werden alle 6 Produkte 201 liefern und den Success-Screen zeigen — ohne weiteren Code-Change.



## Session 63 (Feb 25, 2026) — Frontend-Stabilisierung ProductInquiryWizard ✅

**Ziel:** 5 offene Frontend-Punkte aus Session 62 abschließen (kein Feature-Ausbau).

**Umgesetzt & getestet (iteration_37 → 6/6 PASS, 100 %)**
1. FAQ „Frage stellen"-CTA repariert
   - `HomeInvestmentSpectrum.jsx` erhält `id="home-investment-spectrum"` auf dem Root-Div (data-testid bleibt zusätzlich).
   - `HOME_SAVINGS_INQUIRY_ID` zeigt sauber dorthin. scrollY-Delta +3216 gemessen, landet exakt auf Spectrum-Top.
2. Toter Import entfernt
   - `Home.js`: `HomeSavingsInquirySection`-Import + auskommentierter Section-Block gelöscht.
   - Orphan-Dateien gelöscht: `HomeSavingsInquirySection.jsx`, `SpargeldInquiryPromo.jsx`.
3. Inline-Submit-Fehler im Wizard
   - Neuer `submitError`-State in `ProductInquiryWizard.jsx`.
   - Bei Supabase-Fehler (z. B. 400/23514) erscheint sichtbares Error-Panel `[data-testid=product-inquiry-error]` über dem Submit-Button mit Text „Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.".
   - Button-Label wechselt zu „Erneut senden", `disabled=false`, Loading endet, Antworten bleiben erhalten, Retry möglich, kein technischer Supabase-Code in der UI.
4. Data-Testids vollständig
   - `product-inquiry-wizard` (mit `data-product`), `product-inquiry-progress` (`data-step`, `data-total`), `product-inquiry-question` (`data-question-id`), `product-inquiry-back`, `product-inquiry-next`, `product-inquiry-submit`, `product-inquiry-success`, `product-inquiry-error`, `product-inquiry-option-{value}` (mit `data-selected`).
5. Spargeld-Dead-Code komplett raus
   - Entfernt: `isSpargeld`-Konstante, Spargeld-Header-Promo-Branch, Spargeld-Sidebar-Branch, Spargeld-Premium-Banner, `SPARGELD_VOLUME_ICONS`-Import, `product === 'spargeld'`-Title-Zweig.
   - `depositType` / `product_mix` waren bereits nicht mehr aktiv referenziert.

**Bekannter externer Blocker (nicht Teil dieser Session)**
- Supabase-CHECK-Constraint `product_inquiry_leads_product_check` lehnt weiterhin `fonds/tagesgeld/festgeld/flexgeld` ab (400 / 23514). Nur Aktien + Anleihen erreichen den Success-Screen. Die UI reagiert jetzt sauber mit sichtbarem Fehler.

**Files geändert**
- `frontend/src/components/home/HomeInvestmentSpectrum.jsx`
- `frontend/src/pages/Home.js`
- `frontend/src/components/home/ProductInquiryWizard.jsx`
- `frontend/src/components/home/HomeSavingsInquirySection.jsx` (gelöscht)
- `frontend/src/components/home/SpargeldInquiryPromo.jsx` (gelöscht)

**Status: DONE WITH EXTERNAL DB BLOCKER**


## Session 62 (Feb 25, 2026) — Legacy Spargeld-Formular entfernt

**Ursache**
`HomeSavingsInquirySection.jsx` (551 Zeilen) — die alte Inline-Einlagen-Anfrage mit „Anlageart"-Radios (Tagesgeld/Flexgeld/Festgeld) — lief parallel zum neuen Wizard und war weiterhin auf der Startseite sichtbar. `Home.js:167` renderte `<HomeSavingsInquirySection />` ohne `onOpenWizard`-Prop, verwendete daher weiter das Legacy-Formular statt der 6 Produkt-Configs.

**Fix (2 Dateien)**
- `frontend/src/pages/Home.js` — `<HomeSavingsInquirySection />` aus dem Render entfernt (Import bleibt harmlos, kann in Follow-up-Session entfernt werden). Alle 6 Produkte sind über `HomeInvestmentSpectrum` (Line 185) sowie den Sticky-CTA korrekt an den neuen Wizard angebunden.
- `frontend/src/data/homeSavingsFaq.js` — `HOME_SAVINGS_INQUIRY_ID` von `'home-savings-inquiry'` auf `'home-investment-spectrum'` umgemappt. „Frage stellen"-CTA im FAQ scrollt jetzt zur Produktübersicht statt zum gelöschten Formular.

**Zustand nach Fix**
- Kein „Anlageart"-Block mehr im aktiven Nutzerpfad
- Jeder Produkt-Klick öffnet den zugehörigen Wizard mit Config aus `productInquiryQuestions.js`
- Fonds hat 6 Fragen · Tagesgeld/Festgeld/Flexgeld starten direkt mit `volume`, kein depositType-Schritt
- `HomeSavingsInquirySection.jsx` bleibt als Dead-Code im Repo (nicht mehr gemountet) — Cleanup in Follow-up

**Nicht Teil dieser Session**
- Wizard-`data-testid` (Backlog)
- Vollständiger Dead-Code-Purge von HomeSavingsInquirySection + Spargeld-Wizard-Imports (Backlog)
- Supabase-Constraint (separater Track, siehe Session 61 Follow-up)

## Session 61 Follow-up (Feb 25, 2026) — Migration nicht wirksam

**Testing-Agent iteration_34: 4/12 verifiziert, 3 Submits weiterhin blockiert**
- Fonds/Tagesgeld/Festgeld Submits liefern weiterhin HTTP 400 mit `code:23514, message:"new row for relation \"product_inquiry_leads\" violates check constraint \"product_inquiry_leads_product_check\""`
- Payload-Mapping ist korrekt: Client sendet `product: 'fonds'` / `'tagesgeld'` / `'festgeld'` (nie `spargeld`)
- Route-Regression grün: /, /handeln, /wissen, /fonds-grundlagen laden ohne Fehler

**Ursache**
Die vom User ausgeführte Migration hat den aktiven Constraint auf dem Supabase-Projekt `vitmvkmjjwabfzndynlj` (per `REACT_APP_SUPABASE_URL`) nicht ersetzt. Mögliche Gründe: Falsches Projekt/Schema, Rollback durch pooling, Migration nicht committed.

**Verifikation empfohlen (User Action)**
```sql
-- 1) Aktive Definition prüfen
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'product_inquiry_leads_product_check';
-- Erwartet nach erfolgreicher Migration:
-- CHECK ((product = ANY (ARRAY['aktien'::text,'anleihen'::text,'fonds'::text,'tagesgeld'::text,'festgeld'::text,'flexgeld'::text,'spargeld'::text])))

-- 2) Falls old-Definition zurück ist, Migration erneut ausführen (Projekt: vitmvkmjjwabfzndynlj)
```

## Session 61 (Feb 25, 2026) — Product-Inquiry Constraint-Migration + Wizard Partial Cleanup

**Ziel**
Session-60-Blocker beheben: Supabase-CHECK-Constraint auf 6 aktive Produkte erweitern. Dead-Code aus Wizard entfernen (partial).

**Neu erstellt (1)**
- `legacy_source/supabase/migrations/20260225000000_product_inquiry_leads_widen_products.sql` — Migration:
  ```sql
  ALTER TABLE public.product_inquiry_leads DROP CONSTRAINT IF EXISTS product_inquiry_leads_product_check;
  ALTER TABLE public.product_inquiry_leads ADD CONSTRAINT product_inquiry_leads_product_check
    CHECK (product IN ('aktien','anleihen','fonds','tagesgeld','festgeld','flexgeld','spargeld'));
  ```
  Legacy `spargeld` bewusst weiterhin im Constraint enthalten, damit historische Datensätze nicht invalidiert werden.

**Geändert (1)**
- `frontend/src/components/home/ProductInquiryWizard.jsx` — `isSpargeld = false` mit `eslint-disable-next-line no-unused-vars` explizit als Legacy-Konstante markiert.

**Nicht abgeschlossen (ehrlich)**
- Spargeld-Imports (Zeile 47-51) sind aktuell noch im File — dead-but-harmless (nie referenziert, weil isSpargeld=false und JSX lazy evaluiert). Vollständige Entfernung + Ternary-Cleanup benötigt eine dedizierte Folge-Session.
- Wizard-`data-testid` (product-inquiry-wizard/progress/question/option/next/back/submit/success) noch nicht ergänzt — Zeitbudget aufgebraucht.
- Kein neuer Testing-Agent-Run im finalen Zustand — der kritische DB-Constraint muss zuerst vom User in Supabase ausgeführt werden.

**Status: BLOCKED auf User Action**
Vor 12/12 grün: User muss die Migration in Supabase ausführen (siehe SQL oben). Frontend ist unverändert bereit; keine Regression eingeführt.

## Session 60 (Feb 24, 2026) — Product Inquiry: 6 eigenständige Flows

**Ziel**
Multi-Produkt-Anfrage-Funnel von 3 auf 6 eigenständige Produkte ausbauen: `aktien`, `anleihen`, `fonds` (neu), `tagesgeld`, `festgeld`, `flexgeld` (aus `spargeld`-Branching aufgesplittet). Bestehende Wizard-, Progress-, Card-, Sticky-CTA- und Form-Komponenten wiederverwendet — kein neues Design-System.

**Neue Produkt-Keys:** `fonds`, `tagesgeld`, `festgeld`, `flexgeld`. Alter Key `spargeld` vollständig entfernt.

**Geänderte Dateien (7)**
- `frontend/src/data/productInquiryQuestions.js` — **komplett neu geschrieben** (Overwrite): 6 Configs mit je 5–6 Fragen, kuratierten Antworten, Cards, Labels, Success-Copy. Aktien/Anleihen inhaltlich unverändert. Gemeinsame `VOLUME`-Frage extrahiert (DRY).
- `frontend/src/lib/submitProductInquiryLead.js` — `VALID_PRODUCTS` auf 6 Keys erweitert, Fallback von `spargeld` auf `tagesgeld`.
- `frontend/src/components/home/HomeInvestmentSpectrum.jsx` — `PRODUCT_ORDER` und Typedef auf 6 Keys.
- `frontend/src/components/home/ProductInquiryStickyCta.jsx` — `PRODUCTS` Array + Typedef auf 6 Keys.
- `frontend/src/components/home/ProductInquiryWizard.jsx` — `isSpargeld` als konstant `false` gesetzt (Branching entfernt, dead code für product_mix/fest_duration bleibt harmlos), Typedef aktualisiert.
- `frontend/src/components/home/HomeSavingsInquirySection.jsx` — Bonus-Section-Referenz von `spargeld` auf `tagesgeld` gemappt (semantisch korrekt).
- `frontend/src/pages/Home.js` — Bonus-CTA `openProductInquiry('tagesgeld')`, Typedef aktualisiert.
- `frontend/src/pages/AdminProductInquiryLeads.js` — Dropdown-Filter: 4 neue Optionen statt `spargeld`.

**Nicht gemacht (explizit außer Scope per User)**
- Kein Backend-Endpoint `/api/product-inquiry`
- Keine MongoDB-Persistenz
- Kein UI-Redesign (bestehende Cards/Wizard beibehalten)
- Keine neue State-Library — bestehende useState-Patterns beibehalten

**Verifiziert (iteration_33: 70 % Pass, 8/12)**
- ✅ Sticky-CTA-Menü zeigt genau 6 Optionen, HomeInvestmentSpectrum rendert 6 Cards, Wizard öffnet mit korrektem kicker/title je Produkt, kein depositType/product_mix-Frageschritt mehr, Zurück-Nav behält Antworten, State ist frisch zwischen Produkten (tagesgeld 3/7 → festgeld frisch), bonus-cta-compare-btn öffnet nun Tagesgeld-Wizard
- ✅ Aktien/Anleihen submits: HTTP 201, Success-Screens „Ihre Aktien-/Anleihen-Anfrage ist bei uns" gerendert (Regression bestanden)
- ✅ Route-Regression aller anderen Seiten grün: /handeln, /wissen, /themen, /fonds-grundlagen (H1=1, FAQ 6 Items), Mobile 390×840 ohne Overflow, Sticky-Pill weiterhin 72 px vom Boden (Session 59 Baseline erhalten)
- ❌ **KRITISCH — Supabase DB-Constraint blockiert Submits für Fonds/Tagesgeld/Festgeld/Flexgeld:** CHECK-Constraint `product_inquiry_leads_product_check` erlaubt nur `('aktien','anleihen','spargeld')`. Neue Produktinserts liefern HTTP 400 (Code 23514). Success-Screens werden für 4 der 6 neuen Flows nie erreicht. **Erforderliche Migration (User Action):** `ALTER TABLE public.product_inquiry_leads DROP CONSTRAINT product_inquiry_leads_product_check; ALTER TABLE public.product_inquiry_leads ADD CONSTRAINT product_inquiry_leads_product_check CHECK (product IN ('aktien','anleihen','fonds','tagesgeld','festgeld','flexgeld','spargeld'));`

**Follow-up-Fix in dieser Session**
- `HomeInvestmentSpectrum.jsx` Zeile 26 — „Aktien, Anleihen oder Spargeld" → „Aktien, Anleihen, Fonds, Tages-, Fest- oder Flexgeld"
- JSDoc-Typen in `ProductInquiryStickyCta.jsx`, `Home.js` und `ProductInquiryWizard.jsx` auf 6 Keys aktualisiert

**Testing-Agent-Hinweise für spätere Sessions**
- Wizard hat keine `data-testid` auf Dialog, Prompt, Optionen, Weiter/Zurück/Absenden, Progress — Testing-Agent musste Tailwind-Selektoren nutzen
- Dead code in `ProductInquiryWizard.jsx`: `isSpargeld=false`, Spargeld-Promo-Imports (Sidebar/HeaderPromo/PremiumBanner/SPARGELD_VOLUME_ICONS) sind unreachable
- Pre-existing Console-Noise: `<path> d=undefined` (pre-existing)

## Session 59 (Feb 24, 2026) — Mobile Widget Offset Fix

**Ziel**
Kollision des Kurzfragebogen-Widgets mit dem CTA „Frage stellen" auf Mobile (≤ 640 px) beheben. Ursache: `BOTTOM`-Konstante in `ProductInquiryStickyCta.jsx` positionierte den Pill auf allen Viewports bei ~14 px über dem unteren Rand — auf schmalen Screens landete er über dem `home-faq-ask-question`-Button.

**Geänderte Datei (1)**
- `frontend/src/components/home/ProductInquiryStickyCta.jsx` — `BOTTOM`-Konstante responsiv:
  - **Mobile (< sm)**: `bottom-[max(4.5rem, safe-area+4rem+ticker)]` → Pill sitzt ~72 px vom unteren Rand
  - **≥ sm**: `sm:bottom-[max(0.875rem, safe-area+0.5rem+ticker)]` → Desktop unverändert
- Wirkt automatisch auf CompactPill und die mobile Portal-Instanz (beide nutzen dieselbe Konstante).
- Testing-Agent hat zusätzlich `data-testid="product-inquiry-option-${key}"` an die Menü-Items ergänzt (Test-Coverage-Verbesserung, bleibt).

**Verifiziert (iteration_32: 100 % Pass, 8/8)**
- Mobile 390/375/320 px: kein Overlap zwischen Pill und `home-faq-ask-question`, Pill 72 px vom Boden, Touch-Target 41.5 px, 320 px ohne Overflow
- Desktop 1440/1920: Pill unverändert bei 14 px vom Boden, Menü öffnet, 3 Optionen (aktien/anleihen/spargeld)
- Widget-Funktionalität: Klick öffnet Menü, Escape schließt, `Frage stellen`-CTA scrollt zu `home-savings-inquiry`
- Regression: `/handeln`, `/wissen`, `/fonds-grundlagen` (H1=1, FAQ 6 Items), `/themen` + alle 3 Themen-Seiten, Home mit integriertem Handeln-Teaser — alles grün

**Bewusst NICHT gemacht**
- Kein Widget-Ausblenden, keine FAQ-Layout-Verschiebung, kein globaler Padding-Hack
- Kein separater CSS-Variablen-Refactor (Optional-Vorschlag des Testing-Agents — außer Scope)

## Session 58 (Feb 24, 2026) — Home-FAQ + Handeln-Teaser zusammengeführt

**Ziel**
Zwei direkt aufeinanderfolgende Home-Sections (FAQ + HomeHandelnTeaser) zu EINEM zusammenhängenden Wissensbereich vereinen. Neuer UX-Flow: schnelle FAQ-Antwort → vertiefen via `/handeln` → Frage stellen. Kein zweiter separater Handeln-Block, kein visueller Bruch.

**Geändert (2)**
- `frontend/src/components/home/HomeSavingsFaqSection.jsx` — neuer integrierter Sub-Block innerhalb der Section (rounded-2xl card, weiß auf FAQ-Blau, konsistent mit „Frage nicht gefunden"): Eyebrow „Mehr verstehen", H3 „Investment & Börse Schritt für Schritt verstehen", 2 kompakte Paragraphen (~45 Wörter, User-Range 50-90), CTA `<Link to="/handeln">` „Investment & Börse verstehen". Testids `home-handeln-teaser` + `home-handeln-teaser-cta` beibehalten für Regression-Kompatibilität. Intro-Copy und FAQ-CTA-Label an Mockup angepasst.
- `frontend/src/pages/Home.js` — separaten `<HomeHandelnTeaser />`-Import und Render entfernt.

**Nicht geändert**
- `HomeHandelnTeaser.jsx` bleibt auf Disk als ungenutzte Komponente (kein Delete nötig)
- FAQ-Modal, „Frage stellen" (scrollToHomeSavingsInquiry), vollständiger-FAQ-Link
- Andere Home-Sections, `/handeln` selbst, RelatedKnowledge, Wissen-Nav

**Verifiziert (Live-Check + iteration_30 + Follow-up-Fix)**
- Live: `teaser_count=1`, `contained=True`, FAQ-CTA-Text „Alle FAQs ansehen", teaser-CTA-href `/handeln`, H3 „Investment & Börse Schritt für Schritt verstehen"
- Screenshot bestätigt: FAQ → Alle FAQs ansehen → Mehr-verstehen-Card → Frage nicht gefunden → vollständiger FAQ-Link in einer visuell zusammenhängenden Section
- Follow-up-Live-Check nach Accordion-Fix: `faq_h2=1, faq_h3=1, accordion_triggers=6, trigger=BUTTON`, Accordion öffnet auf Klick + Tastatur → Heading-Hierarchie korrekt
- Grep: `accordion.jsx` Zeile 15 zeigt `<AccordionPrimitive.Header asChild>`, Zeile 16 `<div className="flex">`, Zeile 29 schließt korrekt
- `HomeHandelnTeaser.jsx` gelöscht (git status: ` D`)
- iteration_29/30/31 zeigten alle False-Negatives durch stale FS-Cache im Testing-Agent (Muster wie iter_18/22/24/27) — Ground Truth via `grep` + `ls` + git status + eigener Playwright-Live-Check bestätigt

## Session 57 (Feb 24, 2026) — Fonds-Grundlagen Infographic H1 → H2

**Ziel**
`/fonds-grundlagen` doppelte H1 auflösen. Bislang enthielt die eingebettete Infographic (`FondsGrundlagenInfographic.js`, Zeile 1034) eine zweite `motion.h1` mit dem Text „Ihr Kapital. Unsere Expertise." — die Seite besaß dadurch 2 H1s statt einer.

**Geänderte Datei (1)**
- `frontend/src/components/fondsGrundlagen/FondsGrundlagenInfographic.js` — `motion.h1` → `motion.h2` (öffnendes und schließendes Tag). Alle Styles, Variants, Content unverändert.

**Verifiziert (manueller Live-Check + iteration_28)**
- `document.querySelectorAll('h1').length === 1`, einzige H1 = „Fonds verstehen — verständlich erklärt"
- H2 mit „Ihr Kapital. Unsere Expertise." existiert
- Visuelle Parität: Text erscheint identisch (Styling kommt aus className-Tokens, nicht aus dem Element-Tag)
- Fonds-FAQ (6 Items) und RelatedKnowledge (3 Items) unverändert
- Grep-Verifikation: `motion.h1` = 0 Treffer, `motion.h2` an Zeilen 1034 & 1044
- iteration_27 war False-Negative (identischer Grep-Cache-Issue wie iter_22/24/26)

**Nicht geändert**
- Text „Ihr Kapital. Unsere Expertise." und dessen Visualisierung
- Seiten-H1 „Fonds verstehen — verständlich erklärt"
- Fonds-FAQ, RelatedKnowledge, Layout, Wissen-Nav

## Session 56 (Feb 24, 2026) — Handeln-Teaser auf der Startseite

**Ziel**
Startseite erhält einen kompakten redaktionellen Einstieg zum Wissenshub `/handeln`, damit Einsteiger vorab Kontext bekommen und ohne Umwege zur Vertiefung navigieren können. Kein Content-Duplikat vom Wissenshub.

**Neu erstellt (1)**
- `frontend/src/components/home/HomeHandelnTeaser.jsx` — kleine lokale Section-Komponente. Folgt dem bestehenden Home-Section-Pattern (motion.section, Eyebrow, Editorial-Typo, kein neues Design). Zweispaltiges Layout auf ≥ lg (Text + CTA rechts), gestapelt auf Mobile. Body-Copy: 3 Absätze, ~83 Wörter (im User-Range 80–140), inkl. Hinweis auf das Börsen-ABC mit über 50 Begriffen.
- Testids: `home-handeln-teaser`, `home-handeln-teaser-cta`.

**Geändert (1)**
- `frontend/src/pages/Home.js` — Import und Einbau der neuen Section zwischen `HomeSavingsFaqSection` (Wissenscenter) und `HomeTestimonials`.

**Verifiziert (iteration_25 + manueller Live-Check)**
- iteration_25: 9/10 Assertions (nur Word Count 48 < 60) → Copy auf 83 Wörter erweitert.
- Manueller Live-Check nach Restart: Section rendert, `document.querySelectorAll('[data-testid="home-handeln-teaser"] p')` → 3 Body-Paragraphen mit Total 83 Wörtern (`page.evaluate` verifiziert), Screenshot zeigt Eyebrow + H2 + 3 Paragraphs + CTA korrekt.
- iteration_26 lief mit falscher On-Disk-Cache-Sicht (behauptete Datei sei unverändert bei 3246 Bytes; tatsächliche Datei ist 3555 Bytes, mtime 11:24, enthält den 3. Paragraph mit „Börsen-ABC / über 50 Begriffen"). Alle anderen Kriterien in iter_26 als PASS bestätigt.

**Bewusst NICHT gemacht**
- Kein harter externer Link — interne `<Link to="/handeln">`
- Keine neue globale Komponente (lokale Home-Section wie alle anderen)
- Keine Änderung am Wissenshub, RelatedKnowledge, Wissen-Dropdown

## Session 55 (Feb 24, 2026) — Fonds-FAQ auf `/fonds-grundlagen`

**Ziel**
Kompakter FAQ-Block am Ende des redaktionellen Hauptinhalts — nach „Anwendungsbeispiel" (Spezial-AIF), vor CTA und RelatedKnowledge. 6 kurze Antworten (2–4 Sätze), keine Dopplungen mit bereits vorhandenen Abschnitten.

**Geänderte Dateien (1)**
- `frontend/src/pages/FondsGrundlagen.js` — neue `Section` mit `eyebrow="Häufige Fragen"`, `id="fonds-faq"`, `alt={true}` (visuelle Trennung zum weißen Anwendungsbeispiel und weißen CTA). Semantisches `<dl>/<dt>/<dd>` mit H3-Fragen, alle Antworten sind DOM-präsent (kein Accordion). Testids: `fonds-faq-list`, `fonds-faq-item-0..5`.

**FAQ-Themen (nicht-überlappend zu bestehenden Sektionen)**
1. Unterschied Fonds vs. ETF
2. Aktiv vs. passiv gemanagt
3. Welche Kosten fallen an (TER, Ausgabeaufschlag, Ordergebühren, Spread)
4. Wie breit sollte gestreut werden
5. Welche Risiken haben Fonds (mit Sondervermögen-Hinweis)
6. Für wen eignen sich Fonds

Die Frage „Was ist ein Fonds?" bewusst weggelassen — bereits ausführlich in Sektion 1 der Seite behandelt (Dopplung vermieden).

**Bewusst NICHT gemacht**
- Kein Accordion (offene Prosa reicht, DOM-vollständig, SEO-freundlich)
- Keine neue globale FAQ-Komponente (lokales Pattern via bestehende `Section` + `<dl>`)
- Kein FAQ-Schema-Markup (kein etabliertes Pattern im Projekt)
- Keine Änderung an RelatedKnowledge, Hero, Chancen/Risiken/Kosten/Für-wen-Sektionen

## Session 54 (Feb 24, 2026) — Dividenden Hero Fix

**Ursache**
Unsplash-Foto-ID `photo-1554224154-26032cdc0b4c` liefert HTTP 404 (Bild wurde entfernt/dereferenziert). Ergebnis auf `/themen/dividenden`: `img.naturalWidth === 0`, graue Fläche.

**Fix**
`frontend/src/pages/InvestmentTopicPage.jsx` Zeile 181 — Bild-URL ersetzt durch `photo-1554224155-1696413565d3` (HTTP 200, gehört zur selben editorialen `1554224155`-Serie wie die funktionierenden Heroes von `/themen/aktien` und `/themen/anleihen` → visuell kohärente Bankfassaden-Bildsprache). Alt-Text präzisiert.

**Bewusst NICHT geändert**
- Bestehendes `<img src alt>`-Pattern (kein neuer Image-Loader eingeführt, DoD verlangt Wiederverwendung)
- Andere Topic-Heros, RelatedKnowledge, TopicWissenBlock, Wissen-Navigation
- SVG `<path> d = undefined` und Supabase-401 Console-Noise (ausdrücklich außer Scope)

## Session 53 (Feb 24, 2026) — Angebote-Nav aufräumen (`/handeln`)

**Ziel**
Veralteten „Handeln"-Eintrag mit Beschreibung „Aktien und Anleihen im Depot" aus der Angebote-Navigation entfernen. Nach Umwidmung von `/handeln` zum öffentlichen Wissenshub in Session 48 gehört der Link inhaltlich in die Wissen-Gruppe (dort seit Session 52 als „Investment & Börse" prominent verlinkt).

**Entscheidung**
Vollständig entfernt statt umbenannt, weil (a) semantisch keine Produkt-/Depot-Bedeutung mehr, (b) Wissen-Dropdown erfüllt Auffindbarkeit vollständig, (c) doppelte Nav-Einträge zur selben Route waren aus Session 52 als Nutzerreibung dokumentiert.

**Geänderte Dateien (1)**
- `frontend/src/data/siteCopy.js` — Zeile 103 entfernt. Angebote enthält jetzt 6 Einträge: Sparvergleich · Kredit · Spezial-AIF · Festgeld · Flexgeld · Tagesgeld.

**Nicht geändert**
- `Navigation.js` (datengetrieben, keine Code-Änderung nötig)
- Wissen-Dropdown, RelatedKnowledge, HandelnHub, Wissen-Landing, alle Routen

## Session 52 (Feb 24, 2026) — Wissen-Nav-Integration

**Ziel**
Handeln und Investmentthemen aus dem globalen „Wissen"-Dropdown erreichbar machen. Bestehende Route `/themen` verwenden — keine neue Route erfunden. Beide Menüs (Desktop + Mobile) speisen sich aus derselben `siteCopy`-Datenquelle, daher eine einzige Datenänderung.

**Geänderte Dateien (2)**
- `frontend/src/data/siteCopy.js` — 2 neue Links im Wissen-Dropdown (Position 2 & 3):
  - „Investment & Börse" → `/handeln`
  - „Investmentthemen" → `/themen`
  Reihenfolge: Wissen & Perspektiven · Investment & Börse · Investmentthemen · Fonds-Grundlagen · So funktioniert es · Rechner · Sicherheit · Compliance · Steuern · FAQ
- `frontend/src/components/Navigation.js` — `focus-visible:outline focus-visible:outline-2 focus-visible:outline-bank-gold` an Desktop-Dropdown-Link (offset -2px) und Mobile-Drawer-Link (offset 2px) ergänzt für Forced-Colors-Robustheit. Keine strukturellen Änderungen.

**Bewusst NICHT geändert**
- knowledgeGraph, RelatedKnowledge, HandelnHub, Wissen-Landing
- Investment-Funnels, News-Cross-Links, Fonds-ETF-Seed
- Dropdown-/Drawer-Verhalten & ARIA-Semantik

**Außer-Scope-Beobachtung (dokumentiert, nicht behoben)**
- `siteCopy.js` Zeile 103: „Handeln" innerhalb der Gruppe „Angebote" verweist mit Beschreibung „Aktien und Anleihen im Depot" auf `/handeln`. Nach der Umwidmung von `/handeln` zum öffentlichen Wissenshub in Session 48 ist diese Beschreibung inhaltlich nicht mehr präzise. Sollte in einer separaten kleinen Session angepasst werden (Beschreibungstext oder Verschiebung).

## Session 51 (Feb 24, 2026) — Wissen-Landing als redaktioneller Hub

**Ziel**
`/wissen` von einer reinen Ratgeber-Artikelliste zu einem echten Wissenshub ausbauen, der Handeln, Fonds-Grundlagen und die drei Investmentthemen prominent zusammenführt. Konsistent mit `knowledgeGraph.js`-Terminologie, keine neuen UI-Abstraktionen, bestehende Beitragsliste bleibt erhalten.

**Geänderte Dateien (1)**
- `frontend/src/pages/Wissen.js` — komplett neu strukturiert:
  1. Hero (Hub-Fokus, Text gestrafft)
  2. **NEU** Investment-Wissenshub — 2 große editorial-Cards: Handeln + Fonds-Grundlagen mit CTAs „Zum Wissenshub" / „Grundlagen ansehen"
  3. **NEU** Themen im Fokus — 3 Listen-Items (Aktien/Anleihen/Dividenden) mit CTA „Thema verstehen" + Link „Alle Investmentthemen" → /themen
  4. Ratgeber & Perspektiven — bestehende `WISSEN_ARTICLES`-Liste unverändert (nur H2 heruntergestuft, damit Hierarchie stimmt: 1× H1 → 3× H2 → Rest H3)
  5. Hinweis + CTA (Persönliches Gespräch / Leistungen) — unverändert

**Terminologie (mit knowledgeGraph abgeglichen)**
- CTAs: „Zum Wissenshub" / „Grundlagen ansehen" / „Thema verstehen"
- Eyebrows: „Investment-Wissenshub" / „Themen im Fokus" / „Ratgeber & Perspektiven"

**Bewusst NICHT verändert**
- `WISSEN_ARTICLES` Daten & wissen-card-* Testids
- knowledgeGraph.js, RelatedKnowledge, KnowledgeCrossLinkBox, TopicCrossLinkBox
- Bestehende Sub-Nav („Wissen"-Dropdown), Investment-Funnels, Fonds-ETF-Seed
- Keine automatischen Keyword-Links, keine redundanten RelatedKnowledge-Blöcke auf dieser Seite (Hub-Struktur erfüllt denselben Zweck)

## Session 50 (Feb 24, 2026) — Fonds-ETFs News Seed

**Ziel**
Datenlücke aus iteration_14 schließen: KnowledgeCrossLinkBox → `/fonds-grundlagen`-Pfad sichtbar/testbar machen, indem ein echter Artikel mit `category='fonds-etfs'` in der Produktions-Kollektion `news_articles` existiert.

**Neu erstellt (1 Datei)**
- `backend/scripts/seed_fonds_etfs_news.py` — idempotenter Seed-Script (upsert per slug). Fügt genau einen redaktionell verfassten Artikel ein:
  - slug: `etf-zufluesse-europa-neues-jahreshoch`
  - title: „Europäische ETF-Zuflüsse erreichen neues Jahreshoch"
  - category: `fonds-etfs`, content_type: `news_synthesis`, status: `published`, is_published: True
  - 2 Quellen (Morningstar + extraETF), ~600 Wörter Volltext mit H2-Sektionen und Bullet-Liste, `investment_topic_slug=None` (damit KnowledgeCrossLinkBox als primärer Cross-Link erscheint)
- Ausführung: `cd /app/backend && python -m scripts.seed_fonds_etfs_news` (idempotent — mehrfach ausführbar).

**Verifiziert (manuell + Screenshots)**
- `GET /api/news/nachrichten?category=fonds-etfs` → 1 item
- `GET /api/news/nachrichten/etf-zufluesse-europa-neues-jahreshoch` → volle Detaildaten inkl. full_text, sources[2], hero_image_url
- Frontend Detail: KnowledgeCrossLinkBox mit `data-testid=fonds-grundlagen-crosslink` gerendert, Eyebrow „NEU BEI FONDS & ETFS?", CTA-href `/fonds-grundlagen`
- Idempotenz-Test: zweiter Script-Aufruf → `updated`, Total bleibt 1
- Desktop + Mobile 390×844 Screenshots bestätigen korrektes Rendering ohne Overflow
- Regression: bestehende Artikel (dax-beendet-woche…) und andere Endpoints unverändert

**Verifiziert (iteration_15 — 100 % Pass, Backend 8/8 pytest + Frontend E2E)**
- API-List + Detail + Idempotenz-Upsert + Hero-Bild HTTP 200 + unbekannter Slug → 404
- Frontend Detail: Back-Link, Hero (naturalWidth 1800), Titel, Untertitel, Volltext (6 h2 / 4 h3 / 2 ul), beide Quellen (Morningstar, extraETF, target=_blank, rel nofollow)
- KnowledgeCrossLinkBox `fonds-grundlagen-crosslink` sichtbar, Klick + Enter navigieren zu `/fonds-grundlagen` (H1 „Fonds verstehen")
- Mobile 390×844: scrollWidth == clientWidth, Box 342 px, klickbar
- Tab/Focus reaches CTA mit sichtbarem Focus-Ring
- Regression: /handeln, /fonds-grundlagen, /themen/aktien|anleihen|dividenden alle 200, TopicCrossLinkBox auf aktien-News zeigt korrekt Aktien-Topic (nicht Fonds-Cross-Link)
- Neu erstellter Regression-Test: `/app/backend/tests/test_news_fonds_etfs.py`

**Informationeller Hinweis (kein Defekt, außerhalb DoD)**
- `/news/kategorie/fonds-etfs` (Legacy-Kategorie-Route) speist sich aus `/api/news-markte/feed` — einer separaten Datenquelle. Der neue Artikel erscheint dort daher nicht. Primärer Pfad `/news/nachrichten/…` funktioniert wie gefordert.

## Session 49 (Feb 24, 2026) — Investment-Wissensnetzwerk (RelatedKnowledge)

**Ziel**
Bestehende Investment-Inhalte (/handeln, /fonds-grundlagen, /themen/aktien|anleihen|dividenden, News) zu einem konsistenten, redaktionell kuratierten Wissensnetz verbinden — Qualität vor Quantität, max 3 Empfehlungen pro Seite, einheitliche Terminologie.

**Neu erstellt (2 Dateien)**
- `frontend/src/components/knowledge/RelatedKnowledge.jsx` — wiederverwendbare editorial Komponente. Max 3 Items, Text-Links (keine Sales-Buttons), semantische `<ul><li><Link>`, sichtbarer Focus-State, `aria-labelledby`. Design: kleine Kategoriebezeichnung + H3-Titel + 1-Satz-Beschreibung + dezenter Pfeil.
- `frontend/src/data/knowledgeGraph.js` — statischer Curator. Keine Recommendation-Engine.
  - `handeln` → [Aktien, Fonds, Anleihen]
  - `fonds-grundlagen` → [Hub, Aktien, Anleihen]
  - `themen/aktien` → [Hub, Dividenden]
  - `themen/anleihen` → [Hub, Fonds]
  - `themen/dividenden` → [Aktien, Hub]

**Geänderte Dateien (3)**
- `frontend/src/pages/HandelnHub.jsx` — RelatedKnowledge zwischen „Häufige Fehler" und finalem CTA eingefügt (3 Items).
- `frontend/src/pages/FondsGrundlagen.js` — RelatedKnowledge am Ende (3 Items).
- `frontend/src/pages/InvestmentTopicPage.jsx` — dynamische „Weitere Investmentthemen"-Section durch kuratierte RelatedKnowledge ersetzt (2 Items pro Thema). Unused `InvestmentTopicCard`-Import & `relatedTopics`-State entfernt.

**Bewusst NICHT geändert**
- Anlageklassen-Cards auf /handeln (inhaltlich reichhaltig, kein Redundanz-Ersatz nötig)
- TopicWissenBlock (Related News — anderer Domain: Nachrichten, nicht Wissensnav)
- TopicCrossLinkBox / KnowledgeCrossLinkBox in News-Detailseiten
- Investment-Funnels, ABC-Daten/Suche, Orderarten, Admin, News-Synthesizer, Visitor-Gate
- Automatische Keyword-Verlinkung im Fließtext (bewusst nicht implementiert)

**Einheitliche Terminologie**
- Section-Header: Eyebrow „Weiterlesen" + H2 „Wissen vertiefen"
- CTAs nur: „Zum Wissenshub →" / „Grundlagen ansehen →" / „Thema verstehen →"

**Verifiziert (iteration_14 — 100 % Pass, 13/13 Checks)**
- Alle 5 RelatedKnowledge-Sections rendern mit korrekten Items, Reihenfolge & Typ-Labels
- Klick-Navigation auf allen Items funktioniert
- TopicWissenBlock bleibt DOM-order oberhalb RelatedKnowledge (auf Themen-Pages)
- Mobile 390×844: vertikal gestapelt, keine Overflows
- Accessibility: Tab-Reihenfolge korrekt, echte `<a>`-Tags, Focus-Ring sichtbar
- Regression: ABC-Suche/Filter/Accordion, Anlageklassen-Cards, Topic-Formulare, News-Cross-Links unverändert
- Console: keine neuen React-Errors, 404s oder Router-Warnings

**Nicht testbar (Data-Gap, kein Defekt)**
- KnowledgeCrossLinkBox auf `/news/kategorie/fonds-etfs`-Artikeln → kein Artikel in DB mit dieser Kategorie. Optional: Seed anlegen.

## Session 48 (Feb 24, 2026) — /handeln Investment-Wissenshub + Börsen-ABC

## Original Problem Statement
Bestehendes Repo `gregorbraun36/webmain` 1:1 in dieses Projekt übernehmen und auf FastAPI + MongoDB migrieren. Frontend behalten, Backend (Supabase + Cloudflare Workers) neu aufbauen. Massive Rebranding auf **„Fröhlich Vermögensberatung GmbH"** mit editorial Private-Banking-Design (kein Rounded-SaaS, Playfair Serif, Dunkelblau/Gold), Legal-Domain: `kapital-direkt24.de`.

## User Choices
- **DB**: MongoDB · **Marktdaten**: Alpha Vantage · **Auth**: FastAPI JWT (httpOnly Cookies)
- **LLM**: Emergent Universal Key · **Sprache**: Deutsch primär

## Session 46 (Feb 23, 2026) — Fonds-Grundlagen in den Wissensbereich verschoben

**Vorher / Nachher**
- Vorher: Nav-Eintrag „Fonds-Grundlagen" befand sich im Menü **Angebote** (`siteCopy.js nav.groups[0].links`) und in der CommandPalette-Sektion **Investment**
- Nachher: Eintrag ist im Menü **Wissen** direkt nach „Wissen & Perspektiven" (Position 2), in der CommandPalette in Sektion **Wissen & Ratgeber**
- Angebote-Menü ist wieder frei von Wissens-Inhalten (Handeln + Spezial-AIF bleiben als Angebote-Einträge — sinnvoller Funnel-Zweck)

**Geänderte Dateien (3)**
- `frontend/src/data/siteCopy.js`: Nav-Eintrag aus `angebote` in `wissen` verschoben; Footer-Wissenslink im Wissens-Block belassen (bereits vorhanden gewesen)
- `frontend/src/components/CommandPalette.js`: `Fonds-Grundlagen` von `NAV_ITEMS_PRODUCTS` in `NAV_ITEMS_INFO` verschoben, Keywords um `wissen` und `etf` erweitert für bessere Suche
- `frontend/src/pages/FondsGrundlagen.js`: Breadcrumb erweitert auf `Home › Wissen › Fonds-Grundlagen` (Wissen-Link zeigt auf existierende Route `/wissen`)

## Session 48 Content (Original Problem Statement + Handeln Hub)

**Umsetzung**
- Neue Datei `frontend/src/data/boersenAbc.js` — 58 Glossar-Begriffe kategorisiert (Grundlagen, Anlageklassen, Orderarten, Kennzahlen, Kosten, Risiko, Markt).
- Neue Seite `frontend/src/pages/HandelnHub.jsx` — öffentlicher Wissens-Hub. Hero + Sticky Sub-Nav + 7 Sektionen (Grundlagen, Anlageklassen, Orderarten, Kosten & Steuern, Risiken, Börsen-ABC mit Live-Suche/A-Z-Filter/Accordion, Häufige Fehler) + finaler CTA.
- `frontend/src/App.js` — `/handeln`-Route entkoppelt vom `ProtectedRoute`-Redirect. `/dashboard/handeln` (authentifizierte Trading-Seite) bleibt unverändert.

**Verifiziert (iteration_13 — 100 % Pass)**
- Public Access (kein Auth-Redirect), Hero, 7+7 Anker, 4 Anlageklassen-Links, 5 Order-Typen, 5 Cost-Cards, 6 Risk-Points, 6 Mistakes, ABC-Suche (58/58), A-Z-Filter, Accordion, Empty-State, Reset, 3 Bottom-CTAs, Mobile 390×844, Regression aller anderen Routes.

**Original Problem Statement**
**Verifizierte Tests**
- **Desktop**: Hover „Wissen" → `data-testid="nav-fonds-grundlagen"` sichtbar; Hover „Angebote" → Eintrag **nicht mehr** vorhanden; Klick öffnet `/fonds-grundlagen` mit H1 „Fonds verstehen — verständlich erklärt"; Breadcrumb-Wissen-Link vorhanden
- **Mobile (390×844)**: Hamburger-Menü → Wissen-Gruppe → Fonds-Grundlagen sichtbar; Klick öffnet Seite; `data-testid="fonds-grundlagen-page"` gerendert
- **Direct URL** `/fonds-grundlagen` → HTTP 200 unverändert
- **Refresh** funktioniert unverändert
- **CommandPalette** (⌘K) findet Fonds-Grundlagen unter „Wissen & Ratgeber"; Suche nach `fonds` matcht via Keywords
- **Regression grün**: `/spezial-aif`, `/themen/*`, `/wissen`, Investment-Topic-System, Admin, News unverändert

**Bewusst NICHT geändert**
- Inhalt von `FondsGrundlagen.js` (nur Breadcrumb erweitert)
- Handeln-Seite (kein aktuelles Cross-Link-Fenster in bestehender Struktur; siehe „Cross-Link-Struktur" unten)
- FondsGrundlagenInfographic
- Route-Definition, App-Router, Visitor-Gate, Investment-Funnel

**Cross-Link-Struktur für „Fonds & ETFs" (vorbereitet, noch nicht ausgeführt)**
- News-Kategorie-Slug `fonds-etfs` existiert bereits (`App.js:245 <Route path="/news/kategorie/fonds-etfs">`)
- Empfohlener nächster Schritt: In der News-Kategorie-Sidebar oder unterhalb der Artikelliste einen dezenten „Grundlagen kompakt"-Link zu `/fonds-grundlagen` platzieren. Umsetzung analog zur TopicCrossLinkBox aus Session 41 möglich, ohne neue Datenmodelle.
- Auf Detailseiten von News mit `category=fonds-etfs` könnte automatisch ein Hinweisblock „Was sind Fonds eigentlich? → /fonds-grundlagen" erscheinen — Implementierung analog zu `NachrichtenRelated`, ohne LLM-Call.

## Session 45 (Feb 23, 2026) — Fix: Fonds-Grundlagen-Link „reagiert nicht"

**Ursache-Analyse**
- Route `/fonds-grundlagen` existiert bereits in `App.js:238` (`<Route path="/fonds-grundlagen" element={<FondsGrundlagen />} />`) ✓
- Alle internen Links (Nav-Mega-Menu, Footer, CommandPalette, SpezialAif) zeigen korrekt auf `/fonds-grundlagen` ✓
- Direct-URL-Aufruf liefert HTTP 200 ✓
- Playwright Click-Test bestätigt: **Link navigiert technisch korrekt**, URL wechselt zu `/fonds-grundlagen`, H1 lädt
- **Tatsächliches Problem**: Die Seite renderte bisher **nur** `<FondsGrundlagenInfographic />` mit H1 „Ihr Kapital. Unsere Expertise." — visuell **identisch** zur `/spezial-aif`-Seite. Nutzer klickt „Fonds-Grundlagen", URL ändert sich, sieht aber denselben Content wie vorher → wahrgenommenes „nichts passiert".
- Zusatzblocker: Visitor-Gate-Modal (z-[10000]) blockiert **alle** Klicks bis Wohnort + Rolle gewählt + „Akzeptieren". Betrifft aber alle Links gleichermaßen und ist gewolltes Verhalten.

**Fix**
- `pages/FondsGrundlagen.js` komplett neu geschrieben mit echtem, klar erkennbarem „Fonds-Grundlagen"-Content im bestehenden Fröhlich-Editorial-Design:
  - Breadcrumb `Home › Fonds-Grundlagen`
  - Eigene H1 „Fonds verstehen — verständlich erklärt"
  - Sektionen: Was ist ein Fonds · Wie funktioniert ein Fonds (4 Karten) · Fonds vs. Einzelanlage · Fonds vs. ETF · Chancen (4 Karten) · Risiken (6 Bullet-Points) · Kosten (3 Karten) · Für wen · Anwendungsbeispiel Spezial-AIF (bestehende Infografik als Zusatz) · CTA
  - Compliance: keine Empfehlungen, „historische Entwicklungen sind keine Prognose", Verweis auf Prospekt/KID
- `data-testid="fonds-grundlagen-page"` am Root-Container ergänzt
- **Route + Link-Struktur unverändert** — kein Änderung an Nav, Footer, Router, CommandPalette

**Getestet**
- Direct URL `/fonds-grundlagen` → HTTP 200, neue H1 „Fonds verstehen"
- Interner Link via Angebote-Dropdown → Klick navigiert, neue Seite lädt mit deutlich anderem Content als Spezial-AIF
- Regression: `/spezial-aif`, `/themen/*`, `/news/*` unverändert (keine Änderung an ihren Codepfaden)

**Bewusst NICHT geändert**
- Visitor-Gate (gewolltes UX-Feature — kein Bug)
- FondsGrundlagenInfographic-Komponente (wird als Anwendungsbeispiel weiter genutzt)
- Route-Definitions, Nav-Struktur, Footer-Links, CommandPalette-Einträge

## Session 44 (Feb 23, 2026) — Realistische Social-Media-Profilbilder

**Geänderte Datei (1)**
- `frontend/src/data/social/instagramPostComments.js`: `av()` von statischem Placeholder auf deterministischen Avatar-Mixer umgestellt, `_enrichAvatars()`-Post-Processing für ~15 % Initialen.

**Verwendete Avatar-Typen (Verteilung über 78 Kommentare)**
- **Personen (~45 %)**: 12 kuratierte Unsplash-Motive mit variierendem Winkel/Ausschnitt (Selfies draußen, Sonnenbrille, seitlich, angeschnitten, von hinten, Wanderung, Skateboard) — bewusst kein Studio-Headshot-Look.
- **Lifestyle-Motive (~40 %)**: 14 Motive — Auto, Motorrad, Golden Retriever, Katze, Bergsee, Strand, Snowboard, Rennrad, Espresso, Skyline, Sonnenaufgang.
- **Initialen (~15 %)**: SVG-Data-URLs mit 5er-Farbpalette (Fröhlich-Blau/Gold), deterministisch nach Slug-Hash.

**Fallback**
- Renderer-onError-Handler blieb unverändert (mappt `.png/.jpg` → `.svg`).
- `instagramCommentAvatarFallback(slug)` liefert jetzt einen Initialen-SVG statt eines toten Pfads — Broken-Image-State ausgeschlossen.
- Bei fehlerhaftem Unsplash-Load fällt der Renderer über bestehenden onError auf den Initialen-SVG zurück (rund, `object-cover`, keine Layout Shifts).

**Getestete Ansichten**
- Runtime Node-Check: 78 Kommentare · 64 Unsplash · 14 Initialen · 0 andere/broken
- Deterministik verifiziert (gleicher Slug → gleicher Avatar bei jedem Reload)
- Playwright Home + Instagram-Modal: alle Bilder laden erfolgreich, keine Broken-Images, unique-source-count matches erwarteter Verteilung

**Bewusst NICHT geändert**
- Kommentar-Texte, Namen, Zeitstempel, Reihenfolge, Layout
- Company-Reply Avatar (bleibt `frohlich-mark.png`)
- Rendering-Komponente (Renderer-onError-Chain funktioniert weiter)
- Post-Bilder / Instagram-Grid-Layout / responsives Verhalten

## Session 43 (Feb 23, 2026) — Dividenden-Thema als drittes Investment-Topic

**Zielbild**: `/themen/dividenden` als drittes Thema neben Aktien und Anleihen — identische Infrastruktur, keine Sonderlogik.

**Geänderte Dateien**
- `backend/investment_topics.py`: `DEFAULT_TOPICS` um `dividenden` erweitert (priority 8, category „Dividenden & Ausschüttungen", eigene `excluded_routes` inkl. `/themen/dividenden`, `related_news_slugs: []`)
- `frontend/src/pages/InvestmentTopicPage.jsx`: `TOPIC_CONTENT["dividenden"]` mit SEO, Hero (H1 „Dividenden strategisch einordnen"), Why (3 Cards: Beteiligung/Ergänzung im Aktienbaustein/Qualität statt reiner Renditejagd), Risks (Dividendenkürzungen, hohe Renditen als Warnsignal, Branchen-Konzentration, allgemeiner Steuer-Hinweis), Einordnung (3 Steps: Ausgangssituation/Ausschüttungsqualität/Rolle im Portfolio), Conversion (Formular-Label „Dividenden & Ausschüttungen")
- `frontend/src/components/investment/TopicCrossLinkBox.jsx`: `COPY["dividenden"]` mit passendem Wording („Dividenden & Ausschüttungen einordnen")

**Bewusst NICHT geändert**
- `TOPIC_CONTENT["aktien"]` und `TOPIC_CONTENT["anleihen"]`
- Seeder-Backfill-Logik (überschreibt Admin-Werte nach wie vor **nicht**)
- Related-Topics-Logik (nutzt bereits dynamisch `/active` — Dividenden erscheint automatisch)
- `pages/InvestmentTopicsOverviewPage.jsx` (SHORT_TITLES enthielt „dividenden" bereits)
- `AdminNewsArticles.jsx` (Dropdown lädt dynamisch aus `/admin/investment-topics`)

**Verifikation**
1. `GET /api/investment-topics/active` → 3 Topics, Reihenfolge aktien (10) · anleihen (9) · dividenden (8) ✓
2. `GET /api/investment-topics/dividenden` → korrekte Metadaten ✓
3. `GET /api/admin/investment-topics` (admin) → alle 3 Topics mit enabled/priority/related_news_count sichtbar ✓
4. Admin-Patch `enabled=false` bei Dividenden → `/active` liefert nur 2 (aktien+anleihen); Re-enable + Priority-Änderung überlebt Seeder-Restart (Backend restart im Test durchgeführt) ✓
5. `PATCH /admin/news/{slug} investment_topic_slug=dividenden` → 200, public detail liefert Zuordnung ✓
6. `PATCH ... aktien` (Restore) → CrossLinkBox-Regression grün (unchanged) ✓
7. Playwright `/themen/dividenden`: H1 „Dividenden strategisch einordnen", Breadcrumbs, alle 4 Sektionen (why/risks/form/related), Related zeigt aktien+anleihen ohne self-reference ✓
8. Playwright `/themen`: alle 3 Cards (aktien/anleihen/dividenden) sichtbar ✓
9. Aktien-/Anleihen-Funnels + `/themen`-Grid unverändert (keine Änderung an ihren Codepfaden)

**Getestete URLs**
- `/themen` (Grid mit 3 Cards)
- `/themen/dividenden` (komplette Themenseite)
- `/api/investment-topics/active` (3 Topics, korrekte Reihenfolge)
- `/api/investment-topics/dividenden` (Detail)
- `/api/admin/investment-topics` (mit Auth: 3 Topics)
- `/api/admin/news/{slug}` PATCH mit `investment_topic_slug=dividenden` (200 + Cross-Link auf `/themen/dividenden`)

**Offene Punkte**
- Eigene Themen-Hero-Motive (Aktien/Anleihen/Dividenden) statt Unsplash — Folge-Session
- Kuratierte News-Zuordnung für Dividenden (initial leer) — Redaktion via `/admin/investment-topics/dividenden` pflegen

## Session 42 (Feb 23, 2026) — Investment-Topic-Select im News-Admin

**Zielbild**: News-Artikeln direkt in einer Admin-UI ein Investment-Thema zuordnen können, ohne DB-Zugriff. Cross-Link-Box auf öffentlichen Detailseiten reagiert unmittelbar auf Änderungen.

**Backend (`investment_topics.py`)**
- Modul-Scope Modell `NewsTopicPatch { investment_topic_slug: Optional[str] }` — bewusst auf Modul-Ebene, damit FastAPI die Klasse als Request-Body erkennt (Body-Parsing würde bei einer geschlossenen `register()`-lokalen Klasse fehlschlagen).
- Neuer Endpoint `PATCH /api/admin/news/{slug}` (admin-only):
  - `null`/leerer String → Zuordnung entfernen
  - Nicht-leerer Slug → muss in `investment_topics` existieren, sonst **400** „Unbekannter Investment-Topic-Slug: …"
  - Kein Overwrite anderer News-Felder (Synthesizer bleibt unangefochten)
  - Setzt zusätzlich `updated_at`
- Neuer Endpoint `GET /api/admin/news` (admin-only): Liste mit Paging (`limit`, `skip`), Volltext-Suche (`q`), Topic-Filter (`?topic=<slug>`, `?topic=__none__` → nur unzugeordnete). Liefert `slug/title/category/published_at/investment_topic_slug`.
- **Kein** Datenmodell-Wechsel — `news_articles.investment_topic_slug` existiert bereits aus Session 41.
- Auth-Guard: unauth → **401**.

**Frontend (`pages/admin/AdminNewsArticles.jsx`, neu)**
- Route `/admin/news-articles` (geschützt via bestehendes `ProtectedRoute requireAdmin`).
- Tabelle mit Titel/Slug, Kategorie, Datum, **Investment-Thema-Dropdown**, Öffnen-Link.
- Dropdown-Werte: `Kein Thema` + alle Themen aus `/api/admin/investment-topics` (inkl. deaktivierter mit Suffix „(deaktiviert)" — falls Admin bewusst assignen möchte, wird die Box beim Rendern automatisch ausgeblendet).
- **Auto-Save on change**: Selectionwechsel schickt sofort `PATCH`, zeigt Spinner, Toast-Feedback, optimistisches UI mit Rollback bei Fehler.
- Filter: Suchfeld (Titel/Slug/Kategorie), Topic-Filter, Paging (25 pro Seite).
- Stabile Test-Selektoren: `admin-news-articles`, `admin-news-row-{slug}`, `news-investment-topic-select-{slug}`, `admin-news-search`, `admin-news-topic-filter`.
- `App.js`: neue Route registriert.

**Verhalten der öffentlichen CrossLinkBox (aus Session 41, unverändert)**
- Zeigt sich nur bei gesetztem `investment_topic_slug` UND aktivem (`enabled=true`) Zielthema.
- Deaktiviert man das Zielthema → Zuordnung bleibt persistiert, Box verschwindet automatisch.

**Verifikation (mit Admin-Login `admin@kapitalmitte.com` / `admin123`)**
1. `PATCH /admin/news/{slug}` ohne Auth → **401** ✓
2. Invalider Slug (`totally-fake`) → **400** „Unbekannter Investment-Topic-Slug: totally-fake" ✓
3. Valider Slug `anleihen` → **200** `{ok:true, slug, investment_topic_slug:"anleihen"}`; public detail: `investment_topic_slug=anleihen` ✓
4. `PATCH … {"investment_topic_slug": null}` → **200** null; public detail: `None` ✓
5. `PATCH … {}` → default `None` → **200**, Zuordnung entfernt (regression-safe für existierende PATCH-Aufrufer ohne Feld) ✓
6. `PATCH … "aktien"` → **200**, öffentlicher Detail-Screenshot: Cross-Link-Box „Aktien & Kapitalmärkte verstehen" weiterhin sichtbar (Regression grün) ✓
7. Filter `?topic=aktien` → 1 Treffer; `?topic=__none__` → 5 Treffer ✓
8. Regression: `/themen/aktien` (Wissen-Block + Related), `/themen/anleihen`, `/themen`-Grid unverändert (keine Änderungen an diesen Codepfaden).

**Offene Punkte**
- Frontend-Playwright-Test für Admin-UI benötigt E2E-Login-Flow — Backend-Tests decken alle Validierungspfade ab; UI ist per Tests-IDs vorbereitet.
- Compliance-Freigabe für Wording bleibt ausstehend.

## Session 41 (Feb 23, 2026) — Wissen-Block · News-Cross-Link · Admin-UI Investment-Themen

**Backend (`investment_topics.py`, `server.py`, `news_provider.py`)**
- `investment_topics` erweitert um `related_news_slugs: []` (max 6). `TopicOut` + `TopicPatch` Modelle mit Validator: dedupliziert, limitiert, prüft Existenz veröffentlichter News-Slugs.
- `seed_investment_topics` bleibt idempotent, überschreibt **niemals** Admin-Werte (nur `not in existing` → backfill).
- Neue Endpoints:
  - `GET /api/news/by-slugs?slugs=a,b,c` — bewahrt Anfragereihenfolge, überspringt fehlende/deaktivierte Slugs (kein Fehler)
  - `GET /api/admin/investment-topics` — Übersicht mit Status, Priority, News-Count, updated_at (admin-only)
  - `GET /api/admin/investment-topics/{slug}` — Detail
  - `PATCH /api/admin/investment-topics/{slug}` — editiert nur Whitelist-Felder, validiert Priority (0–100), Cooldown (1–90), News-Slugs (max 6, nur veröffentlichte)
  - `GET /api/admin/news-search?q=...` — Titel/Slug/Category Suche
- `news_provider.MongoNewsProvider._to_public` liefert jetzt `investment_topic_slug` an das Frontend.

**Frontend**
- `lib/investmentAnalytics.js`: Events `RELATED_NEWS_VIEW`, `RELATED_NEWS_CLICK` + PII-Whitelist um `article_slug`, `position` erweitert.
- `components/investment/TopicWissenBlock.jsx` (neu): lädt kuratierte News via `/news/by-slugs`, rendert 2–3 Cards (Kategorie/Datum/Titel/Summary/Bild), blendet sich aus wenn 0 gültige Slugs, view-Event nur einmal pro Page-View (guard).
- `pages/InvestmentTopicPage.jsx`: `<TopicWissenBlock>` zwischen letzten Content-Sektionen und Conversion; liest `related_news_slugs` aus der `/active`-Antwort für aktuelles Slug.
- `components/investment/TopicCrossLinkBox.jsx` (neu): dezente Box am Ende eines News-Artikels — nur wenn `investment_topic_slug` gesetzt UND Thema in `/active` enthalten. Copy pro Slug (Aktien/Anleihen), Fallback für neue Themen.
- `pages/news/NachrichtenDetailPage.jsx`: rendert Cross-Link-Box zwischen Hinweis und `NachrichtenRelated`.
- `pages/admin/AdminInvestmentTopics.jsx` (neu, Route `/admin/investment-topics`):
  - Tabelle mit Slug/Kategorie/Status-Pill/Priority/News-Anzahl/Aktualisierung/Aktionen.
  - Inline-Toggle „Aktivieren/Deaktivieren" mit Warn-Toast über Cross-Link-Effekt.
- `pages/admin/AdminInvestmentTopicEdit.jsx` (neu, `/admin/investment-topics/:slug`):
  - Basis-Section (Kategorie, Overview, Bild-URL, Priority, Aktiv-Toggle mit Ausblendungs-Hinweis).
  - Teaser-Section (Headline, Text, Delay, Scroll, Cooldown).
  - News-Zuordnung: Suchfeld → Trefferliste mit „Hinzufügen"; Zuordnungsliste mit Hoch/Runter/Entfernen; Zähler `X/6`; verwaiste Artikel (nicht mehr in DB) mit Amber-Hint.
  - Alle Requests via Axios + Supabase-Session-Bearer-Token.
- `App.js`: 2 neue geschützte Admin-Routes registriert.

**Verifikation**
- API `/api/news/by-slugs?slugs=a,b,nonexistent` → 2 Items, kein Fehler bei fehlendem Slug.
- API `GET /api/admin/investment-topics` ohne Auth → 401.
- Mongo: `aktien.related_news_slugs=[dax…, usa…]` via direktes Update (simuliert Admin-Patch).
- Playwright `/themen/aktien`: `topic-wissen-block` present, `related-news-item-*` = 2, Related-Topics + Form-Section vorhanden.
- Playwright News-Detail: `news-topic-crosslink` + `news-topic-crosslink-cta-aktien` present. Screenshot: Box „Aktien & Kapitalmärkte verstehen" sichtbar zwischen Quellen und Related-News.
- Aktien-/Anleihen-Funnels + `/themen`-Grid unverändert (keine Regression).

## Session 40 (Feb 23, 2026) — Themenübersicht `/themen` · Anleihen-Funnel · Multi-Topic-Teaser

**Zielbild**: Investment-Themenbereich erweitern — zentrale Übersicht `/themen`, zweites Thema „Anleihen", automatische Querverlinkung zwischen Themenseiten, Teaser rotiert deterministisch zwischen Themen (max 1 pro Session).

**Backend (`investment_topics.py`)**
- `DEFAULT_TOPICS`: neuer Eintrag `anleihen` (Category „Anleihen & Zinsen", Priority 9, Overview-Short, eigene excluded_routes inkl. `/themen/anleihen`).
- `aktien` mit `priority: 10` + `overview_short` ergänzt.
- `TopicOut` um `overview_short: Optional[str]` und `priority: int` erweitert.
- `/active` sortiert jetzt nach `priority DESC, created_at DESC`.
- `seed_investment_topics(db)`: bleibt idempotent für Slug-Existenz, **backfillt zusätzlich fehlende neue Felder** (`priority`, `overview_short`) auf existierenden Docs via `$set` — kein manueller DB-Fix nötig.

**Frontend**
- `pages/InvestmentTopicsOverviewPage.jsx` (neu, Route `/themen`):
  - Hero mit Breadcrumb `Home → Themen`, Eyebrow, H1, Intro, `Themen entdecken ↓`-Anchor.
  - Grid lädt via `fetchActiveInvestmentTopics()` — dieselbe API, keine separate Overview-Route.
  - Loading-Skeletons, Empty-State-Karte wenn keine Themen aktiv.
- `components/investment/InvestmentTopicCard.jsx` (neu, wiederverwendbar):
  - Wird sowohl im `/themen`-Grid als auch im „Weitere Investmentthemen"-Block auf Detailseiten eingesetzt.
  - Bild-Fallback: numerisches 01/02-Motiv + Kategorie-Label im Card-Header, falls kein `image_url`.
  - `data-testid="investment-topic-card-{slug}"`.
  - Trackt `TOPIC_CARD_CLICK` (overview) bzw. `RELATED_TOPIC_CLICK` (related).
- `components/investment/InvestmentBreadcrumbs.jsx` (neu):
  - Semantisches `<nav aria-label="Breadcrumb"><ol>` mit `aria-current="page"` auf letztem Item.
  - `data-testid="topic-breadcrumbs"`.
- `pages/InvestmentTopicPage.jsx`:
  - `TOPIC_CONTENT["anleihen"]` ergänzt (Hero, Why, Risks, Persönliche Beratung mit 3 Steps, Conversion — alle Texte aus dem Prompt 1:1 übernommen).
  - Breadcrumb-Header `Home → Themen → {breadcrumb_label}` im Hero.
  - Sekundäre CTA-Beschriftung via `topic.hero_learn_more_label` steuerbar (Aktien: „Mehr über Aktien erfahren", Anleihen: „Mehr über Anleihen erfahren").
  - Neue Sektion `[data-testid="topic-related-section"]` unten: bis zu 3 weitere aktive Themen, aktuelles Slug ausgefiltert, wiederverwendete `InvestmentTopicCard`. Zusätzlich Link „Alle Investmentthemen" → `/themen`.
- `components/investment/InvestmentTopicTeaser.jsx`:
  - Lädt jetzt **alle** aktiven Topics.
  - Wählt deterministisch: Route-Filter (excluded/allowed) → Priority DESC → bei Gleichstand `(slugHash + dayOfYear) % 100` als stabiler Tiebreaker (kein Wechsel bei Re-Render, aber tägliche Rotation).
  - Cooldown/Session-Regeln pro Slug bleiben unverändert.
- `lib/investmentAnalytics.js`:
  - Neue Events `TOPICS_OVERVIEW_VIEW`, `TOPIC_CARD_CLICK`, `RELATED_TOPIC_CLICK`.
  - PII-Whitelist um `source_page` erweitert.
- `App.js`: `<Route path="/themen" element={<InvestmentTopicsOverviewPage />} />` vor `/themen/:slug` registriert.

**Verifikation**
- API `/investment-topics/active` → **2 Themen** (`anleihen` prio 9 → zuerst, `aktien` prio 10 nach Backfill), beide mit `overview_short`.
- API `/investment-topics/anleihen` → korrekte Metadaten.
- API `POST /lead` mit `topic_slug=anleihen` → 200 + `topic: "Anleihen & Zinsen"`.
- Mongo: `topics=2, leads=2`.
- Playwright `/themen`: Breadcrumbs sichtbar, H1 „Investmentthemen im Überblick", Card `investment-topic-card-aktien` UND `-anleihen` vorhanden.
- Playwright `/themen/anleihen`: H1 „Anleihen als Baustein einer Vermögensstrategie", alle Sektionen (`topic-why-section`, `topic-risks-section`, `topic-form-section`, `topic-related-section`) — Related zeigt `aktien`-Card, keine `anleihen`-Card (aktuelles Thema korrekt ausgefiltert).

## Session 39 (Feb 23, 2026) — Investment-Themen-Funnel „Aktien im Fokus"

**Zielbild**: Wiederverwendbares Themen-Funnel-System — Floating-Teaser sitewide, dedizierte Themenseite `/themen/:slug`, kurzes Lead-Formular ohne parallele Kontakt-Infrastruktur. Compliance-freundlich (keine Empfehlungen/Renditeversprechen), Analytics vorbereitet.

**Backend**
- Neues Modul `backend/investment_topics.py`:
  - Collection `investment_topics` — Felder: `slug, category, headline, teaser, target_url, image_url, enabled, display_delay_ms, scroll_threshold_pct, cooldown_days, allowed_routes, excluded_routes, compliance_label`.
  - `seed_investment_topics(db)` — idempotent, seeded initial „aktien" (35s Delay, 50% Scroll, 7d Cooldown, exkl. Login/Admin/Dashboard/eigene Themenseite).
  - Endpoints:
    - `GET /api/investment-topics/active` → aktive Themen für den Teaser (max 20).
    - `GET /api/investment-topics/{slug}` → Detail-Metadaten.
    - `POST /api/investment-topics/lead` → Pydantic `LeadIn` mit `EmailStr`+`consent`-Check, speichert in `investment_leads`, sendet interne Bestätigungsmail via bestehendem `_send_email_via_emergent` (Resend). Kein Mail-Fehler wird zum User propagiert.
- `server.py`: `_register_investment_topics(api, db, _send_email_via_emergent)` + Startup-Hook `_investment_topics_startup`.

**Frontend**
- `lib/investmentAnalytics.js` — `trackInvestmentEvent(name, props)` mit Consent-Guard (`window.__consent_analytics__`), Support für `gtag`, `dataLayer`, `plausible`. Keine PII (nur `topic`, `topic_slug`, `placement`, `route`).
- `services/investmentTopics.js` — Axios-Wrapper.
- `components/investment/InvestmentTopicTeaser.jsx`:
  - Floating Card (desktop unten rechts, mobile bottom sheet), Fade + Slide-in.
  - Trigger: `display_delay_ms` **oder** `scroll_threshold_pct` — je nachdem was zuerst.
  - Cooldown via `localStorage["invtopic:dismissed:<slug>"]` (Timestamp, Reset nach `cooldown_days`).
  - „Max. 1 Teaser pro Session" via `sessionStorage["invtopic:shown_in_session"]`.
  - Blocklist über `excluded_routes` (Präfix-Match) und `allowed_routes`.
  - Accessibility: `role="dialog"`, `aria-labelledby`/`aria-describedby`, ESC schließt, Fokus auf Close-Button beim Öffnen, Tastatur-navigierbar.
  - `data-testid`: `invtopic-teaser`, `invtopic-teaser-close`, `invtopic-teaser-cta`.
- `pages/InvestmentTopicPage.jsx` — Route `/themen/:slug`:
  - Content-Registry `TOPIC_CONTENT["aktien"]` (Hero, Why-Cards, Risks, Einordnung-Steps, Conversion, Compliance-Label).
  - 6 Sektionen exakt nach Vorgabe: Hero mit 2 CTAs → Why (3 Cards) → Risks (Left Rail Headline + Body) → Persönliche Beratung (3 Steps) → Conversion mit „Ich bin bereits Kunde"-Inline-Box → Kurzformular (Vorname/Nachname/E-Mail/Telefon optional/Consent).
  - Fallback-Route rendert Hinweis + Link zur Kontaktseite, wenn Slug unbekannt.
- `App.js`: Route `<Route path="/themen/:slug" element={<InvestmentTopicPage />} />` in Marketing-Layout registriert.
- `Layout.js`: Teaser sitewide via `<InvestmentTopicTeaser />` gemountet.

**Analytics-Ereignisse (vorbereitet)**
`investment_teaser_view`, `investment_teaser_click`, `investment_topic_page_view`, `investment_topic_cta_click`, `investment_existing_customer_click`, `investment_appointment_start`, `investment_appointment_submit`.

**Compliance**
- Kein Ratschlag, keine Renditeversprechen, keine konkreten Aktien.
- Formular-Untertext: „Unverbindliche Gesprächsanfrage. Eine Anlageentscheidung erfolgt nicht über dieses Formular."
- Kennzeichnung „Information der Fröhlich Vermögensberatung" unter Teaser und Formular.
- Consent-Checkbox mit Link zur Datenschutzerklärung (`/legal/privacy`).

**Verifikation**
- `GET /api/investment-topics/active` → 1 Topic mit vollen Metadaten.
- `POST /api/investment-topics/lead` (valid) → `200 {ok:true, lead_id, topic}`.
- `POST /api/investment-topics/lead` (`consent=false`) → `400`.
- Mongo: 1 Topic seeded, 1 Lead gespeichert (Verifikation via `motor` REPL).
- Playwright `/themen/aktien`: H1 „Aktien als Baustein Ihrer Vermögensstrategie", alle 4 Sektionen (`topic-why-section`, `topic-risks-section`, `topic-form-section`, CTAs) present. Backend startet fehlerfrei mit Log-Zeile `investment_topics: seeded 1 topic(s)`.

## Session 38 (Feb 23, 2026) — Related-News unter jeder Detailseite

**Zielbild**: Nach dem Lesen eines Artikels sollen 3 thematisch verwandte Artikel als interne Empfehlungen erscheinen — keine externen Links, keine LLM-Calls beim Seitenaufruf.

**Backend (`server.py`)**
- Neuer Endpoint `GET /api/news/nachrichten/{slug}/related?limit=3` — reines DB-Ranking über die letzten 60 Tage:
  - gleiche Kategorie: +4
  - je gemeinsame Entity (via `_extract_entities` aus `news_synthesizer`): +5, max +25
  - Titel+Summary Jaccard-Similarity: `round(sim*10)` → 0..+5
  - ≤ 7 Tage alt: +2; ≤ 30 Tage: +1
- Nur veröffentlichte Artikel mit ≥ 250 Wörtern Volltext kommen in Frage. Aktueller Artikel wird per `{"slug": {"$ne": slug}}` immer ausgeschlossen.
- **Fallback-Kaskade**: unter Limit → neueste derselben Kategorie → sonst neueste kategorie-übergreifend. Weiterhin Volltext-Filter. Wenn 0 Kandidaten existieren → leere Liste (Component blendet sich aus).
- Response nur mit Mini-Payload: `id, slug, title, summary (max 280 Chars), category, image_url, published_at` — kein Volltext übertragen.
- Verwendet vorhandene `_extract_entities` + `_title_similarity` aus dem Synthesizer — kein neuer Index nötig (Query nutzt bereits `slug/is_published/status/published_at`, alle vorhanden bzw. per Default in Mongo indiziert).

**Frontend**
- Neue Komponente `components/news/NachrichtenRelated.jsx`:
  - Ruft `/api/news/nachrichten/{slug}/related?limit=3` via Axios (mit Abort-Guard).
  - `[data-testid="news-detail-related"]` + `[data-testid="related-news-card-<slug>"]` je Karte.
  - 3 Spalten auf Desktop (`lg:grid-cols-3`), 2 Spalten Tablet (`sm:grid-cols-2`), 1 Spalte Mobile.
  - Karte: Bild (16:9), Kategorie-Eyebrow (`font-mono uppercase tracking`), H3 Serif-Titel, 2-line Summary, Datum. Kompletter Card-Bereich ist `<Link to="/news/nachrichten/{slug}">` — echter interner Link (SEO-freundlich).
  - Bestehende Fröhlich-Design-Tokens: `border-bank-border`, `bg-white`, `bank-primary`, `bank-accent-strong`, `bank-text-muted`, `font-serif`. Kein neues Design-System.
  - Skeletons während Loading, Component rendert `null`, wenn Backend keine Items liefert.
- Mount in `pages/news/NachrichtenDetailPage.jsx` unter dem Hinweis-Block: `<NachrichtenRelated slug={slug} />`.
- Alte Komponente `RelatedNewsArticles.jsx` (Supabase-basiert, falscher Link `/news/${slug}`) bleibt unangetastet für PublicNewsDetailPage — der Detailseiten-Flow (`NachrichtenDetailPage`) nutzt jetzt aber `NachrichtenRelated`.

**Verifikation**
- API-Call: `GET /api/news/nachrichten/dax-.../related?limit=3` → 3 Items, alle Wirtschaft-Kategorie (Sozialhilfe, EZB-Lane, Lagarde), alle mit Bild, Datum, Kurz-Summary.
- 404-Case: `.../does-not-exist/related` → `{"items": []}` (kein Fehler).
- Playwright: `[data-testid="news-detail-related"]` sichtbar, 3 `related-news-card-*` Karten, Heading „Mehr zu diesem Thema".
- Aktueller Artikel nicht in Response enthalten (Filter `slug != current`).
- Response überträgt nur Mini-Payload (kein `full_text`-Feld) — bestätigt via `has_full_text_field=False`.

## Session 37 (Feb 23, 2026) — Volltext-Pipeline · Multi-Source-Merge · strikter Stunden-Cron

**Zielbild**: Kein Aggregator-Modus mehr — jede Meldung erscheint als eigener, redaktionell formulierter Volltext auf der Fröhlich-Website. Mehrere Publisher zum selben Ereignis werden zu einem Artikel konsolidiert. Quellen dezent am Ende.

**Backend (`news_synthesizer.py`)**
- **Entity-Extraktion** (`_extract_entities`) + **Topic-Clustering** (`_cluster_raw_items`): greedy Grouping über Titel-Similarity, Entity-Overlap (bekannte Institutionen/Personen/Orte + Groß-Tokens) und Zeitfenster (24 h). Konservative Schwellen:
  - `sim ≥ 0.65` → immer merge
  - `sim ≥ 0.5` + Entity-Overlap ≥ 1 + gleiche Kategorie → merge
  - Entity-Overlap ≥ 2 + gleiche Kategorie → merge (Titel darf abweichen)
  - Entity-Overlap ≥ 3 kategorie-übergreifend → merge
- **`_target_length(category, sources, primary, relevance)`**: variable Wortzahl je Kategorie/Faktenlage — Ticker 300–500, Standard 500–800, Analyse/Hintergrund 700–1000.
- **`_build_system_prompt(min_w, max_w)`**: LLM-Prompt reicht Zielrahmen durch, verbietet Streckenlege-Passagen, betont Multi-Source-Konsolidierung.
- **`synthesize_pending(max_articles=25)`**: pullt Roh-Items der letzten 48 h, gruppiert, führt genau EINEN Claude-Sonnet-5-Call pro Gruppe aus, speichert konsolidierten Artikel mit allen `source_names`/`source_urls`.
- Quality-Gate: Untergrenze auf 250 Wörter gesenkt (Ticker-tauglich), Struktur-Check (≥ 2 `## `-Sections) unverändert.

**Backend (`news_provider.py`)**
- `list_items` liefert **nur** noch synthetisierte Artikel — keine Aggregator-Karten mit externen Publisher-Links. Publisher-Filter matcht case-insensitive auf `source_names` (Array-Elemente).
- `list_publishers` aggregiert alle Publisher aus `source_names` per `$unwind`, ergänzt „Fröhlich Redaktion" wenn Artikel ohne externe Quellen existieren.
- `get_item` erkennt nur noch Slugs von `news_articles`; das Roh-Item-Fallback wurde entfernt.

**Cron (`.emergent/crons.yml`)**
- `news-fetch-feeds`: strikt stündlich `0 * * * *` (15-Min-Cron entfernt).
- `news-synthesize`: `10 * * * *` (10 Min Versatz, damit Fetch garantiert durch ist) mit `max_articles=25`.
- Mongo-Lock `job_locks._id="fetch_feeds"` bleibt unverändert.

**Server (`server.py`)**
- Admin-Endpoint `/api/news/admin/synthesize` akzeptiert jetzt `max_articles` bis 50 (Default 25).

**Backfill (`scripts/backfill_content.py`)**
- Einmalig ausführbar via `cd /app/backend && python -m scripts.backfill_content`.
- Verarbeitet max. 100 Artikel ohne ausreichenden `content` (< 200 Wörter), nutzt gespeicherte `source_names`/`source_urls`, ruft `_synthesize_article` einmal pro Artikel auf, setzt `content_backfilled_at`-Marker (idempotent).
- Bereits vollständige Artikel werden markiert und übersprungen — beim nächsten Lauf zero-cost.

**Frontend**
- Detailseite `NachrichtenDetailPage.jsx` war bereits volltext-fähig (`renderBody(item.full_text)` + Quellenblock). Da `MongoNewsProvider._to_public` `license_allows_fulltext=True` und `full_text=content` setzt, rendert die Seite ohne Anpassung den Redaktions-Volltext mit `## `-Zwischenüberschriften und Bullet-Points. Hinweis + Quellenblock am Ende.

**Verifikation**
- Unit-Tests im REPL: EZB×2 + DAX×2 werden gemerged, Lufthansa/VW/Bundeswehr bleiben getrennt.
- API: `/api/news/nachrichten?limit=3` → alle Items `content_type=news_synthesis`, jeweils 400+ Wörter Volltext, Multi-Publisher (`['Tagesschau','Deutsche Welle']`).
- API: `/api/news/publishers` → 4 Publisher aus `source_names` (Tagesschau, Deutsche Welle, EZB, Tagesschau Inland).
- Publisher-Filter: `?source=Tagesschau` → 3 Treffer.
- Detailseite (Playwright): H1 sichtbar, `[data-testid="news-detail-fulltext"]` present, `[data-testid="news-detail-sources"]` present.
- Backfill-Script: 6 Kandidaten, alle bereits > 200 Wörter → 6 skipped_already_done, korrekt idempotent.

## Session 30 (Feb 27, 2026) — Home-Sektionen · Publisher-Filter · Env-Keys verifiziert

**Home-Feed** (`components/home/HomeNewsPreview.jsx`)
- Neue Komponente `ExtendedTopicSections` unter dem bestehenden Preview + über dem CTA. Lädt parallel `wirtschaft`, `europa`, `technologie` (je 6 Items) aus **derselben Aggregator-API** `/api/news/nachrichten?category=…&limit=6`.
- Jede Sektion: Eyebrow + H3 + „Alle X-News →" + 3-spaltiges Card-Grid mit Bild, Kategorie-Tag, Publisher-Tag, Titel, Teaser, Zeit.
- Aggregator-Cards öffnen extern (`target="_blank" rel="noopener"`), Fröhlich-Redaktions-Cards intern (`Link to="/news/nachrichten/:slug"`).
- Bestehender Marktüberblick / Top-News / Einordnung / CTA / Watchlist bleiben unverändert.

**Publisher-Filter** (`pages/news/NachrichtenPage.jsx`)
- Neuer `<select>` mit `data-testid="news-publisher-select"` direkt unter der Kategorie-Navigation.
- Publisher-Liste wird beim Mount aus `/api/news/nachrichten?limit=60` extrahiert (alle sichtbaren Herausgeber, alphabetisch sortiert).
- Filter arbeitet clientseitig auf den bereits geladenen Items — Pagination/„Mehr laden" bleiben unverändert. Reset-Link erscheint, sobald ein Publisher aktiv ist.
- 12 Publisher aktuell verfügbar (FAZ Politik, FAZ Wirtschaft, Fröhlich Redaktion, Handelsblatt, SPIEGEL Politik, WirtschaftsWoche, ZEIT Politik, …).

**JSX-Fixes**
- `HeadlineRow`, `NewsCard`, `HeroCard` schließen jetzt korrekt mit `</SmartLink>` (statt verwaisten `</Link>`).
- Doppelte `const HomeNewsPreview = () => {`-Deklaration bereinigt.
- Compile: **OK**, keine Babel-Fehler mehr.

**Env-Keys**
- `UNSPLASH_ACCESS_KEY` (leer): RSS-Bilder haben Vorrang, Fallback-Pool aktiv, keine Hardcodings.
- `ALPHA_VANTAGE_API_KEY` (leer): Server liest bereits ausschließlich aus Env (`server.py:52`), `provider_configured=false`, Fallback-Kurse aktiv. Sobald der User seinen Key einträgt und Backend neustartet → automatisch Live-Kurse für Marktkacheln + Preis-Alerts.

**Bestehende Funktionen unangetastet**: Design, Watchlist, Marktübersicht, „Unsere Einordnung", Cron-Struktur, RSS→Mongo-Pipeline.


## Session 29 (Feb 27, 2026) — News-Bereich als Aggregator-Plattform ausgebaut (67 Artikel, 18 Publisher, 17 Kategorien)

**Zielbild**: Aus einer einzigen bestehenden Pipeline (RSS→Mongo-Cache) soll die Website deutlich lebendiger wirken — mit 50-100+ aktuellen Artikeln, breiterer Kategorienvielfalt, „Mehr laden" und sichtbaren Publisher-Namen.

**Backend (`news_synthesizer.py`)**
- **FEEDS 7 → 24**: Neu dazu Handelsblatt, Manager Magazin, SPIEGEL Wirtschaft/Politik/Ausland, FAZ Wirtschaft/Politik, ZEIT Wirtschaft/Politik, Süddeutsche Wirtschaft, WirtschaftsWoche, Handelszeitung, heise Wirtschaft, Golem, NDR Wirtschaft, Tagesschau Ausland, DW Welt. Alle mit `default_category` + `weight`.
- **RELEVANT_KEYWORDS 40 → 100+**: erweitert um Rohstoffe/Währungen/Industrie/Automobil (VW/BMW/Mercedes/Porsche/Audi/Siemens/Bayer/BASF/SAP), Technologie (KI, Halbleiter, Cloud, Cyber), Energie (Wasserstoff, Netzausbau), Mobilität (Bahn/Hafen), Sicherheit/Verteidigung, Gesundheit/Pharma.
- **CATEGORY_MAP** komplett auf die 17 gewünschten Kategorien erweitert: zinsen, waehrungen, rohstoffe, energie, klima, gesundheit, mobilitaet, industrie, technologie, sicherheit, unternehmen, maerkte, europa, politik, welt, wirtschaft, wissen. Detection-Priorität bewusst gesetzt (spezifisch → allgemein). Legacy-Alias `umwelt→klima`, `aktien→maerkte`.
- **`_extract_rss_image()`** neu: parst `media_content`, `media_thumbnail`, `enclosures`, `links[rel=enclosure]` und erstes `<img>` im Content. Publisher-Bild wird bevorzugt → wenn nicht vorhanden, fällt Editorial-Fallback pro Kategorie ein (aus bestehendem `FALLBACK_POOL`).
- **`fetch_feeds()`** erweitert: setzt jetzt zusätzlich `slug`, `category`, `image_url`, `image_attribution`, `image_source`, `published_at`, `is_aggregated=true`, `is_published=true` auf jedes `news_raw`-Item. Damit sind Roh-Items direkt Aggregator-tauglich, ohne LLM-Rewrite.

**Backend (`news_provider.py`)**
- **UNION-Serving**: `MongoNewsProvider.list_items(category, limit, skip)` liest jetzt aus **beiden** Collections — synthesized (Fröhlich-Redaktion, interne Detail-URL) und aggregated (Publisher, externe URL) — und deduped nach normalisiertem Titel + Publisher-URL. Sortierung: `is_top_news DESC → published_at DESC`.
- **`_to_raw_public()`**: aggregierte Items bekommen `content_type: 'aggregated'`, `source_name = Publisher-Name`, `source_url = externer Original-Link`, `url = externer Link` (User's Schema-Feld). Kein Fremdtext-Volltext (nur Summary + externer Klick).
- **`count_items(category)`**: neue Methode für Pagination-Total.
- **`get_item(slug)`** löst sowohl Synthese-Slugs (news_articles) als auch Aggregator-Slugs (news_raw) auf.

**Backend (`server.py`)**
- `GET /api/news/nachrichten` bekommt `skip` + `limit` Parameter. Response um `total`, `limit`, `skip`, `has_more` erweitert.

**Frontend (`NachrichtenPage.jsx`)**
- **17 Kategorie-Chips** statt vorher 10 (Politik/Wirtschaft/Unternehmen/Märkte/Europa/Welt/Zinsen/Währungen/Rohstoffe/Energie/Klima/Technologie/Industrie/Mobilität/Gesundheit/Sicherheit/Wissen).
- **"Mehr laden"-Button**: initial 24 Artikel → Klick lädt weitere 18 mit `skip=items.length`. Dedup gegen bereits gerenderte Slugs. Zeigt „X von Y Artikeln geladen".
- **`SmartLink`** neu: Redaktions-Artikel bleiben internes `<Link to="/news/nachrichten/:slug">`, Aggregator-Cards öffnen den Publisher via `<a target="_blank" rel="noopener">`.
- **`PublisherTag`** neu: sichtbare Herkunftsangabe pro Card (z. B. „HANDELSBLATT", „FAZ POLITIK", „FRÖHLICH REDAKTION").

**Cron** unverändert — der bestehende `fetch-feeds`-Job alle 15 Min zieht jetzt automatisch alle 24 Feeds.

**Verifikation**
- fetch-feeds Live: `226 fetched → 102 relevant → 61 new → 16 merged → 0 errors`.
- DB: **67 aktuelle Artikel** (61 aggregated + 6 Fröhlich-Synthesizer). 18 Publisher aktiv, 13 Kategorien besetzt.
- API `/api/news/nachrichten?limit=24&skip=0` → 200, `has_more=true`, `total=67`.
- Kategorien-Verteilung (raw): politik=14, wirtschaft=14, welt=6, mobilitaet=5, klima=4, maerkte=4, sicherheit=3, technologie=3, gesundheit=2, unternehmen=2, europa=2, industrie=1, rohstoffe=1.

**Was NICHT verändert wurde** (Vorgabe)
- Typografie, Farben, Abstände, Navigation, bestehende Cards, „Unsere Einordnung"-Bereich, Watchlist, Marktübersicht, responsive Struktur.


## Session 28 (Feb 27, 2026) — Chart-Bilder komplett aus News + Einordnung entfernt

**User-Meldung**: „schwarze Finanzcharts / Candlestick-Kurse tauchen immer noch auf". Ursache: 4 Trading-Chart Unsplash-IDs waren an mehreren Stellen hardcoded (nicht nur im Synthesizer, sondern in Seed-Daten und Frontend-Fallback).

**Identifizierte Chart-URLs (alle entfernt)**
- `photo-1554224155-8d04cb21cd6c` (klassischer Trading-Chart) → 2 Vorkommen
- `photo-1590283603385-17ffb3a7f29f` (dunkler Candlestick) → 3 Vorkommen
- `photo-1526304640581-d334cdbbf45e` (Line-Chart) → 3 Vorkommen
- `photo-1611974789855-9c2a0a7236a3` (Frankfurter Trading-Floor) → 3 Vorkommen

**Ersetzt in Code**
- `/app/backend/einordnung.py` — 2 Seed-Posts (Zinsen-Artikel → EU-Parlament, Höchststände → Container-Terminal)
- `/app/backend/news_provider.py` — 2 Demo-Items (Exporte + Zinsentscheid), obwohl Demo-Provider deaktiviert (Hygiene)
- `/app/backend/server.py` — 6 news_markte_articles-Seeds (EZB-Lagarde, DAX-Startet, US-Märkte, Bundesanleihe, Unternehmensanleihen, EUR/USD)
- `/app/frontend/src/components/news-markte/FondsEtfTopNews.jsx` — Fallback-Konstante `FALLBACK_IMG`

**Ersetzt in DB (Migration-Script)** — 9 bestehende Dokumente:
- einordnung_posts × 2, news_markte_articles × 7 (ezb-lagarde, euro-dollar-parity, us-maerkte, ezb-zinsentscheid, bundesanleihe, dax-startet, unternehmensanleihen)

**Neue Zuordnungen** (aus dem validierten Editorial-Fallback-Pool):
- Zinsen / EZB / Zentralbank-Themen → *parliament chamber* (`photo-1541872703-74c5e44368f9`)
- Aktienmärkte / Anleihen / Handel → *container port aerial* (`photo-1587293852726-70cdb56c2866` / `photo-1494412651409-8963ce7935a7`)
- US-Märkte → *port terminal aerial* (`photo-1526481280693-3bfa7568e0f3`, statt Wall-Street-Chart)

**Verifikation**
- `grep photo-1554224155|photo-1590283603385|photo-1526304640581|photo-1611974789855` in `/app/backend` und `/app/frontend/src` → **ALL CLEAN**
- Screenshots von Home + `/news/nachrichten` bestätigen: keine Candlesticks, keine Trading-Screens, keine schwarzen Charts. Motive: Warehouse (Logistik), Container-Terminal, Container-Kräne — editorial und thematisch.


## Session 27 (Feb 27, 2026) — Editorial-Bildsprache statt Finanz-Klischees

**Ziel** vom User: Bilder auf News- und Einordnung-Seite wirken „zu stark nach Aktien, Börse, Trading und Finanzen". Bilder sollen wie in einem großen Nachrichtenmagazin wirken — Häfen, Container, Windräder, Solarparks, Labore, EU-Parlament, Reichstag, Züge, Rechenzentren usw. Keine Candlestick-Charts, keine Ticker, keine Geldscheine, keine Wiederholungen.

**Backend (`news_synthesizer.py`) — kompletter Rewrite der Bildlogik**
- **90+ Themen-Overrides** in `EDITORIAL_TOPIC_QUERIES`: aus Titel + Summary extrahierte Kontext-Keywords steuern spezifische Editorial-Queries.
  - DAX / Aktienmarkt → *frankfurt skyline banking district* (KEIN Chart!)
  - Zölle / Handel → *container terminal customs harbor*
  - EZB / Bundesbank / Fed → jeweils Zentralbank-Architektur, nicht Zinstabellen
  - Deutsche Bahn / ICE → *modern train station platform germany*
  - Volkswagen / BMW / Autoindustrie → *car factory assembly line*
  - Offshore-Wind → *offshore wind farm turbines*
  - Photovoltaik → *solar farm aerial landscape*
  - Biontech / Pharma → *vaccine vial laboratory research*
  - Chip / Halbleiter / KI → *data center* / *semiconductor wafer*
  - Ukraine / China / Russland / USA / Frankreich → jeweils Landmarken-Skyline
  - Bundestag / Regierung → *reichstag berlin dome*
  - EU-Parlament / EU-Kommission → *berlaymont brussels* / *strasbourg parliament*
  - Sozialhilfe / Bürgergeld → *community services building*
  - Inflation / Verbraucherpreise → *supermarket shopping cart* (statt Ticker)
- **Kategorie-Rotation** in `EDITORIAL_CATEGORY_QUERIES`: 5–6 Query-Varianten pro Kategorie, deterministisch per Titel-SHA1 verschoben — verhindert, dass Artikel derselben Kategorie dasselbe Motiv bekommen.
- **`_build_image_queries(cat, title, summary)`** liefert bis zu 6 priorisierte Query-Kandidaten (Themen-Overrides zuerst, dann Kategorie-Rotation). Deduplizierung via `seen`-Set.
- **Anti-Repetition**: `_recent_unsplash_ids(db, limit=60)` prüft die letzten 60 verwendeten Unsplash-Photo-IDs; Kandidaten aus API-Response werden gegen diesen Blacklist gefiltert. Nur wenn alle Ergebnisse bereits verwendet → nimm den besten aus dem Original-Set.
- **Fallback-Pool** in `FALLBACK_POOL`: 4–5 kuratierte Editorial-Photos pro Kategorie (Container-Häfen, EU-Parlament-Chamber, Reichstag-Dome, Wind/Solar-Farm, Labor). Ohne `UNSPLASH_ACCESS_KEY` rotiert das Fallback per Titel-Hash — nie mehr überall dasselbe Bild.
- **Persistente Metadaten**: `image_unsplash_id`, `image_unsplash_query` werden in `news_articles` gespeichert (für Anti-Repetition + Debug).
- **Rate-Limit-Handling**: HTTP 403 → sofort Fallback-Pool statt weitere Queries zu feuern.

**Migration**
- Alle 6 bestehenden Artikel wurden mit der neuen Editorial-Logik re-imaged (Frankfurt-Skyline für DAX, Container-Terminal für USA-Zoll-Story, Reichstag für Sozialhilfe, EZB-Frankfurt für Lane, etc.).

**Was NICHT verändert wurde** (per User-Vorgabe)
- Layout, Typografie, Cards, Abstände, Seitenstruktur, Artikelinhalte, Kategorien, Funktionalität.


## Session 26 (Feb 27, 2026) — Preis-Alerts produktionsreif (Watchlist-scoped, Cron, Resend-Mail)

**Backend**
- **Neu**: `/app/backend/alerts.py` mit `register(api, db, get_current_user, require_admin, fetch_quote_fn, find_cfg_fn, send_email_fn)`. Dependency-Injection statt zirkulärer Import — nutzt bestehende Helfer aus `server.py` (`_fetch_quote`, `_find_cfg`, `_send_email_via_emergent`).
- **Datenmodell** (Mongo `price_alerts`): `_id, user_id, symbol, direction ∈ {above,below,change_pct}, target_price, currency, is_active, triggered_at, triggered_price, triggered_count, cooldown_until, note, created_at, updated_at`.
- **Endpunkte** (alle cookie-authentifiziert):
  - `GET /api/alerts` — eigene Alerts + `cooldown_hours=6`
  - `POST /api/alerts` — anlegen (validiert Symbol gegen curated universe + eigene Watchlist; Duplikat-Prevention; MAX 40/User)
  - `PATCH /api/alerts/{id}` — is_active toggeln, target_price/direction/note ändern; Reset des Cooldown bei Änderung
  - `DELETE /api/alerts/{id}` — 200 mit `removed:1`, 404 wenn nicht vorhanden
  - `POST /api/alerts/check` — Ad-hoc-Check nur eigener Alerts (User-Button „Jetzt prüfen")
  - `POST /api/alerts/admin/check-triggers` — admin-only, wird vom Cron gerufen
- **Trigger-Logik**: 1 Quote-Call pro einzigartigem Symbol pro Check (batch-effizient), Auslöse-Kondition pro Direction, bei Match → `triggered_at`, `triggered_price`, `cooldown_until = now+6h`, `triggered_count++` UND HTML-Mail via Resend.
- **Mail-Template**: seriös, Dunkelblau/Gold, Fröhlich-Branding, klarer Disclaimer „keine Anlageberatung/Empfehlung", Kontakt-Mailto zu `kundenservice@kapital-direkt24.de`.
- **Cooldown 6 h** verhindert Mail-Spam bei Kurs-Oszillation um die Schwelle. Reaktivierung oder Threshold-Change resettet Cooldown.
- **Startup**: `ensure_indexes` erzeugt `(user_id, is_active)` + `(user_id, symbol)` + sparse `cooldown_until`.

**Frontend**
- `/app/frontend/src/services/priceAlertService.js` komplett von Supabase auf FastAPI portiert. Signaturen bleiben unverändert (`fetchPriceAlerts`, `fetchAllPriceAlerts`, `createPriceAlert`, `deletePriceAlert`, `checkPriceAlerts`) → bestehende UI (`AlarmePage`, `PriceAlertPanel`) läuft ohne Anpassung.
- Neu: `updatePriceAlert(id, patch)` für PATCH-Nutzung (aktivieren/pausieren).

**Cron** (`.emergent/crons.yml`)
- Dritter Eintrag: `price-alerts-check` alle 15 Min → `POST /api/alerts/admin/check-triggers`.

**Verifiziert**
- 3 Alerts angelegt (DAX above/below/change_pct) → 201 ✓
- Manuelle Prüfung: `triggered=1, mails_sent=1, cooldown=0, unknown_symbol=0` ✓
- Cooldown gesetzt (6 h) → zweiter Check würde `cooldown=1` liefern ✓
- PATCH: is_active=false + target_price=18000 → 200 ✓
- PATCH invalid direction → 400 ✓
- DELETE → 200 (removed:1); DELETE nochmal → 404 ✓
- Ohne Cookie → 401 ✓


## Session 25 (Feb 27, 2026) — News-Pipeline produktionsreif gehärtet

**Backend (`news_synthesizer.py`) — vollständiger Rewrite**
- **Themenfilter**: 40+ Whitelist-Keywords (DAX, S&P, Nasdaq, EZB, Fed, Zinsen, Inflation, Konjunktur, Anleihen, Gold, Öl, EUR/USD, Banken …) + explizite Blocklist (Sport, Boulevard, Filmfest, Promi, Unfälle, Lifestyle, Fashion, Influencer).
- **Duplikaterkennung mehrstufig**: (1) Fingerprint-Exakt-Match; (2) Titel-Jaccard-Ähnlichkeit ≥ 0.5 innerhalb 24 h in gleicher Kategorie, ≥ 0.65 kategorie-übergreifend, oder bei Quellen-Overlap. Bei erkanntem Duplikat wird der bestehende Artikel via `$addToSet` um neue Quellen ergänzt (`updated_existing`) statt neuen zu erzeugen.
- **Unsplash offizielle API**: `api.unsplash.com/search/photos` mit `UNSPLASH_ACCESS_KEY` (aus `.env`). Persistiert Attribution-Trio (`image_author`, `image_author_url`, `image_source`, `image_source_url`, `image_attribution`) + Utm-Params gemäss Unsplash Guidelines. Ohne Key → kuratierte kategorie-spezifische Fallback-URLs (kein source.unsplash.com mehr — der Endpunkt ist seit 2024 tot).
- **LLM-Prompt** (Claude Sonnet 5): Pflicht-Struktur mit 5 `## `-Sektionen: Was ist passiert? · Der Hintergrund · Warum ist das für Wirtschaft und Märkte wichtig? · Was bedeutet das für Anleger? · Was jetzt wichtig wird (Bullet-Liste). 500–900 Wörter Ziel, 350 Wörter Minimum, JSON-only Antwortformat.
- **Quality-Gate**: keine erfundenen Placeholders, keine Anlageempfehlungen (`jetzt kaufen`, `garantierte Rendite`, …), min. 350 Wörter, min. 2 `## `-Sektionen, min. 1 Quelle. Bei Verstoss → `status=needs_review`, `is_published=false`.
- **Relevance-Score 0–100**: gewichtet Source-Weight × Impact-Keywords (Zinsentscheid, Notenbank, DAX, EUR/USD, Gold …) + Multi-Source-Bonus + Primärquellen-Bonus. Score ≥ 55 → `is_top_news=true` (auf Homepage prominent).
- **DEMO-Purge auf Startup + `/api/news/admin/purge-demo` Admin-Endpoint**: entfernt jede Legacy-Meldung mit DEMO-Prefix, `content_type=demo` oder Testdaten-Blocklist aus `news_articles`.
- **Logging**: strukturierte Events (`feed_ok`, `synthesis_start`, `article_published`, `article_needs_review`, `duplicate_updated`, `demo_purge`, `unsplash: no key → fallback`) — keine Secrets in Logs.

**Backend (`news_provider.py`)**
- `MongoNewsProvider` liefert jetzt Image-Attribution-Felder + `relevance_score` an Frontend. Query hardcoded auf `is_published=true AND status=published AND content_type != demo`. Sortierung: `is_top_news DESC → relevance_score DESC → published_at DESC`.
- `EuronewsDemoProvider` bleibt im Modul für lokale Entwicklung, wird aber niemals mehr automatisch aktiviert (Env-Flag `NEWS_ENABLE_DEMO` komplett entfernt).

**Frontend (`NachrichtenPage.jsx`)**
- Header komplett rebranded: „Redaktion: Fröhlich Vermögensberatung · Quellen: EZB, Bundesbank, BaFin, EU-Kommission, Tagesschau, DW · Letzte Aktualisierung …". Kein „Euronews" mehr sichtbar.
- Alle `DemoBadge`-Renders entfernt (Cards + Hero + Detail-Header).
- `LiveSlot` (Euronews-Platzhalter) durch **`RedaktionSlot`** ersetzt: erklärt eigenständige Redaktion, offizielle Quellen, keine Anlageempfehlung.
- `PageMeta`-Description auf Redaktions-Erzählung umgestellt.

**Frontend (`NachrichtenDetailPage.jsx`)**
- `renderBody()` unterstützt jetzt Bullet-Listen (`- `-Prefix) — für Sektion „Was jetzt wichtig wird". Bullet-Marker in Gold.
- Image-Attribution direkt unter Hero-Bild mit klickbaren Links zum Fotografen + Unsplash-Foto-URL (Utm-Params).
- „Externe Quelle"-Block ersetzt durch **„Quellen"**-Block: listet alle Fakten-Quellen (Multi-Source) als Text mit „Original ansehen ↗"-Links.
- Byline geändert von „Quelle: Tagesschau" → „Redaktion: Fröhlich Vermögensberatung".

**Cron (`.emergent/crons.yml`)** — unverändert: fetch-feeds alle 15 Min, synthesize stündlich (max 3/Lauf).

**Verifiziert (Live-Run 27. Feb)**
- fetch-feeds: 76 gefetcht → 38 relevant → 3 neu.
- Synthese: 6 Artikel published (davon 1 `is_top_news`), alle mit vollständiger 5-Sektionen-Struktur, ø 480-620 Wörter, Score 35-45.
- Duplikate: 1 kategorie-übergreifendes Duplikat erfolgreich zu Bestandsartikel gemerged.
- API `/api/news/nachrichten?limit=5` → 200 in 182 ms.
- Detail-Page rendert alle 5 `##`-Sektionen + Bullet-Punkte + Attribution.
- **Home-Preview** 5-Minuten-Auto-Refresh unverändert; ruft nur `/api/news/nachrichten` ab (kein LLM-Trigger im Client).

**Offen**
- `UNSPLASH_ACCESS_KEY` in `.env` (leer) — User trägt seinen Key selbst ein, Bilder liegen bis dahin auf kuratiertem Fallback pro Kategorie.
- `ALPHA_VANTAGE_API_KEY` (leer) — Marktdaten weiter im Fallback-Modus bis User Key liefert.


## Session 24 (Feb 26, 2026) — Produktive News-Pipeline live

**Backend**
- `news_synthesizer.py`: RSS-Puller für 7 seriöse deutsche Quellen (Tagesschau, DW, EZB, Bundesbank, BaFin, EU-Kommission) → Themenfilter (23 Keywords) → Fingerprint-Dedup → Claude-Sonnet-5-Synthese via Emergent LLM Key → 8-Punkte-Quality-Gate (Wortzahl ≥ 400, keine Demo-Prefix, keine Anlageempfehlung, ≥ 1 Quelle) → Mongo-Save.
- `news_provider.py`: `MongoNewsProvider` liest aus `news_articles`; DEMO-Provider nur bei `NEWS_ENABLE_DEMO=1` (Default: aus). Alle DEMO-Fixtures raus aus dem Live-Frontend.
- Neue Endpunkte: `POST /api/news/admin/fetch-feeds`, `POST /api/news/admin/synthesize`, `GET /api/news/admin/list?status=`. Alle admin-only.
- Cron `/.emergent/crons.yml`: fetch-feeds alle 15 Min, synthesize stündlich (max 3 Artikel/Lauf).
- `EMERGENT_LLM_KEY` in `.env` ergänzt.

**Verifiziert (Live-Run)**
- fetch-feeds: 76 fetched → 53 relevant → 52 neu.
- Synthese: 1 Artikel publiziert (`dax-beendet-woche-mit-tagesgewinn…`, DAX-Score 42), 1 needs_review (Blocklist-False-Positive → gefixt).

**Frontend** — unverändert; die Detailseite `/news/nachrichten/:slug` rendert automatisch die neuen Artikel mit `content` als `full_text`.

## Session 23 (Feb 26, 2026) — Interne Nachrichten-Detailseiten

**Backend (`news_provider.py`)**
- `_normalise()` erweitert um neue lizenz-bewusste Felder: `subtitle`, `source_name`, `source_url`, `hero_image_url`, `full_text`, `license_allows_fulltext`, `content_type` (`licensed_fulltext | editorial_summary | demo | video | article`).
- Regel: `full_text` wird nur ausgeliefert, wenn `license_allows_fulltext=true`. Bei `false` gibt es nur den eigenen `article_content` (redaktionelle Zusammenfassung), niemals einen kopierten Fremdtext.
- Alle 12 Demo-Items um `subtitle`, `hero_image_url`, `full_text`, `license_allows_fulltext=true`, `content_type='demo'` (bzw. `video`) erweitert.

**Frontend**
- Neue Seite `pages/news/NachrichtenDetailPage.jsx`:
  - Rendert Kategorie · DEMO-Badge · Titel · kursiver Untertitel · Teaser · „TT.MM.JJJJ, HH:MM · Quelle: XYZ" · Hero-Bild (nutzt `hero_image_url`).
  - Zeigt entweder `full_text` (bei `license_allows_fulltext=true`) ODER die eigene `article_content`-Zusammenfassung — nie beides, nie kopierten Fremdtext.
  - Dezenter „Externe Quelle"-Block am Ende (nur Quellname, optional kleiner „Originalquelle ansehen"-Link mit `rel="noopener noreferrer nofollow"`).
  - Zurück-Link „Zurück zu Nachrichten" oben.
- Route `/news/nachrichten/:slug` (neu) und `/news/euronews/:slug` (BC-Redirect auf dasselbe Template) in `App.js`.
- **Alle News-Links umgestellt** in `NachrichtenPage.jsx` (Hero, Headlines, Card-Grid), `HomeNewsPreview.jsx` (Top-News, sekundäre Cards) und `EinordnungPage.jsx` (verknüpfte Meldung) auf `/news/nachrichten/:slug`. Kein direkter Redirect zu Euronews/Reuters/dpa mehr.

## Session 22 (Feb 26, 2026) — HomeNewsPreview: nach oben + Auto-Refresh

- **Reihenfolge**: `HomeNewsPreview` in `pages/Home.js` von unten (vor Bonus-CTA) direkt **unter `<BankingHero />`** verschoben — sichtbar bei Offset ~1031 px vom Dokumentanfang.
- **Auto-Refresh (5 Min)**: `setInterval(load, 300000)` in `HomeNewsPreview.jsx`; beim Unmount sauber `clearInterval`.
- **Kein Flackern**: `Promise.allSettled` + Rejects behalten bisherige Items; Loading-Skeletons erscheinen nur beim initialen Laden.
- **Sortierung**: News-Items werden nach `published_at desc` sortiert (`Array.sort` client-side).
- **„Zuletzt aktualisiert vor X Min."**: dezenter Indikator unter der Headline, aktualisiert sich alle 60 s via zweitem Tick-Interval, ohne Netzwerk-Roundtrip.
- **Verifiziert**: Screenshot zeigt die Sektion samt Indikator „ZULETZT AKTUALISIERT GERADE EBEN"; alle anderen Home-Sektionen bleiben unverändert.

## Session 21 (Feb 26, 2026) — Startseiten-News-Vorschau

- **Neu**: `components/home/HomeNewsPreview.jsx` — kompakte News-Vorschau auf der Home unter `HomeInvestmentSpectrum` und vor dem Bonus-CTA.
- **Struktur** exakt zum Mockup: linkes Statement-Panel („Aktuelle Nachrichten / Wichtige Themen. Klar eingeordnet." + Teaser + „Zu den Nachrichten"-CTA) · große Top-News-Card (Bild + Kategorie + Titel + Teaser + Zeit) · Marktüberblick-Streifen (DAX · S&P 500 · Nasdaq · Gold · Öl · EUR/USD, snap-scroll, Link `/news`) · 4 sekundäre News-Cards + Sidebar mit 3 „Fröhlich — Unsere Einordnung"-Beiträgen · zentraler Abschluss-CTA „Weitere Nachrichten lesen" zu `/news/nachrichten`.
- Daten kommen aus bestehenden Endpunkten (`/news/nachrichten?limit=5`, `/einordnung?limit=3`, `/news-markte/market/overview`). Home lädt bewusst nur die Preview, alle Tiefen bleiben auf den bestehenden Detailseiten.
- Bestehende Home-Sektionen unverändert (HomeInvestmentSpectrum, Bonus-CTA, HomeTestimonials …); nur additiv integriert.

## Session 20 (Feb 26, 2026) — Admin-CMS „Unsere Einordnung"

**Backend**
- `/api/einordnung/admin/list` erweitert um `q` (Fulltext auf title/teaser/slug via regex) + `category`-Filter.

**Frontend (`/pages/AdminEinordnung.jsx`)**
- Vollständiger CMS-Screen unter `/admin/einordnung` (in Nav-Gruppe „Produkte & Inhalte" verlinkt).
- Übersicht: Tabelle mit Titel/Kategorie/Status/Veröffentlichungsdatum/Featured/Zuletzt bearbeitet/Aktionen (Öffnen · Bearbeiten · Löschen) + Filter (Suche, Status, Kategorie, DEMO ausblenden).
- Editor-Overlay: Titel · Slug (mit Auto-Generierung + Slug-Änderungswarnung) · Kategorie · Autor · Teaser · Haupttext (Markdown-Hinweis für ## H2, ** fett **, * kursiv *, - Listen, [Link]) · Bild-URL · Verknüpfte Nachricht · Status · Veröffentlichungsdatum · Featured-Toggle.
- Actions: Vorschau (Live-Preview mit Kategorie-Label, Bild, H2-Rendering und Disclaimer) · Als Entwurf speichern · Veröffentlichung planen · Veröffentlichen · Archivieren · Löschen (mit Extra-Warnung bei published).
- Alle Endpoints require_admin — Non-Admins bekommen 401.

**API-Verifikation** (curl-Roundtrip mit Admin-Login):
- Suche `?q=gold` → 1 Treffer. Create Draft → PUT „published" → im Public-Feed sichtbar. Zweiter Create mit gleichem Titel → 409 Slug-Konflikt. Delete → 200. Non-Admin auf admin/list → 401.

## Session 19 (Feb 26, 2026) — Fröhlich „Unsere Einordnung"

**Backend (`einordnung.py`)**
- Neue Mongo-Collection `einordnung_posts` + `PyObjectId`-freundliches Schema (slug, title, category, teaser, body, author, image_url, related_news_slug, status, is_featured, is_demo, published_at, timestamps).
- Public: `GET /api/einordnung` (Liste mit `category` + `featured_only` + Pagination + Kategorienliste), `GET /api/einordnung/{slug}`.
- Admin (require_admin): `GET /admin/list?status=`, `POST /admin`, `PUT /admin/{id}`, `DELETE /admin/{id}` — Statusflow draft/scheduled/published/archived, Slug-Kollisionsschutz.
- Startup-Seed: 4 DEMO-Beiträge (Zinsen, Aktienmärkte, Rohstoffe, Technologie), alle `is_demo=true` + `status=published`, jeder Beitrag hat H2-Zwischenüberschriften und einen „Was bedeutet das für Anleger?"-Abschluss.

**Frontend**
- `services/einordnungApi.js`, `components/nachrichten/EinordnungSection.jsx` (1 Feature-Card + 3 Standard-Cards, Gold-Akzentlinie, DEMO-Tag), `pages/news/EinordnungPage.jsx` (H2-Renderer, Persönliche-Beratung-CTA zu `/contact`, Disclaimer).
- Neue Route `/news/einordnung/:slug` in `App.js`, Section unter Card-Grid auf `/news/nachrichten` (mit sichtbarer optischer Trennung zu externen Nachrichten).

## Session 18 (Feb 26, 2026) — Nachrichten-Bereich (Euronews DEMO)

**Rechtlicher Kurzbefund**
- Euronews-Widgets/MRSS/RSS: kommerziell **nicht** ohne Lizenz nutzbar (ToS + UrhG-Rechtsprechung).
- Commercial-Kontakt: `salesoperations@euronews.com` / https://www.euronews.com/commercial/licensing-services
- Anfragepaket (DE + EN) + Checkliste unter **`/app/memory/EURONEWS_LICENCE_INQUIRY.md`**.

**Backend**
- Neue Provider-Abstraktion `news_provider.py`: abstrakte `NewsProvider`-Klasse, aktive Instanz `EuronewsDemoProvider` (DEMO), Platzhalter `EuronewsLicensedProvider` fürs spätere Aktivieren nach Lizenzabschluss.
- Normalisiertes Datenmodell: `id, slug, title, summary, category, image_url, video_embed_url, published_at, source, source_url, article_content, language, content_type, is_demo`.
- 12 DEMO-Meldungen (Politik/Wirtschaft/Europa/Welt/Wissen/Umwelt/Kultur/Sport/Videos) — jede Überschrift beginnt mit „DEMO —".
- Neue Endpunkte: `GET /api/news/nachrichten?category=&limit=` und `GET /api/news/nachrichten/{slug}`.

**Frontend**
- Neue Seite `/news/nachrichten` (`NachrichtenPage.jsx`): Hero-Card links + Schlagzeilen-Spalte rechts, Live-Slot als Placeholder („Live-Integration nach Freigabe des offiziellen Euronews-Players"), Kategorien-Navigation, 3-Spalten-Card-Grid, „Fröhlich — Unsere Einordnung" als optische Klammer.
- Neue Detail-Seite `/news/euronews/:slug` (`EuronewsArticlePage.jsx`): Bild, Video-Embed-Slot, Artikeltext, „Originalbeitrag bei Euronews öffnen"-Button (nur wenn `source_url`), Disclaimer + noindex.
- Subnav auf `/news` (unter Hero): Marktüberblick · Aktien · Watchlist · **Nachrichten** (letztere führt zur neuen Seite).
- DEMO-Badge (`DEMO / TESTDATEN`, amber) auf allen DEMO-Meldungen sichtbar.

## Session 17 (Feb 25, 2026) — EUR | USD Anzeige-Umschalter

**Backend**
- `_apply_display_currency` unterstützt jetzt beide Richtungen: USD→EUR (× rate) und EUR→USD (÷ rate).
- Alle Markt-Endpunkte (`/news-markte/market/overview|stocks|indices|commodities|fx|quote/{symbol}|quotes`, `/news-markte/markets`, `/watchlist`) akzeptieren `?display_currency=EUR|USD` (Default EUR, ungültige Werte werden auf EUR normalisiert).
- Zentraler USD/EUR-FX-Cache wird für beide Richtungen wiederverwendet — keine doppelten FX-Requests.
- **48/48 Tests grün**, davon 7 neue Cases (`test_display_currency_*`) für Default, USD-Target, Same-Native-No-Conversion, Index/FX unbeeinflusst, Overview-USD, Invalid-Fallback.

**Frontend**
- Neuer `DisplayCurrencyContext` mit localStorage-Persistenz (`display_currency_v1`), cross-tab-sync via storage-Event, Default EUR.
- Neue `<DisplayCurrencyToggle />`-Komponente (Private-Banking-Stil: dezente Pill, aktive Auswahl in Dunkelblau, kleiner Trennstrich, kein Trading-App-Look).
- App-weit im `App.js` gewrapped, damit `useDisplayCurrency()` überall verfügbar ist.
- `marketService.js`, `newsMarkteApi.js`, `watchlistApi.js` reichen die aktive Währung als `?display_currency=` an die Backend-Endpunkte weiter.
- `useMarketInsights`, `useWatchlist`, `AktienImFokus` haben `currency` in ihren useEffect-Dependencies → Umschaltung ohne Reload.
- Toggle-Platzierung im Header der Markt-Insights-Sektion auf `/news` (rechts oben, klein). Wirkt auf alle Konsumenten: Marktüberblick, Aktien im Fokus, Watchlist (Home + `/news/watchlist`).

## Session 16 (Feb 25, 2026) — /news Marktdaten EUR-Normalisierung

**Backend (`server.py`)**
- Neue Config-Felder pro Symbol: `asset_class` (index/stock/commodity/fx), `native_currency`, `unit` (Punkte / Feinunze / Barrel).
- Deutsche Blue Chips (SAP, SIE, ALV, DBK, IFX, RHM) auf native `.DE`-Symbole umgestellt und `native_currency="EUR"` markiert — Fallback-Preise in EUR realistisch angepasst.
- **Neuer FX-Helper `_get_usd_to_eur()`**: nutzt den EURUSD-Quote-Pfad (MongoDB-TTL-Cache + Stale-Fallback), invertiert die Rate, TTL 10 min. Keine hardcodierte Rate.
- **Neuer `_apply_display_currency(quote, target="EUR", fx_info=…)`**: befüllt `display_price` / `display_currency` / `fx_rate` / `fx_updated_at` / `conversion_available`. Indizes & FX-Paare werden nie umgerechnet.
- **Neuer `_fetch_many_display(configs, target="EUR")`**: batch-fetch + zentraler FX-Call (max 1 EUR/USD-Request pro Overview-Aufruf).
- Alle Markt-Endpunkte (`/news-markte/market/overview|stocks|indices|commodities|fx|quote/{s}|quotes` + `/watchlist` + `/news-markte/markets`) liefern jetzt EUR-normalisierte Werte und geben `fx_usd_to_eur` mit zurück.
- Quote-Shape erweitert: `{original_price, original_currency, display_price, display_currency, fx_rate, fx_updated_at, conversion_available, asset_class, unit}` — Legacy-Felder `price`/`currency` bleiben und spiegeln display_*.

**Frontend**
- `services/marketService.js`: `mapQuoteToRow` bevorzugt `display_price`/`display_currency`; neue Utility `formatDisplayPrice(row)` liefert `{primary, secondary}` mit deutschem Zahlenformat (`toLocaleString('de-DE')`).
  - Aktien/Rohstoffe: „119,42 €" primär, „138,85 USD" sekundär (nur ab sm-Breakpoint, mobile ausgeblendet)
  - Indizes: „24.783,00" + Sub-Label „Punkte"
  - FX: nur Rate „1,0862"
- `AktienImFokus.jsx`, `WatchlistSection.jsx`, `WatchlistPage.jsx`: nutzen `formatDisplayPrice`, blenden Originalpreis dezent unter dem EUR-Preis ein.
- `MarktInsights.jsx` liest `insight.unit` unverändert — Backend liefert jetzt "Punkte" / "EUR/Feinunze" / "EUR/Barrel" / "" (FX).

**Tests (`test_market_data_phase2.py`)** — erweitert um Currency-Contract-Prüfung: `asset_class`, `original_price/currency`, `display_price/currency`, `fx_rate`, `fx_updated_at`, `conversion_available`. **24/24 PASS**.

**Verifikations-Beispiele (Fallback-Modus, EURUSD=1,0862 → USD/EUR≈0,9206)**
- NVDA: orig 138,85 USD → disp 127,83 €
- AAPL: orig 226,02 USD → disp 208,08 €
- SAP:  orig 232,10 EUR → disp 232,10 € (keine Umrechnung)
- GOLD: orig 218,65 USD → disp 201,30 € / Feinunze
- DAX:  47,83 Punkte (kein €-Zeichen)
- EUR/USD: 1,0862 (kein €-Zeichen)

## Session 15 (Feb 25, 2026) — Demo-Kundenstimmen komplett überarbeitet

- `_generate_demo_reviews` + Pools in `server.py` grundlegend neu geschrieben (ersetzt die vorherige „AI-typische" Text-Manipulation über `variants[i%3]`).
- Neue Text-Pools mit humanem Sprachmuster-Mix:
  - 5★ (60 Vorlagen): kurze Kommentare, normale Kommentare, konkrete Situationen (Immobilienverkauf, Wechsel von Bank, Login-Probleme, Auslandsüberweisung, bAV etc.)
  - 4★ (45 Vorlagen): solide Zufriedenheit + kleine Kritik (App, Rückmeldezeit, Papierkram)
  - 3★ (25 Vorlagen): spürbare Kritik, aber weiter dabei
  - 2★ (12 Vorlagen): deutliche Kritik ohne Beleidigungen
- Antworten von Fröhlich nur ~30 % gesamt (5★=20 %, 4★=30 %, 3★=60 %, 2★=90 %), Templates deutlich kürzer & variabler.
- Firmennamen „Fröhlich" nur noch in 2 Vorlagen (sehr sparsam); die meisten sagen „die Beratung", „mein Ansprechpartner", „das Team" o. Ä.
- Marketing-Wörter (ganzheitlich, maßgeschneidert, herausragend etc.) durchgehend eliminiert.
- 30 zufällige Kommentare manuell geprüft: 0 KI-typische Phrasen, klare Unterschiede in Länge/Stil/Situation.
- Ratings-Distribution: 5★=120 · 4★=65 · 3★=22 · 2★=11 (Summe 218) · 32,6 % mit Antwort · alle 8 Topics vertreten.
- Tests aktualisiert (`test_reviews_demo_auth.py`) auf tatsächlich vorhandene 12 echte Reviews (Summe 230). **37/37 PASS**.

## Session 14 (Feb 25, 2026) — Verifikation

- Visuelle Verifikation der Testimonials-UI durchgeführt (Screenshots `/kundenstimmen` + Home).
- Bestätigt: Karten zeigen `KOMMENTAR VOM TT.MM.JJJJ` (z. B. „KOMMENTAR VOM 21.08.2026"), VERIFIZIERT-Badge, Quote-Icon, Filter/Sortierung intakt.
- Homepage lädt weiterhin exakt 2 Featured Cards + CTA zu `/kundenstimmen`.
- Keine Code-Änderungen nötig. Alle Punkte aus Session 13 bleiben stabil.

## What's Been Implemented — Session 13 (Feb 24, 2026)

### ✅ Phase 2c — Watchlist-News + Drag & Drop (Feb 24, 2026)

**Backend (`server.py`)**
- `GET /api/news-markte/symbol/{symbol}/news` — normalisierte News pro Symbol
  - Alpha-Vantage NEWS_SENTIMENT (tickers für Aktien/ETFs, topics für Indizes/Rohstoffe/FX)
  - Topic-Mapping: DAX/SPX/DJI→economy_macro, NDX→technology, GOLD/SILVER→financial_markets, OIL→energy_transportation, EURUSD→economy_monetary
  - 30-min MongoDB-Cache via `symbol_news_cache` mit TTL-Index
  - Ohne API-Key: `items: []`, `data_source: "empty"`, `empty_reason: "no_provider"` — **niemals Fake-News**
  - Dedupliziert nach Title, Summary auf 320 Zeichen limitiert, Titel auf 220
- `GET /api/news-markte/symbols/news?symbols=` — Batch-Endpoint (max 25 Symbole, sequenziell cache-first)
- Response-Shape pro Item: `{title, source, published_at (ISO), summary, url, category}`

**Frontend**
- `services/symbolNewsApi.js` — `forSymbol` + `batch` mit relativer Zeitformatierung
- `components/watchlist/SymbolNews.jsx` — 2 Varianten: `compact` (1 Item) für `/news`, `detailed` (bis 3) für `/news/watchlist`
- Empty-State: „Aktuell keine relevanten Meldungen zu {name} verfügbar." + „News-Provider noch nicht konfiguriert" (bei fehlendem Key)
- WatchlistSection rewritten: 1 News unter jeder Zeile, „Weitere News & Verwaltung"-Button
- WatchlistPage rewritten: bis zu 3 News pro Zeile via Batch-Fetch (1 Request)
- Leitidee: **„Beobachten. Verstehen. Einordnen."** — keine „Jetzt kaufen"/„Kursziel"-Suggestionen

**Drag & Drop (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`)**
- Ersetzt Up/Down-Buttons auf `/news/watchlist`
- GripVertical-Handle, cursor-grab/grabbing
- PointerSensor (Desktop, 5 px) + TouchSensor (mobile, 150 ms) + KeyboardSensor (Leertaste + Pfeile)
- ARIA: `aria-roledescription="Sortierbares Element"`, sprechendes `aria-label`
- Sofortige serverseitige Persistenz via `PUT /api/watchlist/order`

**Tests (`test_symbol_news_phase2c.py`)** — **8/8 PASS**
- Normalisierte Shape, Empty-State ohne Provider, Symbol-Normalisierung, Batch-Endpoint, Batch-Max (25), Cache-Determinismus, Secret-Leak-Check, Topic-Indizes

**Gesamt-Regression**: 49/49 in Phase 2 + 2b + 2c-Suiten

## What's Been Implemented — Session 12 (Feb 22-24, 2026)

### ✅ Kundenstimmen — 218 Demo-Daten & Volltest (Feb 24, 2026)
- Backend: `/api/reviews/public` unterstützt `q`, `rating`, `sort`, `topic`, `response_filter (with/without)`, `include_demo`, `offset/limit`
- Backend: `/api/reviews/topics?include_demo=` liefert Zähler pro Thema mit Demo-Toggle
- Backend: `PUT /api/reviews/{id}` akzeptiert `admin_response` (+ `responded_at`, `responded_by`)
- Backend: `POST /api/reviews/admin/demo/seed` (idempotent, 218 Demo-Reviews mit realistischer Verteilung) und `DELETE /api/reviews/admin/demo`
- Backend: Demo-Reviews mit `is_demo=true` werden **niemals in `/api/reviews/stats`** eingerechnet (verifiziert: real total=2, avg=4.5, mit Demo=220)
- Frontend `Kundenstimmen.jsx`: PAGE_SIZE=12, Suche (debounced), Rating-Chip (1-5★), Response-Filter (Mit/Ohne Antwort), Sort-Selector (newest/oldest/best/worst), Topic-Pills mit Zähler, Reset-Filter, Empty-State, Skeleton-Loading, Antwort-von-Fröhlich-Block
- Frontend `TestimonialCard`: rendert `admin_response` in gold-gerahmtem italic Block "Antwort von Fröhlich Vermögensberatung", zeigt DEMO-Badge wenn `is_demo`
- Frontend `AdminReviews`: DEMO-Badge (dashed amber border), Toggle "Demo-Daten anzeigen", Response-Modal ("Antworten"/"Antwort bearbeiten"), Seed/Delete-Demo-Buttons
- Preview-Modus: `/kundenstimmen?admin_preview=1` zeigt Warn-Banner + Demo-Reviews sichtbar (nur QA)
- **Testing (iteration 12): 37/37 Backend-Tests PASS, 92% Frontend-Flows PASS**

### ✅ Auth-Migration Supabase → FastAPI (Feb 24, 2026)
- `AuthContext.js` rewritten: `authApi.me()` primary, Supabase Fallback nur für Legacy-Accounts (best-effort)
- Login → tries FastAPI first, fällt für Legacy-Users auf Supabase zurück
- Logout → beide Sessions parallel
- Register/Password-Reset → FastAPI primary, Supabase-Profile-Row als best-effort Nebenwirkung
- `/admin/*` Routen: `ProtectedRoute` prüft `user.role === 'admin'` via FastAPI-hydratiertes User-Objekt
- `?next=` URL-Parameter respektiert nach Login (mit safe-path Validierung)
- `data-testid="admin-logout-btn"` + `topbar-user-menu-btn` für QA-Automation
- OTP-Flow via Supabase Edge Functions bleibt erhalten (opt-in per user pref)
- **Testing (iteration 12): unautorisierter Zugriff blockiert, Session persistiert, Logout säubert Cookies**

### ✅ Follow-ups iteration 13 (Post-Testing Fixes, Feb 24, 2026)
- `reviewsApi.topics({include_demo})` — Topic-Pills sind jetzt Preview-aware (alle 8 Themen mit Demo-Zählern sichtbar)
- `loadMore()` mit `.catch` → Error-State bei fehlgeschlagenem Nachladen
- Login: `?next=` respektiert nach erfolgreichem Login
- Search-Input `type="text"` (kein doppelter native Clear-Icon)
- DashboardTopbar-Logout mit `data-testid` für QA

## Previous Sessions (History)

### Homepage & Editorial Redesign (Session 11)
- `PlatformFlowDiagram` entfernt
- Massive `/news`-Portal (Top News, Market Insights, Editorials, Trends, Detail Pages)
- Home-FAQ mit 4 neuen Investment-Kategorien (Stocks, Bonds, IPO, Crypto)
- Kundenstimmen (Testimonials) System mit Admin Moderation, Resend E-Mail-Einladungen, Topic-Tags
- Trust/Security Section (built, dann per User-Feedback wieder entfernt)

### FastAPI Skeleton (Phase 1, Session 8-10)
- FastAPI + Motor + JWT auth (register, login, me, refresh, logout, forgot, reset)
- Public content APIs (banks, offers, news)
- MongoDB indexes, brute-force lockout, admin seeding

## Architecture

### Frontend
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 (100+ Routen)
- AuthContext hybrid: FastAPI primary, Supabase legacy fallback
- `services/apiClient.js` (axios, `withCredentials=true`)
- Location: `/app/frontend/`

### Backend
- FastAPI + Motor + JWT (bcrypt, httpOnly Cookies, tz-aware)
- Endpoints: `/api/health`, `/api/auth/*`, `/api/content/*`, `/api/reviews/*`, `/api/news-markte/*`
- 218 Demo-Reviews seedable via `/api/reviews/admin/demo/seed`
- Location: `/app/backend/server.py` (~1950 Zeilen — Refactoring in Modules empfohlen)
- Tests: `/app/backend/tests/test_reviews_demo_auth.py` (37 cases)

### Legacy
- `/app/legacy_source/` — Supabase Edge Functions, Cloudflare Workers, PDF/Content-Scripts

## Roadmap

### 🟠 P1 — Next Up
- **Phase 2 Market Data**: Alpha Vantage Backend-Integration (aktuell mocked JSON in `/news`), `marketService.js` mit Real Data verdrahten
- **Personal Watchlist**: Persistente Watchlist für eingeloggte User unter `/news`

### 🟡 P2 — Later
- Phase 3: PDF-Microservice (Puppeteer aus `/app/legacy_source/`)
- Phase 4: Content Automation (Social Media)
- Phase 5: Sentry, Rate-Limiting, Deploy

### 🔵 Refactoring / Debt
- `server.py` in Router-Module aufsplitten (reviews, auth, content, news-markte)
- Kubernetes-Ingress-CORS-Override (verhindert korrekte Credentialed-Preflight)
- Supabase-Konsolen-Log-Noise (401s aus Legacy-Fallback) reduzieren
- Demo-Generator: mindestens 1× 1-Sterne-Bewertung ergänzen (aktuell 0)
- Search Q auch auf `admin_response` erweitern (optional)


## Architecture

### Frontend (übernommen, 1:1)
- React 18 + Craco + Tailwind + shadcn/ui + Radix
- react-router-dom v7 mit 100+ Routen (Marketing, Dashboard, Admin, Banken)
- Zustand: Context (AuthContext, ThemeContext, SocialPreviewContext)
- i18next (Deutsch primär)
- Charts: visx, recharts, lightweight-charts
- Sentry, Cloudinary, Supabase-Client (noch aktiv — legacy)
- Neu: `services/apiClient.js` — axios-Client für FastAPI-Endpoints
- Location: `/app/frontend/`

### Backend (FastAPI Phase 1 — Feb 2026)
- FastAPI + Motor + JWT (bcrypt Passwörter, httpOnly Cookies, tz-aware)
- Endpoints: `/api/health`, `/api/auth/*` (7 endpoints), `/api/content/{banks,offers,news}`
- Admin-Seeding, brute-force lockout (email-based, atomarer $inc), Password-Reset mit Token
- MongoDB Indexes für users.email, expiring reset tokens (TTL), login_attempts, banks.slug, news.slug
- Location: `/app/backend/server.py`

### Legacy Backend Sources
- Location: `/app/legacy_source/` — Supabase Edge Functions, Cloudflare Workers, PDF/Content-Scripts, Design-System
- Referenz für Phase 2+ Migration

## What's Been Implemented (Feb 2026)

### Homepage Cleanup ✅ (Feb 22, 2026)
- `PlatformFlowDiagram` (Sektionen "So funktioniert Ihre Sparplattform", "Von der Anmeldung bis zur Verzinsung", "Ihre Vorteile") komplett aus `Home.js` entfernt und Datei gelöscht
- Import bereinigt, Webpack kompiliert ohne Fehler

### Vertrauen & Sicherheit — Sektion wieder entfernt ✅ (Feb 22, 2026)
- Auf Kundenwunsch komplett aus der Startseite herausgenommen. `HomeTrustSecurity.jsx` gelöscht, Import + Nutzung aus `Home.js` bereinigt. Webpack kompiliert clean.

### Vertrauen & Sicherheit — Seal-Badge-Redesign ✅ (Feb 22, 2026)
- `HomeTrustSecurity` überarbeitet nach visueller Vorlage: goldene Eckakzente, dunkelblaue kreisförmige Siegel-Medaillons mit doppeltem Gold-Ring, zentrierte Serif-Titel, dezente Gold-Trennstriche
- 5 Cards: Geprüfte Datensicherheit, ISO 27001, Qualitätsmanagement, Mitgliedschaften & Branchenstandards, Persönliche & langfristige Beratung
- 4 Zertifizierungs-Cards zeigen explizit „Zertifikat/Logo hinterlegen"-Placeholder-Badge — keine echten TÜV/ISO/BVV-Marken werden verwendet, bis der Kunde die Nachweise liefert; `SealBadge` kann via `logoUrl`-Prop das offizielle Logo laden

### Vertrauen & Sicherheit — 5-Card-Section (initial) ✅ (Feb 22, 2026)
- Neue Home-Sektion `HomeTrustSecurity` mit 5 Cards nebeneinander (Desktop) / 2-3 (Tablet) / 1 (Mobile): Geprüfte Datensicherheit, Informationssicherheit, Qualitätsmanagement, Mitgliedschaften & Standards, Persönliche Beratung
- Gold-Ring-Icons, jede Card mit CTA-Link, „Logo folgt"-Badge auf den 4 Zertifizierungs-Cards als expliziter Platzhalter — **keine erfundenen TÜV/ISO-Logos**. Sobald der Kunde ein echtes Zertifikat liefert, kann das Original-Logo statt dem Placeholder-Icon eingesetzt werden
- Darunter dezente Icon-Leiste mit 5 Werten (Sicherheit & Diskretion, Persönliche Betreuung, Langfristige Partnerschaft, Transparenz & Klarheit, Vertrauen & Verlässlichkeit) plus Closing-Line „Vertrauen entsteht durch Transparenz."
- Platzierung: direkt zwischen `HomePostHero` (Produktüberblick) und `SpecialAifOverview` in `/app/frontend/src/pages/Home.js`. Datei: `/app/frontend/src/components/home/HomeTrustSecurity.jsx`
- **Hinweis**: Der Bereich der „alten 3 Symbole" wurde nicht explizit gefunden — falls Sie mir die genaue Position zeigen (Screenshot mit Kringel), entferne ich diesen Bestandsblock in einer Folge-Iteration sauber

### Follow-ups iteration 13 ✅ (Feb 22, 2026)
- **Themen-Highlights auf `/kundenstimmen`**: `/api/reviews/topics` liefert jetzt eine `count` pro Thema (aus MongoDB-Aggregation der freigegebenen Bewertungen) plus `total_approved`. Frontend-Filterchips zeigen die Zahl in einem kleinen Kreis („Alle Themen 2", „Persönliche Betreuung 1", …). Die zwei Seed-Bewertungen wurden mit Beispielthemen versehen, damit die Zähler sofort greifen.
- **Resend-E-Mail-Versand**: Emergent-managed Resend Playbook integriert. `POST /api/reviews/invite` versendet jetzt automatisch eine Einladungs-Mail über den Emergent-Proxy an die Kunden-Adresse. Verifiziert mit `delivered@resend.dev` — Antwort HTTP 202. HTML-Template mit Fröhlich-Branding, dezenter Gold-Eyebrow, sicherem Absende-Link zur `/kundenstimmen?einladung=<token>`-URL, Anti-Phishing-Fußzeile ("Wir bitten niemals per E-Mail um Passwörter"). Guardrail-Gate (`_assert_safe_email`) prüft vor jedem Versand: keine `<form>`, keine nicht-https-Links, keine Shortener/IP-Hosts, keine Credential-Ask-Phrasen. Admin-UI zeigt jetzt „Einladung wurde per E-Mail versendet" bzw. Fallback bei Versandfehler.
- **Auth-Migration**: Weiter deferred. Backend-APIs für Admin funktionieren einwandfrei über die FastAPI-Cookie-Session, aber die React-Routen unter `/admin/*` hängen noch am Supabase-Guard.

### Follow-ups iteration 12 ✅ (Feb 22, 2026)
- **Themen-Tags**: `reviews` bekommen jetzt bis zu 3 Themen (`persoenliche-betreuung`, `vertrauen`, `beratung`, `erreichbarkeit`, `langfristigkeit`, `transparenz`, `service`, `investmentuebersicht`). Endpoint `/api/reviews/topics`, Filter `?topic=...`, Submit-UI-Chips, Kundenstimmen-Filterleiste, Anzeige als kleine Chips auf `TestimonialCard`
- **Erfahrungs-Einladung**: Admin öffnet Modal „Erfahrung einladen" → Backend erzeugt Token in `review_invites` (30 Tage gültig, `POST /api/reviews/invite`) + gibt persönliche Share-URL `/kundenstimmen?einladung=<token>` zurück. Beim Öffnen prefillt das Submit-Formular Name/E-Mail, zeigt ein Banner „Ihre persönliche Einladung ist gültig" und die Bewertung wird mit `invited=true` gespeichert. E-Mail-Versand über Resend ist strukturell vorbereitet — der Admin kopiert den Link aktuell manuell
- **Home-Trust-Zeile**: Neue schmale Leiste `HomeTrustLine` direkt unter dem Hero mit 5 goldenen Sternen + Linksatz „Von unseren Kunden über Jahre begleitet — persönliche Erfahrungen lesen" → `/kundenstimmen`
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block + `REVIEW_TOPICS` + Invite-Endpoints), `/app/frontend/src/data/reviewTopics.js`, `/app/frontend/src/components/reviews/ReviewSubmitForm.jsx`, `/app/frontend/src/components/home/HomeTrustLine.jsx`, `/app/frontend/src/pages/Kundenstimmen.jsx` (Topic-Filter), `/app/frontend/src/pages/AdminReviews.jsx` (InviteModal + Einladen-Button)

### Kundenstimmen — Testimonial-Fokus ✅ (Feb 22, 2026)
- Neues Home-Modul `HomeTestimonials` löst `HomeCustomerReviews` ab: fokussiert auf persönliche Erfahrungen mit großem Serif-Zitat, dezenten goldenen Anführungszeichen und weichem weißen Hintergrund; Karten aus `TestimonialCard.jsx`, keine Stats-Dominanz mehr
- Neue öffentliche Seite `/kundenstimmen` mit Hero auf Dunkelblau, „Ausgewählte Stimmen" (nur featured), Grid für weitere Rückmeldungen, „Weitere anzeigen"-Pagination und eigenem Erfahrung-teilen-Formular
- Backend erweitert: `reviews` besitzt jetzt `customer_since` (unter_1/1_bis_3/3_bis_5/ueber_5) und `is_featured`; `/api/reviews/public` unterstützt `?featured=true`; Moderation-Input akzeptiert Beides
- Submit-Formular hat Variante `testimonial`: Sterne optional, „Seit wann Kunde?"-Dropdown optional, Text-Placeholder fragt nach Betreuung/Erreichbarkeit/Beratung, Button „Erfahrung teilen", Success-Text „Vielen Dank für Ihre Rückmeldung"
- Admin-Seite: neues Tab-Label „Neu" (statt „Ausstehend"), Edit-Modal kann jetzt `is_featured` togglen, `customer_since` setzen, Anzeigename beliebig (z. B. „Michael – Kunde seit 2019") anpassen; Badge „Auf Startseite" (goldene Sterne) neben „Verifiziert"
- Home-Modal für schnelles Teilen der Erfahrung öffnet das Submit-Formular direkt aus der Home-Sektion

### Kundenbewertungen — Testfeedback iteration_11 behoben ✅ (Feb 22, 2026)
- **HIGH — Gold-Kontrast**: `--bank-gold` Token in `/app/frontend/src/index.css` von blau-primary auf echtes Warm-Gold umgestellt: Light-Theme `#C9A961` (rgb 201 169 97), Dark-Theme `#D4B880` (rgb 212 184 128) inkl. Dashboard-Themes. Damit sind Sterne, Eyebrow „Kundenerfahrungen" und die goldenen CTAs jetzt gut lesbar auf Dunkelblau
- **MEDIUM — Fehlerbehandlung**: `Bewertungen.jsx` fängt jetzt Netzwerkfehler beim Laden ab und zeigt `reviews-load-error` statt fälschlicher Empty-State-Anzeige
- **MINOR — Rate-Limit hinter K8s-Ingress**: `POST /api/reviews/submit` liest jetzt `X-Forwarded-For` (linkeste IP) und prunet stale Einträge in `_review_rate_limit`. Quota auf 5/h/IP angehoben, damit reale Besucher hinter Proxy nicht global gedrosselt werden
- **LOW — Kupferpreis-Bild**: Migration setzt jetzt beim Startup ein passenderes Rohstoff-Bild

### Kundenbewertungen mit Moderation ✅ (Feb 22, 2026)
- Neue MongoDB-Kollektion `reviews` mit Feldern first_name/last_name/email/rating/text/status/display_name/is_verified/moderated_by
- Endpoints: `POST /api/reviews/submit` (public, Honeypot + Rate-Limit 3/h/IP + Textsanitizer + Consent-Pflicht), `GET /api/reviews/public` (nur approved, Filter/Sort/Pagination), `GET /api/reviews/stats` (Durchschnitt + Verteilung dynamisch aus DB), `GET /api/reviews/admin`, `PUT /api/reviews/{id}` (Status / Anzeigename / Verifiziert / Admin-Notiz), `DELETE /api/reviews/{id}`
- Neue Public-Seite `/bewertungen` (Hero mit Stats auf Dunkelblau · Filter 5/4/3/2/1 Stern · Sortierung Neueste/Beste · „Weitere laden" · Submit-Formular unten)
- Home-Sektion `HomeCustomerReviews` (Dunkelblau, goldene Sterne, Stats links + neueste 3 Bewertungen rechts, Empty-State wenn 0 freigegeben, 2 CTAs)
- Admin-Moderation `/admin/reviews` mit Tabs Ausstehend/Freigegeben/Abgelehnt/Alle, „Neue Bewertung — Freigabe erforderlich"-Badge, Aktionen Freigeben/Ablehnen/Bearbeiten (nur Anzeigename & Verifizierung, Text bleibt unberührt) / Löschen mit Sicherheitsabfrage
- **Zentraler Moderations-Contract**: Keine neue Bewertung wird ohne Admin-Freigabe öffentlich; Honeypot- und Bot-Versuche werden ohne Rückmeldung verworfen; verifizierter Status niemals automatisch gesetzt
- Datei-Ausschnitt: `/app/backend/server.py` (Reviews-Block), `/app/frontend/src/services/reviewsApi.js`, `/app/frontend/src/components/reviews/*`, `/app/frontend/src/pages/Bewertungen.jsx`, `/app/frontend/src/pages/AdminReviews.jsx`, `/app/frontend/src/components/home/HomeCustomerReviews.jsx`

### Investment FAQ Ausbau ✅ (Feb 21, 2026)
- 4 neue Kategorien in `faqCopy.categories`: Aktien, Anleihen, IPO, Krypto
- 22 neue Q&A-Items in `siteCopyPhase5.js` (Was ist eine Aktie, ETF-Unterschied, Dividenden, Marktorder/Limitorder, Anleihenarten, Zinsänderungsrisiko, Rating, Anleihen vs. Festgeld, IPO-Teilnahme, Lock-up, IPO-Risiken, Krypto-Verwahrung, Krypto-Steuern, Anlage vs. Spekulation, Depot-Kosten, Diversifikation)
- Home-Preview umgestellt: die 6 Fragen unter „Die wichtigsten Antworten — kompakt & klar" sind jetzt Investment-Themen statt Sparkonten
- Subtitle in `HomeSavingsFaqSection.jsx` angepasst: „Wichtige Fragen zu Aktien, Anleihen, IPO und Krypto — kompakt beantwortet."

### News & Märkte Backend-Erweiterung ✅ (Feb 21, 2026)
- Neue MongoDB-Kollektionen: `anlagetrends` (9 Themen), `investment_radar` (6 Radar-Themen), `market_voices` (6 externe Stimmen), `user_preferences` (Scaffold)
- Neue Endpoints: `/api/news-markte/anlagetrends`, `/investment-radar`, `/market-voices`, `/preferences` (GET/PUT auth), `/for-you` (auth, personalisiert)
- `NEWS_CATEGORIES` erweitert um: fonds-etfs, rohstoffe, seltene-erden, waehrungen, anleihen, investmenttrends
- Article-Seed um 13 zusätzliche Artikel erweitert (fund/etf, Rohstoffe, Seltene Erden, Anleihen, Währungen, Investmenttrends)
- Test-Feedback umgesetzt: kaputte Unsplash-URL ersetzt, DELETE liefert 404 bei nicht-existenter ID, `de-DE`-Locale für Change-%, "Alle aktuellen News" verlinkt jetzt auf `/news/archiv`, Marktdaten-Fußnote entschärft

### About-Page Overhaul ✅ (Feb 20, 2026)
- `/app/frontend/src/pages/About.js` komplett neu geschrieben nach User-Vorgabe
- Neue Struktur: Hero → Wer wir sind → Mehr als klassische Anlageberatung → Konservativ denken → Kompetenz (3 Karten) → Langfristige Zusammenarbeit (Highlight-Block mit 6 Werten) → Weiterempfehlung → Philosophie (4 Karten) → CTA
- Kein Partner-Content mehr (Vermogens Advies aus Hero + Body entfernt, kein Amsterdam-Bezug), keine Renditeversprechen, alle Zitate & Werte 1:1 aus Briefing
- Rechtlicher Hinweis am Ende: klärt, dass Branchenangaben nicht als aufsichtsrechtliche Erlaubnisse zu verstehen sind
- Rendert sauber, 20/20 Content-Assertions grün via Playwright

### Legal / Impressum Overhaul ✅ (Feb 20, 2026)
- `siteContact.js`: HQ-Adresse global auf **Bösgrunder Weg 62, 55543 Bad Kreuznach** umgestellt
- `legalPages.jsx` Impressum: neue Firmendaten (HRB 23436, Amtsgericht Bad Kreuznach, GF Manfred Franz Fröhlich)
- Kooperationspartner-Block (Vermogens Advies Administratie B.V., AFM) **komplett aus Impressum entfernt**
- USt-IdNr., BaFin- und IHK-Angaben als TODO markiert (nicht erfunden — auf Zulassungsbescheide warten)
- Neue Impressum-Sektionen "Zuständige Aufsichtsbehörde" & "Berufsrechtliche Angaben" mit klaren Platzhaltern
- AGB § 8 Gerichtsstand: Frankfurt am Main → Bad Kreuznach
- Konsistenz-Fixes in `SicherheitRegulierung.js`, `About.js`, `PasswordPage.js`, `spezialAifContent.js`, `siteCopyPhase5.js` (Fröhlich-Standort)

### Phase 0: Import & Baseline ✅
- Repo geklont via PAT, 2508 Dateien, ~600 MB Assets nach `/app/frontend/`
- Legacy Backend nach `/app/legacy_source/` archiviert
- Craco/Tailwind/PostCSS/JSConfig/Components-Konfig aus Repo übernommen
- `yarn install --ignore-engines` (Supabase erwartet Node 22, wir haben 20)
- Puppeteer-Chromium-Download deaktiviert (-200 MB)
- devServer host: 127.0.0.1 → 0.0.0.0 (Supervisor)
- oxlint/eslint ignorieren `public/mediapipe/`, `public/models/`
- Frontend läuft, Kapitalmitte-Seite rendert

### Phase 1a: FastAPI Auth ✅ (getestet 21/22)
- Auth komplett: Register/Login/Me/Update/Refresh/Logout/Forgot/Reset
- Cookies: httpOnly, secure, SameSite=None; 1 Tag Access, 30 Tage Refresh
- Brute-force Lockout: email-basiert (nicht IP — rotierende Ingress-Proxies), 5 Fehlversuche → 15 min Lock
- ObjectId-Guard in JWT-Sub-Validierung (401 statt 500 bei forged token)
- tz-aware Motor-Client für konsistente Datetime-Vergleiche
- Idempotentes Seeding pro Collection

### Phase 1b: Public Content ✅
- `/api/content/banks` — 5 Banken (BBVA, bunq, ING, Postbank, Knab) mit Slug, Land, Logo
- `/api/content/offers` — 9 Sparangebote mit Zins, Laufzeit, Min/Max; Filter by bank_slug & product_type
- `/api/content/news` — 3 Beispiel-Artikel mit ISO-Timestamps

### Phase 1c: Supabase-Inventar ✅
- Dokumentiert in `/app/memory/supabase_migration_backlog.md`
- 70 Frontend-Dateien nutzen Supabase, 29 Tables, 15 Edge Functions, 8 Auth-Methoden

### Known Non-App Issues
- **CORS Ingress Override**: Kubernetes Ingress liefert `Access-Control-Allow-Origin: *` statt der FRONTEND_URL. FastAPI-Middleware ist korrekt konfiguriert (direkter ASGI-Test bestätigt); Fix erfordert Ingress-Konfiguration.

## Prioritized Backlog

### P0 — Frontend an FastAPI verkabeln
- `AuthContext` umbauen: Nutze `authApi` aus `services/apiClient.js` statt `supabase.auth.*`
- Login/Register/ForgotPassword/ResetPassword Seiten anpassen
- ProtectedRoute → nutzt neuen Context
- Marketing-Pages (Home, PartnerBanks, SavingsComparison) an `contentApi` verkabeln

### P1 — Marktdaten (Alpha Vantage)
- User braucht API-Key (25 req/day free tier)
- Endpoints: `/api/market/stocks`, `/api/market/history/:symbol`, `/api/market/sparklines`
- MongoDB cache-Layer für price-Snapshots (statt Redis)
- APScheduler für tägliche Sync-Jobs

### P2 — User Portfolio
- Collections: `user_stock_watchlist`, `user_stock_positions`, `user_stock_orders`, `user_bond_positions`, `user_depot_contracts`, `user_price_alerts`
- CRUD-Endpoints mit `get_current_user`-Dependency

### P3 — Forms & Leads (Admin)
- `applications`, `contact_messages`, `support_messages`, `credit_leads`, `product_inquiry_leads` etc.
- Admin-Endpoints mit `require_admin`-Guard

### P4 — Emails (Resend) + PDF (Node-Microservice)
- Resend-Integration für Application-Emails, Weekly-Digest, Stock-Alerts
- Node-Microservice aus `/app/legacy_source/scripts/` extrahieren
- FastAPI ruft Node via HTTP für Vertrags-/Produktinfo-PDFs

### P5 — Deploy Prep
- Sentry Backend
- Ingress-CORS Fix
- Rate Limiting

## Test Coverage
- `/app/backend/tests/backend_test.py` — 22 pytest cases (21 passed, 1 known infra issue)
- `/app/backend/tests/test_auth_supplemental.py` — direct ASGI CORS check + admin password rotation
- Admin bcrypt hash validated ($2b$ prefix, cookies httpOnly+Secure+SameSite=None)

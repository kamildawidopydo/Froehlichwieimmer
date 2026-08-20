# Fröhlich Vermögensberatung — Rebrand-TODOs

Nach dem Rename von "Kapitalmitte" → "Fröhlich Vermögensberatung" verbleiben
folgende Stellen mit alten `kapitalmitte`-Referenzen, die vom User bestätigt
werden müssen. **Diese wurden bewusst NICHT automatisch geändert**, weil sie
externe Identitäten (Social-Accounts, Domain, Email-Postfach) betreffen.

## 1. localStorage-Keys (BEHALTEN — nicht anfassen)
- `kapitalmitte_cookie_consent`
- `kapitalmitte_visitor_profile`

Ein Rename würde alle bestehenden User auslocken und deren Cookie-Zustimmung
verwerfen. Kann später über eine Migrations-Routine (mit Grace-Period-Read
aus dem alten Key) sicher migriert werden.

## 2. Email-Adressen (neue Kundenservice-Adresse eintragen)
**Aktuell überall verwendet:** `kundenservice@kapitalmitte.com`

Betroffene Dateien (jeweils sichtbare Kontakt-CTAs, Widerrufs-Text, Admin-Log):
- `context/AuthContext.js` (3 Stellen — Fehlermeldungen an User)
- `pages/Login.js`
- `pages/FAQ.js`
- `pages/AdminContractSubmissions.js`
- `pages/BBVAContractForm.js`, `BunqDeContractForm.js`, `PostbankContractForm.js` (Widerrufs-Text)
- `pages/bbva/BBVAFestgeldVertrag.js`
- `pages/bunq/BunqFestgeldVertrag.js`, `bunq/BunqFlexgeldVertrag.js`
- `pages/bunq-de/BunqDeFestgeldVertrag.js`, `bunq-de/BunqDeFlexgeldVertrag.js`
- `pages/knab/KnabFestgeldVertrag.js`, `knab/KnabFlexgeldVertrag.js`
- `pages/ing/IngFestgeldVertrag.js`
- `pages/postbank/PostbankFestgeldVertrag.js`
- `components/liveness/IdentityInterviewFlow.jsx`

**Aktion nötig:** Sag mir die neue Kundenservice-Email
(z. B. `kundenservice@froehlich-vermoegensberatung.de`), dann suche/ersetze ich
sie global.

## 3. Domain-URLs (neue Website-Domain eintragen)
**Aktuell überall verwendet:** `https://www.kapitalmitte.com` / `www.kapitalmitte.com` / `kapitalmitte.com`

Betroffene Bereiche:
- **Canonical / OG-URLs**: `components/PageMeta.js`, `public/index.html` (`<link rel="canonical" href>`, `og:url`)
- **Social-Profil-Websites** (`data/social/facebookProfile.js`, `linkedinProfile.js` — bereits mit TODO-Kommentar markiert)
- **Instagram Link-in-Bio** (`data/social/instagramProfile.js` — bereits markiert)
- **linkPreview-URLs** in Facebook/LinkedIn Posts (Zinsrechner-Vorschau)
- **Sichtbarer Copy-Text** wie „direkt auf kapitalmitte.com" in Post-Bodies
- **Body-Text auf About.js** („Über kapitalmitte.com bündeln wir…")
- **PDF-Generatoren** (`lib/generate*Pdf.js`) — Fußzeilen, Kopf
- **`lib/supabase.js`**, `context/AuthContext.js` (Kommentare + Fehlermeldung an User)
- **`data/customerDocuments.js`**, `data/bankBonusTexts.js` etc. (Rechtstexte)
- **`data/comparisonProfiles.js`**, `data/spezialAifPibContent.js`
- **Body-Text auf Vertrags-/Produktinfo-Seiten** wie „Vertriebsvergütung: Fröhlich Vermögensberatung kapitalmitte.com"
- **Locale-Dateien** `locales/de.json`, `locales/en.json`

**Aktion nötig:** Sag mir die neue Domain
(z. B. `https://www.froehlich-vermoegensberatung.de` oder eure echte
Prod-Domain), dann suche/ersetze ich global.

## 4. Social-Media-Handles / Account-URLs
**Aktuell (Kapitalmitte-Vorlagen, im Frontend als statische Vorschau):**
- Instagram: `@kapitalmitte` → `data/social/instagramProfile.js:username`
- Facebook: `kapitalmitte` (page handle) → `data/social/facebookProfile.js:handle`
- LinkedIn: `linkedin.com/company/kapitalmitte` (vanity) → `data/social/linkedinProfile.js:vanityUrl`

Alle drei sind mit `// TODO(Fröhlich Vermögensberatung):` markiert.

**Aktion nötig:** Sag mir die echten Handles der Fröhlich-Vermögensberatung-Accounts
(oder ob diese Social-Vorschau-Modale ganz entfernt werden sollen), dann suche/ersetze ich.

## 5. JS-Identifier (interne Code-Bezeichner — kein User-Impact)
Diese sind KEINE sichtbaren Texte, sondern interne Code-Namen. Sie können
bleiben oder für Cleanliness umbenannt werden:

- `KAPITALMITTE_REPLY_TEMPLATES` in `lib/humanizeReviewText.js`

Auto-Rebrand hat sie absichtlich nicht angefasst, damit sich keine Import-
Referenzen brechen.

## Rebrand — was AUTOMATISCH erledigt wurde
- **Alle sichtbaren Vorkommen** von `Kapitalmitte` (Word-Boundary-Match) →
  `Fröhlich Vermögensberatung` in `.js` / `.jsx` / `.json` / `.html`
  (Marketing-Copy, Headings, Buttons, Modal-Titel, alt/aria/title-Attribute,
  OG-/Twitter-Meta, Page-Titles, Social-Preview-Modal-Texte,
  linkPreview-Titles, imageAlt).
- **Uppercase `KAPITALMITTE`** in PDF-Renderer (`generateBunqPdf.js`) → `FRÖHLICH`.
- **Social-Handle-Zeilen** haben jetzt einen TODO-Kommentar direkt darüber,
  damit sie beim nächsten Blick nicht übersehen werden.

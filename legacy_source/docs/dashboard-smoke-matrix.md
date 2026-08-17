# Dashboard Refactor — Smoke / Regression Matrix

This matrix is the release gate for the dashboard refactor + role-hardening
work (Phases 0–6). It must be executed before tagging a release.

> Automated smoke layer (run with `npm test`) covers the pure logic for
> formatters, metrics, and the role contract. Everything else is manual.

## 0. Preconditions

- [ ] `git status` is clean.
- [ ] `npm install` is up to date.
- [ ] Apply the latest migrations:
      `supabase db push` (or your normal deploy flow). Required for
      `20260425120000_profile_role_user_admin_only.sql`,
      `20260425130000_bond_catalog_and_requests.sql`,
      `20260425134000_bond_request_approval_workflow.sql`,
      `20260425143000_extend_bond_approve_rpc.sql`,
      `20260425150000_seed_bond_catalog.sql`,
      `20260425160000_support_tickets.sql`,
      `20260512150000_product_inquiry_leads.sql`.
- [ ] `npm run build` exits 0 with no warnings.
- [ ] `npm test -- --watchAll=false` is green
      (`role`, `dashboardFormatters`, `dashboardMetrics` suites).

## 1. Role / Access Matrix (Phase 5)

| Persona            | Path                          | Expected                                                |
| ------------------ | ----------------------------- | ------------------------------------------------------- |
| Unauthenticated    | `/`, `/login`, `/register`    | Public marketing layout, accessible.                    |
| Unauthenticated    | `/dashboard/uebersicht`       | Redirected to `/login?next=/dashboard/uebersicht`.      |
| Unauthenticated    | `/admin`                      | Redirected to `/login?next=/admin`.                     |
| User (`role=user`) | `/dashboard/uebersicht`       | Loads in `UserDashboardLayout`.                         |
| User (`role=user`) | `/admin`                      | Redirected to `/dashboard/uebersicht`.                  |
| Admin              | `/admin`                      | Loads `AdminDashboardLayout`.                           |
| Admin              | `/admin/anleihen-katalog`     | Loads `AdminBondCatalog`.                               |
| Admin              | `/admin/anleihen-anfragen`    | Loads `AdminBondRequests`.                              |
| Tampered           | profile.role manually changed | DB CHECK rejects update; trigger rewrites to `'user'`.  |

DB checks (run in psql / supabase studio):

```sql
-- Should return only ('admin') and/or ('user'), nothing else.
select * from public.v_profile_roles;

-- Should fail with check constraint violation.
update public.profiles set role = 'anonymous' where id = '<some-id>';
```

## 2. User Dashboard Routes (Phases 1–3)

For each route below, verify (a) direct URL load, (b) sidebar active state,
(c) content matches the reference image of the same name.

- [ ] `/dashboard/uebersicht`
- [ ] `/dashboard/vermoegen` (Mein Vermögen hub)
- [ ] `/dashboard/depot` → redirects to `/dashboard/vermoegen`
- [ ] `/dashboard/festgeld`
- [ ] `/dashboard/tagesgeld`
- [ ] `/dashboard/flexgeld`
- [ ] `/dashboard/anleihen`
- [ ] `/dashboard/anleihen/kaufen`
- [ ] `/dashboard/aktien`
- [ ] `/dashboard/auftraege`
- [ ] `/dashboard/favoriten`
- [ ] `/dashboard/historie`
- [ ] `/dashboard/profil`

Compatibility redirects (Phase 0/2):

- [ ] `/dashboard?tab=portfolio` → `/dashboard/vermoegen`
- [ ] `/dashboard?tab=orders` → `/dashboard/auftraege`
- [ ] `/dashboard?tab=favorites` → `/dashboard/favoriten`
- [ ] Any other `?tab=` value → `/dashboard/uebersicht`

## 3. Admin Dashboard Routes (Phase 4)

- [ ] `/admin` shows the new shell, quick links, no duplicate top header.
- [ ] `/admin/kunden-anleihen` reachable with admin badge counts.
- [ ] `/admin/anleihen-katalog` — create/edit/delete and template-fill from `stocks` + existing catalog.
- [ ] `/admin/anleihen-anfragen` — approve/reject pending request, processed rows become read-only.
- [ ] Approve flow auto-creates one row in `user_bond_positions` for the request owner.
- [ ] Reject flow sets `status='rejected'` and stores decision note.
- [ ] `/admin/markt-daten` — KPI cards populated, "Cache komplett aktualisieren" returns
      a fresh `cached`/`fetched_at` payload (or `skipped: true` if throttled),
      "Health Check" returns a one-symbol response, oldest list and missing-symbols list
      reflect Supabase reality.
- [ ] All other existing `/admin/*` pages still load (no 404, no console errors).
- [ ] `/admin/product-inquiry-leads` loads `AdminProductInquiryLeads` (landing questionnaire inbox).

## 4. Cross-Cutting Smoke

- [ ] Realtime: change a row in `bond_purchase_requests`, sidebar badge updates
      in <5s without manual refresh.
- [ ] Notifications: items link to new route paths
      (`/dashboard/auftraege`, `/dashboard/vermoegen`, ...).
- [ ] Command palette (Ctrl/Cmd+K) navigates to the new German routes for both
      user and admin personas.
- [ ] Logout from admin → back to public landing, no leftover dashboard chrome.

## 5. Regression on Critical Flows

- [ ] Export (PDF/CSV) from each user page that supports it.
- [ ] Charts on `Übersicht`, `Depot`, `Anleihen` render with sample data.
- [ ] Order placement / quick-action CTAs go to the correct destination.
- [ ] Profile update saves and reloads with correct values.
- [ ] `/dashboard/anleihen/kaufen`: shows ≥ 30 catalog bonds (no `stock_fallback`),
      every card has Kupon, Kurs, Fälligkeit, Restlaufzeit, Aktuelle Rendite, Approx. YTM.
- [ ] `/dashboard/anleihen`: each position card has Kursgewinn (%), Aktuelle Rendite,
      Approx. YTM in the lower row.
- [ ] `/dashboard/aktien`: header shows "Letzte Aktualisierung" badge and "Aktualisieren"
      button; clicking refreshes prices and updates the timestamp.

## 5b. Support Chat (Ticket-System)

DB-Smoke (psql / Supabase Studio):

```sql
-- Tabellen, RLS, Trigger, RPC vorhanden?
select tablename from pg_tables
 where schemaname = 'public'
   and tablename in ('support_tickets', 'support_messages');
select policyname from pg_policies
 where schemaname = 'public'
   and tablename in ('support_tickets', 'support_messages');
select tgname from pg_trigger
 where tgrelid in (
   'public.support_tickets'::regclass, 'public.support_messages'::regclass
 );
select proname from pg_proc where proname = 'mark_support_thread_read';

-- RLS-Negativtest: ein Nicht-Owner darf das Ticket nicht sehen.
-- (Vom 2. User-Account ausführen)
select * from public.support_tickets;  -- darf nur eigene Zeilen liefern
```

- [ ] User A öffnet `/dashboard/support`, klickt **Neue Anfrage**, Betreff + Nachricht,
      Toast „Anfrage erstellt …". Zeile in `support_tickets` mit `unread_for_admin = 1`.
- [ ] Admin sieht in der Sidebar sofort den `Support-Postfach` Badge,
      Toast „Neue Support-Nachricht" erscheint (nur wenn admin NICHT auf
      `/admin/support` ist).
- [ ] Admin öffnet `/admin/support`, das Ticket steht oben mit `1` Unread-Badge,
      Klick öffnet den Thread, Badge fällt auf 0
      (`mark_support_thread_read('admin')` wirkt).
- [ ] Admin antwortet, User-Browser empfängt die Nachricht **innerhalb < 5 s**
      ohne Reload, `unread_for_user` springt auf 1, Sidebar-Badge im
      User-Layout aktualisiert.
- [ ] User öffnet den Thread neu → Unread-Badge fällt auf 0
      (`mark_support_thread_read('user')`).
- [ ] Admin klickt **Schließen** → Status-Badge wird grün „Geschlossen",
      User sieht „Ticket geschlossen — bitte neue Anfrage eröffnen", das
      Eingabefeld ist disabled.
- [ ] User schickt nichts mehr in dieses Ticket; öffnet stattdessen über
      **Neue Anfrage** ein zweites Ticket. Beide Tickets erscheinen sortiert
      nach `last_message_at desc`.
- [ ] Admin schreibt in das geschlossene Ticket eine Nachricht → Status
      kippt automatisch zurück auf `open` (Trigger).
- [ ] Status-Filter „Offen / In Bearbeitung / Geschlossen / Alle" funktioniert,
      Suche nach E-Mail / Betreff matcht erwartet.
- [ ] Realtime-Negativtest: 2 Tabs (User + Admin) mehrere Sekunden lang
      gleichzeitig hin und her tippen, alle Nachrichten erscheinen
      genau einmal (kein Doppel durch Optimistic-Insert + Realtime-Echo).
- [ ] Command Palette (Ctrl/Cmd+K) findet „Support" (User) und
      „Admin — Support-Postfach" (Admin) per Stichwort.

## 5c. Settings Expansion (DE/EN + Security)

- [ ] `/dashboard/profil` zeigt die Tabs **Konto / Benachrichtigungen / Sicherheit / Datenschutz / Sprache**.
- [ ] **Konto**: Telefon/Land/Adresse speichern, Seite neu laden, Werte bleiben erhalten.
- [ ] **Benachrichtigungen**: alle Toggles speichern weiter in `profiles.notification_prefs`.
- [ ] **Sprache**: auf Englisch umstellen, Sidebar + Command Palette werden EN, Reload behält EN.
- [ ] Nach Logout/Login bleibt die gewählte Sprache erhalten (aus Profil-Preference).
- [ ] **Sicherheit / Passwort**: ungültige Eingaben zeigen Fehler; gültige Änderung zeigt Erfolg.
- [ ] **Sicherheit / Sitzungen**: „Andere Sitzungen abmelden“ führt ohne Fehler aus.
- [ ] **Sicherheit / Sitzungen**: „Von allen Geräten abmelden“ beendet Session und leitet aus Dashboard heraus.
- [ ] Command Palette Placeholder/Empty-State sind in EN sichtbar, wenn EN aktiv ist.
- [ ] Admin-Layout-Navigation wechselt bei EN auf englische Labels (Users, Support Inbox, Market Data etc.).
- [ ] DE-Regression: zurück auf Deutsch stellen, Navigation/Settings wieder DE.

## 5d. Landing product inquiry (Startseite)

DB (nach Migration `20260512150000_product_inquiry_leads.sql`):

```sql
select tablename from pg_tables
 where schemaname = 'public' and tablename = 'product_inquiry_leads';
select policyname from pg_policies
 where schemaname = 'public' and tablename = 'product_inquiry_leads';
```

- [ ] `/` zeigt im Block „Kurz abgestimmt“ drei Produktkarten (Aktien, Anleihen, Spargeld) und die bestehende Konditionen-Karte; kein Konsolenfehler.
- [ ] Klick **Jetzt Fragen beantworten** öffnet den Dialog; ohne Antworten ist **Weiter** blockiert (Toast); letzter Schritt erfordert Pflichtfelder + Datenschutz/AGB-Checkboxen.
- [ ] Erfolgreiches Absenden legt eine Zeile in `product_inquiry_leads` an (`product`, `answers` jsonb, Kontakt, `consent_privacy`/`consent_terms` true).
- [ ] Admin: `/admin/product-inquiry-leads` lädt Liste; Suche und Filter (Status/Produkt); Status ändern und Löschen wirken persistent.
- [ ] Admin: mindestens zwei Zeilen auswählen → **Ausgewählte drucken** öffnet den Druckdialog; Drucklayout enthält nur die ausgewählten Datensätze (Screen-UI ist per `print:hidden` ausgeblendet).
- [ ] Command Palette: „Produkt-Anfragen“ / `product-inquiry` findet die Admin-Route.
- [ ] Realtime (optional): neuer Lead mit `status=new` erhöht Badge **Produkt-Anfragen (Start)** in der Admin-Sidebar nach kurzer Wartezeit.

## 5e. UX Simplification (Phases 1–5)

- [ ] Account summary sidebar/strip removed — Kontowert only on `/dashboard/uebersicht` hero (`GesamtübersichtSection`).
- [ ] `/dashboard/uebersicht`: **Mehr…** range control opens on full button click (label + chevron).
- [ ] `/dashboard/uebersicht`: default widgets reduced; **Widgets anpassen** visible.
- [ ] Market ticker visible only on `/dashboard/handeln` and `/dashboard/aktien*`.
- [ ] Sidebar **Mein Vermögen** expands to Festgeld / Tagesgeld / Flexgeld / Anleihen / Aktien.
- [ ] Vermögen product pages show **VermoegenSubNav** pill bar + breadcrumb back to hub.
- [ ] First visit to `/dashboard/uebersicht` shows 3-step onboarding; **Überspringen** dismisses.
- [ ] `/dashboard/profil` → **Dashboard-Tour erneut starten** re-opens onboarding on Übersicht.
- [ ] `Gesamtübersicht`: 1W/1M/1J + Mehr dropdown; Performance chart behind toggle; allocation behind **Verteilung anzeigen**.

## 6. Performance / A11y Spot Check

- [ ] Lighthouse on `/dashboard/uebersicht` (logged-in): Performance ≥ 80,
      Accessibility ≥ 90.
- [ ] Sidebar can be navigated with keyboard (Tab + Enter).
- [ ] No high-severity console errors on any of the routes above.

## 7. Sign-off

- [ ] Engineering lead
- [ ] Product / design owner
- [ ] QA owner

When every box is checked, the dashboard refactor + role-hardening release
gate is satisfied and the build is ready to ship.

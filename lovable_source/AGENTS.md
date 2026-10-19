<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- Customer navigation and savings views use shared dashboard components; security views use SecurityPositionCard — consistent presentation without changing bookings.
- Customer IPO mappings preserve position-specific prices and shared valuePosition totals, bypassing live stock quotes — admin/customer values match even without tickers or with rounded quantities.

- Original react-router-dom code runs unchanged via `src/lib/reactRouterDom.jsx` (vite alias) mounted from `src/routes/index.tsx` + `src/routes/$.tsx` (ssr:false) — keeps the 1:1 port of 160 original routes without rewriting 800 files.
- `react-helmet-async` is aliased to `src/lib/helmetCompat.jsx` — React 19 hoists head tags natively.
- Styling = original `index.css` + `tailwind.config.cjs` via `@config` in `src/styles.css` — exact visual parity with the original.
- Unported FastAPI endpoints are answered by `src/routes/api/$.ts` with 503 DATA_SOURCE_UNAVAILABLE — no fake data, pages hit their real error states.
- Keep `lottie-react@2.4.1` — v3 dropped the default export the original uses.
- Public reads (`/api/public/*`) come from Lovable Cloud tables banks/savings_offers/countries (original Mongo docs stored 1:1 as jsonb) via the shared `createSavingsQueries` core — one ranking/filter logic for DB and local fallback.
- Auth: `/api/auth/*` wraps Lovable Cloud Auth and keeps the original HttpOnly cookie contract (access_token/refresh_token) — the 28 original consumers stay unchanged.
- Market quotes, charts and FX come live from the keyless Yahoo Finance chart endpoint via `src/lib/liveQuotes.server.ts` (60 s cache) with the checked-in snapshot as fallback; news still uses snapshots — no paid provider key needed, pages never break when the source is down.
- Stock detail endpoints (/api/stocks/{sym}/analyst|dividends|earnings|research|fundamentals|news, /compare) are served in `src/routes/api/$.ts` from the original backup caches in `src/data/public-snapshots/stock-*.json`, with prices, day values and compare series live from Yahoo — keeps the original payload shape without a paid data provider.
- Chunk-load failures (stale modules after a preview restart) are auto-recovered in `src/routes/__root.tsx` (up to 3 reloads, counters reset after a successful load) — the huge legacy module graph makes stale-chunk errors common.
- Never name client modules after blocklist patterns (e.g. `CookieConsent`, `tracker`, `ads`) — ad/cookie blockers (Fanboy Annoyances, Brave, Opera) block the request, which breaks the whole static import graph and blanks the page; check new filenames against EasyList/Fanboy lists.
- AI features call Lovable AI Gateway (Responses API) only from server routes; helpers live in `src/lib/ai/*.server.ts`, admin AI endpoints under `src/routes/api/admin/` check the admin role from the session cookie — keeps keys and prompts server-side and matches the legacy cookie auth.
- Public form POSTs (/api/send-*, newsletter, leads, reviews/submit) are stored in the form_submissions table (large base64 attachments go to the private form-attachments bucket) via src/routes/api/$.ts — no email provider is connected yet, so nothing is lost.
- News: `src/lib/news/liveNews.server.ts` liest freie RSS-Feeds, lässt sie per AI Gateway in eigenen Worten umschreiben und speichert sie in `live_news`; pg_cron ruft `/api/public/hooks/news-sync` stündlich mit dem nur serverseitig lesbaren `news_sync_state.cron_token` auf (Sperre, Mindestabstand, max. 4 Beiträge/Lauf, Pause bei 402/403); `src/routes/api/$.ts` stellt diese Beiträge vor den Snapshot — aktuelle Meldungen ohne bezahlten Nachrichtendienst, Quellbilder werden aus Urheberrechtsgründen nie übernommen.
- Admin panel (Kunden/Depots/Produkte/Aufträge/KYC/Preise/Audit) lives in `src/pages/panel/*` with APIs `/api/admin/panel/*` (staff role + `staff_permissions`, checked per request from the session cookie) and `/api/kunde/*` (own data only); its tables have RLS with no client policies and are touched only via the service role — all authorization stays server-side.
- Order execution goes through the `execute_transaction` SQL function (row locks, KYC/account check, no negative holdings/cash) — bookings must stay atomic and idempotent.
- A profile insert trigger creates customer + portfolio (bootstrap admin email gets the admin role instead) — every customer has exactly one depot.
- Admin KYC uploads use the staff-authorized panel API with file-content, size and address-proof-date validation, private storage and audit logging; upload does not grant verification — document handling preserves the separate approval workflow.
- Formular-Zugangscodes: Backend in `src/routes/api/formular-access/$.ts` (öffentlich: verify, session/validate, session/conditions) und `src/routes/api/admin/formular-access/$.ts` (staff, Berechtigung „kunden"). Codes nur als SHA-256-Hash in `formular_access_codes`; Klartext nur einmalig beim Erstellen. Sitzungen 24 h in `formular_sessions`; Vertrags-Eingänge laufen über den bestehenden form_submissions/form-attachments-Weg mit Resend-Benachrichtigung.

# Nachrichten Module

A read-only, dashboard-only news feed for authenticated users. The feature is
implemented end-to-end on top of the existing Supabase + CRA stack: an Edge
Function pulls Euronews Deutsch RSS feeds and scrapes article bodies, stores
the result in `public.news_articles`, and the React dashboard renders a list +
detail view.

## Architecture

```
de.euronews.com (RSS + article HTML)
        |
        | every 15 min via pg_cron
        v
Supabase Edge Function `news-sync-articles`
        |
        | upsert (onConflict guid) + delete absent guids
        v
Postgres `public.news_articles`  (live mirror, no archive)
        |
        | select / textSearch / RPC view_count
        v
React dashboard
  /dashboard/news            -> NewsPage      (Aktuell | Beliebt + filter + search)
  /dashboard/news/:slug      -> NewsDetailPage
```

Key constraints:

- **No external redirection.** Article cards link only to internal slugs; the
  source URL is preserved in the database for attribution and never rendered as
  a clickable link.
- **No archive.** Each sync run replaces the cache: rows whose `guid` is no
  longer present in any feed are deleted in the same transaction.
- **No video tab.** Out of scope for the current iteration.

## Components

### Backend

- [supabase/migrations/20260508120000_nachrichten_schema.sql](../supabase/migrations/20260508120000_nachrichten_schema.sql)
  - `public.news_articles` (with stored generated `tsvector` column `fts`).
  - GIN index on `fts`, btree on `published_at desc` and `category`.
  - RLS: authenticated users can `select`; writes are service-role only.
  - `public.news_increment_view(text)` RPC for the detail page view counter.
  - Optional `pg_cron` schedule (best-effort; falls back to manual setup).

- [supabase/functions/news-sync-articles/index.ts](../supabase/functions/news-sync-articles/index.ts)
  - Pulls every feed in `feeds.ts` in parallel, fail-soft on individual feeds.
  - Scrapes article bodies via `parsers.ts` (`<article>` first, then
    `og:description` / `meta[name=description]` fallbacks).
  - Upserts in chunks of 50 with `onConflict: 'guid'` and deletes any DB row
    whose `guid` is missing from the current feed window.
  - Refuses to wipe the cache when the upstream returns zero items
    (defensive guard against an upstream-wide outage).

### Frontend

- [src/services/newsService.js](../src/services/newsService.js) – Supabase
  query builder wrappers (`listArticles`, `getArticleBySlug`,
  `incrementArticleView`).
- [src/hooks/useNewsList.js](../src/hooks/useNewsList.js) – paginated list
  hook with debounced search (300 ms) and `AbortController`-based race
  cancellation.
- [src/hooks/useNewsArticle.js](../src/hooks/useNewsArticle.js) – slug-based
  loader; fires `incrementArticleView` once per mount.
- [src/components/dashboard/news/](../src/components/dashboard/news/) –
  `NewsCard`, `NewsTabs`, `NewsCategoryChips`, `NewsSearchBar`,
  `NewsListSkeleton`, `NewsEmptyState`, `NewsErrorState`.
- [src/pages/dashboard/NewsPage.jsx](../src/pages/dashboard/NewsPage.jsx) –
  list view with tabs, category chips, search and `IntersectionObserver`
  infinite scroll.
- [src/pages/dashboard/NewsDetailPage.jsx](../src/pages/dashboard/NewsDetailPage.jsx) –
  detail view with hero image, summary, paragraph-split body, `Quelle:
  Euronews` badge and a `Zurück zu Nachrichten` link.

Wiring touches only three existing files: `src/App.js`,
`src/components/dashboard/UserDashboardLayout.jsx`,
`src/components/CommandPalette.js`.

## Required environment

The Edge Function reads only the standard Supabase secrets that are already
provisioned for the project:

| Secret | Purpose |
| ------ | ------- |
| `SUPABASE_URL` | injected automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | injected automatically |

No third-party API key is required.

## Deploy

```bash
# 1. Apply the schema
supabase db push

# 2. Deploy both Edge Functions (videos sync is chained from articles)
npm run supabase:deploy:news

# 3. (one-time) schedule the cron job from Supabase Studio or CLI:
#    select cron.schedule(
#      'news-sync-articles',
#      '*/15 * * * *',
#      $$select net.http_post(
#        url := 'https://<your-ref>.functions.supabase.co/news-sync-articles',
#        headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE_KEY>')
#      );$$
#    );
#
# 4. Smoke-test once manually:
supabase functions invoke news-sync-articles --no-verify-jwt
```

## Smoke checklist

1. Sidebar shows `Nachrichten` under **Aktivität**.
2. `/dashboard/news` opens, the grid is populated and loads more cards while
   you scroll.
3. Tabs `Aktuell` and `Beliebt` produce a different ordering.
4. Category chips and the search box narrow the result set.
5. Clicking a card navigates to `/dashboard/news/:slug`; the URL never points
   to `euronews.com` and there is no anchor element linking to the upstream
   article.
6. Dark mode renders cards, hero image and detail body without contrast
   regressions.
7. After 15 minutes the cron tick adds new headlines and refreshes the video
   listing (videos sync runs automatically at the end of each article sync).

## Maintenance notes

- **RSS schema drift.** If Euronews changes the parameters in
  `de.euronews.com/rss?level=theme&name=...`, edit
  `supabase/functions/news-sync-articles/feeds.ts` and redeploy. Failed feeds
  are skipped, so a single broken endpoint will not take the whole sync down.
- **Active categories.** As of the initial deploy, only `theme=news` and
  `theme=business` return RSS on the German edition; everything else
  (`world`, `next`, `green`, `culture`, `travel`, `vertical=*`, vertical paths
  like `/welt/rss`) currently 404s. Both `feeds.ts` and `NEWS_CATEGORIES` in
  `src/lib/news/euronewsFeeds.js` ship with that working pair only. Add a new
  entry to both lists once a confirmed endpoint is found.
- **Article body extraction** is intentionally defensive: if `<article>` is no
  longer present, the function falls back to `og:description`/`meta[name=
  description]`. When even those fail, the row is stored with `content =
  null` and the dashboard shows a friendly "Für diese Meldung steht aktuell
  kein vollständiger Text zur Verfügung." notice.
- **Popular tab** uses `view_count` lifetime. To switch to e.g. a 7-day window
  we would add a `news_popular_within_days(int)` RPC that returns slugs and
  call it from `listArticles` when `tab === 'popular'`.
- **Future video support.** Out of scope for now; if added later, the
  cleanest options are (a) the YouTube Euronews Deutsch channel via the Data
  API + IFrame Player, or (b) a separate scraper service for the embed
  manifest. Both have been considered in the original design discussion and
  intentionally deferred.

-- ============================================================================
-- Nachrichten Module – Schema
-- - news_articles: arsivsiz cache for Euronews Deutsch articles. The Edge
--   Function `news-sync-articles` upserts current RSS items and deletes any
--   row whose `guid` is no longer present in the upstream feed (no archive).
-- - public read for authenticated users; writes restricted to service_role.
-- - Full text search via stored generated tsvector column `fts` (GIN).
-- - Optional pg_cron + pg_net schedule appended at the end (best-effort).
-- ============================================================================

-- 1) Table -------------------------------------------------------------------
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  guid text not null unique,
  slug text not null unique,
  title text not null,
  summary text,
  content text,
  image_url text,
  category text not null default 'news',
  source_url text not null,
  published_at timestamptz not null,
  language text not null default 'de',
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector(
      'german',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')
    )
  ) stored
);

comment on table public.news_articles is
  'Live mirror of Euronews Deutsch articles. No archive: rows are deleted when the upstream RSS feed drops them.';
comment on column public.news_articles.guid is
  'Stable identifier from the RSS feed (used as upsert/delete key).';
comment on column public.news_articles.category is
  'Internal slug: news | world | business | next | green | culture | travel.';

-- 2) Indexes -----------------------------------------------------------------
create index if not exists news_articles_published_at_idx
  on public.news_articles (published_at desc);
create index if not exists news_articles_category_idx
  on public.news_articles (category);
create index if not exists news_articles_fts_idx
  on public.news_articles using gin (fts);

-- 3) updated_at trigger ------------------------------------------------------
create or replace function public.news_articles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists news_articles_touch_updated_at on public.news_articles;
create trigger news_articles_touch_updated_at
  before update on public.news_articles
  for each row execute function public.news_articles_touch_updated_at();

-- 4) RLS ---------------------------------------------------------------------
alter table public.news_articles enable row level security;

drop policy if exists "news_articles_read" on public.news_articles;
create policy "news_articles_read" on public.news_articles
  for select to authenticated using (true);
-- write paths are reserved for the service role used by the Edge Function;
-- no insert/update/delete policy is created on purpose.

-- 5) View counter RPC --------------------------------------------------------
create or replace function public.news_increment_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.news_articles
     set view_count = view_count + 1
   where slug = p_slug;
$$;

revoke all on function public.news_increment_view(text) from public;
grant execute on function public.news_increment_view(text) to authenticated;

-- 6) Optional cron schedule (best-effort) ------------------------------------
-- Requires `pg_cron` and `pg_net` extensions plus the database settings
-- `app.functions_url` and `app.service_role_key`. If anything is missing the
-- block is skipped without failing the migration; in that case run the
-- following statement manually from Supabase Studio:
--
--   select cron.schedule(
--     'news-sync-articles',
--     '*/15 * * * *',
--     $$select net.http_post(
--       url := '<your-functions-url>/news-sync-articles',
--       headers := jsonb_build_object('Authorization','Bearer <service-role-key>')
--     );$$
--   );
do $$
declare
  v_functions_url text;
  v_service_key text;
begin
  begin
    v_functions_url := current_setting('app.functions_url', true);
    v_service_key   := current_setting('app.service_role_key', true);
  exception when others then
    raise notice 'cron settings not available: %', sqlerrm;
    return;
  end;

  if v_functions_url is null or v_service_key is null then
    raise notice 'app.functions_url / app.service_role_key not set; skipping cron setup.';
    return;
  end if;

  begin
    perform cron.unschedule('news-sync-articles');
  exception when others then null;
  end;

  begin
    perform cron.schedule(
      'news-sync-articles',
      '*/15 * * * *',
      format(
        'select net.http_post(url := %L, headers := jsonb_build_object(%L, %L));',
        v_functions_url || '/news-sync-articles',
        'Authorization',
        'Bearer ' || v_service_key
      )
    );
  exception when others then
    raise notice 'cron.schedule failed: %', sqlerrm;
  end;
end $$;

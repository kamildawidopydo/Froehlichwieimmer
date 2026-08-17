-- Phase 2: read time, public feed cache, anon rate-limit bookkeeping

alter table public.news_articles
  add column if not exists read_time_minutes int;

comment on column public.news_articles.read_time_minutes is
  'Estimated reading time in minutes (~200 wpm), computed during sync.';

-- Backfill existing rows
update public.news_articles
   set read_time_minutes = greatest(
     1,
     ceil(
       cardinality(
         regexp_split_to_array(
           trim(
             coalesce(title, '') || ' ' ||
             coalesce(summary, '') || ' ' ||
             coalesce(content, '')
           ),
           '\s+'
         )
       )::numeric / 200.0
     )::int
   )
 where read_time_minutes is null;

-- Short-lived cache for first-page public news list responses
create table if not exists public.news_list_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists news_list_cache_expires_at_idx
  on public.news_list_cache (expires_at);

alter table public.news_list_cache enable row level security;
-- No policies: service_role only (Edge Function).

-- Sliding-window rate limit counters (per client IP hash)
create table if not exists public.news_api_rate_limits (
  client_key text not null,
  window_start timestamptz not null,
  request_count int not null default 0,
  primary key (client_key, window_start)
);

create index if not exists news_api_rate_limits_window_idx
  on public.news_api_rate_limits (window_start);

alter table public.news_api_rate_limits enable row level security;
-- No policies: service_role only (Edge Function).

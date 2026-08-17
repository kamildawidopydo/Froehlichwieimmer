-- ============================================================================
-- Nachrichten Module – Videos
-- - news_videos: live mirror cache of https://de.euronews.com/video entries
-- - no archive: rows not present in upstream listing are deleted on each sync
-- - authenticated users can read; writes are service-role only
-- ============================================================================

create table if not exists public.news_videos (
  id uuid primary key default gen_random_uuid(),
  guid text not null unique,
  slug text not null unique,
  title text not null,
  summary text,
  thumbnail_url text,
  embed_url text,
  source_url text not null,
  duration_seconds int,
  show_label text,
  published_at timestamptz not null,
  language text not null default 'de',
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector(
      'german',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(show_label, '')
    )
  ) stored
);

comment on table public.news_videos is
  'Live mirror of Euronews video listing. No archive: rows are deleted when no longer present upstream.';
comment on column public.news_videos.guid is
  'Stable unique identifier, currently aligned with source_url.';
comment on column public.news_videos.embed_url is
  'Embed URL from page metadata if available; may be blocked by frame-ancestors policies.';

create index if not exists news_videos_published_at_idx
  on public.news_videos (published_at desc);
create index if not exists news_videos_fts_idx
  on public.news_videos using gin (fts);

create or replace function public.news_videos_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists news_videos_touch_updated_at on public.news_videos;
create trigger news_videos_touch_updated_at
  before update on public.news_videos
  for each row execute function public.news_videos_touch_updated_at();

alter table public.news_videos enable row level security;

drop policy if exists "news_videos_read" on public.news_videos;
create policy "news_videos_read" on public.news_videos
  for select to authenticated using (true);

create or replace function public.news_increment_video_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.news_videos
     set view_count = view_count + 1
   where slug = p_slug;
$$;

revoke all on function public.news_increment_video_view(text) from public;
grant execute on function public.news_increment_video_view(text) to authenticated;

-- Optional cron schedule (best-effort), same approach as articles.
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
    raise notice 'app.functions_url / app.service_role_key not set; skipping video cron setup.';
    return;
  end if;

  begin
    perform cron.unschedule('news-sync-videos');
  exception when others then null;
  end;

  begin
    perform cron.schedule(
      'news-sync-videos',
      '*/30 * * * *',
      format(
        'select net.http_post(url := %L, headers := jsonb_build_object(%L, %L));',
        v_functions_url || '/news-sync-videos',
        'Authorization',
        'Bearer ' || v_service_key
      )
    );
  exception when others then
    raise notice 'cron.schedule failed for videos: %', sqlerrm;
  end;
end $$;

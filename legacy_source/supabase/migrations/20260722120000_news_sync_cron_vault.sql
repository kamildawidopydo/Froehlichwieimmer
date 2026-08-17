-- Fix news sync cron to use Vault / get_runtime_secret (same pattern as
-- stock-prices / ipo-sync). Previous jobs depended on app.functions_url which
-- is often unset, so cron setup was silently skipped and /news stayed stale.

create extension if not exists pg_net;

create or replace function public.refresh_news_articles_now(
  p_sync_group text default 'euronews',
  p_supabase_url text default null,
  p_service_role_key text default null
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
  v_group text;
  v_headers jsonb;
  v_request_id bigint;
begin
  v_group := lower(coalesce(nullif(trim(p_sync_group), ''), 'euronews'));
  if v_group not in ('euronews', 'financial', 'official') then
    raise exception 'invalid sync_group: %', v_group;
  end if;

  v_url := coalesce(
    nullif(trim(p_supabase_url), ''),
    public.get_runtime_secret('supabase_url', 'app.supabase_url')
  );
  v_key := coalesce(
    nullif(trim(p_service_role_key), ''),
    public.get_runtime_secret('service_role_key', 'app.service_role_key')
  );

  if v_url is null or v_key is null then
    raise exception 'supabase_url/service_role_key missing. Configure Vault or app.* settings.';
  end if;

  v_headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer ' || v_key,
    'apikey',        v_key
  );

  select net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/news-sync-articles',
    headers := v_headers,
    body    := jsonb_build_object('sync_group', v_group),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.refresh_news_articles_now(text, text, text) is
  'Invokes news-sync-articles Edge Function via pg_net using Vault/app.* runtime secrets.';

do $$
declare
  v_job text;
begin
  foreach v_job in array array[
    'news-sync-articles',
    'news-sync-articles-euronews',
    'news-sync-articles-financial',
    'news-sync-articles-official'
  ] loop
    begin
      perform cron.unschedule(v_job);
    exception when others then null;
    end;
  end loop;

  perform cron.schedule(
    'news-sync-articles-euronews',
    '*/15 * * * *',
    $cron$select public.refresh_news_articles_now('euronews', null::text, null::text);$cron$
  );

  perform cron.schedule(
    'news-sync-articles-financial',
    '*/10 * * * *',
    $cron$select public.refresh_news_articles_now('financial', null::text, null::text);$cron$
  );

  perform cron.schedule(
    'news-sync-articles-official',
    '*/30 * * * *',
    $cron$select public.refresh_news_articles_now('official', null::text, null::text);$cron$
  );
exception when others then
  raise notice 'news sync cron vault fix failed: %', sqlerrm;
end $$;

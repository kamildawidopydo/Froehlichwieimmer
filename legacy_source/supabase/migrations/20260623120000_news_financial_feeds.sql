-- Financial news categories, source_provider column, and staggered sync cron jobs.

alter table public.news_articles
  add column if not exists source_provider text not null default 'euronews';

comment on column public.news_articles.source_provider is
  'Upstream provider slug: euronews | finanznachrichten | ecb | bundesbank';

create index if not exists news_articles_source_provider_idx
  on public.news_articles (source_provider);

create index if not exists news_articles_provider_published_idx
  on public.news_articles (source_provider, published_at desc);

-- ---------------------------------------------------------------------------
-- Staggered article sync (euronews 15m, financial 10m, official 30m)
-- ---------------------------------------------------------------------------
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

  perform cron.schedule(
    'news-sync-articles-euronews',
    '*/15 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body := '{"sync_group":"euronews"}'::jsonb
      );$job$,
      v_functions_url || '/news-sync-articles',
      'Bearer ' || v_service_key
    )
  );

  perform cron.schedule(
    'news-sync-articles-financial',
    '*/10 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body := '{"sync_group":"financial"}'::jsonb
      );$job$,
      v_functions_url || '/news-sync-articles',
      'Bearer ' || v_service_key
    )
  );

  perform cron.schedule(
    'news-sync-articles-official',
    '*/30 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body := '{"sync_group":"official"}'::jsonb
      );$job$,
      v_functions_url || '/news-sync-articles',
      'Bearer ' || v_service_key
    )
  );
exception when others then
  raise notice 'news financial cron setup failed: %', sqlerrm;
end $$;

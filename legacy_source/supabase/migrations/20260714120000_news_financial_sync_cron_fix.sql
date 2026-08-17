-- Ensure staggered news sync cron jobs exist (euronews / financial / official).
-- The legacy single-job cron only synced Euronews, so Markt categories stayed stale.
-- Financial + official sync are also chained from euronews in the Edge Function,
-- but dedicated crons keep each group on its own schedule.

do $$
declare
  v_functions_url text;
  v_service_key text;
  v_job text;
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
  raise notice 'news financial sync cron fix failed: %', sqlerrm;
end $$;

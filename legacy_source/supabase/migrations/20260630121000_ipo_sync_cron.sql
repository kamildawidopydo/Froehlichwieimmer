-- ============================================================================
-- Weekly IPO catalog sync via pg_cron + ipo-sync Edge Function
-- ============================================================================

create extension if not exists pg_net;

create or replace function public.refresh_ipo_catalog_now(
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
  v_headers jsonb;
  v_request_id bigint;
begin
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
    url     := v_url || '/functions/v1/ipo-sync',
    headers := v_headers,
    body    := '{"force":false}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.refresh_ipo_catalog_now(text, text) is
  'Invokes ipo-sync Edge Function via pg_net using Vault/app.* runtime secrets.';

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync_ipo_catalog_weekly') then
    perform cron.unschedule('sync_ipo_catalog_weekly');
  end if;
end$$;

select cron.schedule(
  'sync_ipo_catalog_weekly',
  '0 6 * * 0',
  $$ select public.refresh_ipo_catalog_now(null::text, null::text); $$
);

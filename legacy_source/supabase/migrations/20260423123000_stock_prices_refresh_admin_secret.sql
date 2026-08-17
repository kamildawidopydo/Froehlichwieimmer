-- ============================================================================
-- Include admin secret header for stock-prices cron invocations
-- ============================================================================

create or replace function public.refresh_stock_prices_now(
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
  v_admin_secret text;
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
  v_admin_secret := public.get_runtime_secret('admin_function_secret', 'app.admin_function_secret');

  if v_url is null or v_key is null then
    raise exception 'supabase_url/service_role_key missing. Configure Vault or app.* settings.';
  end if;

  v_headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer ' || v_key,
    'apikey',        v_key
  );

  if v_admin_secret is not null then
    v_headers := v_headers || jsonb_build_object('x-admin-secret', v_admin_secret);
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/stock-prices',
    headers := v_headers,
    body    := '{}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;


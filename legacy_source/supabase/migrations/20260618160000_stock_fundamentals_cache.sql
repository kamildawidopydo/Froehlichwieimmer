-- Daily fundamentals cache (Yahoo via sync-stock-fundamentals Edge Function)

create extension if not exists pg_net;

create table if not exists public.stock_fundamentals_cache (
  symbol text primary key references public.stocks(symbol) on delete cascade,
  currency text,
  market_cap bigint,
  pe_ratio numeric(12, 4),
  forward_pe numeric(12, 4),
  dividend_yield numeric(10, 4),
  beta numeric(10, 4),
  eps numeric(14, 4),
  book_value numeric(14, 4),
  fifty_two_week_high numeric(14, 4),
  fifty_two_week_low numeric(14, 4),
  avg_volume bigint,
  partial boolean not null default false,
  fetch_error text,
  fetched_at timestamptz not null default now()
);

create index if not exists stock_fundamentals_cache_fetched_idx
  on public.stock_fundamentals_cache (fetched_at desc);

alter table public.stock_fundamentals_cache enable row level security;

drop policy if exists stock_fundamentals_cache_select on public.stock_fundamentals_cache;
create policy stock_fundamentals_cache_select on public.stock_fundamentals_cache
  for select to authenticated
  using (true);

comment on table public.stock_fundamentals_cache is
  'Cached Yahoo fundamentals; refreshed daily by sync-stock-fundamentals.';

-- pg_net cron helper (service_role only)
create or replace function public.refresh_stock_fundamentals_now(
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
    url     := v_url || '/functions/v1/sync-stock-fundamentals',
    headers := v_headers,
    body    := jsonb_build_object('force', false)
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.refresh_stock_fundamentals_now(text, text) is
  'Invokes sync-stock-fundamentals Edge Function via pg_net (daily cron).';

revoke all on function public.refresh_stock_fundamentals_now(text, text) from public;
grant execute on function public.refresh_stock_fundamentals_now(text, text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync_stock_fundamentals_daily') then
    perform cron.unschedule('sync_stock_fundamentals_daily');
  end if;
end$$;

-- 05:15 UTC daily (after stock price refresh window)
select cron.schedule(
  'sync_stock_fundamentals_daily',
  '15 5 * * *',
  $$ select public.refresh_stock_fundamentals_now(null::text, null::text); $$
);

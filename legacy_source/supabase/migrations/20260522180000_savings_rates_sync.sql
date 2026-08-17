-- Daily savings rate sync via savings-rates-sync Edge Function
-- Sources: Raisin/Weltsparen public API + official bank websites (best-effort)

create extension if not exists pg_net;

create table if not exists public.savings_rate_sync_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists savings_rate_sync_log_started_idx
  on public.savings_rate_sync_log (started_at desc);

alter table public.savings_rate_sync_log enable row level security;

drop policy if exists "rate_sync_log: admin read" on public.savings_rate_sync_log;
create policy "rate_sync_log: admin read" on public.savings_rate_sync_log
  for select using (public.is_admin());

create or replace function public.refresh_savings_rates_now(
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
    url     := v_url || '/functions/v1/savings-rates-sync',
    headers := v_headers,
    body    := jsonb_build_object('force', true)
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.refresh_savings_rates_now(text, text) is
  'Invokes savings-rates-sync Edge Function via pg_net (daily cron or manual).';

revoke all on function public.refresh_savings_rates_now(text, text) from public;
grant execute on function public.refresh_savings_rates_now(text, text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync_savings_rates_daily') then
    perform cron.unschedule('sync_savings_rates_daily');
  end if;
end$$;

-- 06:00 UTC daily
select cron.schedule(
  'sync_savings_rates_daily',
  '0 6 * * *',
  $$ select public.refresh_savings_rates_now(null::text, null::text); $$
);

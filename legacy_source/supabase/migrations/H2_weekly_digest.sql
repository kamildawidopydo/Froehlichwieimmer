-- ============================================================================
-- H2: Weekly email digest
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- 1) Opt-out column on profiles (default true = user receives the digest)
alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true;

-- 2) Optional helper RPC: trigger the Edge Function manually from SQL
--    Requires the `pg_net` extension (already enabled for stock-prices cron).
create extension if not exists pg_net;

create or replace function public.send_weekly_digest_now(
  p_mode text default 'all',
  p_user_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
  v_body jsonb;
  v_request_id bigint;
begin
  -- These settings are set by pg_cron / app_settings (see bottom of file).
  -- Fallback: read from Vault if you prefer.
  select current_setting('app.supabase_url', true)     into v_url;
  select current_setting('app.service_role_key', true) into v_key;

  if v_url is null or v_key is null then
    raise exception 'app.supabase_url / app.service_role_key are not configured. See instructions in this file.';
  end if;

  v_body := jsonb_build_object('mode', p_mode);
  if p_user_id is not null then
    v_body := v_body || jsonb_build_object('user_id', p_user_id);
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey',        v_key
    ),
    body    := v_body
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.send_weekly_digest_now(text, uuid)
  is 'Invokes send-weekly-digest Edge Function via pg_net. mode = all | single.';

-- 3) Schedule: every Sunday 09:00 Europe/Berlin (= 07:00 UTC in winter / 08:00 in summer).
--    We pick 07:00 UTC which maps to 09:00 CET (winter) and 09:00 is acceptable in CEST.
--    Adjust if you care about DST.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send_weekly_digest') then
    perform cron.unschedule('send_weekly_digest');
  end if;
end$$;

select cron.schedule(
  'send_weekly_digest',
  '0 7 * * 0',  -- 07:00 UTC every Sunday
  $$ select public.send_weekly_digest_now('all'); $$
);

-- ============================================================================
-- ONE-TIME SETUP (run these three statements once, replacing the placeholders):
--
--   alter database postgres set app.supabase_url     = 'https://YOUR-PROJECT.supabase.co';
--   alter database postgres set app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- If these settings are already configured for the stock-prices cron job you
-- can skip this step. Verify with:
--
--   select current_setting('app.supabase_url', true), current_setting('app.service_role_key', true);
--
-- After setting them the next pg_cron invocation will work automatically.
-- ============================================================================

-- ============================================================================
-- H3: Platform improvements (prefs, onboarding, admin analytics, secret handling)
-- ============================================================================

-- 1) Profiles: granular notification preferences + onboarding state
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'weekly_digest', true,
    'order_updates', true,
    'marketing', false,
    'price_alerts', true
  ),
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_steps jsonb not null default '[]'::jsonb;

update public.profiles
set notification_prefs = coalesce(notification_prefs, '{}'::jsonb)
  || jsonb_build_object('weekly_digest', coalesce(email_digest_enabled, true))
where (notification_prefs ->> 'weekly_digest') is null;

-- 2) Unified weekly digest eligibility
create or replace view public.weekly_digest_recipients as
select
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.cash_balance,
  p.status,
  p.email_digest_enabled,
  p.notification_prefs
from public.profiles p
where p.status = 'approved'
  and (
    coalesce((p.notification_prefs ->> 'weekly_digest')::boolean, p.email_digest_enabled, true) = true
  );

comment on view public.weekly_digest_recipients is
  'Profiles that should receive weekly digest based on notification_prefs + backward-compatible email_digest_enabled.';

-- 3) Admin analytics RPC (server-side aggregation)
create or replace function public.admin_analytics_overview(p_range_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_range int := greatest(7, least(coalesce(p_range_days, 30), 365));
  v_from_ts timestamptz := now() - make_interval(days => v_range);
  v_from_date date := (now() - make_interval(days => v_range))::date;
  v_from_7d timestamptz := now() - interval '7 days';
  v_from_24h timestamptz := now() - interval '24 hours';

  v_total_aum numeric := 0;
  v_total_users int := 0;
  v_active_24h int := 0;
  v_active_7d int := 0;
  v_new_users_7d int := 0;
  v_pending_orders int := 0;
  v_order_total int := 0;
  v_order_executed int := 0;
  v_order_rejected int := 0;
  v_order_cancelled int := 0;

  v_aum_series jsonb := '[]'::jsonb;
  v_reg_series jsonb := '[]'::jsonb;
  v_top_holdings jsonb := '[]'::jsonb;
  v_top_users jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(role = 'admin', false) into v_is_admin
  from public.profiles
  where id = v_uid;

  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  with latest as (
    select distinct on (s.user_id) s.user_id, s.total_value
    from public.user_portfolio_snapshots s
    order by s.user_id, s.snapshot_date desc
  )
  select coalesce(sum(total_value), 0) into v_total_aum from latest;

  select count(*) into v_total_users from public.profiles where status = 'approved';
  select count(*) into v_active_24h from public.profiles where last_seen_at >= v_from_24h;
  select count(*) into v_active_7d from public.profiles where last_seen_at >= v_from_7d;
  select count(*) into v_new_users_7d from public.profiles where created_at >= v_from_7d;
  select count(*) into v_pending_orders from public.user_stock_orders where status = 'pending';

  select
    count(*)::int,
    count(*) filter (where status = 'executed')::int,
    count(*) filter (where status = 'rejected')::int,
    count(*) filter (where status = 'cancelled')::int
  into v_order_total, v_order_executed, v_order_rejected, v_order_cancelled
  from public.user_stock_orders
  where created_at >= now() - interval '30 days';

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', x.snapshot_date, 'total', x.total)
      order by x.snapshot_date
    ),
    '[]'::jsonb
  )
  into v_aum_series
  from (
    select s.snapshot_date, sum(s.total_value)::numeric as total
    from public.user_portfolio_snapshots s
    where s.snapshot_date >= v_from_date
    group by s.snapshot_date
  ) x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', x.day, 'count', x.count)
      order by x.day
    ),
    '[]'::jsonb
  )
  into v_reg_series
  from (
    select date(p.created_at) as day, count(*)::int as count
    from public.profiles p
    where p.created_at >= v_from_ts
    group by date(p.created_at)
  ) x;

  with agg as (
    select
      p.symbol,
      sum(p.quantity)::numeric as qty,
      sum(p.quantity * coalesce(c.price, p.avg_cost, 0))::numeric as value,
      count(distinct p.user_id)::int as user_count
    from public.user_stock_positions p
    left join public.stock_prices_cache c on c.symbol = p.symbol
    group by p.symbol
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'symbol', a.symbol,
        'name', coalesce(s.name, a.symbol),
        'sector', s.sector,
        'qty', a.qty,
        'value', a.value,
        'userCount', a.user_count
      )
      order by a.value desc
    ),
    '[]'::jsonb
  )
  into v_top_holdings
  from (
    select * from agg order by value desc limit 10
  ) a
  left join public.stocks s on s.symbol = a.symbol;

  with latest as (
    select distinct on (s.user_id) s.user_id, s.total_value
    from public.user_portfolio_snapshots s
    order by s.user_id, s.snapshot_date desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', x.user_id,
        'value', x.total_value,
        'profile', jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'email', p.email
        )
      )
      order by x.total_value desc
    ),
    '[]'::jsonb
  )
  into v_top_users
  from (
    select * from latest order by total_value desc limit 10
  ) x
  left join public.profiles p on p.id = x.user_id;

  return jsonb_build_object(
    'totalAum', v_total_aum,
    'totalUsers', v_total_users,
    'active24h', v_active_24h,
    'active7d', v_active_7d,
    'newUsers7d', v_new_users_7d,
    'pendingOrders', v_pending_orders,
    'aumSeries', v_aum_series,
    'regSeries', v_reg_series,
    'topHoldings', v_top_holdings,
    'topUsers', v_top_users,
    'orderStats', jsonb_build_object(
      'pending', v_pending_orders,
      'executed', v_order_executed,
      'rejected', v_order_rejected,
      'cancelled', v_order_cancelled,
      'total', v_order_total
    )
  );
end;
$$;

grant execute on function public.admin_analytics_overview(int) to authenticated;

-- 4) Secret helper + digest RPC refactor (Vault preferred, DB setting fallback)
create or replace function public.get_runtime_secret(p_vault_name text, p_setting_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute
      'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_value
      using p_vault_name;
  end if;

  if v_value is null then
    v_value := current_setting(p_setting_key, true);
  end if;

  return v_value;
end;
$$;

create or replace function public.send_weekly_digest_now(
  p_mode text default 'all',
  p_user_id uuid default null,
  p_supabase_url text default null,
  p_service_role_key text default null,
  p_admin_secret text default null
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
  v_body jsonb;
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
  v_admin_secret := coalesce(
    nullif(trim(p_admin_secret), ''),
    public.get_runtime_secret('admin_function_secret', 'app.admin_function_secret')
  );

  if v_url is null or v_key is null then
    raise exception 'supabase_url/service_role_key missing. Pass p_supabase_url+p_service_role_key OR configure Vault/app.* settings.';
  end if;

  v_body := jsonb_build_object('mode', p_mode);
  if p_user_id is not null then
    v_body := v_body || jsonb_build_object('user_id', p_user_id);
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
    url     := v_url || '/functions/v1/send-weekly-digest',
    headers := v_headers,
    body    := v_body
  ) into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.send_weekly_digest_now(text, uuid) is
  'Invokes send-weekly-digest with Vault-first secret retrieval and DB setting fallback.';

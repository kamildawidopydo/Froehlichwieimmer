-- ============================================================================
-- IPO valuation (admin listing price / profit %) + manual admin assignment
-- ============================================================================

-- ---------- Schema extensions ------------------------------------------------

alter table public.ipo_subscription_requests
  add column if not exists source text not null default 'customer',
  add column if not exists subscription_price_per_share numeric(14, 4),
  add column if not exists listing_price_per_share numeric(14, 4),
  add column if not exists profit_margin_pct numeric(7, 4),
  add column if not exists position_symbol text,
  add column if not exists use_admin_valuation boolean not null default true,
  add column if not exists valuation_set_at timestamptz,
  add column if not exists valuation_set_by uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ipo_subscription_requests_source_check'
  ) then
    alter table public.ipo_subscription_requests
      add constraint ipo_subscription_requests_source_check
      check (source in ('customer', 'admin'));
  end if;
end$$;

comment on column public.ipo_subscription_requests.source is
  'customer = user-submitted request; admin = manually assigned by admin.';
comment on column public.ipo_subscription_requests.listing_price_per_share is
  'Admin valuation price per share for unrealized P/L display.';
comment on column public.ipo_subscription_requests.use_admin_valuation is
  'When true, dashboard uses listing_price_per_share instead of market cache.';

-- ---------- Internal: resolve IPO symbol -------------------------------------

create or replace function public._ipo_resolve_symbol(
  p_request public.ipo_subscription_requests,
  p_ipo public.ipo_catalog
)
returns text
language plpgsql
immutable
as $$
declare
  v_symbol text;
  v_slug text;
begin
  v_symbol := upper(trim(coalesce(
    nullif(trim(p_request.ticker), ''),
    nullif(trim(p_ipo.ticker_proposed), '')
  )));

  if v_symbol is null or v_symbol = '' then
    v_slug := upper(regexp_replace(coalesce(p_ipo.company_name, 'IPO'), '[^A-Za-z0-9]', '', 'g'));
    if v_slug = '' then
      v_slug := 'UNB';
    end if;
    v_symbol := 'IPO-' || left(v_slug, 12);
  end if;

  return v_symbol;
end;
$$;

-- ---------- Internal: resolve subscription price from IPO catalog ------------

create or replace function public._ipo_resolve_subscription_price(
  p_request public.ipo_subscription_requests,
  p_ipo public.ipo_catalog,
  p_override numeric default null
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_qty numeric;
  v_px numeric;
begin
  if p_override is not null and p_override > 0 then
    return round(p_override, 4);
  end if;

  v_qty := greatest(coalesce(p_request.shares_requested, 1), 1);

  v_px := case
    when p_request.amount_eur is not null and v_qty > 0 then
      round(p_request.amount_eur / v_qty, 4)
    when p_ipo.price_range_low is not null and p_ipo.price_range_high is not null then
      round((p_ipo.price_range_low + p_ipo.price_range_high) / 2.0, 4)
    when p_ipo.price_range_high is not null then p_ipo.price_range_high
    when p_ipo.price_range_low is not null then p_ipo.price_range_low
    else null
  end;

  if v_px is null or v_px <= 0 then
    v_px := 1;
  end if;

  return v_px;
end;
$$;

-- ---------- Internal: resolve listing + profit % -----------------------------

create or replace function public._ipo_resolve_valuation(
  p_subscription_price numeric,
  p_listing_price numeric default null,
  p_profit_pct numeric default null
)
returns table (listing_price numeric, profit_margin_pct numeric)
language plpgsql
immutable
as $$
declare
  v_listing numeric;
  v_profit numeric;
begin
  if p_subscription_price is null or p_subscription_price <= 0 then
    raise exception 'Valid subscription price is required';
  end if;

  if p_listing_price is null and p_profit_pct is null then
    raise exception 'listing_price or profit_pct is required';
  end if;

  if p_listing_price is not null and p_listing_price > 0 then
    v_listing := round(p_listing_price, 4);
    v_profit := round(((v_listing - p_subscription_price) / p_subscription_price) * 100.0, 4);
  else
    if p_profit_pct < 0 then
      raise exception 'profit_pct cannot be negative';
    end if;
    v_profit := round(p_profit_pct, 4);
    v_listing := round(p_subscription_price * (1 + v_profit / 100.0), 4);
  end if;

  return query select v_listing, v_profit;
end;
$$;

-- ---------- Internal: deduct cash (admin manual assignment) ------------------

create or replace function public._ipo_deduct_cash_for_subscription(
  p_user_id uuid,
  p_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(14, 2);
  v_balance numeric(14, 2);
begin
  v_total := round(p_quantity * p_price, 2);
  if v_total <= 0 then
    return;
  end if;

  select cash_balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'user not found';
  end if;

  if v_balance < v_total then
    raise exception 'insufficient balance';
  end if;

  update public.profiles
  set cash_balance = cash_balance - v_total
  where id = p_user_id
  returning cash_balance into v_balance;

  insert into public.user_cash_transactions (
    user_id, amount, balance_after, type, description, created_by
  )
  values (
    p_user_id,
    -v_total,
    v_balance,
    'stock_buy',
    format('Admin IPO-Zuweisung: %s %s Stk @ %s', p_symbol, p_quantity, p_price),
    p_actor_id
  );
end;
$$;

-- ---------- Internal: fulfill approved subscription --------------------------

create or replace function public._ipo_fulfill_subscription(
  p_request_id uuid,
  p_actor_id uuid,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ipo_subscription_requests%rowtype;
  v_ipo public.ipo_catalog%rowtype;
  v_pos public.user_stock_positions%rowtype;
  v_symbol text;
  v_currency text;
  v_qty numeric;
  v_sub_price numeric;
  v_listing numeric;
  v_profit_pct numeric;
  v_new_qty numeric;
  v_new_avg numeric;
begin
  select * into v_request
  from public.ipo_subscription_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'Request must be approved before fulfillment';
  end if;

  if v_request.user_id is null then
    raise exception 'Request has no user_id';
  end if;

  select * into v_ipo
  from public.ipo_catalog
  where id = v_request.ipo_id;

  if v_ipo.id is null then
    raise exception 'IPO catalog entry not found';
  end if;

  v_symbol := public._ipo_resolve_symbol(v_request, v_ipo);

  v_currency := coalesce(
    nullif(trim(v_ipo.price_currency), ''),
    case
      when coalesce(v_ipo.exchange, '') ilike '%US%'
        or coalesce(v_ipo.market, '') ilike '%NASDAQ%'
        or coalesce(v_ipo.market, '') ilike '%NYSE%' then 'USD'
      when coalesce(v_ipo.exchange, '') ilike '%London%'
        or coalesce(v_ipo.market, '') ilike '%LSE%' then 'GBP'
      else 'EUR'
    end
  );

  v_qty := greatest(coalesce(v_request.shares_requested, 1), 1);
  v_sub_price := public._ipo_resolve_subscription_price(v_request, v_ipo, p_subscription_price);

  select r.listing_price, r.profit_margin_pct
  into v_listing, v_profit_pct
  from public._ipo_resolve_valuation(v_sub_price, p_listing_price, p_profit_pct) r;

  insert into public.stocks (symbol, name, exchange, currency, sector, logo_url, is_active, display_order)
  values (
    v_symbol,
    v_ipo.company_name,
    coalesce(v_ipo.exchange, v_ipo.market),
    v_currency,
    v_ipo.sector,
    v_ipo.logo_url,
    false,
    greatest(50, coalesce(v_ipo.display_order, 0))
  )
  on conflict (symbol) do update set
    name = excluded.name,
    exchange = coalesce(excluded.exchange, public.stocks.exchange),
    currency = excluded.currency,
    sector = coalesce(excluded.sector, public.stocks.sector),
    logo_url = coalesce(excluded.logo_url, public.stocks.logo_url);

  select * into v_pos
  from public.user_stock_positions pos
  where pos.user_id = v_request.user_id
    and pos.symbol = v_symbol
  for update;

  if found then
    v_new_qty := coalesce(v_pos.quantity, 0) + v_qty;
    if v_new_qty <= 0 then
      raise exception 'Invalid resulting quantity';
    end if;
    v_new_avg := round(
      (coalesce(v_pos.quantity, 0) * coalesce(v_pos.avg_cost, 0) + v_qty * v_sub_price) / v_new_qty,
      6
    );
    update public.user_stock_positions pos
    set quantity = v_new_qty,
        avg_cost = v_new_avg,
        currency = v_currency,
        updated_at = now()
    where pos.id = v_pos.id;
  else
    insert into public.user_stock_positions (user_id, symbol, quantity, avg_cost, currency, updated_at)
    values (v_request.user_id, v_symbol, v_qty, v_sub_price, v_currency, now());
  end if;

  insert into public.user_stock_orders (
    user_id,
    symbol,
    side,
    quantity,
    requested_price,
    executed_price,
    status,
    note,
    executed_at,
    executed_by,
    order_type
  )
  values (
    v_request.user_id,
    v_symbol,
    'buy',
    v_qty,
    v_sub_price,
    v_sub_price,
    'executed',
    concat('IPO-Zeichnung genehmigt (Anfrage ', v_request.id::text, ')'),
    now(),
    p_actor_id,
    'market'
  );

  insert into public.stock_prices_cache (symbol, price, prev_close, change_abs, change_pct, currency, fetched_at)
  values (
    v_symbol,
    v_listing,
    v_sub_price,
    v_listing - v_sub_price,
    case when v_sub_price > 0 then round(((v_listing - v_sub_price) / v_sub_price) * 100.0, 4) else 0 end,
    v_currency,
    now()
  )
  on conflict (symbol) do update set
    price = excluded.price,
    prev_close = coalesce(public.stock_prices_cache.prev_close, excluded.prev_close),
    change_abs = excluded.change_abs,
    change_pct = excluded.change_pct,
    currency = excluded.currency,
    fetched_at = now();

  update public.ipo_subscription_requests
  set subscription_price_per_share = v_sub_price,
      listing_price_per_share = v_listing,
      profit_margin_pct = v_profit_pct,
      position_symbol = v_symbol,
      use_admin_valuation = true,
      valuation_set_at = now(),
      valuation_set_by = p_actor_id
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- ---------- Approve (extended) -----------------------------------------------

drop function if exists public.approve_ipo_subscription_request(uuid, text);

create or replace function public.approve_ipo_subscription_request(
  p_request_id uuid,
  p_decision_note text default null,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.ipo_subscription_requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  if p_listing_price is null and p_profit_pct is null then
    raise exception 'listing_price or profit_pct is required';
  end if;

  update public.ipo_subscription_requests
  set status = 'approved',
      approved_at = now(),
      rejected_at = null,
      handled_at = now(),
      handled_by = v_actor_id,
      decision_note = coalesce(p_decision_note, decision_note)
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Request not found or already processed';
  end if;

  return public._ipo_fulfill_subscription(
    p_request_id,
    v_actor_id,
    p_listing_price,
    p_profit_pct,
    p_subscription_price
  );
end;
$$;

revoke all on function public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric) from public;
grant execute on function public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric) to authenticated;

comment on function public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric) is
  'Admin-only: approves pending IPO request with valuation, creates depot position and price cache.';

-- ---------- Update valuation (retroactive) -------------------------------------

create or replace function public.update_ipo_request_valuation(
  p_request_id uuid,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_use_admin_valuation boolean default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.ipo_subscription_requests%rowtype;
  v_sub_price numeric;
  v_listing numeric;
  v_profit_pct numeric;
  v_use_admin boolean;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  select * into v_request
  from public.ipo_subscription_requests
  where id = p_request_id
    and status = 'approved';

  if v_request.id is null then
    raise exception 'Approved request not found';
  end if;

  v_sub_price := coalesce(
    v_request.subscription_price_per_share,
    case
      when v_request.amount_eur is not null and v_request.shares_requested > 0 then
        round(v_request.amount_eur / v_request.shares_requested, 4)
      else null
    end
  );

  if v_sub_price is null or v_sub_price <= 0 then
    raise exception 'Subscription price not set on request';
  end if;

  if p_listing_price is not null or p_profit_pct is not null then
    select r.listing_price, r.profit_margin_pct
    into v_listing, v_profit_pct
    from public._ipo_resolve_valuation(
      v_sub_price,
      coalesce(p_listing_price, v_request.listing_price_per_share),
      coalesce(p_profit_pct, v_request.profit_margin_pct)
    ) r;
  else
    v_listing := v_request.listing_price_per_share;
    v_profit_pct := v_request.profit_margin_pct;
  end if;

  v_use_admin := coalesce(p_use_admin_valuation, v_request.use_admin_valuation);

  update public.ipo_subscription_requests
  set listing_price_per_share = coalesce(v_listing, listing_price_per_share),
      profit_margin_pct = coalesce(v_profit_pct, profit_margin_pct),
      use_admin_valuation = v_use_admin,
      valuation_set_at = now(),
      valuation_set_by = v_actor_id
  where id = p_request_id
  returning * into v_request;

  if v_use_admin
     and v_request.position_symbol is not null
     and v_request.listing_price_per_share is not null then
    insert into public.stock_prices_cache (symbol, price, change_abs, change_pct, fetched_at)
    values (
      v_request.position_symbol,
      v_request.listing_price_per_share,
      v_request.listing_price_per_share - v_sub_price,
      case when v_sub_price > 0 then
        round(((v_request.listing_price_per_share - v_sub_price) / v_sub_price) * 100.0, 4)
      else 0 end,
      now()
    )
    on conflict (symbol) do update set
      price = excluded.price,
      change_abs = excluded.change_abs,
      change_pct = excluded.change_pct,
      fetched_at = now();
  end if;

  return v_request;
end;
$$;

revoke all on function public.update_ipo_request_valuation(uuid, numeric, numeric, boolean) from public;
grant execute on function public.update_ipo_request_valuation(uuid, numeric, numeric, boolean) to authenticated;

comment on function public.update_ipo_request_valuation(uuid, numeric, numeric, boolean) is
  'Admin-only: updates listing valuation on an approved IPO subscription request.';

-- ---------- Admin manual create ----------------------------------------------

create or replace function public.admin_create_ipo_subscription(
  p_user_id uuid,
  p_ipo_id uuid,
  p_shares_requested integer,
  p_amount_eur numeric default null,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null,
  p_decision_note text default null,
  p_deduct_cash boolean default false
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_ipo public.ipo_catalog%rowtype;
  v_request public.ipo_subscription_requests%rowtype;
  v_sub_price numeric;
  v_qty integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_ipo_id is null then
    raise exception 'ipo_id is required';
  end if;

  v_qty := greatest(coalesce(p_shares_requested, 1), 1);

  if p_listing_price is null and p_profit_pct is null then
    raise exception 'listing_price or profit_pct is required';
  end if;

  select * into v_ipo
  from public.ipo_catalog
  where id = p_ipo_id;

  if v_ipo.id is null then
    raise exception 'IPO catalog entry not found';
  end if;

  insert into public.ipo_subscription_requests (
    user_id,
    ipo_id,
    company_name,
    ticker,
    amount_eur,
    shares_requested,
    status,
    notes,
    decision_note,
    source,
    approved_at,
    handled_at,
    handled_by
  )
  values (
    p_user_id,
    p_ipo_id,
    v_ipo.company_name,
    v_ipo.ticker_proposed,
    p_amount_eur,
    v_qty,
    'approved',
    null,
    p_decision_note,
    'admin',
    now(),
    now(),
    v_actor_id
  )
  returning * into v_request;

  v_request := public._ipo_fulfill_subscription(
    v_request.id,
    v_actor_id,
    p_listing_price,
    p_profit_pct,
    p_subscription_price
  );

  if p_deduct_cash then
    v_sub_price := v_request.subscription_price_per_share;
    perform public._ipo_deduct_cash_for_subscription(
      p_user_id,
      v_request.position_symbol,
      v_qty,
      v_sub_price,
      v_actor_id
    );
  end if;

  return v_request;
end;
$$;

revoke all on function public.admin_create_ipo_subscription(
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean
) from public;
grant execute on function public.admin_create_ipo_subscription(
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean
) to authenticated;

comment on function public.admin_create_ipo_subscription(
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean
) is
  'Admin-only: manually assigns an IPO subscription to a user with valuation and optional cash deduction.';

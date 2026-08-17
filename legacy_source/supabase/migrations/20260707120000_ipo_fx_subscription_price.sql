-- IPO subscription price: convert EUR volume to IPO currency (USD/GBP/…) using live FX rates.

create or replace function public._ipo_resolve_subscription_price(
  p_request public.ipo_subscription_requests,
  p_ipo public.ipo_catalog,
  p_override numeric default null,
  p_fx_rates jsonb default null
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_qty numeric;
  v_px numeric;
  v_currency text;
  v_fx_rate numeric;
begin
  if p_override is not null and p_override > 0 then
    return round(p_override, 4);
  end if;

  v_qty := greatest(coalesce(p_request.shares_requested, 1), 1);

  v_currency := upper(coalesce(nullif(trim(p_ipo.price_currency), ''), 'EUR'));

  v_px := case
    when p_request.amount_eur is not null and v_qty > 0 then
      case
        when v_currency = 'EUR' then
          round(p_request.amount_eur / v_qty, 4)
        when p_fx_rates is not null
          and (p_fx_rates ->> v_currency) is not null
          and (p_fx_rates ->> v_currency)::numeric > 0 then
          round(
            (p_request.amount_eur * (p_fx_rates ->> v_currency)::numeric) / v_qty,
            4
          )
        else
          round(p_request.amount_eur / v_qty, 4)
      end
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

create or replace function public._ipo_fulfill_subscription(
  p_request_id uuid,
  p_actor_id uuid,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null,
  p_fx_rates jsonb default null
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
  v_sub_price := public._ipo_resolve_subscription_price(v_request, v_ipo, p_subscription_price, p_fx_rates);

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

drop function if exists public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric);

create or replace function public.approve_ipo_subscription_request(
  p_request_id uuid,
  p_decision_note text default null,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null,
  p_fx_rates jsonb default null
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
    p_subscription_price,
    p_fx_rates
  );
end;
$$;

revoke all on function public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric, jsonb) from public;
grant execute on function public.approve_ipo_subscription_request(uuid, text, numeric, numeric, numeric, jsonb) to authenticated;

drop function if exists public.admin_create_ipo_subscription(
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean
);

create or replace function public.admin_create_ipo_subscription(
  p_user_id uuid,
  p_ipo_id uuid,
  p_shares_requested integer,
  p_amount_eur numeric default null,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_subscription_price numeric default null,
  p_decision_note text default null,
  p_deduct_cash boolean default false,
  p_fx_rates jsonb default null
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
    p_subscription_price,
    p_fx_rates
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
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean, jsonb
) from public;
grant execute on function public.admin_create_ipo_subscription(
  uuid, uuid, integer, numeric, numeric, numeric, numeric, text, boolean, jsonb
) to authenticated;

drop function if exists public.update_ipo_request_valuation(uuid, numeric, numeric, boolean);

create or replace function public.update_ipo_request_valuation(
  p_request_id uuid,
  p_listing_price numeric default null,
  p_profit_pct numeric default null,
  p_use_admin_valuation boolean default null,
  p_fx_rates jsonb default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.ipo_subscription_requests%rowtype;
  v_ipo public.ipo_catalog%rowtype;
  v_sub_price numeric;
  v_listing numeric;
  v_profit_pct numeric;
  v_use_admin boolean;
  v_symbol text;
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
    and status in ('pending', 'approved');

  if v_request.id is null then
    raise exception 'Editable request not found';
  end if;

  select * into v_ipo
  from public.ipo_catalog
  where id = v_request.ipo_id;

  v_symbol := public._ipo_resolve_position_symbol_for_request(v_request);

  v_sub_price := coalesce(
    v_request.subscription_price_per_share,
    public._ipo_resolve_subscription_price(v_request, v_ipo, null, p_fx_rates)
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

  if p_use_admin_valuation is not null then
    v_use_admin := p_use_admin_valuation;
  elsif p_listing_price is not null or p_profit_pct is not null then
    v_use_admin := true;
  else
    v_use_admin := v_request.use_admin_valuation;
  end if;

  update public.ipo_subscription_requests
  set listing_price_per_share = coalesce(v_listing, listing_price_per_share),
      profit_margin_pct = coalesce(v_profit_pct, profit_margin_pct),
      subscription_price_per_share = coalesce(subscription_price_per_share, v_sub_price),
      position_symbol = coalesce(position_symbol, v_symbol),
      use_admin_valuation = v_use_admin,
      valuation_set_at = now(),
      valuation_set_by = v_actor_id
  where id = p_request_id
  returning * into v_request;

  if v_request.status = 'approved'
     and v_use_admin
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

revoke all on function public.update_ipo_request_valuation(uuid, numeric, numeric, boolean, jsonb) from public;
grant execute on function public.update_ipo_request_valuation(uuid, numeric, numeric, boolean, jsonb) to authenticated;

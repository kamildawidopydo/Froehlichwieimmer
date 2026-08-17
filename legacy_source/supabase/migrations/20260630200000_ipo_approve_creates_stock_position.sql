-- ============================================================================
-- IPO approval: create stock catalog entry + user depot position (like bonds)
-- ============================================================================

create or replace function public.approve_ipo_subscription_request(
  p_request_id uuid,
  p_decision_note text default null
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
  v_pos public.user_stock_positions%rowtype;
  v_symbol text;
  v_currency text;
  v_qty numeric;
  v_px numeric;
  v_new_qty numeric;
  v_new_avg numeric;
  v_slug text;
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

  if v_request.user_id is null then
    raise exception 'Request has no user_id';
  end if;

  select * into v_ipo
  from public.ipo_catalog
  where id = v_request.ipo_id;

  if v_ipo.id is null then
    raise exception 'IPO catalog entry not found';
  end if;

  v_symbol := upper(trim(coalesce(nullif(trim(v_request.ticker), ''), nullif(trim(v_ipo.ticker_proposed), ''))));

  if v_symbol is null or v_symbol = '' then
    v_slug := upper(regexp_replace(coalesce(v_ipo.company_name, 'IPO'), '[^A-Za-z0-9]', '', 'g'));
    if v_slug = '' then
      v_slug := 'UNB';
    end if;
    v_symbol := 'IPO-' || left(v_slug, 12);
  end if;

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

  v_px := case
    when v_ipo.price_range_low is not null and v_ipo.price_range_high is not null then
      round((v_ipo.price_range_low + v_ipo.price_range_high) / 2.0, 4)
    when v_ipo.price_range_high is not null then v_ipo.price_range_high
    when v_ipo.price_range_low is not null then v_ipo.price_range_low
    when v_request.amount_eur is not null and v_qty > 0 then
      round(v_request.amount_eur / v_qty, 4)
    else 1
  end;

  if v_px is null or v_px <= 0 then
    v_px := 1;
  end if;

  insert into public.stocks (symbol, name, exchange, currency, sector, logo_url, is_active, display_order)
  values (
    v_symbol,
    v_ipo.company_name,
    coalesce(v_ipo.exchange, v_ipo.market),
    v_currency,
    v_ipo.sector,
    v_ipo.logo_url,
    true,
    greatest(50, coalesce(v_ipo.display_order, 0))
  )
  on conflict (symbol) do update set
    name = excluded.name,
    exchange = coalesce(excluded.exchange, public.stocks.exchange),
    currency = excluded.currency,
    sector = coalesce(excluded.sector, public.stocks.sector),
    logo_url = coalesce(excluded.logo_url, public.stocks.logo_url),
    is_active = true;

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
      (coalesce(v_pos.quantity, 0) * coalesce(v_pos.avg_cost, 0) + v_qty * v_px) / v_new_qty,
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
    values (v_request.user_id, v_symbol, v_qty, v_px, v_currency, now());
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
    v_px,
    v_px,
    'executed',
    concat('IPO-Zeichnung genehmigt (Anfrage ', v_request.id::text, ')'),
    now(),
    v_actor_id,
    'market'
  );

  return v_request;
end;
$$;

comment on function public.approve_ipo_subscription_request(uuid, text) is
  'Admin-only: approves pending IPO subscription/investment request, ensures stocks row, creates/updates user_stock_positions and executed buy order.';

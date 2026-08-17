-- Sell validation: subtract pending sell orders from available depot quantity
-- (mirrors get_user_buying_power logic for open buy orders).

create or replace function public.submit_user_stock_order(
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_requested_price numeric,
  p_note text,
  p_coupon_code text default null,
  p_order_type text default 'market',
  p_limit_price numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sym text := upper(trim(coalesce(p_symbol, '')));
  v_side text := lower(trim(coalesce(p_side, '')));
  v_qty numeric := p_quantity;
  v_type text := lower(trim(coalesce(p_order_type, 'market')));
  v_limit numeric := p_limit_price;
  v_req numeric := p_requested_price;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_coupon_id uuid;
  v_gross numeric;
  v_net numeric;
  v_pct numeric;
  v_buying_power numeric;
  v_sellable numeric;
  v_order_id uuid;
  v_sell_pos public.user_stock_positions%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.process_cash_settlements(v_uid);

  if v_sym = '' then
    raise exception 'Symbol required';
  end if;

  if v_side not in ('buy', 'sell') then
    raise exception 'Invalid side';
  end if;

  if v_type not in ('market', 'limit') then
    raise exception 'Invalid order type';
  end if;

  if v_qty is null or v_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if v_type = 'limit' then
    if v_limit is null or v_limit <= 0 then
      raise exception 'Limit price required for limit orders';
    end if;
    v_req := v_limit;
  elsif v_req is null or v_req <= 0 then
    raise exception 'Invalid requested price';
  end if;

  v_gross := round(v_qty * v_req, 4);

  v_coupon_id := null;
  v_pct := null;
  if v_code is not null and v_side = 'buy' then
    select c.id, c.percent
    into v_coupon_id, v_pct
    from public.stock_trade_coupons c
    where c.code = v_code and c.status = 'active'
    for update;

    if not found then
      raise exception 'Ungültiger oder bereits verwendeter Gutscheincode';
    end if;
  elsif v_code is not null and v_side = 'sell' then
    raise exception 'Gutscheine sind nur für Kaufaufträge gültig';
  end if;

  v_net := case
    when v_pct is null then v_gross
    else round(v_gross * (1 - (v_pct / 100)), 2)
  end;

  if v_side = 'buy' then
    v_buying_power := public.get_user_buying_power(v_uid);
    if v_buying_power < v_net then
      raise exception 'Nicht genug Kaufkraft (verfügbar abzüglich offener Orders)';
    end if;
  elsif v_side = 'sell' then
    select * into v_sell_pos
    from public.user_stock_positions pos
    where pos.user_id = v_uid and pos.symbol = v_sym
    for update;

    if not found then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;

    v_sellable := coalesce(v_sell_pos.quantity, 0) - coalesce((
      select sum(o.quantity)
      from public.user_stock_orders o
      where o.user_id = v_uid
        and o.symbol = v_sym
        and o.side = 'sell'
        and o.status = 'pending'
    ), 0);

    if v_sellable < v_qty then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;
  end if;

  insert into public.user_stock_orders (
    user_id, symbol, side, quantity, requested_price, status, note,
    coupon_id, discount_percent_snapshot, order_type, limit_price, cash_reserved
  )
  values (
    v_uid, v_sym, v_side, v_qty, v_req, 'pending', v_note,
    v_coupon_id, v_pct,
    v_type,
    case when v_type = 'limit' then v_limit else null end,
    case when v_side = 'buy' then v_net else null end
  )
  returning id into v_order_id;

  if v_coupon_id is not null then
    update public.stock_trade_coupons c
    set status = 'reserved', reserved_order_id = v_order_id
    where c.id = v_coupon_id;
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.submit_user_stock_order(text, text, numeric, numeric, text, text, text, numeric) from public;
grant execute on function public.submit_user_stock_order(text, text, numeric, numeric, text, text, text, numeric) to authenticated;

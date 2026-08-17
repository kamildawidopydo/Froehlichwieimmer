-- Realized P&L tracking for executed stock sell orders.
-- Adds user_stock_orders.realized_pnl and records it at execution time
-- (realized gain = (executed_price - position avg_cost) * quantity for sells).

alter table public.user_stock_orders
  add column if not exists realized_pnl numeric;

comment on column public.user_stock_orders.realized_pnl is
  'Realized profit/loss (EUR-equivalent of trade currency) recorded for executed sell orders: (executed_price - avg_cost) * quantity. Null for buys / pending.';

-- Recreate execute_stock_order to compute and persist realized P&L on sells.
create or replace function public.execute_stock_order(p_order_id uuid, p_executed_price numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_ord public.user_stock_orders%rowtype;
  v_px numeric := p_executed_price;
  v_gross numeric;
  v_disc numeric := 0;
  v_net numeric;
  v_bal numeric;
  v_pos public.user_stock_positions%rowtype;
  v_new_qty numeric;
  v_new_avg numeric;
  v_realized numeric := null;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  if v_px is null or v_px <= 0 then
    raise exception 'Invalid executed price';
  end if;

  select *
  into v_ord
  from public.user_stock_orders o
  where o.id = p_order_id
    and o.status = 'pending'
  for update;

  if not found then
    raise exception 'Order not found or not pending';
  end if;

  v_gross := round(v_ord.quantity * v_px, 4);

  if v_ord.side = 'buy'
     and v_ord.coupon_id is not null
     and v_ord.discount_percent_snapshot is not null
     and v_ord.discount_percent_snapshot > 0 then
    v_disc := round(v_gross * (v_ord.discount_percent_snapshot / 100), 2);
  end if;

  v_net := round(v_gross - v_disc, 2);

  if v_ord.side = 'buy' then
    select p.cash_balance into v_bal
    from public.profiles p
    where p.id = v_ord.user_id
    for update;

    if v_bal < v_net then
      raise exception 'Kundenguthaben reicht für Ausführung nicht aus (Netto: %)', v_net;
    end if;

    update public.profiles p
    set cash_balance = p.cash_balance - v_net
    where p.id = v_ord.user_id;

    select *
    into v_pos
    from public.user_stock_positions pos
    where pos.user_id = v_ord.user_id
      and pos.symbol = v_ord.symbol
    for update;

    if found then
      v_new_qty := v_pos.quantity + v_ord.quantity;
      if v_new_qty <= 0 then
        raise exception 'Invalid resulting quantity';
      end if;
      v_new_avg := round(
        (coalesce(v_pos.quantity, 0) * coalesce(v_pos.avg_cost, 0) + v_ord.quantity * v_px) / v_new_qty,
        6
      );
      update public.user_stock_positions pos
      set
        quantity = v_new_qty,
        avg_cost = v_new_avg,
        updated_at = now()
      where pos.id = v_pos.id;
    else
      insert into public.user_stock_positions (user_id, symbol, quantity, avg_cost, updated_at)
      values (v_ord.user_id, v_ord.symbol, v_ord.quantity, v_px, now());
    end if;
  else
    -- sell
    select *
    into v_pos
    from public.user_stock_positions pos
    where pos.user_id = v_ord.user_id
      and pos.symbol = v_ord.symbol
    for update;

    if not found or v_pos.quantity < v_ord.quantity then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;

    -- Realized P&L against the current average cost basis.
    v_realized := round((v_px - coalesce(v_pos.avg_cost, 0)) * v_ord.quantity, 2);

    update public.profiles p
    set cash_balance = p.cash_balance + v_gross
    where p.id = v_ord.user_id;

    if v_pos.quantity = v_ord.quantity then
      delete from public.user_stock_positions pos where pos.id = v_pos.id;
    else
      update public.user_stock_positions pos
      set
        quantity = pos.quantity - v_ord.quantity,
        updated_at = now()
      where pos.id = v_pos.id;
    end if;
  end if;

  update public.user_stock_orders o
  set
    status = 'executed',
    executed_price = v_px,
    executed_at = coalesce(o.executed_at, now()),
    realized_pnl = v_realized
  where o.id = v_ord.id;

  if v_ord.coupon_id is not null then
    update public.stock_trade_coupons c
    set
      status = 'consumed',
      consumed_at = now(),
      consumed_order_id = v_ord.id,
      consumed_by_user_id = v_ord.user_id,
      reserved_order_id = null
    where c.id = v_ord.coupon_id
      and (
        c.status = 'reserved' and c.reserved_order_id = v_ord.id
        or c.status = 'active'
      );
  end if;
end;
$$;

revoke all on function public.execute_stock_order(uuid, numeric) from public;
grant execute on function public.execute_stock_order(uuid, numeric) to authenticated;

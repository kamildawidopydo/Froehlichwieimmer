-- Keep which order/user redeemed a coupon after reserved_order_id is cleared.

alter table public.stock_trade_coupons
  add column if not exists consumed_order_id uuid;

alter table public.stock_trade_coupons
  add column if not exists consumed_by_user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_trade_coupons_consumed_order_id_fkey'
  ) then
    alter table public.stock_trade_coupons
      add constraint stock_trade_coupons_consumed_order_id_fkey
      foreign key (consumed_order_id) references public.user_stock_orders (id) on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_trade_coupons_consumed_by_user_id_fkey'
  ) then
    alter table public.stock_trade_coupons
      add constraint stock_trade_coupons_consumed_by_user_id_fkey
      foreign key (consumed_by_user_id) references public.profiles (id) on delete set null;
  end if;
end$$;

-- Best-effort backfill for coupons already consumed (order still references coupon_id)
update public.stock_trade_coupons c
set
  consumed_order_id = o.id,
  consumed_by_user_id = o.user_id
from public.user_stock_orders o
where o.coupon_id = c.id
  and o.status = 'executed'
  and c.status = 'consumed'
  and c.consumed_order_id is null;

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
    select *
    into v_pos
    from public.user_stock_positions pos
    where pos.user_id = v_ord.user_id
      and pos.symbol = v_ord.symbol
    for update;

    if not found or v_pos.quantity < v_ord.quantity then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;

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
    executed_at = coalesce(o.executed_at, now())
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

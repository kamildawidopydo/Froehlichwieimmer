-- Faz 7: available vs unsettled cash (T+2), buying power reservations, limit order type.
-- Admin approval workflow unchanged.

-- ---------- Cash split on profiles ------------------------------------------

alter table public.profiles
  add column if not exists cash_available numeric(14,2) not null default 0,
  add column if not exists cash_unsettled numeric(14,2) not null default 0;

update public.profiles
set
  cash_available = coalesce(cash_balance, 0),
  cash_unsettled = 0
where cash_available = 0 and cash_unsettled = 0;

create or replace function public.sync_profile_cash_balance()
returns trigger
language plpgsql
as $$
begin
  new.cash_balance := coalesce(new.cash_available, 0) + coalesce(new.cash_unsettled, 0);
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_cash_balance on public.profiles;
create trigger trg_sync_profile_cash_balance
  before insert or update of cash_available, cash_unsettled on public.profiles
  for each row execute function public.sync_profile_cash_balance();

-- ---------- T+2 settlement ledger ---------------------------------------------

create table if not exists public.user_cash_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.user_stock_orders (id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  trade_date date not null,
  settlement_date date not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_cash_settlements_pending
  on public.user_cash_settlements (user_id, settlement_date)
  where settled_at is null;

alter table public.user_cash_settlements enable row level security;

drop policy if exists user_cash_settlements_select_own on public.user_cash_settlements;
create policy user_cash_settlements_select_own on public.user_cash_settlements
  for select to authenticated using (user_id = auth.uid());

-- ---------- Order type + reservation ----------------------------------------

alter table public.user_stock_orders
  add column if not exists order_type text not null default 'market',
  add column if not exists limit_price numeric,
  add column if not exists cash_reserved numeric(14,2);

alter table public.user_stock_orders
  drop constraint if exists user_stock_orders_order_type_check;

alter table public.user_stock_orders
  add constraint user_stock_orders_order_type_check
  check (order_type in ('market', 'limit'));

-- ---------- Helpers ---------------------------------------------------------

create or replace function public.add_business_days(p_start date, p_days int)
returns date
language plpgsql
immutable
as $$
declare
  v date := p_start;
  v_added int := 0;
begin
  while v_added < p_days loop
    v := v + 1;
    if extract(isodow from v)::int between 1 and 5 then
      v_added := v_added + 1;
    end if;
  end loop;
  return v;
end;
$$;

create or replace function public.get_user_buying_power(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.cash_available, 0) - coalesce((
    select sum(o.cash_reserved)
    from public.user_stock_orders o
    where o.user_id = p_user_id
      and o.status = 'pending'
      and o.side = 'buy'
      and o.cash_reserved is not null
  ), 0)
  from public.profiles p
  where p.id = p_user_id;
$$;

revoke all on function public.get_user_buying_power(uuid) from public;
grant execute on function public.get_user_buying_power(uuid) to authenticated;

create or replace function public.process_cash_settlements(p_user_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_cash_settlements%rowtype;
  v_count int := 0;
begin
  for v_row in
    select *
    from public.user_cash_settlements s
    where s.settled_at is null
      and s.settlement_date <= current_date
      and (p_user_id is null or s.user_id = p_user_id)
    for update
  loop
    update public.profiles p
    set
      cash_unsettled = greatest(0, coalesce(p.cash_unsettled, 0) - v_row.amount),
      cash_available = coalesce(p.cash_available, 0) + v_row.amount
    where p.id = v_row.user_id;

    update public.user_cash_settlements
    set settled_at = now()
    where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_cash_settlements(uuid) from public;
grant execute on function public.process_cash_settlements(uuid) to authenticated;

-- ---------- Admin cash adjustments → available ------------------------------

create or replace function public.apply_cash_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Not authorized';
  end if;

  if p_amount >= 0 then
    update public.profiles
    set cash_available = coalesce(cash_available, 0) + p_amount
    where id = p_user_id
    returning cash_balance into v_new_balance;
  else
    update public.profiles
    set cash_available = coalesce(cash_available, 0) + p_amount
    where id = p_user_id
      and coalesce(cash_available, 0) + p_amount >= 0
    returning cash_balance into v_new_balance;

    if v_new_balance is null then
      raise exception 'Insufficient available cash';
    end if;
  end if;

  if v_new_balance is null then
    raise exception 'User not found';
  end if;

  insert into public.user_cash_transactions (user_id, amount, balance_after, type, description, created_by)
  values (p_user_id, p_amount, v_new_balance, p_type, p_description, auth.uid());

  return v_new_balance;
end;
$$;

-- ---------- Submit order (market | limit, buying power) ---------------------

drop function if exists public.submit_user_stock_order(text, text, numeric, numeric, text, text);

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

    if not found or coalesce(v_sell_pos.quantity, 0) < v_qty then
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

-- Release reservation when order leaves pending
create or replace function public.release_order_cash_reservation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pending' and new.status in ('cancelled', 'rejected', 'executed') then
    new.cash_reserved := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_order_cash_reservation on public.user_stock_orders;
create trigger trg_release_order_cash_reservation
  before update of status on public.user_stock_orders
  for each row execute function public.release_order_cash_reservation();

-- ---------- Reject (reservation cleared by trigger) -------------------------

create or replace function public.reject_stock_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_n int;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  if v_reason is null then
    raise exception 'Reason required';
  end if;

  update public.user_stock_orders o
  set status = 'rejected', rejection_reason = v_reason
  where o.id = p_order_id and o.status = 'pending';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Order not found or not pending';
  end if;
end;
$$;

-- ---------- Execute (buy: available, sell: T+2 unsettled) ---------------------

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
  v_available numeric;
  v_pos public.user_stock_positions%rowtype;
  v_new_qty numeric;
  v_new_avg numeric;
  v_realized numeric := null;
  v_trade_date date := current_date;
  v_settle_date date;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  if v_px is null or v_px <= 0 then
    raise exception 'Invalid executed price';
  end if;

  select * into v_ord
  from public.user_stock_orders o
  where o.id = p_order_id and o.status = 'pending'
  for update;

  if not found then
    raise exception 'Order not found or not pending';
  end if;

  perform public.process_cash_settlements(v_ord.user_id);

  v_gross := round(v_ord.quantity * v_px, 4);

  if v_ord.side = 'buy'
     and v_ord.coupon_id is not null
     and v_ord.discount_percent_snapshot is not null
     and v_ord.discount_percent_snapshot > 0 then
    v_disc := round(v_gross * (v_ord.discount_percent_snapshot / 100), 2);
  end if;

  v_net := round(v_gross - v_disc, 2);

  if v_ord.side = 'buy' then
    select p.cash_available into v_available
    from public.profiles p
    where p.id = v_ord.user_id
    for update;

    if coalesce(v_available, 0) < v_net then
      raise exception 'Verfügbares Guthaben reicht für Ausführung nicht aus (Netto: %)', v_net;
    end if;

    update public.profiles p
    set cash_available = coalesce(p.cash_available, 0) - v_net
    where p.id = v_ord.user_id;

    select * into v_pos
    from public.user_stock_positions pos
    where pos.user_id = v_ord.user_id and pos.symbol = v_ord.symbol
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
      set quantity = v_new_qty, avg_cost = v_new_avg, updated_at = now()
      where pos.id = v_pos.id;
    else
      insert into public.user_stock_positions (user_id, symbol, quantity, avg_cost, updated_at)
      values (v_ord.user_id, v_ord.symbol, v_ord.quantity, v_px, now());
    end if;
  else
    select * into v_pos
    from public.user_stock_positions pos
    where pos.user_id = v_ord.user_id and pos.symbol = v_ord.symbol
    for update;

    if not found or v_pos.quantity < v_ord.quantity then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;

    v_realized := round((v_px - coalesce(v_pos.avg_cost, 0)) * v_ord.quantity, 2);

    update public.profiles p
    set cash_unsettled = coalesce(p.cash_unsettled, 0) + v_gross
    where p.id = v_ord.user_id;

    v_settle_date := public.add_business_days(v_trade_date, 2);

    insert into public.user_cash_settlements (user_id, order_id, amount, trade_date, settlement_date)
    values (v_ord.user_id, v_ord.id, v_gross, v_trade_date, v_settle_date);

    if v_pos.quantity = v_ord.quantity then
      delete from public.user_stock_positions pos where pos.id = v_pos.id;
    else
      update public.user_stock_positions pos
      set quantity = pos.quantity - v_ord.quantity, updated_at = now()
      where pos.id = v_pos.id;
    end if;
  end if;

  update public.user_stock_orders o
  set
    status = 'executed',
    executed_price = v_px,
    executed_at = coalesce(o.executed_at, now()),
    realized_pnl = v_realized,
    cash_reserved = null
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

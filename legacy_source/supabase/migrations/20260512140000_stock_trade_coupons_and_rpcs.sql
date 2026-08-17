-- ============================================================================
-- Stock trade coupons + submit_user_stock_order + execute/reject (coupon-aware)
-- Baseline context: app previously inserted user_stock_orders from the client;
-- execute_stock_order / reject_stock_order were not versioned in-repo — this
-- migration adds full definitions. Compare with production before applying.
-- ============================================================================

-- ---------- Coupons table ----------------------------------------------------

create table if not exists public.stock_trade_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent numeric(7, 4) not null,
  status text not null default 'active',
  reserved_order_id uuid,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  admin_note text,
  constraint stock_trade_coupons_code_upper_chk check (code = upper(trim(code))),
  constraint stock_trade_coupons_percent_chk check (percent > 0 and percent <= 100),
  constraint stock_trade_coupons_status_chk check (status in ('active', 'reserved', 'consumed', 'revoked'))
);

create unique index if not exists stock_trade_coupons_code_key on public.stock_trade_coupons (code);

comment on table public.stock_trade_coupons is
  'Single-use percentage coupons for stock buy orders; reserved while order is pending.';

-- ---------- Order columns ----------------------------------------------------

alter table public.user_stock_orders
  add column if not exists coupon_id uuid references public.stock_trade_coupons (id) on delete set null;

alter table public.user_stock_orders
  add column if not exists discount_percent_snapshot numeric(7, 4);

-- Optional FK from coupon -> order (after order exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_trade_coupons_reserved_order_id_fkey'
  ) then
    alter table public.stock_trade_coupons
      add constraint stock_trade_coupons_reserved_order_id_fkey
      foreign key (reserved_order_id) references public.user_stock_orders (id) on delete set null;
  end if;
end$$;

-- ---------- Release coupon when pending order is rejected/cancelled ----------

create or replace function public.trg_release_stock_coupon_on_order_exit_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and new.status in ('cancelled', 'rejected')
     and old.coupon_id is not null then
    update public.stock_trade_coupons c
    set
      status = 'active',
      reserved_order_id = null
    where c.id = old.coupon_id
      and c.status = 'reserved'
      and c.reserved_order_id = old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_stock_coupon_on_order_exit_pending on public.user_stock_orders;
create trigger trg_release_stock_coupon_on_order_exit_pending
  after update of status on public.user_stock_orders
  for each row
  execute function public.trg_release_stock_coupon_on_order_exit_pending();

-- ---------- RLS: coupons admin-only -----------------------------------------

alter table public.stock_trade_coupons enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stock_trade_coupons'
      and policyname = 'stock_trade_coupons_admin_all'
  ) then
    create policy stock_trade_coupons_admin_all
      on public.stock_trade_coupons
      for all
      to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

-- ---------- Helpers ----------------------------------------------------------

create or replace function public._is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_uid and p.role = 'admin'
  );
$$;

-- ---------- Peek coupon (UX only; does not reserve) --------------------------

create or replace function public.peek_stock_trade_coupon(p_code text)
returns table (percent numeric, coupon_id uuid)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select c.percent, c.id
  from public.stock_trade_coupons c
  where c.code = upper(trim(coalesce(p_code, '')))
    and c.status = 'active'
  limit 1;
end;
$$;

revoke all on function public.peek_stock_trade_coupon(text) from public;
grant execute on function public.peek_stock_trade_coupon(text) to authenticated;

-- ---------- Submit order (optional coupon, buy-only coupon) ---------------

create or replace function public.submit_user_stock_order(
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_requested_price numeric,
  p_note text,
  p_coupon_code text default null
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
  v_req numeric := p_requested_price;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_coupon_id uuid;
  v_gross numeric;
  v_net numeric;
  v_pct numeric;
  v_bal numeric;
  v_order_id uuid;
  v_sell_pos public.user_stock_positions%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_sym = '' then
    raise exception 'Symbol required';
  end if;

  if v_side not in ('buy', 'sell') then
    raise exception 'Invalid side';
  end if;

  if v_qty is null or v_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if v_req is null or v_req <= 0 then
    raise exception 'Invalid requested price';
  end if;

  v_gross := round(v_qty * v_req, 4);

  v_coupon_id := null;
  v_pct := null;
  if v_code is not null and v_side = 'buy' then
    select c.id, c.percent
    into v_coupon_id, v_pct
    from public.stock_trade_coupons c
    where c.code = v_code
      and c.status = 'active'
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
    select p.cash_balance into v_bal
    from public.profiles p
    where p.id = v_uid
    for update;

    if v_bal is null then
      raise exception 'Profil nicht gefunden';
    end if;

    if v_bal < v_net then
      raise exception 'Nicht genug Guthaben für diesen Auftrag (inkl. Rabatt)';
    end if;
  elsif v_side = 'sell' then
    select * into v_sell_pos
    from public.user_stock_positions pos
    where pos.user_id = v_uid
      and pos.symbol = v_sym
    for update;

    if not found or coalesce(v_sell_pos.quantity, 0) < v_qty then
      raise exception 'Nicht genügend Stücke im Depot';
    end if;
  end if;

  insert into public.user_stock_orders (
    user_id,
    symbol,
    side,
    quantity,
    requested_price,
    status,
    note,
    coupon_id,
    discount_percent_snapshot
  )
  values (
    v_uid,
    v_sym,
    v_side,
    v_qty,
    v_req,
    'pending',
    v_note,
    v_coupon_id,
    case when v_coupon_id is not null then v_pct else null end
  )
  returning id into v_order_id;

  if v_coupon_id is not null then
    update public.stock_trade_coupons c
    set
      status = 'reserved',
      reserved_order_id = v_order_id
    where c.id = v_coupon_id;
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.submit_user_stock_order(text, text, numeric, numeric, text, text) from public;
grant execute on function public.submit_user_stock_order(text, text, numeric, numeric, text, text) to authenticated;

-- ---------- Admin: create coupon --------------------------------------------

create or replace function public.admin_create_stock_trade_coupon(p_percent numeric)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_new_code text;
  v_id uuid;
  v_attempt int := 0;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  if p_percent is null or p_percent <= 0 or p_percent > 100 then
    raise exception 'Percent must be between 0 and 100';
  end if;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 25 then
      raise exception 'Could not generate unique coupon code';
    end if;

    v_new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    begin
      insert into public.stock_trade_coupons (code, percent, status, created_by)
      values (v_new_code, p_percent, 'active', v_admin)
      returning stock_trade_coupons.id into v_id;

      id := v_id;
      code := v_new_code;
      return next;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;
end;
$$;

revoke all on function public.admin_create_stock_trade_coupon(numeric) from public;
grant execute on function public.admin_create_stock_trade_coupon(numeric) to authenticated;

-- ---------- Admin: revoke coupon --------------------------------------------

create or replace function public.admin_revoke_stock_trade_coupon(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_n int;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  update public.stock_trade_coupons c
  set status = 'revoked'
  where c.id = p_coupon_id
    and c.status = 'active'
    and c.reserved_order_id is null;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Coupon cannot be revoked (not active or still reserved)';
  end if;
end;
$$;

revoke all on function public.admin_revoke_stock_trade_coupon(uuid) from public;
grant execute on function public.admin_revoke_stock_trade_coupon(uuid) to authenticated;

-- ---------- Reject stock order ----------------------------------------------

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
  set
    status = 'rejected',
    rejection_reason = v_reason
  where o.id = p_order_id
    and o.status = 'pending';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Order not found or not pending';
  end if;
end;
$$;

revoke all on function public.reject_stock_order(uuid, text) from public;
grant execute on function public.reject_stock_order(uuid, text) to authenticated;

-- ---------- Execute stock order ----------------------------------------------

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

revoke all on function public.execute_stock_order(uuid, numeric) from public;
grant execute on function public.execute_stock_order(uuid, numeric) to authenticated;

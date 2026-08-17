-- ============================================================================
-- Fix retroactive IPO valuation: backfill position_symbol + admin flag
-- ============================================================================

create or replace function public._ipo_resolve_position_symbol_for_request(
  p_request public.ipo_subscription_requests
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ipo public.ipo_catalog%rowtype;
  v_from_order text;
begin
  if p_request.position_symbol is not null and trim(p_request.position_symbol) <> '' then
    return upper(trim(p_request.position_symbol));
  end if;

  select o.symbol into v_from_order
  from public.user_stock_orders o
  where o.user_id = p_request.user_id
    and o.note ilike '%Anfrage ' || p_request.id::text || '%'
  order by o.executed_at desc nulls last
  limit 1;

  if v_from_order is not null and trim(v_from_order) <> '' then
    return upper(trim(v_from_order));
  end if;

  select * into v_ipo
  from public.ipo_catalog
  where id = p_request.ipo_id;

  if v_ipo.id is not null then
    return public._ipo_resolve_symbol(p_request, v_ipo);
  end if;

  return null;
end;
$$;

-- Backfill approved requests created before valuation migration
update public.ipo_subscription_requests r
set
  position_symbol = public._ipo_resolve_position_symbol_for_request(r),
  subscription_price_per_share = coalesce(
    r.subscription_price_per_share,
    case
      when r.amount_eur is not null and r.shares_requested > 0 then
        round(r.amount_eur / r.shares_requested, 4)
      else null
    end
  )
where r.status = 'approved'
  and (
    r.position_symbol is null
    or r.subscription_price_per_share is null
  );

-- Legacy edits: listing set but admin flag off / symbol was missing
update public.ipo_subscription_requests
set use_admin_valuation = true
where status = 'approved'
  and listing_price_per_share is not null
  and position_symbol is not null
  and use_admin_valuation = false;

-- Sync cache for backfilled valuations
insert into public.stock_prices_cache (symbol, price, change_abs, change_pct, fetched_at)
select
  r.position_symbol,
  r.listing_price_per_share,
  r.listing_price_per_share - r.subscription_price_per_share,
  case
    when coalesce(r.subscription_price_per_share, 0) > 0 then
      round(
        ((r.listing_price_per_share - r.subscription_price_per_share) / r.subscription_price_per_share) * 100.0,
        4
      )
    else 0
  end,
  now()
from public.ipo_subscription_requests r
where r.status = 'approved'
  and r.use_admin_valuation = true
  and r.position_symbol is not null
  and r.listing_price_per_share is not null
  and r.subscription_price_per_share is not null
on conflict (symbol) do update set
  price = excluded.price,
  change_abs = excluded.change_abs,
  change_pct = excluded.change_pct,
  fetched_at = now();

-- ---------- update_ipo_request_valuation (fixed) -----------------------------

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
    and status = 'approved';

  if v_request.id is null then
    raise exception 'Approved request not found';
  end if;

  v_symbol := public._ipo_resolve_position_symbol_for_request(v_request);

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

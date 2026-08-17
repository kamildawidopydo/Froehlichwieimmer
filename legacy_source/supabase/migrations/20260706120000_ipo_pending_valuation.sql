-- Allow admins to set IPO valuation on pending requests (visible on customer dashboard before approval).

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
    and status in ('pending', 'approved');

  if v_request.id is null then
    raise exception 'Editable request not found';
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

  -- Market cache only for approved positions (pending is preview-only for the customer).
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

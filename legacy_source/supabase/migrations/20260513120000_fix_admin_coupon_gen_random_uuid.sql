-- gen_random_bytes requires pgcrypto; not always enabled. Use built-in gen_random_uuid().

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

-- ============================================================================
-- Extend approve_bond_purchase_request with admin-supplied coupon/maturity
-- ============================================================================

drop function if exists public.approve_bond_purchase_request(uuid, text);
drop function if exists public.approve_bond_purchase_request(uuid, text, numeric, date);

create or replace function public.approve_bond_purchase_request(
  p_request_id uuid,
  p_decision_note text default null,
  p_kupon_rate numeric default null,
  p_faelligkeitsdatum date default null
)
returns public.bond_purchase_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.bond_purchase_requests%rowtype;
  v_catalog public.bond_catalog%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_actor_id
      and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  if p_kupon_rate is null or p_kupon_rate < 0 then
    raise exception 'Valid kupon_rate is required';
  end if;

  update public.bond_purchase_requests
  set status = 'approved',
      approved_at = now(),
      rejected_at = null,
      handled_at = now(),
      handled_by = v_actor_id,
      kupon_rate = p_kupon_rate,
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

  if v_request.isin is not null then
    select *
    into v_catalog
    from public.bond_catalog
    where isin = v_request.isin
    order by updated_at desc
    limit 1;
  end if;

  insert into public.user_bond_positions (
    user_id,
    bond_name,
    isin,
    issuer,
    nominal_betrag,
    kupon_rate,
    zins_frequenz,
    kaufdatum,
    kaufkurs,
    aktueller_kurs,
    faelligkeitsdatum,
    is_active,
    notes
  )
  values (
    v_request.user_id,
    coalesce(v_request.bond_name, v_catalog.bond_name, v_request.isin, 'Anleihe'),
    coalesce(v_request.isin, v_catalog.isin),
    v_catalog.issuer,
    coalesce(v_request.amount_eur, v_catalog.min_order_eur, 1000),
    coalesce(p_kupon_rate, v_request.kupon_rate, v_catalog.kupon_rate, 0),
    'yearly',
    current_date,
    coalesce(v_catalog.kaufkurs, 100),
    coalesce(v_catalog.aktueller_kurs, v_catalog.kaufkurs, 100),
    coalesce(p_faelligkeitsdatum, v_catalog.faelligkeitsdatum),
    true,
    concat('Auto-created from approved request ', v_request.id::text)
  );

  return v_request;
end;
$$;

revoke all on function public.approve_bond_purchase_request(uuid, text, numeric, date) from public;
grant execute on function public.approve_bond_purchase_request(uuid, text, numeric, date) to authenticated;

comment on function public.approve_bond_purchase_request(uuid, text, numeric, date)
  is 'Admin-only workflow: approves pending bond request with admin coupon/maturity and creates user bond position.';

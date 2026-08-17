-- ============================================================================
-- Bond request approval/reject workflow
--
-- Upgrades bond_purchase_requests from generic handled/cancelled statuses to
-- an explicit approval lifecycle:
--   pending -> approved|rejected
--
-- Also provides guarded RPC functions:
--   - approve_bond_purchase_request(request_id, decision_note)
--   - reject_bond_purchase_request(request_id, decision_note)
--
-- Approve flow writes a user_bond_positions row in the same transaction.
-- ============================================================================

-- 1) Add decision columns needed by the admin workflow.
alter table public.bond_purchase_requests
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists decision_note text;

-- 2) Normalize legacy statuses before tightening the check constraint.
update public.bond_purchase_requests
set status = case
  when status = 'handled' then 'approved'
  when status = 'cancelled' then 'rejected'
  else status
end
where status in ('handled', 'cancelled');

-- 3) Replace status check with explicit pending/approved/rejected domain.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bond_purchase_requests_status_check'
      and conrelid = 'public.bond_purchase_requests'::regclass
  ) then
    alter table public.bond_purchase_requests
      drop constraint bond_purchase_requests_status_check;
  end if;
end$$;

alter table public.bond_purchase_requests
  add constraint bond_purchase_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- 4) Approve function:
--    - admin only
--    - only pending rows are processable
--    - inserts into user_bond_positions in same transaction
--    - prevents double-processing via conditional update
create or replace function public.approve_bond_purchase_request(
  p_request_id uuid,
  p_decision_note text default null
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

  update public.bond_purchase_requests
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
    coalesce(v_request.kupon_rate, v_catalog.kupon_rate, 0),
    'yearly',
    current_date,
    coalesce(v_catalog.kaufkurs, 100),
    coalesce(v_catalog.aktueller_kurs, v_catalog.kaufkurs, 100),
    v_catalog.faelligkeitsdatum,
    true,
    concat('Auto-created from approved request ', v_request.id::text)
  );

  return v_request;
end;
$$;

-- 5) Reject function:
--    - admin only
--    - pending only
--    - no user_bond_positions side effects
create or replace function public.reject_bond_purchase_request(
  p_request_id uuid,
  p_decision_note text default null
)
returns public.bond_purchase_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.bond_purchase_requests%rowtype;
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

  update public.bond_purchase_requests
  set status = 'rejected',
      rejected_at = now(),
      approved_at = null,
      handled_at = now(),
      handled_by = v_actor_id,
      decision_note = coalesce(p_decision_note, decision_note)
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Request not found or already processed';
  end if;

  return v_request;
end;
$$;

revoke all on function public.approve_bond_purchase_request(uuid, text) from public;
grant execute on function public.approve_bond_purchase_request(uuid, text) to authenticated;

revoke all on function public.reject_bond_purchase_request(uuid, text) from public;
grant execute on function public.reject_bond_purchase_request(uuid, text) to authenticated;

comment on function public.approve_bond_purchase_request(uuid, text)
  is 'Admin-only workflow: approves pending bond request and creates user bond position atomically.';
comment on function public.reject_bond_purchase_request(uuid, text)
  is 'Admin-only workflow: rejects pending bond request atomically.';

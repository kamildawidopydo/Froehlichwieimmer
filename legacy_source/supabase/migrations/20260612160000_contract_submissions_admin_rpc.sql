-- Reliable admin read for contract_form_submissions (bypasses RLS edge cases)

create or replace function public.admin_list_contract_form_submissions(p_limit int default 200)
returns setof public.contract_form_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  if auth.uid() is null or not public._is_admin(auth.uid()) then
    raise exception 'Admin only';
  end if;

  return query
  select *
  from public.contract_form_submissions c
  order by c.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.admin_list_contract_form_submissions(int) from public;
grant execute on function public.admin_list_contract_form_submissions(int) to authenticated;

-- Storage: allow service_role uploads (explicit; service_role usually bypasses RLS)
drop policy if exists contract_submissions_storage_service_insert on storage.objects;
create policy contract_submissions_storage_service_insert
  on storage.objects
  for insert
  to service_role
  with check (bucket_id = 'contract-submissions');

drop policy if exists contract_submissions_storage_service_update on storage.objects;
create policy contract_submissions_storage_service_update
  on storage.objects
  for update
  to service_role
  using (bucket_id = 'contract-submissions')
  with check (bucket_id = 'contract-submissions');

-- Ensure admins can read contract_form_submissions (explicit profiles.role check)

drop policy if exists contract_form_submissions_admin_select on public.contract_form_submissions;
create policy contract_form_submissions_admin_select
  on public.contract_form_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists contract_submissions_storage_admin_select on storage.objects;
create policy contract_submissions_storage_admin_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'contract-submissions'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

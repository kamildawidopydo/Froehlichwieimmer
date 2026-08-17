-- Track new vs handled contract submissions for admin sidebar badge + notifications

alter table public.contract_form_submissions
  add column if not exists status text not null default 'new';

alter table public.contract_form_submissions
  drop constraint if exists contract_form_submissions_status_chk;

alter table public.contract_form_submissions
  add constraint contract_form_submissions_status_chk
  check (status in ('new', 'handled'));

-- Existing rows should not flood the badge
update public.contract_form_submissions
set status = 'handled'
where status = 'new';

create index if not exists contract_form_submissions_status_idx
  on public.contract_form_submissions (status, created_at desc);

drop policy if exists contract_form_submissions_admin_update on public.contract_form_submissions;
create policy contract_form_submissions_admin_update
  on public.contract_form_submissions
  for update
  to authenticated
  using (public._is_admin(auth.uid()))
  with check (public._is_admin(auth.uid()));

grant update on public.contract_form_submissions to authenticated;

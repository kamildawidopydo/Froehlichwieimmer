create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.form_submissions to authenticated;
grant all on public.form_submissions to service_role;
alter table public.form_submissions enable row level security;
create policy "Admins can view submissions" on public.form_submissions for select to authenticated using (public.has_role(auth.uid(), 'admin'));
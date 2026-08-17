-- Bank contract form submissions (BBVA Flexgeld/Festgeld, Knab) + PDF archive for admin

create table if not exists public.contract_form_submissions (
  id uuid primary key default gen_random_uuid(),
  product_key text not null,
  bank_name text not null,
  customer_name text,
  customer_email text not null,
  form_summary jsonb not null default '{}'::jsonb,
  contract_pdf_path text,
  attachments jsonb not null default '[]'::jsonb,
  customer_resend_id text,
  admin_resend_id text,
  admin_email_sent boolean not null default false,
  admin_email_error text,
  customer_email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_form_submissions_created
  on public.contract_form_submissions (created_at desc);

create index if not exists idx_contract_form_submissions_product
  on public.contract_form_submissions (product_key, created_at desc);

create index if not exists idx_contract_form_submissions_admin_pending
  on public.contract_form_submissions (admin_email_sent)
  where admin_email_sent = false;

comment on table public.contract_form_submissions is
  'Filled bank contract forms sent by email (customer + admin notify).';

alter table public.contract_form_submissions enable row level security;

drop policy if exists contract_form_submissions_admin_select on public.contract_form_submissions;
create policy contract_form_submissions_admin_select
  on public.contract_form_submissions
  for select
  to authenticated
  using (public.is_admin_user());

-- Inserts only via service role (API routes)
grant select on public.contract_form_submissions to authenticated;
grant all on public.contract_form_submissions to service_role;

-- Storage bucket for PDFs (private; admin reads via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-submissions',
  'contract-submissions',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists contract_submissions_storage_admin_select on storage.objects;
create policy contract_submissions_storage_admin_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'contract-submissions'
    and public.is_admin_user()
  );

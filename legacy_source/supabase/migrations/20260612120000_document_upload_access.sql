-- ============================================================================
-- Document upload (/dokument-upload) — admin-managed single-use access codes
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Tables -----------------------------------------------------------

create table if not exists public.document_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  code_hint text not null,
  admin_label text,
  status text not null default 'active',
  used_at timestamptz,
  used_by_name text,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint document_access_codes_status_chk check (status in ('active', 'used', 'revoked'))
);

create index if not exists document_access_codes_status_idx
  on public.document_access_codes (status);

create index if not exists document_access_codes_created_idx
  on public.document_access_codes (created_at desc);

comment on table public.document_access_codes is
  'Single-use access codes for /dokument-upload; plain code shown once at creation.';

create table if not exists public.document_upload_submissions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.document_access_codes (id) on delete restrict,
  used_by_name text not null,
  message text,
  files jsonb not null default '[]'::jsonb,
  user_agent text,
  ip text,
  status text not null default 'new',
  admin_email_sent boolean not null default false,
  admin_email_error text,
  admin_resend_id text,
  created_at timestamptz not null default now(),
  constraint document_upload_submissions_status_chk check (status in ('new', 'handled'))
);

create index if not exists document_upload_submissions_created_idx
  on public.document_upload_submissions (created_at desc);

create index if not exists document_upload_submissions_status_idx
  on public.document_upload_submissions (status, created_at desc);

comment on table public.document_upload_submissions is
  'Customer document uploads via /dokument-upload (files in storage bucket document-uploads).';

-- ---------- RLS --------------------------------------------------------------

alter table public.document_access_codes enable row level security;
alter table public.document_upload_submissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_access_codes'
      and policyname = 'document_access_codes_admin_all'
  ) then
    create policy document_access_codes_admin_all
      on public.document_access_codes
      for all
      to authenticated
      using (public._is_admin(auth.uid()))
      with check (public._is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_upload_submissions'
      and policyname = 'document_upload_submissions_admin_all'
  ) then
    create policy document_upload_submissions_admin_all
      on public.document_upload_submissions
      for all
      to authenticated
      using (public._is_admin(auth.uid()))
      with check (public._is_admin(auth.uid()));
  end if;
end$$;

grant select, insert, update, delete on public.document_access_codes to authenticated;
grant select, insert, update, delete on public.document_upload_submissions to authenticated;
grant all on public.document_access_codes to service_role;
grant all on public.document_upload_submissions to service_role;

-- ---------- Storage bucket ---------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-uploads',
  'document-uploads',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists document_uploads_storage_admin_select on storage.objects;
create policy document_uploads_storage_admin_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'document-uploads'
    and public.is_admin_user()
  );

drop policy if exists document_uploads_storage_admin_delete on storage.objects;
create policy document_uploads_storage_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'document-uploads'
    and public.is_admin_user()
  );

-- ---------- Code generation helper -------------------------------------------

create or replace function public._document_random_access_code()
returns text
language plpgsql
volatile
as $$
declare
  v_suffix text;
  v_suffixes text[] := array[
    'DOC', 'FILE', 'SCAN', 'SEND', 'UP', 'DATA', 'SAFE', 'COPY', 'FORM', 'MAIL'
  ];
begin
  v_suffix := v_suffixes[1 + floor(random() * array_length(v_suffixes, 1))::int];
  return 'DOC-'
    || lpad((floor(random() * 10000)::int)::text, 4, '0')
    || '-'
    || v_suffix;
end;
$$;

revoke all on function public._document_random_access_code() from public;

-- ---------- Verify code (client gate, does NOT consume) ----------------------

create or replace function public.verify_document_access_code(p_code text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_plain text := upper(trim(coalesce(p_code, '')));
  v_found boolean;
begin
  if v_plain = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.document_access_codes c
    where c.status = 'active'
      and c.code_hash = crypt(v_plain, c.code_hash)
  )
  into v_found;

  return coalesce(v_found, false);
end;
$$;

revoke all on function public.verify_document_access_code(text) from public;
grant execute on function public.verify_document_access_code(text) to anon, authenticated;

-- ---------- Consume code (server-side submit, single-use) --------------------

create or replace function public.consume_document_access_code(
  p_code text,
  p_used_by_name text,
  p_user_agent text default null,
  p_ip text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plain text := upper(trim(coalesce(p_code, '')));
  v_name text := nullif(trim(coalesce(p_used_by_name, '')), '');
  v_ua text := nullif(left(trim(coalesce(p_user_agent, '')), 512), '');
  v_ip text := nullif(left(trim(coalesce(p_ip, '')), 64), '');
  v_row public.document_access_codes%rowtype;
begin
  if v_plain = '' then
    raise exception 'Zugangscode erforderlich';
  end if;

  if v_name is null then
    raise exception 'Name erforderlich';
  end if;

  select *
  into v_row
  from public.document_access_codes c
  where c.status = 'active'
    and c.code_hash = crypt(v_plain, c.code_hash)
  limit 1
  for update;

  if not found then
    raise exception 'Ungültiger oder bereits verwendeter Zugangscode';
  end if;

  update public.document_access_codes c
  set
    status = 'used',
    used_at = now(),
    used_by_name = v_name,
    user_agent = v_ua,
    ip = v_ip
  where c.id = v_row.id;

  return v_row.id;
end;
$$;

revoke all on function public.consume_document_access_code(text, text, text, text) from public;
grant execute on function public.consume_document_access_code(text, text, text, text) to service_role;

-- ---------- Admin: create code -----------------------------------------------

create or replace function public.admin_create_document_access_code(p_label text default null)
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
  v_label text := nullif(trim(coalesce(p_label, '')), '');
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 30 then
      raise exception 'Could not generate unique access code';
    end if;

    v_new_code := public._document_random_access_code();

    begin
      insert into public.document_access_codes (code_hash, code_hint, admin_label, created_by)
      values (
        crypt(v_new_code, gen_salt('bf')),
        regexp_replace(v_new_code, '-[0-9]{4}-', '-****-'),
        v_label,
        v_admin
      )
      returning document_access_codes.id into v_id;

      id := v_id;
      code := v_new_code;
      return next;
      exit;
    end;
  end loop;
end;
$$;

revoke all on function public.admin_create_document_access_code(text) from public;
grant execute on function public.admin_create_document_access_code(text) to authenticated;

-- ---------- Admin: revoke code -----------------------------------------------

create or replace function public.admin_revoke_document_access_code(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_n int;
begin
  if v_admin is null or not public._is_admin(v_admin) then
    raise exception 'Admin only';
  end if;

  update public.document_access_codes c
  set status = 'revoked'
  where c.id = p_code_id
    and c.status = 'active';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Code cannot be revoked (not found or already used/revoked)';
  end if;
end;
$$;

revoke all on function public.admin_revoke_document_access_code(uuid) from public;
grant execute on function public.admin_revoke_document_access_code(uuid) to authenticated;

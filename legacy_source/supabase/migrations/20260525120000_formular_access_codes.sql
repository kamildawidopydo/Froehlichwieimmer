-- ============================================================================
-- Formular (/formular) access codes — admin-managed, usage audit
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Tables -----------------------------------------------------------

create table if not exists public.formular_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  code_hint text not null,
  admin_label text,
  status text not null default 'active',
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint formular_access_codes_status_chk check (status in ('active', 'revoked'))
);

create index if not exists formular_access_codes_status_idx
  on public.formular_access_codes (status);

comment on table public.formular_access_codes is
  'Hashed Zugangscodes for /formular bank document area; plain code shown once at creation.';

create table if not exists public.formular_access_logs (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.formular_access_codes (id) on delete cascade,
  used_by_name text not null,
  used_at timestamptz not null default now(),
  user_agent text,
  session_id uuid
);

create index if not exists formular_access_logs_code_id_idx
  on public.formular_access_logs (code_id, used_at desc);

create table if not exists public.formular_access_sessions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.formular_access_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists formular_access_sessions_expires_idx
  on public.formular_access_sessions (expires_at);

-- ---------- RLS --------------------------------------------------------------

alter table public.formular_access_codes enable row level security;
alter table public.formular_access_logs enable row level security;
alter table public.formular_access_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'formular_access_codes'
      and policyname = 'formular_access_codes_admin_all'
  ) then
    create policy formular_access_codes_admin_all
      on public.formular_access_codes
      for all
      to authenticated
      using (public._is_admin(auth.uid()))
      with check (public._is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'formular_access_logs'
      and policyname = 'formular_access_logs_admin_select'
  ) then
    create policy formular_access_logs_admin_select
      on public.formular_access_logs
      for select
      to authenticated
      using (public._is_admin(auth.uid()));
  end if;
end$$;

-- sessions: no direct client access (RPC only)

-- ---------- Code generation helper -------------------------------------------

create or replace function public._formular_random_access_code()
returns text
language plpgsql
volatile
as $$
declare
  v_suffix text;
  v_suffixes text[] := array[
    'BANK', 'KONT', 'GELD', 'ZINS', 'FEST', 'FLEX', 'ANLA', 'EURO', 'SPAR',
    'WERT', 'KAPI', 'BOND', 'SAFE', 'FUND', 'PLUS', 'PREM', 'GOLD', 'PRIV',
    'VERT', 'FORM'
  ];
begin
  v_suffix := v_suffixes[1 + floor(random() * array_length(v_suffixes, 1))::int];
  return 'VTR-'
    || lpad((floor(random() * 10000)::int)::text, 4, '0')
    || '-'
    || v_suffix;
end;
$$;

revoke all on function public._formular_random_access_code() from public;

-- ---------- Verify code (public form gate) -------------------------------------

create or replace function public.verify_formular_access_code(
  p_code text,
  p_used_by_name text,
  p_user_agent text default null
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
  v_row public.formular_access_codes%rowtype;
  v_session_id uuid;
begin
  if v_plain = '' then
    raise exception 'Zugangscode erforderlich';
  end if;

  if v_name is null then
    raise exception 'Name erforderlich';
  end if;

  select *
  into v_row
  from public.formular_access_codes c
  where c.status = 'active'
    and c.code_hash = crypt(v_plain, c.code_hash)
  limit 1;

  if not found then
    raise exception 'Ungültiger Zugangscode';
  end if;

  insert into public.formular_access_sessions (code_id)
  values (v_row.id)
  returning id into v_session_id;

  insert into public.formular_access_logs (code_id, used_by_name, user_agent, session_id)
  values (v_row.id, v_name, v_ua, v_session_id);

  update public.formular_access_codes c
  set
    use_count = c.use_count + 1,
    last_used_at = now()
  where c.id = v_row.id;

  return v_session_id;
end;
$$;

revoke all on function public.verify_formular_access_code(text, text, text) from public;
grant execute on function public.verify_formular_access_code(text, text, text) to anon, authenticated;

-- ---------- Session validity ---------------------------------------------------

create or replace function public.formular_session_is_valid(p_session_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.formular_access_sessions s
    join public.formular_access_codes c on c.id = s.code_id
    where s.id = p_session_id
      and s.expires_at > now()
      and c.status = 'active'
  );
$$;

revoke all on function public.formular_session_is_valid(uuid) from public;
grant execute on function public.formular_session_is_valid(uuid) to anon, authenticated;

-- ---------- Admin: create code -------------------------------------------------

create or replace function public.admin_create_formular_access_code(p_label text default null)
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

    v_new_code := public._formular_random_access_code();

    begin
      insert into public.formular_access_codes (code_hash, code_hint, admin_label, created_by)
      values (
        crypt(v_new_code, gen_salt('bf')),
        regexp_replace(v_new_code, '-[0-9]{4}-', '-****-'),
        v_label,
        v_admin
      )
      returning formular_access_codes.id into v_id;

      id := v_id;
      code := v_new_code;
      return next;
      exit;
    end;
  end loop;
end;
$$;

revoke all on function public.admin_create_formular_access_code(text) from public;
grant execute on function public.admin_create_formular_access_code(text) to authenticated;

-- ---------- Admin: revoke code -------------------------------------------------

create or replace function public.admin_revoke_formular_access_code(p_code_id uuid)
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

  update public.formular_access_codes c
  set status = 'revoked'
  where c.id = p_code_id
    and c.status = 'active';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Code cannot be revoked (not found or already revoked)';
  end if;
end;
$$;

revoke all on function public.admin_revoke_formular_access_code(uuid) from public;
grant execute on function public.admin_revoke_formular_access_code(uuid) to authenticated;

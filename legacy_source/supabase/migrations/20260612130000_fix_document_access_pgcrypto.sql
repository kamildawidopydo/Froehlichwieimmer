-- pgcrypto (gen_salt, crypt) lives in extensions schema on Supabase hosted Postgres.

create or replace function public.verify_document_access_code(p_code text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, extensions
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

create or replace function public.consume_document_access_code(
  p_code text,
  p_used_by_name text,
  p_user_agent text default null,
  p_ip text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.admin_create_document_access_code(p_label text default null)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public, extensions
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
    exception
      when unique_violation then
        null;
    end;
  end loop;
end;
$$;

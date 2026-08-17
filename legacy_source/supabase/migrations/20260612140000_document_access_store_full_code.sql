-- Store full access code for admin visibility (RLS: admin-only table access).

alter table public.document_access_codes
  add column if not exists code text;

comment on column public.document_access_codes.code is
  'Full plaintext Zugangscode; visible only to admins via RLS.';

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
      insert into public.document_access_codes (code, code_hash, code_hint, admin_label, created_by)
      values (
        v_new_code,
        crypt(v_new_code, gen_salt('bf')),
        v_new_code,
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

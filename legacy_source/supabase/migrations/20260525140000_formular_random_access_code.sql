-- More random access codes: 16 chars from secure random bytes (no fixed VTR/suffix pattern).

create or replace function public._formular_random_access_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_result text := '';
  v_bytes bytea;
  i int;
begin
  v_bytes := gen_random_bytes(16);
  for i in 0..15 loop
    if i > 0 and i % 4 = 0 then
      v_result := v_result || '-';
    end if;
    v_result := v_result || substr(v_chars, (get_byte(v_bytes, i) % length(v_chars)) + 1, 1);
  end loop;
  return v_result;
end;
$$;

create or replace function public._formular_access_code_hint(p_code text)
returns text
language sql
immutable
as $$
  select split_part(p_code, '-', 1) || '-****-****-****';
$$;

create or replace function public.admin_create_formular_access_code(p_label text default null)
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

    v_new_code := public._formular_random_access_code();

    begin
      insert into public.formular_access_codes (code_hash, code_hint, admin_label, created_by)
      values (
        crypt(v_new_code, gen_salt('bf')),
        public._formular_access_code_hint(v_new_code),
        v_label,
        v_admin
      )
      returning formular_access_codes.id into v_id;

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

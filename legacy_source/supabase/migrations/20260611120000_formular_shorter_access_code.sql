-- Shorter formular access codes: 8 chars, no hyphens (was XXXX-XXXX-XXXX-XXXX).

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
  v_len int := 8;
  i int;
begin
  v_bytes := gen_random_bytes(v_len);
  for i in 0..v_len - 1 loop
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
  select case
    when length(replace(p_code, '-', '')) <= 2 then replace(p_code, '-', '')
    else left(replace(p_code, '-', ''), 2) || repeat('*', length(replace(p_code, '-', '')) - 2)
  end;
$$;

-- Per-code contract Konditionen scoped to bank + product (festgeld/flexgeld)

alter table public.formular_access_codes
  add column if not exists contract_conditions jsonb;

comment on column public.formular_access_codes.contract_conditions is
  'Optional Festgeld/Flexgeld Konditionen for a specific bank+product. Other banks/products use app defaults.';

-- Returns custom Konditionen only when session is valid and bank+product match.
create or replace function public.get_formular_session_conditions(
  p_session_id uuid,
  p_bank text,
  p_product text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_conditions jsonb;
  v_bank text := lower(trim(coalesce(p_bank, '')));
  v_product text := lower(trim(coalesce(p_product, '')));
begin
  if p_session_id is null or v_bank = '' or v_product = '' then
    return null;
  end if;

  select c.contract_conditions
  into v_conditions
  from public.formular_access_sessions s
  join public.formular_access_codes c on c.id = s.code_id
  where s.id = p_session_id
    and s.expires_at > now()
    and c.status = 'active'
    and c.contract_conditions is not null
  limit 1;

  if v_conditions is null then
    return null;
  end if;

  if lower(coalesce(v_conditions ->> 'bank', '')) = v_bank
     and lower(coalesce(v_conditions ->> 'product', '')) = v_product then
    return jsonb_build_object(
      'investmentAmount', v_conditions ->> 'investmentAmount',
      'investmentAmountDisplay', v_conditions ->> 'investmentAmountDisplay',
      'interestRate', v_conditions ->> 'interestRate',
      'term', v_conditions ->> 'term',
      'welcomeBonus', v_conditions ->> 'welcomeBonus'
    );
  end if;

  return null;
end;
$$;

revoke all on function public.get_formular_session_conditions(uuid, text, text) from public;
grant execute on function public.get_formular_session_conditions(uuid, text, text) to anon, authenticated;

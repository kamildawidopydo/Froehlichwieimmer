-- ============================================================================
-- Dashboard Metrics Expansion
-- - profiles: tax preference fields (Freistellungsauftrag, Kirchensteuer)
-- - user_depot_contracts: product-specific rule fields (early withdrawal,
--   Flexgeld lock_until, Tagesgeld promo windows)
-- - banks: ensure deposit_protection_amount has a usable default
-- - macro_rates: tiny KV cache for macro indicators (e.g. EU CPI)
-- ============================================================================

-- 1) Profiles: tax preferences --------------------------------------------------
alter table public.profiles
  add column if not exists tax_allowance_eur numeric(12,2) not null default 0
    check (tax_allowance_eur >= 0),
  add column if not exists tax_allowance_used_eur numeric(12,2) not null default 0
    check (tax_allowance_used_eur >= 0),
  add column if not exists church_tax_enabled boolean not null default false,
  add column if not exists church_tax_rate numeric(4,2) not null default 9
    check (church_tax_rate in (0, 8, 9)),
  add column if not exists tax_residency_country text;

comment on column public.profiles.tax_allowance_eur is
  'Freistellungsauftrag total in EUR (DE Sparer-Pauschbetrag). 0 = nicht erteilt.';
comment on column public.profiles.tax_allowance_used_eur is
  'Bereits verbrauchter Freibetrag in EUR (manuell oder berechnet).';
comment on column public.profiles.church_tax_enabled is
  'Kirchensteuer aktiv (true) oder nicht (false).';
comment on column public.profiles.church_tax_rate is
  'Kirchensteuersatz: 8 (BY/BW) oder 9 (Rest), 0 wenn deaktiviert.';
comment on column public.profiles.tax_residency_country is
  'Steuerlicher Wohnsitz (ISO Land oder Klartext). Null => Wert aus profiles.country.';

-- 2) Depot contracts: product-specific rule fields -----------------------------
alter table public.user_depot_contracts
  add column if not exists early_withdrawal_penalty_type text
    not null default 'none'
    check (early_withdrawal_penalty_type in (
      'none',
      'percent_interest',
      'percent_principal',
      'fixed_eur',
      'forfeit_accrued'
    )),
  add column if not exists early_withdrawal_penalty_value numeric(12,4)
    not null default 0
    check (early_withdrawal_penalty_value >= 0),
  add column if not exists lock_until date,
  add column if not exists promo_rate_until date,
  add column if not exists post_promo_rate numeric(6,4)
    check (post_promo_rate is null or post_promo_rate >= 0);

comment on column public.user_depot_contracts.early_withdrawal_penalty_type is
  'Strafregel bei vorzeitiger Bozma: none | percent_interest (% der bisherigen Zinsen) | percent_principal (% des Anlagebetrags) | fixed_eur | forfeit_accrued (alle aufgelaufenen Zinsen verfallen).';
comment on column public.user_depot_contracts.early_withdrawal_penalty_value is
  'Strafwert: bei *_percent_* in Prozent (0–100), bei fixed_eur in EUR.';
comment on column public.user_depot_contracts.lock_until is
  'Flexgeld: Datum, ab dem das Kapital frei verfügbar ist (Lock-Ende).';
comment on column public.user_depot_contracts.promo_rate_until is
  'Tagesgeld: Ende der Promo-Periode (danach gilt post_promo_rate).';
comment on column public.user_depot_contracts.post_promo_rate is
  'Tagesgeld: Standardzins nach Ablauf der Promo-Periode (% p.a.).';

-- 3) Banks: deposit protection default ---------------------------------------
-- Some early seed rows may have a NULL or empty deposit_protection_amount; the
-- dashboard needs a usable value to compute insurance utilisation. We do NOT
-- overwrite existing positive values, only fill empty cells with the EU
-- statutory minimum. The column type can be either numeric or text in older
-- schemas, so we cast safely. Errors in this best-effort seed must NOT abort
-- the rest of the migration, hence the inner exception handler.
do $$
declare
  v_data_type text;
begin
  select data_type
    into v_data_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'banks'
     and column_name = 'deposit_protection_amount';

  if v_data_type is null then
    return;
  end if;

  begin
    if v_data_type in ('numeric', 'integer', 'bigint', 'double precision', 'real') then
      execute $sql$
        update public.banks
           set deposit_protection_amount = 100000
         where deposit_protection_amount is null
            or deposit_protection_amount = 0
      $sql$;
    else
      execute $sql$
        update public.banks
           set deposit_protection_amount = '100000'
         where deposit_protection_amount is null
            or btrim(deposit_protection_amount::text) = ''
            or btrim(deposit_protection_amount::text) = '0'
      $sql$;
    end if;
  exception when others then
    raise notice 'banks.deposit_protection_amount seed skipped: %', sqlerrm;
  end;
end $$;

-- 4) Macro indicators cache ---------------------------------------------------
create table if not exists public.macro_rates (
  key text primary key,
  value numeric(10,4) not null,
  source text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.macro_rates is
  'Tiny KV cache for macro indicators (e.g. eu_cpi_yoy). Updated by edge functions.';
comment on column public.macro_rates.key is
  'Stable key, e.g. "eu_cpi_yoy" or "ecb_main_refi".';
comment on column public.macro_rates.value is
  'Numeric value (typically a percent, e.g. 2.4 for 2.4% YoY).';

alter table public.macro_rates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'macro_rates'
      and policyname = 'macro_rates_read_authenticated'
  ) then
    create policy macro_rates_read_authenticated
      on public.macro_rates
      for select
      to authenticated
      using (true);
  end if;
end $$;

-- 5) Optional: seed a sane fallback so the UI never shows null inflation.
insert into public.macro_rates (key, value, source, fetched_at, metadata)
values (
  'eu_cpi_yoy',
  2.4,
  'seed_fallback',
  now(),
  jsonb_build_object('note', 'Seed fallback before first edge function refresh.')
)
on conflict (key) do nothing;

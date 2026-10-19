CREATE TABLE public.formular_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  admin_label text,
  contract_conditions jsonb,
  status text not null default 'active',
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.formular_access_codes TO service_role;
ALTER TABLE public.formular_access_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.formular_sessions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.formular_access_codes(id) on delete cascade,
  name text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.formular_sessions TO service_role;
ALTER TABLE public.formular_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.formular_access_logs (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references public.formular_access_codes(id) on delete cascade,
  used_by_name text,
  user_agent text,
  used_at timestamptz not null default now()
);
GRANT ALL ON public.formular_access_logs TO service_role;
ALTER TABLE public.formular_access_logs ENABLE ROW LEVEL SECURITY;
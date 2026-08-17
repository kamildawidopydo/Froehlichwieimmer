-- ============================================================================
-- Social preview "Nachricht an Anlagenprofis" (footer Instagram modal)
-- ============================================================================

create table if not exists public.social_preview_messages (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null default 'instagram',
  name         text not null,
  email        text not null,
  message_body text not null,
  status       text not null default 'new',
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint social_preview_messages_platform_check
    check (platform in ('instagram', 'facebook', 'linkedin')),
  constraint social_preview_messages_status_check
    check (status in ('new', 'contacted', 'closed'))
);

comment on table public.social_preview_messages is
  'Kontaktformular aus der Social-Media-Vorschau (Instagram Nachricht-Button).';

create index if not exists social_preview_messages_created_idx
  on public.social_preview_messages (created_at desc);

create index if not exists social_preview_messages_status_idx
  on public.social_preview_messages (status);

drop trigger if exists trg_social_preview_messages_updated_at on public.social_preview_messages;
create trigger trg_social_preview_messages_updated_at
  before update on public.social_preview_messages
  for each row execute function public.set_updated_at();

alter table public.social_preview_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_preview_messages'
      and policyname = 'social_preview_messages_public_insert'
  ) then
    create policy social_preview_messages_public_insert
      on public.social_preview_messages
      for insert
      to anon, authenticated
      with check (
        length(trim(name)) > 0
        and length(trim(email)) > 0
        and length(trim(message_body)) > 0
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_preview_messages'
      and policyname = 'social_preview_messages_admin_all'
  ) then
    create policy social_preview_messages_admin_all
      on public.social_preview_messages
      for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'social_preview_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.social_preview_messages';
  end if;
exception
  when undefined_object then
    null;
end$$;

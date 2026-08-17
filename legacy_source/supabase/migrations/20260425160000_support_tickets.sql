-- ============================================================================
-- Support tickets + messages (customer ↔ admin chat)
--
--   /dashboard/support  -> users see their own threads
--   /admin/support      -> admins see every thread, can reply / close
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- support_tickets --------------------------------------------------

create table if not exists public.support_tickets (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  subject            text not null,
  status             text not null default 'open',
  unread_for_admin   integer not null default 0,
  unread_for_user    integer not null default 0,
  last_message_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint support_tickets_status_check
    check (status in ('open', 'pending', 'closed')),
  constraint support_tickets_subject_not_blank
    check (length(btrim(subject)) > 0)
);

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id);

create index if not exists support_tickets_status_lastmsg_idx
  on public.support_tickets (status, last_message_at desc nulls last);

create index if not exists support_tickets_lastmsg_idx
  on public.support_tickets (last_message_at desc nulls last);

-- ---------- support_messages -------------------------------------------------

create table if not exists public.support_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete set null,
  sender_role  text not null,
  body         text not null,
  created_at   timestamptz not null default now(),
  constraint support_messages_sender_role_check
    check (sender_role in ('user', 'admin')),
  constraint support_messages_body_not_blank
    check (length(btrim(body)) > 0)
);

create index if not exists support_messages_ticket_created_idx
  on public.support_messages (ticket_id, created_at);

-- ---------- updated_at trigger ----------------------------------------------

-- Re-uses public.set_updated_at() defined in earlier migrations.
drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ---------- after-insert message bookkeeping --------------------------------

create or replace function public.touch_support_ticket_after_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets t
     set last_message_at  = new.created_at,
         updated_at       = now(),
         unread_for_admin = case
           when new.sender_role = 'user'  then t.unread_for_admin + 1
           else t.unread_for_admin
         end,
         unread_for_user  = case
           when new.sender_role = 'admin' then t.unread_for_user + 1
           else t.unread_for_user
         end,
         status = case
           when new.sender_role = 'admin' and t.status = 'closed' then 'open'
           else t.status
         end
   where t.id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_support_messages_after_insert on public.support_messages;
create trigger trg_support_messages_after_insert
  after insert on public.support_messages
  for each row execute function public.touch_support_ticket_after_message();

-- ---------- mark thread read RPC --------------------------------------------

create or replace function public.mark_support_thread_read(
  p_ticket_id uuid,
  p_role      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_owner     uuid;
  v_is_admin  boolean;
begin
  if v_uid is null then
    raise exception 'mark_support_thread_read: nicht authentifiziert' using errcode = '28000';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'mark_support_thread_read: ungültige Rolle %', p_role using errcode = '22023';
  end if;

  select user_id into v_owner from public.support_tickets where id = p_ticket_id;
  if v_owner is null then
    raise exception 'mark_support_thread_read: Ticket nicht gefunden' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.profiles p where p.id = v_uid and p.role = 'admin'
  ) into v_is_admin;

  if p_role = 'user' then
    if v_uid <> v_owner then
      raise exception 'mark_support_thread_read: Sie sind nicht der Eigentümer dieses Tickets'
        using errcode = '42501';
    end if;
    update public.support_tickets
       set unread_for_user = 0
     where id = p_ticket_id;
  else
    if not v_is_admin then
      raise exception 'mark_support_thread_read: Admin-Rolle erforderlich'
        using errcode = '42501';
    end if;
    update public.support_tickets
       set unread_for_admin = 0
     where id = p_ticket_id;
  end if;
end;
$$;

grant execute on function public.mark_support_thread_read(uuid, text) to authenticated;

-- ---------- RLS --------------------------------------------------------------

alter table public.support_tickets  enable row level security;
alter table public.support_messages enable row level security;

-- support_tickets: Nutzer liest/erstellt eigene Tickets
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_tickets'
      and policyname = 'support_tickets_user_select_own'
  ) then
    create policy support_tickets_user_select_own
      on public.support_tickets
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_tickets'
      and policyname = 'support_tickets_user_insert_own'
  ) then
    create policy support_tickets_user_insert_own
      on public.support_tickets
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

-- support_tickets: Admin sieht/aktualisiert alle (inkl. Statusänderung)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_tickets'
      and policyname = 'support_tickets_admin_all'
  ) then
    create policy support_tickets_admin_all
      on public.support_tickets
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

-- support_messages: Nutzer liest Nachrichten eigener Tickets
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_messages'
      and policyname = 'support_messages_user_select_own'
  ) then
    create policy support_messages_user_select_own
      on public.support_messages
      for select
      to authenticated
      using (
        exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.user_id = auth.uid()
        )
      );
  end if;
end$$;

-- support_messages: Nutzer schreibt in eigenes Ticket (sender_role = 'user', sender = auth.uid())
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_messages'
      and policyname = 'support_messages_user_insert_own'
  ) then
    create policy support_messages_user_insert_own
      on public.support_messages
      for insert
      to authenticated
      with check (
        sender_role = 'user'
        and sender_id = auth.uid()
        and exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.user_id = auth.uid()
        )
      );
  end if;
end$$;

-- support_messages: Admin sieht/schreibt alle
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_messages'
      and policyname = 'support_messages_admin_all'
  ) then
    create policy support_messages_admin_all
      on public.support_messages
      for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        sender_role = 'admin'
        and sender_id = auth.uid()
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end$$;

-- ---------- Realtime --------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    execute 'alter publication supabase_realtime add table public.support_tickets';
  end if;
exception
  when undefined_object then
    null;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.support_messages';
  end if;
exception
  when undefined_object then
    null;
end$$;

comment on table public.support_tickets
  is 'Kunden-Support-Threads. Jede Konversation = ein Ticket mit Status open/pending/closed.';
comment on table public.support_messages
  is 'Einzelne Nachrichten innerhalb eines Support-Tickets. sender_role unterscheidet Kunde vs. Admin.';
comment on function public.mark_support_thread_read(uuid, text)
  is 'Setzt unread_for_user bzw. unread_for_admin auf 0. Berechtigung: Owner bzw. Admin.';

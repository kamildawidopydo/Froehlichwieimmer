-- ============================================================================
-- Kundenbewertungen für Sparangebote (savings_offers)
-- - Nur registrierte, freigeschaltete Nutzer dürfen einreichen (pending)
-- - Öffentlich nur status = approved und nicht gelöscht
-- - Admin: freigeben, ablehnen, genehmigte Bewertungen soft-löschen
-- ============================================================================

-- ---------- Hilfsfunktion: Anzeigename "Vorname N." ----------------------------

create or replace function public.format_review_author_display(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(
      trim(
        both
        from coalesce(nullif(trim(p.first_name), ''), 'Nutzer')
          || ' '
          || case
            when nullif(trim(p.last_name), '') is not null then
              upper(left(trim(p.last_name), 1)) || '.'
            else ''
          end
      ),
      ''
    ),
    'Nutzer'
  )
  from public.profiles p
  where p.id = p_user_id;
$$;

-- ---------- Tabelle -------------------------------------------------------------

create table if not exists public.offer_reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  savings_offer_id   uuid not null references public.savings_offers(id) on delete cascade,
  stars              numeric(3, 2) not null,
  body               text not null,
  product_type       text not null,
  author_display_name text not null,
  status             text not null default 'pending',
  rejection_reason   text,
  reviewed_by        uuid references public.profiles(id) on delete set null,
  reviewed_at        timestamptz,
  deleted_at         timestamptz,
  deleted_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint offer_reviews_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint offer_reviews_product_type_check
    check (product_type in ('Festgeld', 'Flexgeld')),
  constraint offer_reviews_stars_range_check
    check (stars >= 1 and stars <= 5),
  constraint offer_reviews_stars_quarter_check
    check (mod((stars * 4)::numeric, 1) = 0),
  constraint offer_reviews_body_length_check
    check (char_length(btrim(body)) between 50 and 2000),
  constraint offer_reviews_author_not_blank
    check (char_length(btrim(author_display_name)) > 0),
  constraint offer_reviews_user_offer_unique
    unique (user_id, savings_offer_id)
);

create index if not exists offer_reviews_offer_status_idx
  on public.offer_reviews (savings_offer_id, status)
  where deleted_at is null;

create index if not exists offer_reviews_pending_created_idx
  on public.offer_reviews (created_at desc)
  where status = 'pending' and deleted_at is null;

create index if not exists offer_reviews_user_idx
  on public.offer_reviews (user_id);

drop trigger if exists trg_offer_reviews_updated_at on public.offer_reviews;
create trigger trg_offer_reviews_updated_at
  before update on public.offer_reviews
  for each row execute function public.set_updated_at();

-- ---------- Aggregat-View (nur freigegebene, nicht gelöschte) -----------------

create or replace view public.offer_review_stats as
select
  savings_offer_id,
  count(*)::int as review_count,
  round(avg(stars)::numeric, 2) as avg_stars
from public.offer_reviews
where status = 'approved'
  and deleted_at is null
group by savings_offer_id;

grant select on public.offer_review_stats to anon, authenticated;

-- ---------- Admin-Check ---------------------------------------------------------

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

-- ---------- Nutzer: Bewertung einreichen ----------------------------------------

create or replace function public.submit_offer_review(
  p_savings_offer_id uuid,
  p_stars numeric,
  p_body text,
  p_product_type text default 'Festgeld'
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_offer public.savings_offers%rowtype;
  v_stars numeric := round(p_stars::numeric, 2);
  v_body text := btrim(coalesce(p_body, ''));
  v_product text := case
    when p_product_type = 'Flexgeld' then 'Flexgeld'
    else 'Festgeld'
  end;
  v_row public.offer_reviews%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.role <> 'admin' and v_profile.status <> 'approved' then
    raise exception 'Only approved members can submit reviews' using errcode = '42501';
  end if;

  select * into v_offer from public.savings_offers where id = p_savings_offer_id;
  if not found or coalesce(v_offer.is_active, false) is not true then
    raise exception 'Offer not found or inactive' using errcode = 'P0002';
  end if;

  if v_stars < 1 or v_stars > 5 or mod((v_stars * 4)::numeric, 1) <> 0 then
    raise exception 'Stars must be between 1 and 5 in steps of 0.25' using errcode = '22023';
  end if;

  if char_length(v_body) < 50 or char_length(v_body) > 2000 then
    raise exception 'Review text must be between 50 and 2000 characters' using errcode = '22023';
  end if;

  insert into public.offer_reviews (
    user_id,
    savings_offer_id,
    stars,
    body,
    product_type,
    author_display_name,
    status
  )
  values (
    v_uid,
    p_savings_offer_id,
    v_stars,
    v_body,
    v_product,
    public.format_review_author_display(v_uid),
    'pending'
  )
  on conflict (user_id, savings_offer_id) do update
    set stars = excluded.stars,
        body = excluded.body,
        product_type = excluded.product_type,
        author_display_name = excluded.author_display_name,
        status = 'pending',
        rejection_reason = null,
        reviewed_by = null,
        reviewed_at = null,
        deleted_at = null,
        deleted_by = null,
        updated_at = now()
  where public.offer_reviews.status in ('pending', 'rejected')
    and public.offer_reviews.deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'You already have an approved review for this offer. Contact support to change it.'
      using errcode = '23505';
  end if;

  return v_row;
end;
$$;

grant execute on function public.submit_offer_review(uuid, numeric, text, text) to authenticated;

-- ---------- Admin: freigeben ----------------------------------------------------

create or replace function public.approve_offer_review(
  p_review_id uuid,
  p_decision_note text default null
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.offer_reviews%rowtype;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  update public.offer_reviews
     set status = 'approved',
         rejection_reason = nullif(btrim(coalesce(p_decision_note, '')), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_review_id
     and status = 'pending'
     and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Review not found or not pending' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

grant execute on function public.approve_offer_review(uuid, text) to authenticated;

-- ---------- Admin: ablehnen -----------------------------------------------------

create or replace function public.reject_offer_review(
  p_review_id uuid,
  p_rejection_reason text default null
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.offer_reviews%rowtype;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  update public.offer_reviews
     set status = 'rejected',
         rejection_reason = nullif(btrim(coalesce(p_rejection_reason, '')), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_review_id
     and status = 'pending'
     and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Review not found or not pending' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

grant execute on function public.reject_offer_review(uuid, text) to authenticated;

-- ---------- Admin: genehmigte Bewertung soft-löschen ----------------------------

create or replace function public.delete_offer_review(
  p_review_id uuid
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.offer_reviews%rowtype;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  update public.offer_reviews
     set deleted_at = now(),
         deleted_by = auth.uid(),
         updated_at = now()
   where id = p_review_id
     and status = 'approved'
     and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Approved review not found or already deleted' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

grant execute on function public.delete_offer_review(uuid) to authenticated;

-- ---------- RLS ---------------------------------------------------------------

alter table public.offer_reviews enable row level security;

-- Öffentlich / alle: nur freigegebene, nicht gelöschte
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offer_reviews'
      and policyname = 'offer_reviews_select_approved_public'
  ) then
    create policy offer_reviews_select_approved_public
      on public.offer_reviews
      for select
      to anon, authenticated
      using (status = 'approved' and deleted_at is null);
  end if;
end$$;

-- Nutzer: eigene Bewertungen (alle Status)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offer_reviews'
      and policyname = 'offer_reviews_select_own'
  ) then
    create policy offer_reviews_select_own
      on public.offer_reviews
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

-- Admin: alle Zeilen lesen
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offer_reviews'
      and policyname = 'offer_reviews_admin_select_all'
  ) then
    create policy offer_reviews_admin_select_all
      on public.offer_reviews
      for select
      to authenticated
      using (public.is_admin_user());
  end if;
end$$;

-- Direkte INSERT/UPDATE/DELETE nur über RPC (keine Nutzer-Policies)

comment on table public.offer_reviews is
  'Kundenbewertungen zu savings_offers; Moderation über Admin, öffentlich nur approved.';

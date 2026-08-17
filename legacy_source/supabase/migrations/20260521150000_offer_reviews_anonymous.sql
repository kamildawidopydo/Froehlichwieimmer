-- ============================================================================
-- Öffentliche Bewertungen ohne Mitgliedschaft (Vergleich)
-- - Gast gibt Vorname + Nachname an (wie Mitglieder, Anzeige z. B. "Thomas K.")
-- - status = pending bis Admin-Freigabe
-- ============================================================================

alter table public.offer_reviews
  add column if not exists reviewer_kind text not null default 'member',
  add column if not exists guest_session_token uuid,
  add column if not exists guest_first_name text,
  add column if not exists guest_last_name text;

alter table public.offer_reviews
  drop constraint if exists offer_reviews_reviewer_kind_check;

alter table public.offer_reviews
  add constraint offer_reviews_reviewer_kind_check
    check (reviewer_kind in ('member', 'guest'));

alter table public.offer_reviews
  drop constraint if exists offer_reviews_reviewer_identity_check;

alter table public.offer_reviews
  alter column user_id drop not null;

alter table public.offer_reviews
  add constraint offer_reviews_reviewer_identity_check
    check (
      (
        reviewer_kind = 'member'
        and user_id is not null
        and guest_session_token is null
        and guest_first_name is null
        and guest_last_name is null
      )
      or (
        reviewer_kind = 'guest'
        and user_id is null
        and guest_session_token is not null
        and guest_first_name is not null
        and guest_last_name is not null
      )
    );

alter table public.offer_reviews
  drop constraint if exists offer_reviews_user_offer_unique;

drop index if exists public.offer_reviews_member_offer_uidx;
create unique index offer_reviews_member_offer_uidx
  on public.offer_reviews (user_id, savings_offer_id)
  where user_id is not null and deleted_at is null;

drop index if exists public.offer_reviews_guest_offer_uidx;
create unique index offer_reviews_guest_offer_uidx
  on public.offer_reviews (guest_session_token, savings_offer_id)
  where guest_session_token is not null and deleted_at is null;

-- ---------- Hilfsfunktionen: Name + Anzeige -----------------------------------

create or replace function public.normalize_guest_review_name(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if char_length(v) < 2 or char_length(v) > 60 then
    raise exception 'Name must be between 2 and 60 characters' using errcode = '22023';
  end if;

  if v !~ '^[[:alpha:]\-''’][[:alpha:]\-''’[:space:]]{1,59}$' then
    raise exception 'Invalid name format' using errcode = '22023';
  end if;

  return v;
end;
$$;

create or replace function public.format_guest_review_author(p_first_name text, p_last_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(
        both
        from public.normalize_guest_review_name(p_first_name)
          || ' '
          || upper(left(public.normalize_guest_review_name(p_last_name), 1))
          || '.'
      ),
      ''
    ),
    'Nutzer'
  );
$$;

-- ---------- Öffentlich: Bewertung ohne Konto ------------------------------------

create or replace function public.submit_guest_offer_review(
  p_savings_offer_id uuid,
  p_stars numeric,
  p_body text,
  p_guest_session_token uuid,
  p_first_name text,
  p_last_name text,
  p_product_type text default 'Festgeld'
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.savings_offers%rowtype;
  v_stars numeric := round(p_stars::numeric, 2);
  v_body text := btrim(coalesce(p_body, ''));
  v_product text := case when p_product_type = 'Flexgeld' then 'Flexgeld' else 'Festgeld' end;
  v_token uuid := p_guest_session_token;
  v_first text := public.normalize_guest_review_name(p_first_name);
  v_last text := public.normalize_guest_review_name(p_last_name);
  v_author text := public.format_guest_review_author(v_first, v_last);
  v_row public.offer_reviews%rowtype;
  v_recent int;
begin
  if v_token is null then
    raise exception 'Session token required' using errcode = '22023';
  end if;

  select count(*)::int into v_recent
  from public.offer_reviews r
  where r.reviewer_kind = 'guest'
    and r.guest_session_token = v_token
    and r.created_at > now() - interval '24 hours'
    and r.deleted_at is null;

  if v_recent >= 5 then
    raise exception 'Too many reviews submitted today. Please try again tomorrow.' using errcode = '42501';
  end if;

  select * into v_offer from public.savings_offers where id = p_savings_offer_id;
  if not found or coalesce(v_offer.is_active, false) is not true then
    raise exception 'Offer not found or inactive' using errcode = 'P0002';
  end if;

  if v_stars < 1 or v_stars > 5 or mod((v_stars * 4)::numeric, 1) <> 0 then
    raise exception 'Stars must be between 1 and 5 in steps of 0.25' using errcode = '22023';
  end if;

  if char_length(v_body) < 15 or char_length(v_body) > 2000 then
    raise exception 'Review text must be between 15 and 2000 characters' using errcode = '22023';
  end if;

  select * into v_row
  from public.offer_reviews r
  where r.reviewer_kind = 'guest'
    and r.guest_session_token = v_token
    and r.savings_offer_id = p_savings_offer_id
    and r.deleted_at is null
  limit 1;

  if found then
    if v_row.status = 'approved' then
      raise exception 'You already have an approved review for this offer.' using errcode = '23505';
    end if;

    update public.offer_reviews
       set stars = v_stars,
           body = v_body,
           product_type = v_product,
           guest_first_name = v_first,
           guest_last_name = v_last,
           author_display_name = v_author,
           status = 'pending',
           rejection_reason = null,
           reviewed_by = null,
           reviewed_at = null,
           updated_at = now()
     where id = v_row.id
    returning * into v_row;

    return v_row;
  end if;

  insert into public.offer_reviews (
    user_id,
    savings_offer_id,
    stars,
    body,
    product_type,
    author_display_name,
    status,
    reviewer_kind,
    guest_session_token,
    guest_first_name,
    guest_last_name
  )
  values (
    null,
    p_savings_offer_id,
    v_stars,
    v_body,
    v_product,
    v_author,
    'pending',
    'guest',
    v_token,
    v_first,
    v_last
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_guest_offer_review(
  uuid, numeric, text, uuid, text, text, text
) to anon, authenticated;

create or replace function public.get_guest_offer_review(
  p_savings_offer_id uuid,
  p_guest_session_token uuid
)
returns public.offer_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.offer_reviews%rowtype;
begin
  if p_guest_session_token is null then
    return null;
  end if;

  select * into v_row
  from public.offer_reviews r
  where r.reviewer_kind = 'guest'
    and r.guest_session_token = p_guest_session_token
    and r.savings_offer_id = p_savings_offer_id
    and r.deleted_at is null
  limit 1;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

grant execute on function public.get_guest_offer_review(uuid, uuid) to anon, authenticated;

comment on column public.offer_reviews.reviewer_kind is
  'member = registrierter Nutzer; guest = Bewertung ohne Konto (Vorname/Nachname)';
comment on column public.offer_reviews.guest_session_token is
  'Browser-Session (localStorage), nur zur Statusanzeige für denselben Gast';
comment on column public.offer_reviews.guest_first_name is
  'Vorname des Bewertenden ohne Mitgliedschaft';
comment on column public.offer_reviews.guest_last_name is
  'Nachname des Bewertenden ohne Mitgliedschaft';

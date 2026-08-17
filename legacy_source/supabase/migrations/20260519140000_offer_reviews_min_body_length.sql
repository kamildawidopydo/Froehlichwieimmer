-- Mindestlänge für Bewertungstext: 50 → 15 Zeichen

alter table public.offer_reviews
  drop constraint if exists offer_reviews_body_length_check;

alter table public.offer_reviews
  add constraint offer_reviews_body_length_check
  check (char_length(btrim(body)) between 15 and 2000);

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
  v_product text := case when p_product_type = 'Flexgeld' then 'Flexgeld' else 'Festgeld' end;
  v_row public.offer_reviews%rowtype;
  v_recent int;
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

  select count(*)::int into v_recent
  from public.offer_reviews r
  where r.user_id = v_uid
    and r.created_at > now() - interval '24 hours';

  if v_recent >= 10 then
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
  where r.user_id = v_uid
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
           author_display_name = public.format_review_author_display(v_uid),
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
    user_id, savings_offer_id, stars, body, product_type, author_display_name, status
  )
  values (
    v_uid, p_savings_offer_id, v_stars, v_body, v_product,
    public.format_review_author_display(v_uid), 'pending'
  )
  returning * into v_row;

  return v_row;
end;
$$;

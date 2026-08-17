-- Admin soft-delete: pending, rejected ve approved yorumlar

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
     and status in ('pending', 'approved', 'rejected')
     and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Review not found or already deleted' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

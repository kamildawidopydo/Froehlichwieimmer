-- Align public insert policy with contact_messages (role public) so anon inserts are reliable.

drop policy if exists product_inquiry_leads_public_insert on public.product_inquiry_leads;

create policy product_inquiry_leads_public_insert
  on public.product_inquiry_leads
  for insert
  with check (
    consent_privacy = true
    and consent_terms = true
    and (user_id is null or user_id = auth.uid())
  );

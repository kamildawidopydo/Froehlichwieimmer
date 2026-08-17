-- Remove ING-DiBa from Sparvergleich and Partnerbanken (no active savings listing).
update public.savings_offers o
set is_active = false
from public.banks b
where o.bank_id = b.id
  and b.slug = 'ing-diba';

update public.banks
set is_active = false
where slug = 'ing-diba';

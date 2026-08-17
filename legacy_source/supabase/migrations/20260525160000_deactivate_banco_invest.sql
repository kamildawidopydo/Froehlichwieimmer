-- Remove Banco Invest from comparison (May 2026)

update public.banks
set is_active = false
where slug = 'banco-invest';

update public.savings_offers o
set is_active = false
from public.banks b
where o.bank_id = b.id
  and b.slug = 'banco-invest';

-- Komplett Bank → Morrow Bank (rebrand April 2023, morrowbank.no)
-- Same legal entity; display name and slug updated for comparison catalog.

update public.banks
set
  name = 'Morrow Bank',
  slug = 'morrow-bank',
  website_url = 'https://www.morrowbank.no',
  logo_url = '/assets/bank-logos/morrow-bank.svg'
where slug = 'komplett-bank';

update public.savings_offers o
set description = replace(o.description, 'Komplett Bank', 'Morrow Bank')
from public.banks b
where o.bank_id = b.id
  and b.slug = 'morrow-bank';

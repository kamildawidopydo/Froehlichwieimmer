-- Ikano Bank: product type Tagesgeld (not Flexgeld)
update public.banks
set website_url = 'https://ikanobank.de/tagesgeld/fleks-horten-tagesgeld'
where slug = 'ikano-bank';

update public.savings_offers o
set
  interest_rate = 3.36,
  deposit_term = 0,
  min_deposit = 1,
  investment_type = 'Tagesgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Täglich verfügbar',
  bonus_amount = 0,
  description = 'Ikano Bank Fleks Horten Tagesgeld: 3,36% Guthabenzins garantiert für 3 Monate für Neukunden (Antrag ab 15.04.2026). Bestandskundenzins 1,51%. Schwedische Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'ikano-bank';

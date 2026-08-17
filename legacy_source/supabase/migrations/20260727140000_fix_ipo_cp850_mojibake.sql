-- Fix CP850 mojibake in curated IPO expected_ipo_window values
-- (UTF-8 bytes were misread as CP850 → e.g. ä→├ñ, –→ÔÇô)

update public.ipo_catalog set expected_ipo_window = 'Q4 2026 – 2027 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'sec_filed:openai';

update public.ipo_catalog set expected_ipo_window = 'Herbst 2026 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'sec_filed:anthropic';

update public.ipo_catalog set expected_ipo_window = 'H2 2026 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'sec_filed:discord';

update public.ipo_catalog set expected_ipo_window = '2026 (regulatorisch abhängig)', updated_at = now()
where external_key = 'sec_filed:kraken';

update public.ipo_catalog set expected_ipo_window = 'H2 2026 (S-1 erwartet, nicht bestätigt)', updated_at = now()
where external_key = 'manual:databricks';

update public.ipo_catalog set expected_ipo_window = '2026–2027 (unsicher, mehrfach verschoben)', updated_at = now()
where external_key = 'manual:stripe';

update public.ipo_catalog set expected_ipo_window = '2026 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'manual:canva';

update public.ipo_catalog set expected_ipo_window = '2026–2027 (geschätzt)', updated_at = now()
where external_key = 'manual:waymo';

update public.ipo_catalog set expected_ipo_window = '2026 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'manual:anduril';

update public.ipo_catalog set expected_ipo_window = '2026 (geschätzt)', updated_at = now()
where external_key = 'manual:revolut';

update public.ipo_catalog set expected_ipo_window = '2026 (geschätzt, nicht bestätigt)', updated_at = now()
where external_key = 'manual:figure-ai';

-- Catch-all for any remaining CP850 mojibake patterns in window text
update public.ipo_catalog
set
  expected_ipo_window = replace(replace(replace(expected_ipo_window, 'ÔÇô', '–'), 'ÔÇö', '—'), '├ñ', 'ä'),
  updated_at = now()
where expected_ipo_window like '%├ñ%'
   or expected_ipo_window like '%ÔÇô%'
   or expected_ipo_window like '%ÔÇö%';

-- ============================================================================
-- Remove already-listed companies from IPO catalog (SpaceX + past US scrapes)
-- ============================================================================

-- SpaceX: hard delete (re-added by stockanalysis scrape)
delete from public.ipo_catalog
where ticker_proposed = 'SPCX'
   or company_name ilike '%Space Exploration Technologies%'
   or external_key ilike '%spacex%';

-- Past US scraped IPOs (already traded)
update public.ipo_catalog
set status = 'listed', is_visible = false, updated_at = now()
where source in ('stockanalysis', 'nasdaq', 'yahoo')
  and is_manual_override = false
  and ipo_date is not null
  and ipo_date < current_date;

-- Scraped rows whose ticker is already in active stocks
update public.ipo_catalog i
set status = 'listed', is_visible = false, updated_at = now()
from public.stocks s
where upper(trim(i.ticker_proposed)) = upper(trim(s.symbol))
  and s.is_active = true
  and i.source in ('stockanalysis', 'nasdaq', 'yahoo', 'euronext')
  and i.is_manual_override = false
  and i.source not in ('sec_filed', 'manual');

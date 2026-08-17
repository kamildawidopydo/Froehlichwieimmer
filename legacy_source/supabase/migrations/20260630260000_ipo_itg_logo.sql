-- ITG, Inc. (NASDAQ IPO) — official logo from itgcomm.com

update public.ipo_catalog
set
  prospectus_url = coalesce(nullif(trim(prospectus_url), ''), 'https://www.itgcomm.com'),
  logo_url = '/assets/ipo-logos/itg.png'
where upper(trim(coalesce(ticker_proposed, ''))) = 'ITG'
   or company_name ilike 'ITG, Inc.%';

update public.stocks
set logo_url = '/assets/ipo-logos/itg.png'
where symbol = 'ITG'
   or name ilike 'ITG, Inc.%';

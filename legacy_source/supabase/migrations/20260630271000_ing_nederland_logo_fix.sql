-- ING Nederland: broken ing.svg was a Wikimedia error page — use working asset
update public.banks
set logo_url = '/assets/bank-logos/ing-logo.jpg'
where slug = 'ing-nederland';

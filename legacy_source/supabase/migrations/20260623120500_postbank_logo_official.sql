-- Use official Postbank wordmark (yellow posthorn + navy text) instead of placeholder assets.
update public.banks
set logo_url = '/assets/bank-logos/postbank-official.svg'
where slug = 'postbank';

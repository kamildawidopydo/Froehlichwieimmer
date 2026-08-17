-- Partner bank logos: ING lion mark + EBN Banco (dark on light backgrounds)
update public.banks set logo_url = '/assets/bank-logos/ing-logo.jpg' where slug = 'ing-diba';
update public.banks set logo_url = '/assets/bank-logos/ebn-banco.svg' where slug = 'ebn-banco';

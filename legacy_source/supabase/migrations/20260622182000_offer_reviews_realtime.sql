-- Realtime: admin sidebar badge + toast für neue Kundenbewertungen

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offer_reviews'
  ) then
    execute 'alter publication supabase_realtime add table public.offer_reviews';
  end if;
exception
  when undefined_object then
    null;
end$$;

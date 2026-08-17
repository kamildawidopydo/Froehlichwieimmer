-- Enable Realtime for admin sidebar badges + toast notifications

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contract_form_submissions'
  ) then
    execute 'alter publication supabase_realtime add table public.contract_form_submissions';
  end if;
exception
  when undefined_object then
    null;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'document_upload_submissions'
  ) then
    execute 'alter publication supabase_realtime add table public.document_upload_submissions';
  end if;
exception
  when undefined_object then
    null;
end$$;

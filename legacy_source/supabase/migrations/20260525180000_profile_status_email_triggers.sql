-- Ensure profile registration / status-change emails fire via send-email edge function.
-- Requires: pg_net extension, send-email deployed with --no-verify-jwt

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.settings.supabase_url', true);
begin
  if v_url is null or v_url = '' then
    v_url := 'https://zvzbszdlnbbcxdemwhze.supabase.co';
  end if;

  if new.role = 'user'
     and new.status = 'pending'
     and new.email is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'pending')
  then
    perform net.http_post(
      v_url || '/functions/v1/send-email',
      jsonb_build_object(
        'type', 'INSERT',
        'record', jsonb_build_object(
          'id', new.id,
          'first_name', new.first_name,
          'last_name', new.last_name,
          'email', new.email,
          'country', coalesce(new.country, '–'),
          'role', new.role,
          'status', new.status
        )
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.settings.supabase_url', true);
begin
  if v_url is null or v_url = '' then
    v_url := 'https://zvzbszdlnbbcxdemwhze.supabase.co';
  end if;

  if old.status is distinct from new.status and new.email is not null then
    perform net.http_post(
      v_url || '/functions/v1/send-email',
      jsonb_build_object(
        'type', 'UPDATE',
        'record', jsonb_build_object(
          'id', new.id,
          'first_name', new.first_name,
          'last_name', new.last_name,
          'email', new.email,
          'status', new.status,
          'rejection_reason', coalesce(new.rejection_reason, '')
        ),
        'old_record', jsonb_build_object(
          'status', old.status
        )
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_new_registration on public.profiles;
create trigger on_new_registration
  after insert or update on public.profiles
  for each row execute function public.notify_new_registration();

drop trigger if exists on_status_change on public.profiles;
create trigger on_status_change
  after update on public.profiles
  for each row execute function public.notify_status_change();

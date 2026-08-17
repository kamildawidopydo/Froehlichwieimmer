-- Fix profile registration/status emails to target the current project.
-- Previous fallback URL pointed at an old Supabase project (zvzbszdlnbbcxdemwhze).

create or replace function public.notify_new_registration()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_url text;
begin
  v_url := coalesce(
    nullif(trim(current_setting('app.settings.supabase_url', true)), ''),
    public.get_runtime_secret('supabase_url', 'app.supabase_url')
  );

  if v_url is null or v_url = '' then
    raise warning 'notify_new_registration: supabase_url missing';
    return new;
  end if;

  if new.role = 'user'
     and new.status = 'pending'
     and new.email is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'pending')
  then
    perform net.http_post(
      url := rtrim(v_url, '/') || '/functions/v1/send-email',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
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
      timeout_milliseconds := 15000
    );
  end if;

  return new;
end;
$fn$;

create or replace function public.notify_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_url text;
begin
  v_url := coalesce(
    nullif(trim(current_setting('app.settings.supabase_url', true)), ''),
    public.get_runtime_secret('supabase_url', 'app.supabase_url')
  );

  if v_url is null or v_url = '' then
    raise warning 'notify_status_change: supabase_url missing';
    return new;
  end if;

  if old.status is distinct from new.status and new.email is not null then
    perform net.http_post(
      url := rtrim(v_url, '/') || '/functions/v1/send-email',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
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
      timeout_milliseconds := 15000
    );
  end if;

  return new;
end;
$fn$;

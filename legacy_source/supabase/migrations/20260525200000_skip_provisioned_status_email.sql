-- Admin-provisioned users receive welcome email with temp password from create-admin-user.
-- Skip generic "approved" status email when provisioned_at is set.

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

  if old.status is distinct from new.status
     and new.email is not null
     and not (new.status = 'approved' and new.provisioned_at is not null)
  then
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

-- Live visitor analytics: sessions, events, batch ingest RPC, admin overview RPC

create table if not exists public.visitor_sessions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  entry_path text,
  current_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  viewport_w int,
  viewport_h int,
  page_views int not null default 0,
  event_count int not null default 0,
  duration_seconds int not null default 0,
  is_mobile boolean,
  language text
);

create table if not exists public.visitor_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  page_path text,
  event_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_visitor_events_created
  on public.visitor_events (created_at desc);

create index if not exists idx_visitor_events_session_created
  on public.visitor_events (session_id, created_at desc);

create index if not exists idx_visitor_events_type_created
  on public.visitor_events (event_type, created_at desc);

create index if not exists idx_visitor_sessions_last_seen
  on public.visitor_sessions (last_seen_at desc);

create index if not exists idx_visitor_sessions_started
  on public.visitor_sessions (started_at desc);

alter table public.visitor_sessions enable row level security;
alter table public.visitor_events enable row level security;

drop policy if exists visitor_sessions_admin_select on public.visitor_sessions;
create policy visitor_sessions_admin_select
  on public.visitor_sessions for select to authenticated
  using (public.is_admin_user());

drop policy if exists visitor_events_admin_select on public.visitor_events;
create policy visitor_events_admin_select
  on public.visitor_events for select to authenticated
  using (public.is_admin_user());

-- Realtime for admin live feed
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visitor_events'
  ) then
    alter publication supabase_realtime add table public.visitor_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visitor_sessions'
  ) then
    alter publication supabase_realtime add table public.visitor_sessions;
  end if;
end $$;

create or replace function public.track_visitor_batch(
  p_session_id uuid,
  p_session_patch jsonb default '{}'::jsonb,
  p_events jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_evt jsonb;
  v_session_exists boolean;
  v_event_count int;
begin
  if p_session_id is null then
    return;
  end if;

  v_event_count := coalesce(jsonb_array_length(p_events), 0);
  if v_event_count > 50 then
    raise exception 'too many events in batch';
  end if;

  select exists(select 1 from visitor_sessions where id = p_session_id)
    into v_session_exists;

  if not v_session_exists then
    insert into visitor_sessions (
      id, user_id, entry_path, current_path, referrer,
      utm_source, utm_medium, utm_campaign,
      user_agent, device_type, browser, os,
      viewport_w, viewport_h, is_mobile, language,
      page_views, event_count
    )
    values (
      p_session_id,
      v_uid,
      coalesce(nullif(p_session_patch->>'entry_path', ''), nullif(p_session_patch->>'current_path', '')),
      nullif(p_session_patch->>'current_path', ''),
      nullif(p_session_patch->>'referrer', ''),
      nullif(p_session_patch->>'utm_source', ''),
      nullif(p_session_patch->>'utm_medium', ''),
      nullif(p_session_patch->>'utm_campaign', ''),
      nullif(p_session_patch->>'user_agent', ''),
      nullif(p_session_patch->>'device_type', ''),
      nullif(p_session_patch->>'browser', ''),
      nullif(p_session_patch->>'os', ''),
      nullif(p_session_patch->>'viewport_w', '')::int,
      nullif(p_session_patch->>'viewport_h', '')::int,
      (p_session_patch->>'is_mobile')::boolean,
      nullif(p_session_patch->>'language', ''),
      coalesce((p_session_patch->>'page_views_delta')::int, 0),
      v_event_count
    );
  else
    update visitor_sessions set
      last_seen_at = now(),
      user_id = coalesce(v_uid, user_id),
      current_path = coalesce(nullif(p_session_patch->>'current_path', ''), current_path),
      duration_seconds = greatest(
        duration_seconds,
        coalesce(nullif(p_session_patch->>'duration_seconds', '')::int, 0)
      ),
      page_views = page_views + coalesce((p_session_patch->>'page_views_delta')::int, 0),
      event_count = event_count + v_event_count
    where id = p_session_id;
  end if;

  for v_evt in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb))
  loop
    insert into visitor_events (session_id, user_id, event_type, page_path, event_payload)
    values (
      p_session_id,
      v_uid,
      v_evt->>'event_type',
      nullif(v_evt->>'page_path', ''),
      coalesce(v_evt->'payload', '{}'::jsonb)
    );
  end loop;
end;
$$;

grant execute on function public.track_visitor_batch(uuid, jsonb, jsonb) to anon, authenticated;

create or replace function public.admin_visitor_live_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_today_start timestamptz;
  v_active_cutoff timestamptz := v_now - interval '2 minutes';
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_today_start := date_trunc('day', v_now at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';

  return jsonb_build_object(
    'liveNow', (
      select count(*)::int from visitor_sessions where last_seen_at >= v_active_cutoff
    ),
    'todaySessions', (
      select count(*)::int from visitor_sessions where started_at >= v_today_start
    ),
    'todayPageViews', (
      select count(*)::int from visitor_events
      where event_type = 'page_view' and created_at >= v_today_start
    ),
    'todayUniqueVisitors', (
      select count(distinct session_id)::int from visitor_events where created_at >= v_today_start
    ),
    'weekSessions', (
      select count(*)::int from visitor_sessions where started_at >= v_now - interval '7 days'
    ),
    'avgDurationToday', coalesce((
      select round(avg(duration_seconds))::int from visitor_sessions
      where started_at >= v_today_start and duration_seconds > 0
    ), 0),
    'bounceRateToday', coalesce((
      select round(100.0 * count(*) filter (where page_views <= 1) / nullif(count(*), 0), 1)
      from visitor_sessions where started_at >= v_today_start
    ), 0),
    'rageClicksToday', (
      select count(*)::int from visitor_events
      where event_type = 'rage_click' and created_at >= v_today_start
    ),
    'deadClicksToday', (
      select count(*)::int from visitor_events
      where event_type = 'dead_click' and created_at >= v_today_start
    ),
    'topPages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc)
      from (
        select page_path as path, count(*)::int as views
        from visitor_events
        where event_type = 'page_view'
          and created_at >= v_today_start
          and page_path is not null
        group by page_path
        order by views desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'topClicks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', label, 'selector', selector, 'path', path, 'clicks', clicks
      ) order by clicks desc)
      from (
        select
          coalesce(event_payload->>'label', event_payload->>'tag', 'Element') as label,
          coalesce(event_payload->>'selector', '') as selector,
          page_path as path,
          count(*)::int as clicks
        from visitor_events
        where event_type in ('click', 'rage_click', 'dead_click')
          and created_at >= v_today_start
        group by 1, 2, 3
        order by clicks desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'deviceBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'count', cnt) order by cnt desc)
      from (
        select coalesce(device_type, 'unknown') as device, count(*)::int as cnt
        from visitor_sessions where started_at >= v_today_start
        group by 1
      ) t
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'count', cnt) order by cnt desc)
      from (
        select
          case
            when referrer is null or referrer = '' then 'direct'
            else left(referrer, 120)
          end as source,
          count(*)::int as cnt
        from visitor_sessions where started_at >= v_today_start
        group by 1
        order by cnt desc
        limit 8
      ) t
    ), '[]'::jsonb),
    'hourlyToday', coalesce((
      select jsonb_agg(jsonb_build_object('hour', hour, 'sessions', cnt) order by hour)
      from (
        select
          extract(hour from started_at at time zone 'Europe/Berlin')::int as hour,
          count(*)::int as cnt
        from visitor_sessions where started_at >= v_today_start
        group by 1
      ) t
    ), '[]'::jsonb),
    'activeSessions', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select
          s.id,
          s.current_path,
          s.started_at,
          s.last_seen_at,
          s.page_views,
          s.device_type,
          s.browser,
          s.referrer,
          s.user_id,
          p.first_name,
          p.last_name,
          p.email
        from visitor_sessions s
        left join profiles p on p.id = s.user_id
        where s.last_seen_at >= v_active_cutoff
        order by s.last_seen_at desc
        limit 30
      ) t
    ), '[]'::jsonb),
    'recentEvents', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select
          e.id,
          e.session_id,
          e.event_type,
          e.page_path,
          e.event_payload,
          e.created_at,
          e.user_id
        from visitor_events e
        order by e.created_at desc
        limit 100
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_visitor_live_overview() to authenticated;

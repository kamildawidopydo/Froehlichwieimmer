-- Visitor analytics: GeoIP, 30m chart, yesterday comparison, ghost sessions, session detail

alter table public.visitor_sessions
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists region text;

create index if not exists idx_visitor_sessions_country
  on public.visitor_sessions (country, started_at desc);

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
  v_is_bot boolean := coalesce((p_session_patch->>'is_bot')::boolean, false);
begin
  if p_session_id is null then
    return;
  end if;

  v_event_count := coalesce(jsonb_array_length(p_events), 0);
  if v_event_count > 50 then
    raise exception 'too many events in batch';
  end if;

  if v_is_bot and v_event_count > 0 then
    select exists(select 1 from visitor_sessions where id = p_session_id)
      into v_session_exists;
    if not v_session_exists then
      return;
    end if;
    v_event_count := 0;
    p_events := '[]'::jsonb;
  end if;

  select exists(select 1 from visitor_sessions where id = p_session_id)
    into v_session_exists;

  if not v_session_exists then
    insert into visitor_sessions (
      id, user_id, entry_path, current_path, referrer,
      utm_source, utm_medium, utm_campaign,
      user_agent, device_type, browser, os,
      viewport_w, viewport_h, is_mobile, language,
      country, city, region,
      page_views, event_count, is_bot
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
      nullif(p_session_patch->>'country', ''),
      nullif(p_session_patch->>'city', ''),
      nullif(p_session_patch->>'region', ''),
      coalesce((p_session_patch->>'page_views_delta')::int, 0),
      v_event_count,
      v_is_bot
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
      event_count = event_count + v_event_count,
      is_bot = visitor_sessions.is_bot or v_is_bot,
      country = coalesce(nullif(p_session_patch->>'country', ''), country),
      city = coalesce(nullif(p_session_patch->>'city', ''), city),
      region = coalesce(nullif(p_session_patch->>'region', ''), region)
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

create or replace function public.admin_visitor_session_detail(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session jsonb;
  v_events jsonb;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  select row_to_json(t)::jsonb into v_session
  from (
    select
      s.*,
      p.first_name,
      p.last_name,
      p.email,
      coalesce((
        select max((e.event_payload->>'depth')::int)
        from visitor_events e
        where e.session_id = s.id and e.event_type = 'scroll_depth'
      ), 0) as max_scroll_depth
    from visitor_sessions s
    left join profiles p on p.id = s.user_id
    where s.id = p_session_id
  ) t;

  if v_session is null then
    return jsonb_build_object('session', null, 'events', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(e)::jsonb order by e.created_at desc), '[]'::jsonb)
  into v_events
  from (
    select id, session_id, event_type, page_path, event_payload, created_at
    from visitor_events
    where session_id = p_session_id
    order by created_at desc
    limit 500
  ) e;

  return jsonb_build_object('session', v_session, 'events', v_events);
end;
$$;

grant execute on function public.admin_visitor_session_detail(uuid) to authenticated;

create or replace function public.admin_visitor_live_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_today_start timestamptz;
  v_yesterday_start timestamptz;
  v_active_cutoff timestamptz := v_now - interval '2 minutes';
  v_rage_recent int;
  v_funnel_home int;
  v_ghost_count int;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_today_start := date_trunc('day', v_now at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
  v_yesterday_start := v_today_start - interval '1 day';

  select count(*)::int into v_rage_recent
  from visitor_events
  where event_type = 'rage_click'
    and created_at >= v_now - interval '10 minutes';

  select count(distinct session_id)::int into v_funnel_home
  from visitor_events
  where event_type = 'page_view'
    and page_path = '/'
    and created_at >= v_today_start;

  select count(*)::int into v_ghost_count
  from visitor_sessions s
  where s.last_seen_at >= v_active_cutoff
    and s.is_bot = false
    and s.page_views = 0;

  return jsonb_build_object(
    'liveNow', (
      select count(*)::int from visitor_sessions
      where last_seen_at >= v_active_cutoff and is_bot = false
    ),
    'ghostSessionCount', v_ghost_count,
    'todaySessions', (
      select count(*)::int from visitor_sessions
      where started_at >= v_today_start and is_bot = false
    ),
    'todayPageViews', (
      select count(*)::int from visitor_events e
      join visitor_sessions s on s.id = e.session_id
      where e.event_type = 'page_view' and e.created_at >= v_today_start and s.is_bot = false
    ),
    'todayUniqueVisitors', (
      select count(distinct e.session_id)::int
      from visitor_events e
      join visitor_sessions s on s.id = e.session_id
      where e.created_at >= v_today_start and s.is_bot = false
    ),
    'weekSessions', (
      select count(*)::int from visitor_sessions
      where started_at >= v_now - interval '7 days' and is_bot = false
    ),
    'botsFilteredToday', (
      select count(*)::int from visitor_sessions
      where started_at >= v_today_start and is_bot = true
    ),
    'avgDurationToday', coalesce((
      select round(avg(duration_seconds))::int from visitor_sessions
      where started_at >= v_today_start and duration_seconds > 0 and is_bot = false
    ), 0),
    'bounceRateToday', coalesce((
      select round(100.0 * count(*) filter (where page_views <= 1) / nullif(count(*), 0), 1)
      from visitor_sessions where started_at >= v_today_start and is_bot = false
    ), 0),
    'rageClicksToday', (
      select count(*)::int from visitor_events
      where event_type = 'rage_click' and created_at >= v_today_start
    ),
    'deadClicksToday', (
      select count(*)::int from visitor_events
      where event_type = 'dead_click' and created_at >= v_today_start
    ),
    'jsErrorsToday', (
      select count(*)::int from visitor_events
      where event_type = 'js_error' and created_at >= v_today_start
    ),
    'formAbandonmentsToday', (
      select count(*)::int from visitor_events
      where event_type = 'form_abandon' and created_at >= v_today_start
    ),
    'conversionsToday', (
      select count(*)::int from visitor_events
      where event_type = 'conversion' and created_at >= v_today_start
    ),
    'rageSpikeActive', v_rage_recent >= 5,
    'rageRecent10m', v_rage_recent,
    'yesterdayComparison', jsonb_build_object(
      'sessions', coalesce((
        select count(*)::int from visitor_sessions
        where started_at >= v_yesterday_start and started_at < v_today_start and is_bot = false
      ), 0),
      'pageViews', coalesce((
        select count(*)::int from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view'
          and e.created_at >= v_yesterday_start and e.created_at < v_today_start
          and s.is_bot = false
      ), 0),
      'uniqueVisitors', coalesce((
        select count(distinct e.session_id)::int from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where e.created_at >= v_yesterday_start and e.created_at < v_today_start and s.is_bot = false
      ), 0),
      'conversions', coalesce((
        select count(*)::int from visitor_events
        where event_type = 'conversion'
          and created_at >= v_yesterday_start and created_at < v_today_start
      ), 0),
      'avgDuration', coalesce((
        select round(avg(duration_seconds))::int from visitor_sessions
        where started_at >= v_yesterday_start and started_at < v_today_start
          and duration_seconds > 0 and is_bot = false
      ), 0),
      'bounceRate', coalesce((
        select round(100.0 * count(*) filter (where page_views <= 1) / nullif(count(*), 0), 1)
        from visitor_sessions
        where started_at >= v_yesterday_start and started_at < v_today_start and is_bot = false
      ), 0)
    ),
    'sessionsLast30m', coalesce((
      select jsonb_agg(jsonb_build_object('minute', minute_offset, 'sessions', cnt) order by minute_offset)
      from (
        select
          gs.i as minute_offset,
          count(distinct s.id)::int as cnt
        from generate_series(29, 0, -1) as gs(i)
        left join visitor_sessions s on
          s.is_bot = false
          and s.last_seen_at >= v_now - (gs.i + 1) * interval '1 minute'
          and s.last_seen_at < v_now - gs.i * interval '1 minute'
        group by gs.i
      ) t
    ), '[]'::jsonb),
    'countriesToday', coalesce((
      select jsonb_agg(jsonb_build_object('country', country, 'count', cnt) order by cnt desc)
      from (
        select coalesce(nullif(country, ''), 'Unbekannt') as country, count(*)::int as cnt
        from visitor_sessions
        where started_at >= v_today_start and is_bot = false
        group by 1
        order by cnt desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'topPages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc)
      from (
        select e.page_path as path, count(*)::int as views
        from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view'
          and e.created_at >= v_today_start
          and e.page_path is not null
          and s.is_bot = false
        group by e.page_path
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
    'funnel', coalesce((
      select jsonb_agg(jsonb_build_object(
        'step', step, 'path', path, 'count', cnt,
        'rate', case when v_funnel_home > 0 then round(100.0 * cnt / v_funnel_home, 1) else 0 end
      ) order by ord)
      from (
        select 1 as ord, 'Startseite' as step, '/' as path,
          count(distinct e.session_id)::int as cnt
        from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view' and e.page_path = '/'
          and e.created_at >= v_today_start and s.is_bot = false
        union all
        select 2, 'Vergleich', '/comparison', count(distinct e.session_id)::int
        from visitor_events e join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view' and e.page_path = '/comparison'
          and e.created_at >= v_today_start and s.is_bot = false
        union all
        select 3, 'Rechner', '/calculator', count(distinct e.session_id)::int
        from visitor_events e join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view' and e.page_path = '/calculator'
          and e.created_at >= v_today_start and s.is_bot = false
        union all
        select 4, 'Antrag', '/apply', count(distinct e.session_id)::int
        from visitor_events e join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view' and e.page_path = '/apply'
          and e.created_at >= v_today_start and s.is_bot = false
        union all
        select 5, 'Registrierung', '/register', count(distinct e.session_id)::int
        from visitor_events e join visitor_sessions s on s.id = e.session_id
        where e.event_type = 'page_view' and e.page_path = '/register'
          and e.created_at >= v_today_start and s.is_bot = false
      ) t
    ), '[]'::jsonb),
    'conversionsByGoal', coalesce((
      select jsonb_agg(jsonb_build_object('goal', goal, 'count', cnt) order by cnt desc)
      from (
        select coalesce(event_payload->>'goal', 'unknown') as goal, count(*)::int as cnt
        from visitor_events
        where event_type = 'conversion' and created_at >= v_today_start
        group by 1
        order by cnt desc
      ) t
    ), '[]'::jsonb),
    'utmCampaigns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', utm_source, 'medium', utm_medium, 'campaign', utm_campaign, 'sessions', cnt
      ) order by cnt desc)
      from (
        select
          coalesce(nullif(utm_source, ''), '—') as utm_source,
          coalesce(nullif(utm_medium, ''), '—') as utm_medium,
          coalesce(nullif(utm_campaign, ''), '—') as utm_campaign,
          count(*)::int as cnt
        from visitor_sessions
        where started_at >= v_today_start
          and is_bot = false
          and (utm_source is not null or utm_medium is not null or utm_campaign is not null)
        group by 1, 2, 3
        order by cnt desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'heatmapPoints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'path', page_path, 'bx', bx, 'by', by, 'hits', hits, 'vw', vw, 'vh', vh
      ) order by hits desc)
      from (
        select
          e.page_path,
          floor((e.event_payload->>'x')::numeric / 40)::int as bx,
          floor((e.event_payload->>'y')::numeric / 40)::int as by,
          max((e.event_payload->>'viewport_w')::int) as vw,
          max((e.event_payload->>'viewport_h')::int) as vh,
          count(*)::int as hits
        from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where e.event_type in ('click', 'rage_click', 'dead_click')
          and e.created_at >= v_today_start
          and s.is_bot = false
          and e.event_payload->>'x' is not null
          and e.event_payload->>'y' is not null
        group by e.page_path, 2, 3
        order by hits desc
        limit 80
      ) t
    ), '[]'::jsonb),
    'deviceBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'count', cnt) order by cnt desc)
      from (
        select coalesce(device_type, 'unknown') as device, count(*)::int as cnt
        from visitor_sessions where started_at >= v_today_start and is_bot = false
        group by 1
      ) t
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'count', cnt) order by cnt desc)
      from (
        select
          case when referrer is null or referrer = '' then 'direct' else left(referrer, 120) end as source,
          count(*)::int as cnt
        from visitor_sessions where started_at >= v_today_start and is_bot = false
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
        from visitor_sessions where started_at >= v_today_start and is_bot = false
        group by 1
      ) t
    ), '[]'::jsonb),
    'activeSessions', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select
          s.id, s.current_path, s.started_at, s.last_seen_at, s.page_views,
          s.device_type, s.browser, s.referrer, s.user_id,
          s.utm_source, s.utm_medium, s.utm_campaign,
          s.country, s.city, s.region, s.event_count,
          p.first_name, p.last_name, p.email,
          coalesce((
            select max((e.event_payload->>'depth')::int)
            from visitor_events e
            where e.session_id = s.id
              and e.event_type = 'scroll_depth'
              and e.page_path = s.current_path
          ), 0) as scroll_depth,
          (s.page_views = 0) as is_ghost
        from visitor_sessions s
        left join profiles p on p.id = s.user_id
        where s.last_seen_at >= v_active_cutoff and s.is_bot = false
        order by s.last_seen_at desc
        limit 50
      ) t
    ), '[]'::jsonb),
    'recentEvents', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select e.id, e.session_id, e.event_type, e.page_path, e.event_payload, e.created_at, e.user_id
        from visitor_events e
        join visitor_sessions s on s.id = e.session_id
        where s.is_bot = false
        order by e.created_at desc
        limit 100
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

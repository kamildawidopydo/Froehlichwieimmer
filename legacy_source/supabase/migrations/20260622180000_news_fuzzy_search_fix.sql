-- Fix news_fuzzy_search: CTE "ranked" was referenced across two statements in plpgsql.

create or replace function public.news_fuzzy_search(
  p_source text default 'articles',
  p_query text default '',
  p_category text default 'all',
  p_tab text default 'recent',
  p_limit int default 12,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_query, ''));
  v_limit int := greatest(least(coalesce(p_limit, 12), 50), 1);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_tab text := case when p_tab = 'popular' then 'popular' else 'recent' end;
  v_tsq tsquery;
  v_total bigint;
  v_rows jsonb;
begin
  if v_q = '' then
    return jsonb_build_object('data', '[]'::jsonb, 'count', 0);
  end if;

  v_tsq := public.news_to_tsquery_safe(v_q);

  if p_source = 'videos' then
    with matched as (
      select
        v.id,
        v.slug,
        v.guid,
        v.title,
        v.summary,
        v.thumbnail_url,
        v.embed_url,
        v.source_url,
        v.duration_seconds,
        v.show_label,
        v.published_at,
        v.language,
        v.view_count,
        (
          case
            when v.fts @@ v_tsq then ts_rank_cd(v.fts, v_tsq) * 10
            else 0
          end
          + similarity(v.title, v_q) * 2
          + word_similarity(v_q, v.title)
          + case when v.title ilike v_q || '%' then 0.6 else 0 end
        )::real as rank_score
      from public.news_videos v
      where
        v.fts @@ v_tsq
        or similarity(v.title, v_q) > 0.18
        or word_similarity(v_q, v.title) > 0.28
        or v.title ilike '%' || v_q || '%'
    ),
    ranked as (
      select *
      from matched
      order by
        case when v_tab = 'popular' then view_count end desc nulls last,
        rank_score desc,
        published_at desc
    )
    select
      count(*)::bigint,
      coalesce(
        (
          select jsonb_agg(to_jsonb(r) - 'rank_score')
          from (
            select *
            from ranked
            offset v_offset
            limit v_limit
          ) r
        ),
        '[]'::jsonb
      )
    into v_total, v_rows
    from ranked;

    return jsonb_build_object('data', v_rows, 'count', v_total);
  end if;

  with matched as (
    select
      a.id,
      a.slug,
      a.guid,
      a.title,
      a.summary,
      a.content,
      a.image_url,
      a.category,
      a.source_url,
      a.published_at,
      a.language,
      a.view_count,
      a.read_time_minutes,
      a.video_embed_url,
      a.video_thumbnail_url,
      a.video_source_url,
      (
        case
          when a.fts @@ v_tsq then ts_rank_cd(a.fts, v_tsq) * 10
          else 0
        end
        + similarity(a.title, v_q) * 2
        + word_similarity(v_q, coalesce(a.title, '') || ' ' || coalesce(a.summary, ''))
        + case when a.title ilike v_q || '%' then 0.6 else 0 end
      )::real as rank_score
    from public.news_articles a
    where
      (coalesce(p_category, 'all') = 'all' or a.category = p_category)
      and (
        a.fts @@ v_tsq
        or similarity(a.title, v_q) > 0.18
        or word_similarity(v_q, a.title) > 0.28
        or a.title ilike '%' || v_q || '%'
        or coalesce(a.summary, '') ilike '%' || v_q || '%'
      )
  ),
  ranked as (
    select *
    from matched
    order by
      case when v_tab = 'popular' then view_count end desc nulls last,
      rank_score desc,
      published_at desc
  )
  select
    count(*)::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(r) - 'rank_score')
        from (
          select *
          from ranked
          offset v_offset
          limit v_limit
        ) r
      ),
      '[]'::jsonb
    )
  into v_total, v_rows
  from ranked;

  return jsonb_build_object('data', v_rows, 'count', v_total);
end;
$$;

-- Public news pages: allow anonymous read access to mirrored Euronews content
-- and view-counter RPCs for the Beliebt tab on /news.

drop policy if exists "news_articles_read_anon" on public.news_articles;
create policy "news_articles_read_anon" on public.news_articles
  for select to anon using (true);

drop policy if exists "news_videos_read_anon" on public.news_videos;
create policy "news_videos_read_anon" on public.news_videos
  for select to anon using (true);

grant execute on function public.news_increment_view(text) to anon;
grant execute on function public.news_increment_video_view(text) to anon;

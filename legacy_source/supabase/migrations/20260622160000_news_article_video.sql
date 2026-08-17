-- Optional inline video metadata scraped from Euronews article pages.

alter table public.news_articles
  add column if not exists video_embed_url text,
  add column if not exists video_thumbnail_url text,
  add column if not exists video_source_url text,
  add column if not exists video_scraped_at timestamptz;

comment on column public.news_articles.video_scraped_at is
  'When the article page was last checked for inline video metadata.';

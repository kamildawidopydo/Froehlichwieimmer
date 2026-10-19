CREATE TABLE public.live_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  source_url text NOT NULL UNIQUE,
  category text NOT NULL,
  published_at timestamptz NOT NULL,
  doc jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_news TO anon, authenticated;
GRANT ALL ON public.live_news TO service_role;
ALTER TABLE public.live_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nachrichten sind öffentlich lesbar" ON public.live_news FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX live_news_published_idx ON public.live_news (published_at DESC);

CREATE TABLE public.news_sync_state (
  id int PRIMARY KEY CHECK (id = 1),
  locked_until timestamptz,
  last_run_at timestamptz,
  last_result jsonb,
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.news_sync_state TO service_role;
ALTER TABLE public.news_sync_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.news_sync_state (id) VALUES (1);

CREATE TABLE public.news_source_seen (
  source_url text PRIMARY KEY,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.news_source_seen TO service_role;
ALTER TABLE public.news_source_seen ENABLE ROW LEVEL SECURITY;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
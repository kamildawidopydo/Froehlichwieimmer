CREATE TABLE public.user_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  display_name text,
  asset_type text NOT NULL DEFAULT 'stock',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_watchlist_symbol_unique UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_watchlist TO authenticated;
GRANT ALL ON public.user_watchlist TO service_role;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_watchlist_own" ON public.user_watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  direction text NOT NULL DEFAULT 'above',
  target_price numeric NOT NULL,
  currency text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  triggered_price numeric,
  triggered_count integer NOT NULL DEFAULT 0,
  cooldown_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_alerts_direction_check CHECK (direction IN ('above','below')),
  CONSTRAINT price_alerts_target_check CHECK (target_price > 0)
);
CREATE INDEX price_alerts_user_idx ON public.price_alerts (user_id, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_alerts_own" ON public.price_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
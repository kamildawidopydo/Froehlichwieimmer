ALTER TABLE public.portfolio_positions ADD COLUMN IF NOT EXISTS current_price numeric;
COMMENT ON COLUMN public.portfolio_positions.current_price IS 'Manuell gepflegter aktueller Kurs (Admin), z.B. fuer IPO-Positionen; hat bei der Bewertung Vorrang vor products.market_price.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_positions TO authenticated;
GRANT ALL ON public.portfolio_positions TO service_role;

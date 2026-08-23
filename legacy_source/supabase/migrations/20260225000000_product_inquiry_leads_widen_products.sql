-- Session 61 — Product-Inquiry Constraint für 6 aktive Produkt-Keys
-- Hintergrund: Der bestehende Constraint erlaubt nur ('aktien','anleihen','spargeld').
-- Nach Session-60-Split müssen fonds/tagesgeld/festgeld/flexgeld ebenfalls erlaubt sein.
-- 'spargeld' bleibt vorerst als Legacy-Kompatibilität für historische Datensätze zulässig.

ALTER TABLE public.product_inquiry_leads
  DROP CONSTRAINT IF EXISTS product_inquiry_leads_product_check;

ALTER TABLE public.product_inquiry_leads
  ADD CONSTRAINT product_inquiry_leads_product_check
  CHECK (product IN (
    'aktien',
    'anleihen',
    'fonds',
    'tagesgeld',
    'festgeld',
    'flexgeld',
    'spargeld'  -- Legacy: bestehende historische Leads nicht invalidieren
  ));

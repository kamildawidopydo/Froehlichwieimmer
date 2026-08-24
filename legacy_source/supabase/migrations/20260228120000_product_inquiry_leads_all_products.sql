-- ============================================================================
-- Session 74.9 — CHECK-Constraint um alle 6 Produkt-Wizards erweitern.
--
-- Aktuelle Situation (Preview):
--   ALTER TABLE public.product_inquiry_leads
--     ADD CONSTRAINT product_inquiry_leads_product_check
--     CHECK (product IN ('aktien', 'anleihen'));
--
-- Folge: 4 von 6 Lead-Wizards (fonds, tagesgeld, festgeld, flexgeld) laufen in
-- Postgres-Fehler 23514 „check constraint product_inquiry_leads_product_check"
-- → Wizard zeigt product-inquiry-error, Lead geht komplett verloren.
--
-- Diese Migration entfernt den bestehenden Constraint und legt ihn mit
-- identischem Namen neu an, jetzt inklusive der neu unterstützten Produkte.
-- Bestehende Zeilen werden nicht verändert. Idempotent: bei erneutem Ausführen
-- wird nur der Constraint neu gesetzt.
-- ============================================================================

BEGIN;

ALTER TABLE public.product_inquiry_leads
  DROP CONSTRAINT IF EXISTS product_inquiry_leads_product_check;

ALTER TABLE public.product_inquiry_leads
  ADD CONSTRAINT product_inquiry_leads_product_check
  CHECK (
    product IN (
      'aktien',
      'anleihen',
      'fonds',
      'tagesgeld',
      'festgeld',
      'flexgeld'
    )
  );

COMMIT;

-- ============================================================================
-- Verifikations-Query — nach dem Deploy in Supabase Studio ausführen.
-- Erwartet: EINE Zeile mit definition = "CHECK ((product = ANY (ARRAY[
-- 'aktien'::text, 'anleihen'::text, 'fonds'::text, 'tagesgeld'::text,
-- 'festgeld'::text, 'flexgeld'::text])))"
-- ============================================================================
--
--   SELECT conname,
--          pg_get_constraintdef(oid) AS definition
--     FROM pg_constraint
--    WHERE conname = 'product_inquiry_leads_product_check';
--
-- Smoke-Insert (nur als Preview — mit ROLLBACK):
--   BEGIN;
--     INSERT INTO public.product_inquiry_leads (product, first_name, last_name, email, phone)
--     VALUES ('fonds', 'Test', 'User', 'sql-check@example.com', '+49 30 123')
--     RETURNING id, product;
--   ROLLBACK;

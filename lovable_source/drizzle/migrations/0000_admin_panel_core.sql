
CREATE SEQUENCE IF NOT EXISTS public.customer_no_seq START 100001;
CREATE SEQUENCE IF NOT EXISTS public.portfolio_no_seq START 500001;
CREATE SEQUENCE IF NOT EXISTS public.tx_no_seq START 1;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_no text NOT NULL UNIQUE DEFAULT ('K-' || nextval('public.customer_no_seq')),
  email text NOT NULL DEFAULT '',
  first_name text, last_name text, phone text, street text, house_number text,
  postal_code text, city text, country text, birth_date date,
  kyc_status text NOT NULL DEFAULT 'documents_missing'
    CHECK (kyc_status IN ('documents_missing','documents_submitted','review_pending','more_documents_required','verified','rejected')),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','locked','deactivated')),
  kyc_verified_at timestamptz, kyc_verified_by uuid,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  portfolio_no text NOT NULL UNIQUE DEFAULT ('D-' || nextval('public.portfolio_no_seq')),
  cash_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('aktie','anleihe','festgeld','flexgeld')),
  name text NOT NULL,
  issuer text, isin text, ticker text,
  currency text NOT NULL DEFAULT 'EUR',
  market_price numeric(18,6), market_price_source text NOT NULL DEFAULT 'manuell',
  market_price_at timestamptz,
  buy_price numeric(18,6), sell_price numeric(18,6),
  nominal_value numeric(18,2), coupon_rate numeric(8,4), interest_rate numeric(8,4),
  term_months integer, maturity_date date, min_amount numeric(18,2),
  conditions text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  visibility text NOT NULL DEFAULT 'global' CHECK (visibility IN ('global','assigned')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_assignments (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, customer_id)
);

CREATE TABLE public.portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  unit_price numeric(18,6),
  interest_rate numeric(8,4),
  purchase_date date NOT NULL DEFAULT current_date,
  maturity_date date,
  currency text NOT NULL DEFAULT 'EUR',
  fees numeric(18,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  note text,
  origin text NOT NULL DEFAULT 'manuelle_buchung' CHECK (origin IN ('manuelle_buchung','auftrag')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_no text NOT NULL UNIQUE DEFAULT ('T-' || lpad(nextval('public.tx_no_seq')::text, 7, '0')),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  side text NOT NULL CHECK (side IN ('buy','sell')),
  quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  displayed_price numeric(18,6),
  executed_price numeric(18,6),
  fees numeric(18,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  total numeric(18,2),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','in_review','accepted','executed','rejected','cancelled')),
  origin text NOT NULL DEFAULT 'kundenauftrag' CHECK (origin IN ('kundenauftrag','manuelle_buchung')),
  idempotency_key text UNIQUE,
  execution_note text,
  status_reason text,
  executed_at timestamptz, executed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('id_front','id_back','address_proof','other')),
  address_doc_kind text,
  document_date date,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','superseded')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','more_documents','rejected')),
  reason text,
  admin_id uuid NOT NULL,
  admin_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field text NOT NULL DEFAULT 'market_price',
  old_price numeric(18,6), new_price numeric(18,6),
  reason text NOT NULL,
  admin_id uuid, admin_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  customer_id uuid,
  old_value jsonb, new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_permissions (
  user_id uuid PRIMARY KEY,
  permissions text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.portfolio_positions(portfolio_id);
CREATE INDEX ON public.transactions(customer_id);
CREATE INDEX ON public.transactions(status);
CREATE INDEX ON public.kyc_documents(customer_id);
CREATE INDEX ON public.audit_logs(created_at DESC);
CREATE INDEX ON public.audit_logs(customer_id);

-- Nur der Server (service_role) greift zu; Prüfung von Rolle/Eigentum erfolgt serverseitig.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['customers','portfolios','products','product_assignments','portfolio_positions','transactions','kyc_documents','kyc_reviews','price_history','audit_logs','staff_permissions','app_settings'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
GRANT USAGE ON SEQUENCE public.customer_no_seq, public.portfolio_no_seq, public.tx_no_seq TO service_role;

-- Kunde + Depot automatisch zu jedem neuen Profil; Bootstrap-Admin bekommt Rolle statt Kundenakte.
CREATE OR REPLACE FUNCTION public.on_profile_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF lower(NEW.email) = 'mathias.dreher27@proton.me' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  INSERT INTO public.customers(user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.first_name, NEW.last_name)
  ON CONFLICT (user_id) DO NOTHING RETURNING id INTO cid;
  IF cid IS NOT NULL THEN
    INSERT INTO public.portfolios(customer_id) VALUES (cid);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.on_profile_created() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_create_customer AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created();

-- Backfill bestehender Profile (ohne Admins)
INSERT INTO public.customers(user_id, email, first_name, last_name)
SELECT p.id, p.email, p.first_name, p.last_name FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.portfolios(customer_id)
SELECT c.id FROM public.customers c WHERE NOT EXISTS (SELECT 1 FROM public.portfolios x WHERE x.customer_id = c.id);

-- Auftrag atomar ausführen: Sperren, Freigabe prüfen, Bestand/Liquidität buchen, keine negativen Bestände.
CREATE OR REPLACE FUNCTION public.execute_transaction(_tx uuid, _price numeric, _fees numeric, _admin uuid, _admin_email text, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transactions; c public.customers; pf public.portfolios; pr public.products;
  held numeric; remaining numeric; pos record; total numeric; take numeric;
BEGIN
  SELECT * INTO t FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auftrag nicht gefunden'; END IF;
  IF t.status NOT IN ('submitted','in_review','accepted') THEN RAISE EXCEPTION 'Auftrag ist bereits %', t.status; END IF;
  SELECT * INTO c FROM public.customers WHERE id = t.customer_id FOR UPDATE;
  IF c.kyc_status <> 'verified' OR c.account_status <> 'active' THEN RAISE EXCEPTION 'Kunde ist nicht verifiziert oder nicht aktiv'; END IF;
  SELECT * INTO pf FROM public.portfolios WHERE id = t.portfolio_id FOR UPDATE;
  SELECT * INTO pr FROM public.products WHERE id = t.product_id;
  IF _price IS NULL OR _price < 0 THEN RAISE EXCEPTION 'Ungültiger Ausführungspreis'; END IF;
  _fees := coalesce(_fees, 0);
  IF pr.category IN ('aktie','anleihe') THEN
    IF t.quantity <= 0 THEN RAISE EXCEPTION 'Stückzahl fehlt'; END IF;
    total := round(t.quantity * _price, 2);
  ELSE
    IF t.amount <= 0 THEN RAISE EXCEPTION 'Anlagebetrag fehlt'; END IF;
    total := t.amount;
  END IF;

  IF t.side = 'buy' THEN
    IF pf.cash_balance < total + _fees THEN RAISE EXCEPTION 'Nicht genügend Liquidität im Depot'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance - total - _fees, updated_at = now() WHERE id = pf.id;
    INSERT INTO public.portfolio_positions(portfolio_id, product_id, quantity, amount, unit_price, interest_rate, maturity_date, currency, fees, origin, created_by, note)
    VALUES (pf.id, pr.id, CASE WHEN pr.category IN ('aktie','anleihe') THEN t.quantity ELSE 0 END,
            total, CASE WHEN pr.category IN ('aktie','anleihe') THEN _price ELSE NULL END,
            CASE WHEN pr.category IN ('festgeld','flexgeld') THEN coalesce(_price, pr.interest_rate) ELSE pr.coupon_rate END,
            pr.maturity_date, pr.currency, _fees, 'auftrag', _admin, 'Aus Auftrag ' || t.tx_no);
  ELSE
    IF pr.category IN ('aktie','anleihe') THEN
      SELECT coalesce(sum(quantity),0) INTO held FROM public.portfolio_positions WHERE portfolio_id = pf.id AND product_id = pr.id AND status='open';
      IF held < t.quantity THEN RAISE EXCEPTION 'Verkauf übersteigt den Bestand (% vorhanden)', held; END IF;
      remaining := t.quantity;
      FOR pos IN SELECT * FROM public.portfolio_positions WHERE portfolio_id = pf.id AND product_id = pr.id AND status='open' ORDER BY purchase_date, created_at FOR UPDATE LOOP
        EXIT WHEN remaining <= 0;
        take := least(pos.quantity, remaining);
        UPDATE public.portfolio_positions SET quantity = quantity - take,
          amount = round(greatest(amount - take * coalesce(unit_price,0), 0), 2),
          status = CASE WHEN quantity - take = 0 THEN 'closed' ELSE 'open' END, updated_at = now() WHERE id = pos.id;
        remaining := remaining - take;
      END LOOP;
    ELSE
      SELECT coalesce(sum(amount),0) INTO held FROM public.portfolio_positions WHERE portfolio_id = pf.id AND product_id = pr.id AND status='open';
      IF held < t.amount THEN RAISE EXCEPTION 'Auszahlung übersteigt die Anlage (% vorhanden)', held; END IF;
      remaining := t.amount;
      FOR pos IN SELECT * FROM public.portfolio_positions WHERE portfolio_id = pf.id AND product_id = pr.id AND status='open' ORDER BY purchase_date, created_at FOR UPDATE LOOP
        EXIT WHEN remaining <= 0;
        take := least(pos.amount, remaining);
        UPDATE public.portfolio_positions SET amount = amount - take,
          status = CASE WHEN amount - take = 0 THEN 'closed' ELSE 'open' END, updated_at = now() WHERE id = pos.id;
        remaining := remaining - take;
      END LOOP;
    END IF;
    IF total - _fees < 0 THEN RAISE EXCEPTION 'Gebühren übersteigen den Erlös'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance + total - _fees, updated_at = now() WHERE id = pf.id;
  END IF;

  UPDATE public.transactions SET status='executed', executed_price=_price, fees=_fees,
    total = CASE WHEN t.side='buy' THEN total + _fees ELSE total - _fees END,
    executed_at=now(), executed_by=_admin, execution_note=_note, updated_at=now() WHERE id=_tx;
  INSERT INTO public.audit_logs(actor_id, actor_email, action, entity, entity_id, customer_id, old_value, new_value, reason)
  VALUES (_admin, _admin_email, 'transaction.execute', 'transaction', _tx::text, t.customer_id,
    jsonb_build_object('status', t.status), jsonb_build_object('status','executed','price',_price,'fees',_fees,'total',total), _note);
  RETURN jsonb_build_object('ok', true, 'total', total);
END $$;
REVOKE EXECUTE ON FUNCTION public.execute_transaction(uuid,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_transaction(uuid,numeric,numeric,uuid,text,text) TO service_role;

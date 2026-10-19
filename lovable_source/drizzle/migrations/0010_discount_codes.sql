CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  kind text NOT NULL CHECK (kind IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value > 0),
  categories text[] NOT NULL DEFAULT '{}',
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  valid_until date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ADD COLUMN discount_code text;
ALTER TABLE public.transactions ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.execute_transaction(_tx uuid, _price numeric, _fees numeric, _admin uuid, _admin_email text, _note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t public.transactions; c public.customers; pf public.portfolios; pr public.products;
  held numeric; remaining numeric; pos record; v_total numeric; take numeric; v_disc numeric := 0;
BEGIN
  SELECT * INTO t FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auftrag nicht gefunden'; END IF;
  IF t.status NOT IN ('submitted','in_review','accepted') THEN RAISE EXCEPTION 'Auftrag ist bereits %', t.status; END IF;
  SELECT * INTO c FROM public.customers WHERE id = t.customer_id FOR UPDATE;
  IF c.kyc_status <> 'verified' OR c.account_status <> 'active' THEN RAISE EXCEPTION 'Kunde ist nicht verifiziert oder nicht aktiv'; END IF;
  SELECT * INTO pf FROM public.portfolios WHERE id = t.portfolio_id FOR UPDATE;
  SELECT * INTO pr FROM public.products WHERE id = t.product_id;
  IF _price IS NULL OR _price < 0 THEN RAISE EXCEPTION 'Ungültiger Ausführungspreis'; END IF;
  IF pr.category = 'ipo' AND _price <= 0 THEN RAISE EXCEPTION 'Für eine IPO-Zeichnung muss der Zeichnungskurs je Stück eingetragen werden'; END IF;
  _fees := coalesce(_fees, 0);
  IF pr.category IN ('aktie','anleihe') THEN
    IF t.quantity <= 0 THEN RAISE EXCEPTION 'Stückzahl fehlt'; END IF;
    v_total := round(t.quantity * _price, 2);
  ELSE
    IF t.amount <= 0 THEN RAISE EXCEPTION 'Anlagebetrag fehlt'; END IF;
    v_total := t.amount;
  END IF;

  IF t.side = 'buy' THEN
    v_disc := least(greatest(coalesce(t.discount_amount, 0), 0), v_total + _fees);
    IF pf.cash_balance < v_total + _fees - v_disc THEN RAISE EXCEPTION 'Nicht genügend Liquidität im Depot'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance - v_total - _fees + v_disc, updated_at = now() WHERE id = pf.id;
    INSERT INTO public.portfolio_positions(portfolio_id, product_id, quantity, amount, unit_price, interest_rate, purchase_date, available_from, maturity_date, currency, fees, origin, created_by, note)
    VALUES (pf.id, pr.id,
            CASE WHEN pr.category IN ('aktie','anleihe') THEN t.quantity
                 WHEN pr.category = 'ipo' AND _price > 0 THEN round(t.amount / _price, 4)
                 ELSE 0 END,
            v_total,
            CASE WHEN pr.category IN ('aktie','anleihe','ipo') THEN _price ELSE NULL END,
            CASE WHEN pr.category IN ('festgeld','flexgeld','tagesgeld') THEN coalesce(_price, pr.interest_rate) ELSE pr.coupon_rate END,
            CURRENT_DATE,
            CASE WHEN pr.category = 'festgeld' THEN (CURRENT_DATE + interval '3 months')::date WHEN pr.category IN ('flexgeld','tagesgeld') THEN CURRENT_DATE ELSE NULL END,
            coalesce(pr.maturity_date, CASE WHEN pr.term_months IS NOT NULL THEN (CURRENT_DATE + make_interval(months => pr.term_months))::date END),
            pr.currency, _fees, 'auftrag', _admin,
            'Aus Auftrag ' || t.tx_no || CASE WHEN v_disc > 0 THEN ' (Rabatt ' || v_disc || ' mit Code ' || coalesce(t.discount_code,'') || ')' ELSE '' END);
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
          quantity = CASE WHEN coalesce(pos.quantity,0) > 0 AND pos.amount > 0 THEN round(pos.quantity * ((pos.amount - take) / pos.amount), 4) ELSE pos.quantity END,
          status = CASE WHEN amount - take = 0 THEN 'closed' ELSE 'open' END, updated_at = now() WHERE id = pos.id;
        remaining := remaining - take;
      END LOOP;
    END IF;
    IF v_total - _fees < 0 THEN RAISE EXCEPTION 'Gebühren übersteigen den Erlös'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance + v_total - _fees, updated_at = now() WHERE id = pf.id;
  END IF;

  UPDATE public.transactions SET status='executed', executed_price=_price, fees=_fees, discount_amount = v_disc,
    total = CASE WHEN t.side='buy' THEN v_total + _fees - v_disc ELSE v_total - _fees END,
    executed_at=now(), executed_by=_admin, execution_note=_note, updated_at=now() WHERE id=_tx;
  INSERT INTO public.audit_logs(actor_id, actor_email, action, entity, entity_id, customer_id, old_value, new_value, reason)
  VALUES (_admin, _admin_email, 'transaction.execute', 'transaction', _tx::text, t.customer_id,
    jsonb_build_object('status', t.status), jsonb_build_object('status','executed','price',_price,'fees',_fees,'discount',v_disc,'total',v_total), _note);
  RETURN jsonb_build_object('ok', true, 'total', v_total, 'discount', v_disc);
END $function$;
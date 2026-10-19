CREATE OR REPLACE FUNCTION public.execute_transaction(_tx uuid, _price numeric, _fees numeric, _admin uuid, _admin_email text, _note text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t public.transactions; c public.customers; pf public.portfolios; pr public.products;
  held numeric; remaining numeric; pos record; v_total numeric; take numeric;
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
    v_total := round(t.quantity * _price, 2);
  ELSE
    IF t.amount <= 0 THEN RAISE EXCEPTION 'Anlagebetrag fehlt'; END IF;
    v_total := t.amount;
  END IF;

  IF t.side = 'buy' THEN
    IF pf.cash_balance < v_total + _fees THEN RAISE EXCEPTION 'Nicht genügend Liquidität im Depot'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance - v_total - _fees, updated_at = now() WHERE id = pf.id;
    INSERT INTO public.portfolio_positions(portfolio_id, product_id, quantity, amount, unit_price, interest_rate, purchase_date, available_from, maturity_date, currency, fees, origin, created_by, note)
    VALUES (pf.id, pr.id, CASE WHEN pr.category IN ('aktie','anleihe') THEN t.quantity ELSE 0 END,
            v_total, CASE WHEN pr.category IN ('aktie','anleihe') THEN _price ELSE NULL END,
            CASE WHEN pr.category IN ('festgeld','flexgeld','tagesgeld') THEN coalesce(_price, pr.interest_rate) ELSE pr.coupon_rate END,
            CURRENT_DATE,
            CASE WHEN pr.category = 'festgeld' THEN (CURRENT_DATE + interval '3 months')::date WHEN pr.category IN ('flexgeld','tagesgeld') THEN CURRENT_DATE ELSE NULL END,
            coalesce(pr.maturity_date, CASE WHEN pr.term_months IS NOT NULL THEN (CURRENT_DATE + make_interval(months => pr.term_months))::date END),
            pr.currency, _fees, 'auftrag', _admin, 'Aus Auftrag ' || t.tx_no);
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
    IF v_total - _fees < 0 THEN RAISE EXCEPTION 'Gebühren übersteigen den Erlös'; END IF;
    UPDATE public.portfolios SET cash_balance = cash_balance + v_total - _fees, updated_at = now() WHERE id = pf.id;
  END IF;

  UPDATE public.transactions SET status='executed', executed_price=_price, fees=_fees,
    total = CASE WHEN t.side='buy' THEN v_total + _fees ELSE v_total - _fees END,
    executed_at=now(), executed_by=_admin, execution_note=_note, updated_at=now() WHERE id=_tx;
  INSERT INTO public.audit_logs(actor_id, actor_email, action, entity, entity_id, customer_id, old_value, new_value, reason)
  VALUES (_admin, _admin_email, 'transaction.execute', 'transaction', _tx::text, t.customer_id,
    jsonb_build_object('status', t.status), jsonb_build_object('status','executed','price',_price,'fees',_fees,'total',v_total), _note);
  RETURN jsonb_build_object('ok', true, 'total', v_total);
END $function$;
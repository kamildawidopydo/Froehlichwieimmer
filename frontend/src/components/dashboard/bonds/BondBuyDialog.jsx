import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { pctDe, eurDe, dateTimeDe } from '@/lib/bondDisplay';

const postJson = async (path, body) => {
  const resp = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(typeof data.detail === 'string' ? data.detail : data.detail?.message || 'Aktion fehlgeschlagen.');
    err.detail = data.detail;
    err.status = resp.status;
    throw err;
  }
  return data;
};

const ADVISORY_MSG = 'Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. Ein persönlicher Berater wird sich mit Ihnen in Verbindung setzen.';

const Line = ({ l, v, strong, testid }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-bank-border pt-2 font-semibold' : ''}`}>
    <span className="text-[12.5px] text-bank-text-muted">{l}</span>
    <span className="text-[13px] tabular-nums text-bank-text" data-testid={testid}>{v}</span>
  </div>
);

const minLabel = (q) => (q.min_order_basis === 'nominal' ? 'Nennwert' : 'Kaufbetrag');

const Breakdown = ({ q }) => (
  <div data-testid="bond-buy-summary">
    <Line l="Stückzahl" v={`${q.pieces.toLocaleString('de-DE')} Stk. à ${eurDe(q.denomination)}`} testid="bond-buy-pieces" />
    <Line l="Nennwert" v={eurDe(q.nominal)} testid="bond-buy-nominal" />
    <Line l="Kaufkurs (verbindlich)" v={pctDe(q.price_pct, 2, 4)} testid="bond-buy-price" />
    <Line l="Kaufbetrag (Kurswert)" v={eurDe(q.purchase_amount)} testid="bond-buy-purchase" />
    <Line l="Stückzinsen / Abrechnungsbestandteile" v={eurDe(q.accrued_interest)} testid="bond-buy-accrued" />
    {q.accrued_note && <p className="-mt-1 mb-1 text-[11px] leading-snug text-bank-text-muted">{q.accrued_note}</p>}
    <Line l="Gebühren" v={eurDe(q.fees)} testid="bond-buy-fees" />
    <Line l="Gesamtbetrag" v={eurDe(q.total)} strong testid="bond-buy-total" />
    <Line l="Verfügbares Guthaben" v={eurDe(q.available)} testid="bond-buy-available" />
    {q.min_order_eur != null && (
      <p className="mt-1 text-[11px] leading-snug text-bank-text-muted" data-testid="bond-buy-minimum">
        Mindestanlage {eurDe(q.min_order_eur)} ({minLabel(q)}) · mindestens {q.min_pieces} Stk.
        {q.adjusted_to_minimum && ' – die Stückzahl wurde automatisch auf die Mindestanlage angehoben.'}
      </p>
    )}
    <p className="mt-2 text-[11px] leading-snug text-bank-text-muted">
      Kursstellung: {q.price_source || '–'} · {dateTimeDe(q.price_quoted_at)} · gültig bis {dateTimeDe(q.price_valid_until)}.
      Nach Ihrer Bestätigung wird der Gesamtbetrag reserviert. Abgebucht und ins Depot gebucht wird erst nach der
      Ausführungsbestätigung der Partnerbank; maßgeblich ist deren Abrechnung.
    </p>
  </div>
);

const RiskNotice = ({ bond, ack, onAck }) => (
  <div className="mt-3 border-l-2 border-amber-400 bg-amber-50/60 p-3" data-testid="bond-buy-risk-notice">
    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800">Wesentliche Risiken</p>
    {bond.risk_note && <p className="text-[12.5px] font-semibold text-amber-900">{bond.risk_note}</p>}
    {bond.risk_details && <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line text-[12px] leading-snug text-bank-text">{bond.risk_details}</p>}
    <label className="mt-2 flex items-start gap-2 text-[12.5px] text-amber-900">
      <input type="checkbox" checked={ack} onChange={(e) => onAck(e.target.checked)} data-testid="bond-buy-risk-ack" className="mt-0.5" />
      Ich habe die Risikohinweise gelesen und zur Kenntnis genommen.
    </label>
  </div>
);

const OpenOrders = ({ q, identical, ack, onAck }) => (
  <div className="mt-3 border-l-2 border-amber-400 bg-amber-50 p-3 text-[12.5px] leading-snug text-amber-900" data-testid="bond-buy-open-orders">
    <p className="font-semibold">Für diese Anleihe wartet bereits ein Kaufauftrag auf Bankbestätigung:</p>
    <ul className="mt-1 list-disc pl-4">
      {q.open_orders.map((o) => (
        <li key={o.transaction_no}>{o.transaction_no} · Nennwert {eurDe(o.nominal)} · {eurDe(o.total)} · {dateTimeDe(o.created_at)}</li>
      ))}
    </ul>
    {identical ? (
      <p className="mt-2" data-testid="bond-buy-duplicate-hint">
        Ein identischer Auftrag ist erst nach Abschluss oder Stornierung des bisherigen Auftrags möglich. Ändern Sie den Betrag, wenn Sie einen weiteren, anderen Kaufauftrag erteilen möchten.
      </p>
    ) : (
      <label className="mt-2 flex items-start gap-2">
        <input type="checkbox" checked={ack} onChange={(e) => onAck(e.target.checked)} data-testid="bond-buy-confirm-additional" className="mt-0.5" />
        Ich möchte ausdrücklich einen weiteren, zusätzlichen Kaufauftrag erteilen.
      </label>
    )}
  </div>
);

export const BondBuyDialog = ({ state, onClose, onOrdered, onStale }) => {
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(state?.quote || null);
  const [ack, setAck] = useState(false);
  const [advised, setAdvised] = useState(false);
  const [riskAck, setRiskAck] = useState(false);
  const bond = state?.bond;
  const q = quote || state?.quote;
  const opens = q?.open_orders || [];
  const identical = opens.some((o) => Math.abs(o.nominal - q.nominal) < 0.005);
  const hasRisk = !!(bond?.risk_note || bond?.risk_details);
  const blocked = identical || (opens.length > 0 && !ack) || (hasRisk && !riskAck);

  const submit = async () => {
    setBusy(true);
    try {
      await postJson('/api/bonds/orders', { bond_id: bond.id, amount_eur: state.amount, expected_total: q.total, confirm_additional: ack });
      toast.success('Ihr Kaufauftrag wurde übermittelt. Status: Order in Bearbeitung – wartet auf Bankbestätigung.');
      onOrdered();
    } catch (err) {
      if (err.status === 402 && err.detail) {
        setQuote({ ...q, sufficient: false, available: err.detail.available, total: err.detail.required, missing: err.detail.missing });
        setAdvised(true);
        toast.success(ADVISORY_MSG);
      } else if (err.status === 409) {
        try {
          setQuote(await fetchBuyQuote(bond.id, state.amount));
          toast.error(err.message);
        } catch (e2) {
          toast.error(e2.message);
          onStale?.();
          onClose();
        }
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-white" data-testid="bond-buy-dialog">
        <DialogHeader>
          <DialogTitle>Kaufübersicht · {bond?.bond_name}</DialogTitle>
        </DialogHeader>
        {q && !q.sufficient && (
          <div className="mb-2 border-l-2 border-amber-400 bg-amber-50 p-3 text-[13px] leading-snug text-amber-900" data-testid="bond-buy-insufficient">
            {advised ? ADVISORY_MSG : 'Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. Wenn Sie den Kauf trotzdem bestätigen, setzt sich ein persönlicher Berater mit Ihnen in Verbindung.'}
            <div className="mt-2"><Line l="Fehlender Betrag" v={eurDe(q.missing)} strong testid="bond-buy-missing" /></div>
          </div>
        )}
        {q && <Breakdown q={q} />}
        {q && hasRisk && !advised && <RiskNotice bond={bond} ack={riskAck} onAck={setRiskAck} />}
        {q && opens.length > 0 && <OpenOrders q={q} identical={identical} ack={ack} onAck={setAck} />}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} data-testid="bond-buy-cancel">
            {advised ? 'Schließen' : 'Abbrechen'}
          </Button>
          {q && !advised && (
            <Button variant="primary" onClick={submit} disabled={busy || blocked} data-testid={q.sufficient ? 'bond-buy-confirm' : 'bond-buy-request-advice'}>
              {busy ? 'Wird übermittelt…' : q.sufficient ? 'Kauf verbindlich bestätigen' : 'Kauf bestätigen & Beratung anfordern'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const fetchBuyQuote = (bondId, amount) => postJson('/api/bonds/orders/check', { bond_id: bondId, amount_eur: amount });

export default BondBuyDialog;

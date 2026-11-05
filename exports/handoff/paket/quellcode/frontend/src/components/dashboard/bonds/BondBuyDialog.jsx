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

const Line = ({ l, v, strong, testid }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-bank-border pt-2 font-semibold' : ''}`}>
    <span className="text-[12.5px] text-bank-text-muted">{l}</span>
    <span className="text-[13px] tabular-nums text-bank-text" data-testid={testid}>{v}</span>
  </div>
);

const Shortfall = ({ q }) => (
  <div className="space-y-2" data-testid="bond-buy-insufficient">
    <p className="border-l-2 border-amber-400 bg-amber-50 p-3 text-[13px] leading-snug text-amber-900">
      Ihr verfügbares Guthaben reicht für diesen Kauf derzeit nicht aus. Ein persönlicher Berater wird sich mit Ihnen in Verbindung setzen.
    </p>
    <Line l="Verfügbares Guthaben" v={eurDe(q.available)} testid="bond-buy-available" />
    <Line l="Benötigter Gesamtbetrag" v={eurDe(q.total)} testid="bond-buy-required" />
    <Line l="Fehlender Betrag" v={eurDe(q.missing)} strong testid="bond-buy-missing" />
  </div>
);

const CostSummary = ({ q }) => (
  <div data-testid="bond-buy-summary">
    <Line l="Stückzahl · Nennwert" v={`${q.pieces.toLocaleString('de-DE')} Stk. · ${eurDe(q.nominal)}`} testid="bond-buy-nominal" />
    <Line l="Kaufkurs (verbindlich)" v={pctDe(q.price_pct, 2, 4)} testid="bond-buy-price" />
    <Line l="Kaufpreis" v={eurDe(q.purchase_amount)} testid="bond-buy-purchase" />
    <Line l="Stückzinsen / Abrechnungsbestandteile" v={eurDe(q.accrued_interest)} testid="bond-buy-accrued" />
    {q.accrued_note && <p className="-mt-1 mb-1 text-[11px] leading-snug text-bank-text-muted">{q.accrued_note}</p>}
    <Line l="Kaufgebühren" v={eurDe(q.fees)} testid="bond-buy-fees" />
    <Line l="Gesamtkosten" v={eurDe(q.total)} strong testid="bond-buy-total" />
    <Line l="Verfügbares Guthaben" v={eurDe(q.available)} testid="bond-buy-available" />
    <p className="mt-2 text-[11px] leading-snug text-bank-text-muted">
      Kursstellung: {q.price_source || '–'} · {dateTimeDe(q.price_quoted_at)} · gültig bis {dateTimeDe(q.price_valid_until)}.
      Nach Ihrer Bestätigung wird der Gesamtbetrag reserviert. Abgebucht und ins Depot gebucht wird erst nach der
      Ausführungsbestätigung der Partnerbank; maßgeblich ist deren Abrechnung.
    </p>
  </div>
);

export const BondBuyDialog = ({ state, onClose, onOrdered }) => {
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(state?.quote || null);
  const bond = state?.bond;
  const q = quote || state?.quote;

  const confirm = async () => {
    setBusy(true);
    try {
      await postJson('/api/bonds/orders', { bond_id: bond.id, amount_eur: state.amount, expected_total: q.total });
      toast.success('Ihr Kaufauftrag wurde übermittelt. Status: Order in Bearbeitung – wartet auf Bankbestätigung.');
      onOrdered();
    } catch (err) {
      if (err.status === 402 && err.detail) {
        setQuote({ ...q, sufficient: false, available: err.detail.available, total: err.detail.required, missing: err.detail.missing });
      } else if (err.status === 409) {
        toast.error(err.message);
        try {
          setQuote(await fetchBuyQuote(bond.id, state.amount));
        } catch (e2) {
          toast.error(e2.message);
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
        {q && (q.sufficient ? <CostSummary q={q} /> : <Shortfall q={q} />)}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} data-testid="bond-buy-cancel">
            {q?.sufficient ? 'Abbrechen' : 'Schließen'}
          </Button>
          {q?.sufficient && (
            <Button variant="primary" onClick={confirm} disabled={busy} data-testid="bond-buy-confirm">
              {busy ? 'Wird übermittelt…' : 'Kauf verbindlich bestätigen'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const fetchBuyQuote = (bondId, amount) => postJson('/api/bonds/orders/check', { bond_id: bondId, amount_eur: amount });

export default BondBuyDialog;

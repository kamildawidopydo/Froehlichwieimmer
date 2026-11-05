import React, { useState } from 'react';
import { FileSignature, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pctDe, eurDe, dateDe } from '@/lib/bondDisplay';

const OFFER_STATUS = {
  offered: { label: 'Angebot liegt vor', cls: 'border-sky-300/55 bg-sky-50 text-sky-700' },
  accepted: { label: 'Angenommen – in Prüfung', cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700' },
  declined: { label: 'Abgelehnt', cls: 'border-rose-300/55 bg-rose-50 text-rose-700' },
  expired: { label: 'Abgelaufen', cls: 'border-bank-border bg-bank-bg text-bank-text-muted' },
};

const Item = ({ l, v, testid }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">{l}</p>
    <p className="mt-0.5 text-[13px] tabular-nums text-bank-text" data-testid={testid}>{v}</p>
  </div>
);

const OfferCard = ({ r, onDecided }) => {
  const [busy, setBusy] = useState(false);
  const o = r.offer;
  const meta = OFFER_STATUS[o.status] || OFFER_STATUS.offered;
  const open = o.status === 'offered' && ['pending', 'approved'].includes(r.status);

  const decide = async (decision) => {
    setBusy(true);
    try {
      const resp = await fetch(`/api/bonds/requests/${r.id}/offer/${decision}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Aktion fehlgeschlagen.');
      toast.success(decision === 'accept'
        ? 'Angebot angenommen. Unser Team prüft die Ausführung und meldet sich bei Ihnen – es wurde noch nichts gebucht.'
        : 'Angebot abgelehnt.');
      await onDecided();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-bank-border bg-white p-4" data-testid={`bond-offer-${r.id}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-[1rem] font-semibold text-bank-text">{r.bond_name || 'Anleihe'}</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">ISIN · {r.isin || '–'}</p>
        </div>
        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${meta.cls}`} data-testid={`bond-offer-status-${r.id}`}>
          {meta.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-bank-border pt-3 sm:grid-cols-4">
        <Item l="Nennwert" v={eurDe(o.nominal)} testid={`bond-offer-nominal-${r.id}`} />
        <Item l="Angebotener Kaufkurs" v={pctDe(o.price_pct, 2, 4)} testid={`bond-offer-price-${r.id}`} />
        <Item l="Anlagebetrag" v={eurDe(o.amount_eur)} testid={`bond-offer-amount-${r.id}`} />
        <Item l="Stückzinsen" v={o.accrued_interest != null ? eurDe(o.accrued_interest) : 'entfällt'} />
        <Item l="Gebühren" v={o.fees != null ? eurDe(o.fees) : 'keine'} />
        <Item l="Gesamtkosten" v={eurDe(o.total_cost ?? o.amount_eur)} testid={`bond-offer-total-${r.id}`} />
        <Item l="Gültig bis" v={dateDe(o.valid_until)} />
        <Item l="Ihre Anfrage" v={eurDe(r.amount_eur)} />
      </div>
      {o.message && <p className="mt-3 text-[12.5px] leading-snug text-bank-text-muted">{o.message}</p>}
      <p className="mt-3 text-[11px] text-bank-text-muted">
        Die Annahme löst keine Abbuchung und keine Wertpapierbuchung aus. Die Ausführung erfolgt erst nach den erforderlichen Prüfungen und einer gesonderten Freigabe.
      </p>
      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" disabled={busy} onClick={() => decide('accept')} data-testid={`bond-offer-accept-${r.id}`}>
            <Check size={13} /> Angebot annehmen
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('decline')} className="border-rose-300/55 text-rose-600 hover:bg-rose-50" data-testid={`bond-offer-decline-${r.id}`}>
            <X size={13} /> Angebot ablehnen
          </Button>
        </div>
      )}
    </div>
  );
};

export const BondOffersPanel = ({ requests, onDecided }) => {
  const withOffer = (requests || []).filter((r) => r.offer);
  if (withOffer.length === 0) return null;
  return (
    <div className="mt-5 space-y-3" data-testid="bond-offers-panel">
      <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
        <FileSignature size={13} className="text-bank-gold" /> Individuelle Angebote
      </p>
      {withOffer.map((r) => <OfferCard key={r.id} r={r} onDecided={onDecided} />)}
    </div>
  );
};

export default BondOffersPanel;

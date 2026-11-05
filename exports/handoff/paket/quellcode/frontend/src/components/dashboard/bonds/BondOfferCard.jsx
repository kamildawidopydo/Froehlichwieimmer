import React, { useState } from 'react';
import { ShoppingCart, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BondLogo from '@/components/BondLogo';
import BondPriceChart from '@/components/dashboard/bonds/BondPriceChart';
import { formatEUR } from '@/lib/dashboardFormatters';
import { computeBondMetrics } from '@/lib/dashboardMetrics';
import {
  yearsRemaining,
  formatDePct,
  formatSigned,
  currentYield,
  isReferencePrice,
  dateTimeDe,
  dateDe,
} from '@/lib/bondDisplay';

const Label = ({ children }) => (
  <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">{children}</dt>
);

const priceValue = (b) => {
  if (b.aktueller_kurs == null) return '–';
  const base = `${Number(b.aktueller_kurs).toLocaleString('de-DE', { minimumFractionDigits: 2 })} %`;
  return isReferencePrice(b) ? `${base} (historischer Referenzwert)` : base;
};

const maturityValue = (b) => {
  if (b.is_perpetual) return 'Unbefristet';
  return b.faelligkeitsdatum ? dateDe(b.faelligkeitsdatum) : 'Nach Verifizierung';
};

const restValue = (b) => {
  const y = yearsRemaining(b);
  if (y === Infinity) return 'Unbefristet';
  if (y == null) return '–';
  return y > 0 ? `${y.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} J.` : 'fällig';
};

const buildRows = (b) => {
  const metrics = computeBondMetrics(b);
  const rows = [
    { label: 'Aktueller Kurs', val: priceValue(b), testid: 'price' },
    { label: 'Fälligkeit', val: maturityValue(b), testid: 'maturity' },
    { label: 'Restlaufzeit', val: restValue(b), testid: 'rest' },
  ];
  if (b.is_perpetual) {
    const cy = currentYield(b);
    rows.push({
      label: 'Laufende Verzinsung',
      val: cy != null ? formatDePct(cy) : 'Wird berechnet, sobald alle erforderlichen Daten vorliegen.',
      testid: 'current-yield',
    });
    rows.push({ label: 'Rendite bis Fälligkeit', val: 'entfällt (unbefristet)', testid: 'ytm' });
  } else {
    rows.push({ label: 'Aktuelle Rendite', val: formatDePct(metrics.currentYield), testid: 'current-yield' });
    rows.push({ label: 'Approx. YTM', val: formatDePct(metrics.approxYtm), testid: 'ytm' });
  }
  rows.push({ label: 'Min. Volumen', val: formatEUR(b.min_order_eur || 1000), testid: 'min' });
  return rows;
};

const PriceMeta = ({ b }) => {
  const change = formatSigned(b.kursveraenderung_abs);
  const changePct = formatSigned(b.kursveraenderung_pct, 2, ' %');
  const stamp = b.kurs_datum || (b.price_updated_at && dateTimeDe(b.price_updated_at));
  if (!isReferencePrice(b) && !change && !stamp) return null;
  const parts = [
    isReferencePrice(b) && <span key="r" className="font-medium">{b.kurs_hinweis || 'Referenzkurs'}</span>,
    change && <span key="c">Veränderung {change} / {changePct}</span>,
    stamp && <span key="s">{isReferencePrice(b) ? 'erfasst' : 'Stand'} {stamp}</span>,
    isReferencePrice(b) && <span key="n">kein aktueller Marktpreis</span>,
  ].filter(Boolean);
  return (
    <p className="mb-4 -mt-2 text-[11px] leading-snug text-bank-text-muted" data-testid="bond-card-price-meta">
      {parts.map((p, i) => <React.Fragment key={i}>{i > 0 && ' · '}{p}</React.Fragment>)}
    </p>
  );
};

const DetailLine = ({ label, value }) =>
  value ? (
    <p className="text-[12px] leading-snug text-bank-text">
      <span className="text-bank-text-muted">{label}: </span>
      {value}
    </p>
  ) : null;

const ProductDetails = ({ b, testKey }) => {
  const [open, setOpen] = useState(false);
  const hasDetails = b.id || b.description || b.risk_details || b.legal_issuer || b.denomination || b.zinstermine;
  if (!hasDetails) return null;
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-gold"
        data-testid={`bond-details-toggle-${testKey}`}
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Produktdetails & Risiken
      </button>
      {open && (
        <div className="mt-3 space-y-1.5 border-t border-bank-border pt-3" data-testid={`bond-details-${testKey}`}>
          <DetailLine label="Wertpapierart" value={b.security_type} />
          <DetailLine label="Rechtlicher Herausgeber" value={b.legal_issuer} />
          <DetailLine label="WKN" value={b.wkn} />
          <DetailLine label="Währung" value={b.currency} />
          <DetailLine label="Emissionsdatum" value={b.issue_date && dateDe(b.issue_date)} />
          <DetailLine label="Stückelung" value={b.denomination && formatEUR(b.denomination)} />
          <DetailLine label="Zinszahlung" value={[b.zinsfrequenz, b.zinstermine].filter(Boolean).join(' · ')} />
          {b.description && <p className="pt-1 text-[12px] leading-snug text-bank-text">{b.description}</p>}
          {b.terms_status === 'pending' && (
            <p className="text-[11.5px] leading-snug text-amber-800" data-testid={`bond-terms-pending-${testKey}`}>
              Hinweis: Ausschüttungen liegen im Ermessen des Emittenten. Die Angaben zu Höhe und Terminen werden derzeit noch überprüft.
            </p>
          )}
          {b.id && <BondPriceChart bondId={b.id} />}
          {b.risk_details && (
            <div className="mt-2 border-l-2 border-amber-400 bg-amber-50/60 p-2.5">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800">Wesentliche Risiken</p>
              <p className="whitespace-pre-line text-[12px] leading-snug text-bank-text">{b.risk_details}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BondOfferCard = ({ bond: b, testKey, eager, amount, onAmountChange, onRequest, onBuy }) => {
  const requestsOpen = b.requests_enabled !== false;
  const buyable = b.buy_executable === true;
  return (
    <div
      className="relative border border-bank-border bg-white p-5 transition-shadow duration-300 hover:shadow-editorial-sm"
      data-testid={`bond-card-${testKey}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BondLogo bond={b} size="md" eager={eager} />
          <div className="min-w-0">
            <p className="dashboard-page-title truncate text-[1.1rem] font-semibold leading-tight text-bank-text">
              {b.bond_name || b.isin}
            </p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {b.issuer || ''}
              {b.isin ? ` · ISIN ${b.isin}` : ''}
              {b.wkn ? ` · WKN ${b.wkn}` : ''}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[1.65rem] font-semibold leading-none tabular-nums text-bank-primary">
            {b.kupon_rate != null ? `${Number(b.kupon_rate).toLocaleString('de-DE', { minimumFractionDigits: b.is_perpetual ? 3 : 0, maximumFractionDigits: 3 })} %` : '–'}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Kupon p.a.</p>
        </div>
      </div>
      {b.risk_note && (
        <p className="mb-3 inline-flex items-center gap-1.5 border border-amber-300/70 bg-amber-50 px-2 py-1 text-[11.5px] text-amber-800" data-testid={`bond-risk-note-${testKey}`}>
          <AlertTriangle size={12} strokeWidth={1.75} /> {b.risk_note}
        </p>
      )}
      <dl className="mb-5 grid grid-cols-2 gap-3 border-t border-bank-border pt-4">
        {buildRows(b).map((kv) => (
          <div key={kv.label}>
            <Label>{kv.label}</Label>
            <dd className="rate-figure mt-1 text-[13px] tabular-nums text-bank-text" data-testid={`bond-${kv.testid}-${testKey}`}>
              {kv.val}
            </dd>
          </div>
        ))}
      </dl>
      <PriceMeta b={b} />
      <ProductDetails b={b} testKey={testKey} />
      <div className="mb-4">
        <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
          Ordervolumen (EUR)
        </label>
        <Input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="h-9 text-sm"
          data-testid={`bond-amount-input-${testKey}`}
        />
      </div>
      {buyable && b.kaufkurs != null && (
        <p className="mb-3 text-[11.5px] text-emerald-800" data-testid={`bond-buy-price-${testKey}`}>
          Verbindlicher Kaufkurs {Number(b.kaufkurs).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} %
          {b.kaufkurs_valid_until && ` · gültig bis ${new Date(b.kaufkurs_valid_until).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
        </p>
      )}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={buyable ? onBuy : onRequest}
        disabled={!buyable && !requestsOpen}
        data-testid={buyable ? `bond-buy-now-${testKey}` : `bond-request-purchase-${testKey}`}
      >
        <ShoppingCart size={14} strokeWidth={1.5} />
        {buyable
          ? 'Jetzt kaufen'
          : !requestsOpen
            ? 'Derzeit keine Kaufanfragen möglich'
            : b.is_perpetual || b.kurs_typ === 'reference'
              ? 'Kaufangebot anfordern'
              : 'Kaufanfrage senden'}
      </Button>
    </div>
  );
};

export default BondOfferCard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StockLogo from '@/components/StockLogo';
import { formatDate } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

const money = (value, currency) => value == null || !Number.isFinite(Number(value))
  ? '–'
  : Number(value).toLocaleString('de-DE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SecurityPositionCard({ metric: m, quote = {}, portfolioTotal = 0 }) {
  const navigate = useNavigate();
  const currency = m.currency || quote.currency || 'EUR';
  const ipo = m.category === 'ipo' || m.isIpoValuation;
  const current = m.price ?? m.current_price ?? null;
  const total = current == null ? null : m.marktwert ?? Math.round(Number(m.qty) * Number(current) * 100) / 100;
  const gain = total == null ? null : total - Number(m.einstand);
  const gainPct = gain != null && m.einstand > 0 ? gain / m.einstand * 100 : null;
  const positive = gain != null && gain >= 0;
  const signed = (value) => value == null ? '–' : `${value >= 0 ? '+' : ''}${money(value, currency)}`;
  const fields = [
    [ipo ? 'Zeichnungskurs je Stück' : 'Kaufpreis je Stück', money(m.avg, currency)],
    ['Aktueller Preis je Stück', money(current, currency)],
    [ipo ? 'Zeichnungsbetrag gesamt' : 'Kaufbetrag gesamt', money(m.einstand, currency)],
    ['Aktueller Gesamtwert', money(total, currency)],
    ['Gewinn / Verlust', signed(gain), true],
    ['Gewinn / Verlust in %', gainPct == null ? '–' : `${gainPct >= 0 ? '+' : ''}${gainPct.toLocaleString('de-DE', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} %`, true],
    ['Stückzahl', Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 6 })],
    [ipo ? 'Zeichnungsdatum' : 'Kaufdatum', formatDate(m.purchase_date)],
  ];
  const updated = quote.as_of || quote.last_updated || quote.updated_at;
  return (
    <article className="min-w-0 rounded-lg border border-bank-border bg-bank-surface p-5" data-testid={`position-details-${m.id}`}>
      <div className="flex items-start justify-between gap-3 border-b border-bank-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <StockLogo symbol={m.symbol} name={m.stockName} logoUrl={m.logoUrl} size="sm" />
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold text-bank-text">{m.stockName || m.symbol}</h3>
            <p className="mt-1 break-all text-xs text-bank-text-muted">{ipo ? 'IPO' : 'Aktie'}{m.symbol ? ` · ${m.symbol}` : ''}{m.isin ? ` · ${m.isin}` : ''}</p>
          </div>
        </div>
        {!ipo && <Button variant="ghost" size="icon" aria-label={`Details zu ${m.stockName || m.symbol}`} title="Produktdetails ansehen" onClick={() => navigate(`/dashboard/aktien/${encodeURIComponent(m.symbol)}`)}><ArrowUpRight size={18} /></Button>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
        {fields.map(([label, value, isGain]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs leading-relaxed text-bank-text-muted">{label}</dt>
            <dd className={cn('mt-1 break-words text-sm font-semibold tabular-nums', isGain && gain != null ? positive ? 'text-bank-success' : 'text-bank-error' : 'text-bank-text')}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-bank-border pt-3 text-xs text-bank-text-muted">
        <span>Währung: {currency}</span>
        {portfolioTotal > 0 && currency === 'EUR' && current != null && <span>Depotanteil: {(m.marktwert / portfolioTotal * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %</span>}
        {!ipo && quote.change_pct != null && <span>Tagesveränderung: {Number(quote.change_pct).toLocaleString('de-DE', { signDisplay: 'always', maximumFractionDigits: 2 })} %</span>}
        {updated && <span>Kursstand: {new Date(updated).toLocaleString('de-DE')}</span>}
        {current == null && <span>Aktueller Preis nicht verfügbar</span>}
        {ipo && <span>Bewertung zum hinterlegten IPO-Preis</span>}
      </div>
    </article>
  );
}
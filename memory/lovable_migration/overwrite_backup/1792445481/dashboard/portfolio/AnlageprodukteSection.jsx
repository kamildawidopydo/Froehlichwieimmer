import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductIcon from '@/components/ProductIcon';
import { SectionTitle } from '@/components/dashboard/PageHeader';
import { formatEUR } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

const GROUP_LABELS = {
  einlagen: 'Einlagen',
  wertpapiere: 'Wertpapiere',
};

const PRODUCT_BUBBLE = {
  festgeld: 'border-bank-primary/25 bg-bank-primary/[0.07] text-bank-primary',
  tagesgeld: 'border-bank-accent/25 bg-bank-accent/[0.08] text-bank-accent',
  flexgeld: 'border-bank-gold/30 bg-bank-gold/[0.1] text-bank-gold',
  aktien: 'border-bank-primary/25 bg-bank-primary/[0.07] text-bank-primary',
  anleihen: 'border-slate-300/70 bg-slate-50 text-slate-700',
};

const BAR_COLOR = {
  festgeld: 'bg-bank-primary',
  tagesgeld: 'bg-bank-accent',
  flexgeld: 'bg-bank-gold',
  aktien: 'bg-bank-primary',
  anleihen: 'bg-slate-500',
};

const ProductRow = ({ to, productKey, label, value, hint, sharePct = 0 }) => {
  const hasValue = Number(value) > 0;
  const barWidth = Math.min(Math.max(sharePct, 0), 100);

  return (
    <Link
      to={to}
      className={cn(
        'group grid items-center gap-x-3 gap-y-1 rounded-lg px-3 py-3 transition-colors',
        'grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_72px_auto_20px]',
        'hover:bg-bank-bg/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/25',
      )}
    >
      <ProductIcon
        product={productKey}
        size="md"
        showBubble
        className={cn('border', PRODUCT_BUBBLE[productKey])}
      />

      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-bank-text">{label}</p>
        <p className="mt-0.5 truncate text-[12px] text-bank-text-muted">{hint}</p>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-bank-border/50">
          <div
            className={cn('h-full rounded-full transition-all duration-300', BAR_COLOR[productKey])}
            style={{ width: hasValue ? `${Math.max(barWidth, sharePct > 0 ? 4 : 0)}%` : '0%' }}
          />
        </div>
      </div>

      <p className="hidden text-right text-[12px] font-medium tabular-nums text-bank-text-muted sm:block">
        {sharePct.toFixed(1).replace('.', ',')} %
      </p>

      <p className="text-right text-[14px] font-semibold tabular-nums text-bank-text">{formatEUR(value || 0)}</p>

      <ChevronRight
        size={15}
        strokeWidth={1.5}
        className="text-bank-text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-bank-primary"
        aria-hidden
      />
    </Link>
  );
};

const ProductGroup = ({ groupKey, items }) => {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 px-3 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-bank-text-muted first:pt-0">
        {GROUP_LABELS[groupKey] || groupKey}
      </p>
      <div className="divide-y divide-bank-border/60">
        {items.map((item) => (
          <ProductRow key={item.key} {...item} productKey={item.key} />
        ))}
      </div>
    </div>
  );
};

/**
 * Portfolio product navigator — grouped list with allocation bars (Vermögen hub).
 */
const AnlageprodukteSection = ({ groups, totalValue, className }) => (
  <div className={cn('rounded-xl border border-bank-border bg-white p-5 shadow-sm', className)}>
    <SectionTitle
      kicker="Portfolio"
      action={
        totalValue != null && (
          <p className="text-right text-[13px] font-semibold tabular-nums text-bank-text">{formatEUR(totalValue)}</p>
        )
      }
    >
      Anlageprodukte
    </SectionTitle>
    <p className="-mt-1 mb-3 text-[13px] text-bank-text-muted">Nach Anlageklasse navigieren</p>

    <div className="mb-2 hidden border-b border-bank-border/70 pb-2 sm:grid sm:grid-cols-[auto_1fr_72px_auto_20px] sm:gap-x-3 sm:px-3">
      <span className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted">
        Produkt
      </span>
      <span className="text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted">
        Anteil
      </span>
      <span className="text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted">
        Marktwert
      </span>
      <span aria-hidden />
    </div>

    <ProductGroup groupKey="einlagen" items={groups.einlagen} />
    <ProductGroup groupKey="wertpapiere" items={groups.wertpapiere} />
  </div>
);

export default AnlageprodukteSection;

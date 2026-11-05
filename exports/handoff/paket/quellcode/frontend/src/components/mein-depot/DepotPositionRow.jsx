import React from 'react';
import { Link } from 'react-router-dom';
import Sparkline from '@/components/dashboard/charts/Sparkline';
import { formatEUR, formatEURSigned, pnlTone } from '@/lib/dashboardFormatters';

const pct = (v) =>
  v == null ? '–' : `${Math.round(v * 100) > 0 ? '+' : ''}${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
const eur = (v) => (v == null ? '–' : formatEUR(v));
const signed = (v) => (v == null ? '–' : formatEURSigned(v));

export const FALLBACK_TEXT = 'Ersatzbewertung auf Basis des Einstandswerts – kein aktueller Marktwert';

export const FallbackNote = ({ testid }) => (
  <span className="mt-0.5 block text-[10.5px] font-normal leading-tight text-amber-800" title={FALLBACK_TEXT} data-testid={testid}>
    {FALLBACK_TEXT}
  </span>
);

const ValueCell = ({ row }) => (
  <>
    <span className={row.fallback ? 'text-bank-text-muted' : ''}>{row.fallback ? `${eur(row.value)}*` : eur(row.value)}</span>
    {row.fallback && <FallbackNote testid={`depot-fallback-${row.symbol}`} />}
  </>
);

const KindBadge = ({ row }) => {
  if (row.kind === 'bond') return <span className="rounded bg-bank-bg px-1.5 py-0.5 text-[10px] text-bank-text-muted">Anleihe</span>;
  if (row.ipoUnlisted) {
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800" data-testid={`depot-ipo-badge-${row.symbol}`}>
        IPO-Bewertung – kein Börsenkurs
      </span>
    );
  }
  if (row.kind === 'ipo') return <span className="rounded bg-bank-bg px-1.5 py-0.5 text-[10px] text-bank-text-muted">IPO</span>;
  return null;
};

export const DevelopmentCell = ({ row, spark }) => {
  if (row.kind === 'bond') return <span className="text-[11px] text-bank-text-muted">–</span>;
  if (row.ipoUnlisted || !spark?.closes?.length) {
    return <span className="text-[11px] text-bank-text-muted" data-testid={`depot-spark-empty-${row.symbol}`}>Keine Verlaufsdaten</span>;
  }
  const c = spark.closes;
  return (
    <span data-testid={`depot-spark-${row.symbol}`} title="Entwicklung 30 Tage (EUR)">
      <Sparkline values={c} up={c[c.length - 1] >= c[0]} width={84} height={26} />
    </span>
  );
};

export const TradeButtons = ({ row }) => {
  if (row.kind === 'bond') return <span className="text-[11px] text-bank-text-muted">–</span>;
  const base = `/dashboard/aktien/${encodeURIComponent(row.symbol)}`;
  const btn = 'inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium';
  return (
    <div className="flex justify-end gap-1.5">
      {row.ipoUnlisted ? (
        <span className={`${btn} cursor-not-allowed bg-bank-bg text-bank-text-muted`} title="Kein regulärer Börsenhandel" data-testid={`depot-sell-disabled-${row.symbol}`}>
          Kein Börsenhandel
        </span>
      ) : (
        <>
          <Link to={`${base}?side=buy`} className={`${btn} bg-bank-primary text-white hover:opacity-90`} data-testid={`depot-buy-${row.symbol}`}>Kaufen</Link>
          <Link to={`${base}?side=sell`} className={`${btn} border border-bank-border text-bank-text hover:bg-bank-bg`} data-testid={`depot-sell-${row.symbol}`}>Verkaufen</Link>
        </>
      )}
    </div>
  );
};

const NameCell = ({ row }) => (
  <div className="min-w-0">
    {row.kind === 'bond' ? (
      <p className="truncate font-medium text-bank-text">{row.name}</p>
    ) : (
      <Link to={`/dashboard/aktien/${encodeURIComponent(row.symbol)}`} className="truncate font-medium text-bank-text hover:underline">{row.name}</Link>
    )}
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-bank-text-muted">
      <span className="font-mono">{row.symbol}</span>
      <KindBadge row={row} />
    </div>
  </div>
);

export const DepotRow = React.memo(({ row, spark }) => (
  <tr className="border-b border-bank-border last:border-0" data-testid={`depot-row-${row.symbol}`}>
    <td className="px-3 py-2.5"><NameCell row={row} /></td>
    <td className="px-3 py-2.5 text-right tabular-nums">{Number(row.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })}</td>
    <td className="px-3 py-2.5 text-right tabular-nums">{row.kind === 'bond' ? `${row.avg.toLocaleString('de-DE')} %` : eur(row.avg)}</td>
    <td className="px-3 py-2.5 text-right tabular-nums">{row.kind === 'bond' ? (row.price != null ? `${row.price.toLocaleString('de-DE')} %` : '–') : eur(row.price)}</td>
    <td className="px-3 py-2.5 text-right font-semibold tabular-nums" data-testid={`depot-value-${row.symbol}`}><ValueCell row={row} /></td>
    <td className={`px-3 py-2.5 text-right tabular-nums ${pnlTone(row.gv)}`} data-testid={`depot-gv-${row.symbol}`}>
      <div>{signed(row.gv)}</div>
      <div className="text-[11px]">{pct(row.pct)}</div>
    </td>
    <td className={`px-3 py-2.5 text-right tabular-nums ${pnlTone(row.dayAbs)}`} data-testid={`depot-day-${row.symbol}`}>
      <div>{signed(row.dayAbs)}</div>
      <div className="text-[11px]">{pct(row.dayPct)}</div>
    </td>
    <td className="px-3 py-2.5 text-right tabular-nums" data-testid={`depot-weight-${row.symbol}`}>{pct(row.weight).replace('+', '')}</td>
    <td className="px-3 py-2.5"><DevelopmentCell row={row} spark={spark} /></td>
    <td className="px-3 py-2.5"><TradeButtons row={row} /></td>
  </tr>
));

export const DepotCard = React.memo(({ row, spark }) => (
  <li className="border-b border-bank-border px-4 py-3 last:border-0" data-testid={`depot-card-${row.symbol}`}>
    <div className="flex items-start justify-between gap-3">
      <NameCell row={row} />
      <DevelopmentCell row={row} spark={spark} />
    </div>
    <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
      <div><p className="text-bank-text-muted">Wert</p><p className="font-semibold tabular-nums"><ValueCell row={row} /></p></div>
      <div className={pnlTone(row.gv)}><p className="text-bank-text-muted">G/V</p><p className="tabular-nums">{signed(row.gv)} · {pct(row.pct)}</p></div>
      <div className={pnlTone(row.dayAbs)}><p className="text-bank-text-muted">Heute</p><p className="tabular-nums">{signed(row.dayAbs)}</p></div>
    </div>
    <div className="mt-2 flex items-center justify-between text-[11px] text-bank-text-muted">
      <span>{Number(row.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} {row.kind === 'bond' ? 'nominal' : 'Stück'} · Anteil {pct(row.weight).replace('+', '')}</span>
      <TradeButtons row={row} />
    </div>
  </li>
));

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatEUR, pnlTone } from '@/lib/dashboardFormatters';

const pctTxt = (v, signed = false) =>
  `${signed && Math.round(v * 100) > 0 ? '+' : ''}${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const Bar = ({ label, value, share, testid }) => (
  <div data-testid={testid}>
    <div className="flex justify-between text-[12px]">
      <span className="text-bank-text">{label}</span>
      <span className="tabular-nums text-bank-text-muted">{formatEUR(value)} · {pctTxt(share)}</span>
    </div>
    <div className="mt-1 h-2 rounded-full bg-bank-bg">
      <div className="h-2 rounded-full bg-bank-primary" style={{ width: `${Math.min(100, share)}%` }} />
    </div>
  </div>
);

const PerfList = ({ title, items, testid }) => (
  <div data-testid={testid}>
    <p className="mb-1 text-[12px] font-semibold text-bank-text">{title}</p>
    {items.length === 0 ? <p className="text-[12px] text-bank-text-muted">Keine Daten</p> : items.map((r) => (
      <div key={r.key} className="flex justify-between text-[12px]">
        <span className="truncate">{r.name}</span>
        <span className={`tabular-nums ${pnlTone(r.pct)}`}>{pctTxt(r.pct, true)}</span>
      </div>
    ))}
  </div>
);

const DepotAnalyseDialog = ({ open, onOpenChange, rows, totals }) => {
  const a = useMemo(() => {
    const sum = (k) => rows.filter((r) => r.kind === k).reduce((s, r) => s + r.value, 0);
    const alloc = [
      ['Aktien', sum('stock')], ['IPO-Beteiligungen', sum('ipo')], ['Anleihen', sum('bond')],
      ['Festgeld', totals.festgeld], ['Tagesgeld', totals.tagesgeld], ['Flexgeld', totals.flexgeld],
      ['Sonstige Verträge', totals.sonstige], ['Liquidität', totals.cash],
    ].map(([l, v]) => [l, Number(v) || 0]);
    const all = alloc.reduce((s, [, v]) => s + v, 0);
    const unvalued = rows.filter((r) => r.gv == null);
    const byPct = (list) => [...list].filter((r) => r.pct != null).sort((x, y) => y.pct - x.pct);
    const market = byPct(rows.filter((r) => r.kind === 'stock'));
    const ipo = byPct(rows.filter((r) => r.kind === 'ipo'));
    return {
      alloc: alloc.filter(([, v]) => v > 0).map(([l, v]) => [l, v, all > 0 ? (v / all) * 100 : 0]),
      top: [...rows].sort((x, y) => y.value - x.value).slice(0, 5),
      best: market.filter((r) => Math.round(r.pct * 100) > 0).slice(0, 3),
      worst: market.filter((r) => Math.round(r.pct * 100) < 0).slice(-3).reverse(),
      ipo,
      all,
      unvalued,
    };
  }, [rows, totals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white" data-testid="depot-analyse-dialog">
        <DialogHeader>
          <DialogTitle>Depotanalyse</DialogTitle>
          <DialogDescription>Auf Basis Ihrer aktuellen Bestände. IPO-Werte sind Schätzungen der Emissionsbank, keine Börsenkurse.</DialogDescription>
        </DialogHeader>
        <section className="space-y-2" data-testid="depot-analyse-allocation">
          <p className="text-[13px] font-semibold">Vermögensaufteilung</p>
          {a.alloc.length === 0 ? <p className="text-[12px] text-bank-text-muted">Keine Anlagen in Wertpapieren oder Zinsprodukten vorhanden.</p>
            : a.alloc.map(([l, v, s]) => <Bar key={l} label={l} value={v} share={s} testid={`depot-alloc-${l}`} />)}
          <p className="flex justify-between border-t border-bank-border pt-2 text-[12px] font-semibold" data-testid="depot-alloc-total">
            <span>Gesamtvermögen</span><span className="tabular-nums">{formatEUR(a.all)}</span>
          </p>
          {a.unvalued.length > 0 && (
            <p className="text-[11.5px] text-bank-text-muted" data-testid="depot-analyse-unvalued">
              Ohne aktuelle Bewertung (zum Einstand angesetzt): {a.unvalued.map((r) => r.name).join(', ')}
            </p>
          )}
        </section>
        <section className="mt-4" data-testid="depot-analyse-top">
          <p className="mb-1 text-[13px] font-semibold">Größte Positionen</p>
          {a.top.length === 0 && <p className="text-[12px] text-bank-text-muted">Keine Daten</p>}
          {a.top.map((r) => (
            <div key={r.key} className="flex justify-between text-[12px]">
              <span className="truncate">{r.name}</span>
              <span className="tabular-nums text-bank-text-muted">{formatEUR(r.value)} · {pctTxt(r.weight)}</span>
            </div>
          ))}
        </section>
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PerfList title="Beste Aktien (Börsenkurs)" items={a.best} testid="depot-analyse-best" />
          <PerfList title="Verlierer (Börsenkurs)" items={a.worst} testid="depot-analyse-worst" />
          <PerfList title="IPO-Beteiligungen (geschätzt)" items={a.ipo} testid="depot-analyse-ipo" />
        </section>
        <section className="mt-4" data-testid="depot-analyse-weights">
          <p className="mb-1 text-[13px] font-semibold">Portfolio-Gewichtung</p>
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between text-[12px]">
              <span className="truncate">{r.name}</span>
              <span className="tabular-nums">{pctTxt(r.weight)} der Wertpapiere</span>
            </div>
          ))}
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default DepotAnalyseDialog;

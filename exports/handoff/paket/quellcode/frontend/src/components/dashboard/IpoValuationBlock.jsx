import { computeValueChange, changeLabel, formatEur } from '@/lib/ipoManualValue';

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE') : '–');

export const IpoValuationBlock = ({ ipo }) => {
  const change = computeValueChange(ipo.entry_price_eur, ipo.estimated_value_eur);
  if (!change) return null;
  const l = changeLabel(change);
  return (
    <div className="rounded-md border border-bank-border p-3" data-testid="ipo-valuation-block">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase text-bank-text-muted">IPO-Einstiegspreis pro Aktie</p>
          <p data-testid="ipo-entry-price">{formatEur(ipo.entry_price_eur)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-bank-text-muted">Geschätzter Wert (manuelle Angabe)</p>
          <p data-testid="ipo-estimated-value">{formatEur(ipo.estimated_value_eur)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase text-bank-text-muted">Rechnerische Wertentwicklung</p>
          <p className={`font-medium ${l.tone}`} data-testid="ipo-value-change">
            <span data-testid="ipo-value-change-eur">{l.eur}</span>
            {' · '}
            <span data-testid="ipo-value-change-pct">{l.pct}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-bank-text-muted" data-testid="ipo-valuation-note">
        Stand der Schätzung: {fmtDate(ipo.value_updated_at)}. Der geschätzte Wert wird manuell festgelegt und ist
        kein offizieller Börsenkurs. Die rechnerische Wertentwicklung ist kein tatsächlich erzielter Gewinn und
        keine garantierte Rendite. Solange die Aktie nicht an einer Börse gehandelt wird, gibt es keinen
        Marktpreis und keine realisierbare Rendite.
      </p>
    </div>
  );
};

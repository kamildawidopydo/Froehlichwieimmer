import { Input } from '@/components/ui/input';
import { computeValueChange, changeLabel } from '@/lib/ipoManualValue';

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

export const IpoValuationFields = ({ form, setForm }) => {
  const change = computeValueChange(num(form.entry_price_eur), num(form.estimated_value_eur));
  const l = change && changeLabel(change);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-2 rounded-md border border-bank-border p-3" data-testid="admin-ipo-valuation-fields">
      <p className="text-[12px] font-medium">Preis- und Wertangaben (manuell)</p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" step="0.01" min="0" placeholder="IPO-Einstiegspreis € / Aktie"
          value={form.entry_price_eur} onChange={set('entry_price_eur')} data-testid="admin-ipo-entry-price-input" />
        <Input type="number" step="0.01" min="0" placeholder="Geschätzter Wert € / Aktie"
          value={form.estimated_value_eur} onChange={set('estimated_value_eur')} data-testid="admin-ipo-estimated-value-input" />
      </div>
      <label className="block text-[11px] text-bank-text-muted">
        Datum der letzten Wertaktualisierung
        <Input type="date" value={form.value_updated_at} onChange={set('value_updated_at')}
          data-testid="admin-ipo-value-date-input" />
      </label>
      <p className={`text-[12px] ${l ? l.tone : 'text-bank-text-muted'}`} data-testid="admin-ipo-value-preview">
        {l ? `Rechnerische Wertentwicklung: ${l.eur} · ${l.pct}` : 'Beide Preise eintragen, um die Wertentwicklung zu berechnen.'}
      </p>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { parseDeNumber } from '@/lib/bondDisplay';

const SECTIONS = [
  {
    title: 'Stammdaten',
    fields: [
      { k: 'bond_name', l: 'Anleihename', span: 2 },
      { k: 'issuer', l: 'Emittent (Kundenanzeige)' },
      { k: 'legal_issuer', l: 'Rechtlicher Herausgeber' },
      { k: 'legal_issuer_status', l: 'Herausgeber geprüft?', t: 'select', opts: [['', '–'], ['verified', 'Verifiziert'], ['pending', 'Verifizierung ausstehend']] },
      { k: 'terms_status', l: 'Konditionen (Kupon/Termine) geprüft?', t: 'select', opts: [['', '–'], ['verified', 'Verifiziert'], ['pending', 'Verifizierung ausstehend']] },
      { k: 'verification_note', l: 'Prüfvermerk (nur Admin)', t: 'text', span: 2 },
      { k: 'isin', l: 'ISIN' },
      { k: 'wkn', l: 'WKN' },
      { k: 'security_type', l: 'Wertpapierart', span: 2 },
      { k: 'kupon_rate', l: 'Kupon (% p.a.)', t: 'number' },
      { k: 'currency', l: 'Währung' },
      { k: 'issue_date', l: 'Emissionsdatum', t: 'date' },
      { k: 'faelligkeitsdatum', l: 'Fälligkeitsdatum', t: 'date' },
      { k: 'is_perpetual', l: 'Unbefristet (keine Fälligkeit)', t: 'bool' },
      { k: 'zinsfrequenz', l: 'Zinsfrequenz' },
      { k: 'zinstermine', l: 'Zinszahlungstermine', span: 2 },
      { k: 'denomination', l: 'Stückelung (€)', t: 'number' },
      { k: 'min_order_eur', l: 'Mindestanlage (€)', t: 'number' },
      { k: 'description', l: 'Beschreibung', t: 'text', span: 2 },
    ],
  },
  {
    title: 'Kursverwaltung',
    fields: [
      { k: 'aktueller_kurs', l: 'Angezeigter Kurs (%)', t: 'number' },
      { k: 'kurs_typ', l: 'Kursart', t: 'select', opts: [['', '–'], ['market', 'Marktkurs'], ['reference', 'Referenzkurs (historisch)']] },
      { k: 'kaufkurs', l: 'Kaufkurs (%)', t: 'number' },
      { k: 'verkaufskurs', l: 'Verkaufskurs (%)', t: 'number' },
      { k: 'kursveraenderung_abs', l: 'Kursveränderung (Punkte)', t: 'number' },
      { k: 'kursveraenderung_pct', l: 'Kursveränderung (%)', t: 'number' },
      { k: 'kurs_datum', l: 'Kursdatum / Stand' },
      { k: 'kurs_quelle', l: 'Kursquelle' },
      { k: 'kurs_hinweis', l: 'Kurshinweis (Kundenanzeige)', span: 2 },
      { k: 'rendite_manuell', l: 'Rendite (manuell, %)', t: 'number' },
    ],
  },
  {
    title: 'Risiken',
    fields: [
      { k: 'risk_note', l: 'Kurzer Risikohinweis (Karte)', span: 2 },
      { k: 'risk_details', l: 'Ausführliche Risiken (Produktdetails)', t: 'text', span: 2 },
    ],
  },
  {
    title: 'Sichtbarkeit',
    fields: [
      { k: 'is_available', l: 'Im Kundenbereich sichtbar', t: 'bool' },
      { k: 'requests_enabled', l: 'Für neue Kaufanfragen freigegeben', t: 'bool' },
    ],
  },
];

const ALL = SECTIONS.flatMap((s) => s.fields);
const DEFAULTS = { is_available: true, requests_enabled: true, is_perpetual: false, currency: 'EUR' };

const toForm = (row) =>
  Object.fromEntries(
    ALL.map(({ k, t }) => {
      const v = row?.[k] ?? DEFAULTS[k];
      return [k, t === 'bool' ? !!v : v == null ? '' : t === 'number' ? String(v).replace('.', ',') : String(v)];
    }),
  );

const toPayload = (form) =>
  Object.fromEntries(
    ALL.map(({ k, t }) => {
      const v = form[k];
      if (t === 'bool') return [k, !!v];
      if (v === '' || v == null) return [k, null];
      if (t === 'number') return [k, parseDeNumber(v)];
      return [k, String(v).trim()];
    }),
  );

const FieldInput = ({ f, value, onChange }) => {
  const tid = `bond-admin-field-${f.k}`;
  if (f.t === 'bool') {
    return (
      <label className="flex items-center gap-2 text-sm text-bank-text">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} data-testid={tid} />
        {f.l}
      </label>
    );
  }
  const label = <label className="mb-1 block text-sm font-medium text-bank-text-muted">{f.l}</label>;
  if (f.t === 'text') {
    return <div>{label}<Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} data-testid={tid} /></div>;
  }
  if (f.t === 'select') {
    return (
      <div>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full border border-bank-border bg-white px-2 text-sm" data-testid={tid}>
          {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      {label}
      <Input type={f.t === 'date' ? 'date' : 'text'} inputMode={f.t === 'number' ? 'decimal' : undefined} value={value} onChange={(e) => onChange(e.target.value)} data-testid={tid} />
    </div>
  );
};

export const BondFormModal = ({ open, editing, onClose, onSubmit }) => {
  const [form, setForm] = useState(toForm(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(editing));
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = toPayload(form);
    if (payload.is_perpetual) payload.faelligkeitsdatum = null;
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} data-testid="bond-admin-modal">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-bank-border px-6 py-4">
          <h2 className="text-lg font-semibold text-bank-text">{editing ? 'Anleihe bearbeiten' : 'Neue Anleihe'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bank-border/15" data-testid="bond-admin-modal-close">
            <X size={20} className="text-bank-text-muted" />
          </button>
        </div>
        <form id="bond-form" onSubmit={submit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {SECTIONS.map((s) => (
            <fieldset key={s.title}>
              <legend className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">{s.title}</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <div key={f.k} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                    <FieldInput f={f} value={form[f.k]} onChange={(v) => setForm((p) => ({ ...p, [f.k]: v }))} />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="text-[11px] text-bank-text-muted">
            Kursänderungen werden mit Zeitstempel in der Kurshistorie gespeichert. Jede Änderung wird protokolliert.
          </p>
        </form>
        <div className="flex shrink-0 justify-end gap-3 border-t border-bank-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" form="bond-form" disabled={saving} className="bg-bank-ink text-white hover:bg-bank-ink-elev" data-testid="bond-admin-save-btn">
            {saving ? <><RefreshCw size={16} className="mr-2 animate-spin" /> Speichert…</> : <><Save size={16} className="mr-2" /> {editing ? 'Änderungen speichern' : 'Anleihe anlegen'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BondFormModal;

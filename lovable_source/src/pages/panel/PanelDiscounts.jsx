import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, Input, Button, Field, act, Pill, d, eur, CAT_LABEL } from './_ui';

const CATS = ['aktie', 'anleihe', 'ipo', 'festgeld', 'flexgeld'];
const empty = { code: '', label: '', kind: 'percent', value: '', categories: [], max_uses: '', valid_until: '' };

export default function PanelDiscounts() {
  const list = useLoad(() => panelApi.get('discount-codes'));
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleCat = (c) => set('categories', f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c]);

  const create = async () => {
    setBusy(true);
    const ok = await act(() => panelApi.post('discount-codes', f), 'Rabattcode angelegt');
    setBusy(false);
    if (ok) { setF(empty); list.reload(); }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Rabattcodes" titleIcon={Percent}
        description="Codes, die Kunden beim Kaufen oder Zeichnen eingeben. Der Rabatt wird bei der Ausführung des Auftrags vom abgebuchten Betrag abgezogen." />
      <AdminSurfaceCard className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Code"><Input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="z. B. WILLKOMMEN10" /></Field>
          <Field label="Bezeichnung (optional)"><Input value={f.label} onChange={(e) => set('label', e.target.value)} /></Field>
          <Field label="Art">
            <select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="percent">Prozent vom Betrag</option><option value="fixed">Fester Betrag in €</option>
            </select>
          </Field>
          <Field label={f.kind === 'percent' ? 'Rabatt in %' : 'Rabatt in €'}><Input type="number" min="0" step="any" value={f.value} onChange={(e) => set('value', e.target.value)} /></Field>
          <Field label="Wie oft einlösbar (leer = unbegrenzt)"><Input type="number" min="1" value={f.max_uses} onChange={(e) => set('max_uses', e.target.value)} /></Field>
          <Field label="Gültig bis (optional)"><Input type="date" value={f.valid_until} onChange={(e) => set('valid_until', e.target.value)} /></Field>
        </div>
        <p className="mt-3 text-sm text-bank-text-muted">Gilt für (nichts gewählt = alle Produkte):</p>
        <div className="mt-1 flex flex-wrap gap-3">
          {CATS.map((c) => <label key={c} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.categories.includes(c)} onChange={() => toggleCat(c)} />{CAT_LABEL[c]}</label>)}
        </div>
        <Button className="mt-4" disabled={busy || f.code.length < 3 || !(Number(f.value) > 0)} onClick={create}>Rabattcode anlegen</Button>
      </AdminSurfaceCard>
      <AdminSurfaceCard>
        <State loading={list.loading} error={list.error} onRetry={list.reload}>
          <Table head={['Code', 'Rabatt', 'Gilt für', 'Eingelöst', 'Gültig bis', 'Status', '']} empty={list.data?.items?.length ? null : 'Noch keine Rabattcodes.'}>
            {(list.data?.items || []).map((c) => (
              <tr key={c.id}>
                <td className="font-mono">{c.code}{c.label && <p className="font-sans text-xs text-bank-text-muted">{c.label}</p>}</td>
                <td>{c.kind === 'percent' ? `${c.value} %` : eur(c.value)}</td>
                <td className="text-xs">{c.categories?.length ? c.categories.map((x) => CAT_LABEL[x]).join(', ') : 'Alle Produkte'}</td>
                <td>{c.use_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td>{c.valid_until ? d(c.valid_until) : 'unbegrenzt'}</td>
                <td><Pill tone={c.status === 'active' ? 'green' : 'gray'}>{c.status === 'active' ? 'Aktiv' : 'Inaktiv'}</Pill></td>
                <td className="whitespace-nowrap">
                  <Button size="sm" variant="outline" className="mr-2" onClick={async () => { if (await act(() => panelApi.patch(`discount-codes/${c.id}`, { status: c.status === 'active' ? 'inactive' : 'active' }), 'Gespeichert')) list.reload(); }}>{c.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (window.confirm(`Code ${c.code} löschen?`) && await act(() => panelApi.del(`discount-codes/${c.id}`), 'Gelöscht')) list.reload(); }}>Löschen</Button>
                </td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}

import React, { useState } from 'react';
import { Package, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, Pill, Input, Button, Field, Textarea, act, ConfirmDialog, eur, pct, d, CAT_LABEL } from './_ui';

const BASE = { category: 'aktie', name: '', issuer: '', isin: '', ticker: '', currency: 'EUR', market_price: '', buy_price: '', sell_price: '', nominal_value: '', coupon_rate: '', interest_rate: '', term_months: '', maturity_date: '', min_amount: '', conditions: '', ipo_date_label: '', status: 'active', visibility: 'global' };
const FIELDS = {
  aktie: [['name', 'Aktienname'], ['issuer', 'Unternehmen'], ['isin', 'ISIN'], ['ticker', 'Tickersymbol'], ['market_price', 'Aktueller Marktpreis', 'n'], ['buy_price', 'Kaufpreis', 'n'], ['sell_price', 'Verkaufspreis', 'n']],
  anleihe: [['name', 'Anleihenname'], ['issuer', 'Emittent'], ['isin', 'ISIN'], ['nominal_value', 'Nennwert', 'n'], ['coupon_rate', 'Kupon %', 'n'], ['term_months', 'Laufzeit (Monate)', 'n'], ['maturity_date', 'Fälligkeit', 'date'], ['market_price', 'Kurs / Preis', 'n']],
  festgeld: [['name', 'Produktname'], ['issuer', 'Bank'], ['interest_rate', 'Zinssatz %', 'n'], ['term_months', 'Laufzeit (Monate)', 'n'], ['min_amount', 'Mindestanlage', 'n'], ['maturity_date', 'Fälligkeit', 'date']],
  flexgeld: [['name', 'Produktname'], ['issuer', 'Bank'], ['interest_rate', 'Zinssatz %', 'n'], ['min_amount', 'Mindestanlage', 'n']],
  tagesgeld: [['name', 'Produktname'], ['issuer', 'Bank'], ['interest_rate', 'Zinssatz %', 'n'], ['min_amount', 'Mindestanlage', 'n']],
  ipo: [['name', 'Name des Börsengangs'], ['issuer', 'Anbieter'], ['ticker', 'Tickersymbol'], ['ipo_date_label', 'IPO-Datum (z. B. 15.03.2027 oder „Erwartet 2027“)'], ['min_amount', 'Mindestzeichnung', 'n'], ['maturity_date', 'Zeichnungsfrist bis', 'date'], ['term_months', 'Vorbörslicher Zeitraum (Monate)', 'n']],
};
const COND = { festgeld: 'Auszahlungsbedingungen', flexgeld: 'Verfügbarkeit & Kündigungs-/Auszahlungsregeln', aktie: 'Hinweise', anleihe: 'Hinweise', ipo: 'Zeichnungsbedingungen' };

export default function PanelProducts() {
  const { data, error, loading, reload } = useLoad(() => panelApi.get('products'));
  const customers = useLoad(() => panelApi.get('customers'));
  const [cat, setCat] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [assign, setAssign] = useState(null);
  const items = (data?.items || []).filter((p) => !cat || p.category === cat);
  const save = async () => {
    const { id, assignments: _a, created_at: _c, updated_at: _u, created_by: _b, market_price_source: _s, market_price_at: _t, ...rest } = form;
    const payload = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? '']));
    if (id) delete payload.market_price;
    const ok = await act(() => (id ? panelApi.patch(`products/${id}`, payload) : panelApi.post('products', payload)), 'Produkt gespeichert');
    if (ok) { setForm(null); reload(); }
  };
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Produkte" titleIcon={Package} description="Aktien, Anleihen, Festgeld und Flexgeld verwalten. Marktpreise ändern Sie unter „Preisverwaltung“."
        actions={<Button onClick={() => setForm({ ...BASE })}><Plus className="mr-2 h-4 w-4" />Produkt anlegen</Button>} />
      <AdminToolbarCard className="flex flex-wrap gap-2">
        {[['', 'Alle'], ...Object.entries(CAT_LABEL)].map(([k, l]) => <Button key={k} size="sm" variant={cat === k ? 'default' : 'outline'} onClick={() => setCat(k)}>{l}</Button>)}
      </AdminToolbarCard>
      <AdminSurfaceCard>
        <State loading={loading} error={error} onRetry={reload}>
          <Table head={['Kategorie', 'Name', 'ISIN / Ticker', 'Preis / Zins', 'Laufzeit', 'Angebot', 'Status', '']} empty={items.length ? null : 'Noch keine Produkte angelegt.'}>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{CAT_LABEL[p.category]}</td>
                <td>{p.name}<p className="text-xs text-bank-text-muted">{p.issuer}</p></td>
                <td className="font-mono text-xs">{p.isin || '–'}{p.ticker && ` · ${p.ticker}`}</td>
                <td>{p.category === 'ipo' ? <>{eur(p.market_price, p.currency)}<p className="text-xs">Zeichnungskurs je Stück</p></> : ['aktie', 'anleihe'].includes(p.category) ? <>{eur(p.market_price, p.currency)}{p.category === 'anleihe' && <p className="text-xs">Kupon {pct(p.coupon_rate)}</p>}</> : pct(p.interest_rate)}</td>
                <td>{p.term_months ? `${p.term_months} Mon.` : '–'}{p.maturity_date && <p className="text-xs">bis {d(p.maturity_date)}</p>}</td>
                <td>{p.visibility === 'global' ? 'Alle Kunden' : `${p.assignments?.length || 0} Kunden`}</td>
                <td>{p.status === 'active' ? <Pill tone="green">Aktiv</Pill> : <Pill>Inaktiv</Pill>}</td>
                <td className="whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Bearbeiten" onClick={() => setForm({ ...BASE, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])) })}><Pencil className="h-4 w-4" /></Button>
                  {p.visibility === 'assigned' && <Button size="icon" variant="ghost" aria-label="Kunden zuweisen" onClick={() => setAssign({ id: p.id, name: p.name, ids: new Set((p.assignments || []).map((a) => a.customer_id)) })}><Users className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" aria-label="Löschen" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>

      <Dialog open={Boolean(form)} onOpenChange={() => setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? 'Produkt bearbeiten' : 'Produkt anlegen'}</DialogTitle>
            <DialogDescription>Preise sind manuell gepflegt und keine Live-Börsenkurse.</DialogDescription></DialogHeader>
          {form && <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kategorie"><select disabled={Boolean(form.id)} className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CAT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Währung"><Input maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></Field>
            {FIELDS[form.category].filter(([k]) => !(form.id && k === 'market_price')).map(([k, l, t]) => (
              <Field key={k} label={l}><Input type={t === 'n' ? 'number' : t === 'date' ? 'date' : 'text'} step="any" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
            ))}
            <Field label={COND[form.category]} className="sm:col-span-2"><Textarea rows={3} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} /></Field>
            <Field label="Status"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Aktiv</option><option value="inactive">Inaktiv</option></select></Field>
            <Field label="Angebot"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="global">Für alle Kunden</option><option value="assigned">Nur zugewiesene Kunden</option></select></Field>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Abbrechen</Button><Button disabled={!form?.name} onClick={save}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assign)} onOpenChange={() => setAssign(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kunden für „{assign?.name}“</DialogTitle></DialogHeader>
          <div className="space-y-1">{(customers.data?.items || []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assign?.ids.has(c.id) || false}
              onChange={(e) => { const ids = new Set(assign.ids); e.target.checked ? ids.add(c.id) : ids.delete(c.id); setAssign({ ...assign, ids }); }} />
              {c.customer_no} · {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</label>
          ))}</div>
          <DialogFooter><Button onClick={async () => { const ok = await act(() => panelApi.post(`products/${assign.id}/assign`, { customer_ids: [...assign.ids] }), 'Zuweisung gespeichert'); if (ok) { setAssign(null); reload(); } }}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={Boolean(del)} onOpenChange={() => setDel(null)} requireReason={false} danger confirmLabel="Löschen" title={`„${del?.name}“ löschen`}
        description="Nur möglich, wenn das Produkt nie gebucht wurde. Sonst bitte deaktivieren."
        onConfirm={async () => { const ok = await act(() => panelApi.del(`products/${del.id}`), 'Gelöscht'); if (ok) reload(); return ok; }} />
    </AdminSubpageLayout>
  );
}

import React, { useState } from 'react';
import { LineChart } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, Input, Button, Field, act, ConfirmDialog, num, dt, CAT_LABEL, Pill } from './_ui';

const FIELD_LABEL = { market_price: 'Marktpreis', buy_price: 'Kaufpreis', sell_price: 'Verkaufspreis', interest_rate: 'Zinssatz %', coupon_rate: 'Kupon %', min_amount: 'Mindestzeichnung' };
const FIELDS_FOR = { aktie: ['market_price', 'buy_price', 'sell_price'], anleihe: ['market_price', 'coupon_rate'], festgeld: ['interest_rate'], flexgeld: ['interest_rate'], tagesgeld: ['interest_rate'], ipo: ['market_price', 'min_amount'] };
const priceFields = (p) => FIELDS_FOR[p?.category] || ['market_price'];
const priceLabel = (p, f) => (p?.category === 'ipo' && f === 'market_price' ? 'Zeichnungskurs' : FIELD_LABEL[f] || f);

export default function PanelPrices() {
  const products = useLoad(() => panelApi.get('products'));
  const history = useLoad(() => panelApi.get('price-history'));
  const [dlg, setDlg] = useState(null);
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Preisverwaltung" titleIcon={LineChart}
        description="Manuell gepflegte Preise und Zinssätze. Jede Änderung wird mit altem/neuem Wert, Zeit, Administrator und Begründung gespeichert. Bereits gebuchte Kaufpreise bleiben unverändert." />
      <AdminSurfaceCard className="mb-6">
        <State loading={products.loading} error={products.error} onRetry={products.reload}>
          <Table head={['Produkt', 'Kategorie', 'Preise', 'Quelle', 'Stand', '']} empty={products.data?.items?.length ? null : 'Noch keine Produkte.'}>
            {(products.data?.items || []).map((p) => (
              <tr key={p.id}>
                <td>{p.name}<p className="font-mono text-[11px] text-bank-text-muted">{p.isin}</p></td>
                <td>{CAT_LABEL[p.category]}</td>
                <td className="text-xs">{priceFields(p).map((f) => <p key={f}>{priceLabel(p, f)}: <b>{num(p[f])}</b> {!f.includes('rate') && p.currency}</p>)}</td>
                <td><Pill tone="amber">{p.market_price_source === 'manuell' ? 'Manuell gepflegt' : p.market_price_source}</Pill></td>
                <td className="text-xs">{dt(p.market_price_at || p.updated_at)}</td>
                <td><Button size="sm" variant="outline" onClick={() => setDlg({ p, field: priceFields(p)[0], price: '' })}>Preis ändern</Button></td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
      <h2 className="mb-3 font-display text-lg">Preishistorie</h2>
      <AdminSurfaceCard>
        <State loading={history.loading} error={history.error} onRetry={history.reload}>
          <Table head={['Zeitpunkt', 'Produkt', 'Feld', 'Alt', 'Neu', 'Administrator', 'Begründung']} empty={history.data?.items?.length ? null : 'Noch keine Preisänderungen.'}>
            {(history.data?.items || []).map((h) => (
              <tr key={h.id}><td className="whitespace-nowrap">{dt(h.created_at)}</td><td>{h.product?.name}</td><td>{priceLabel(h.product, h.field)}</td><td>{num(h.old_price)}</td><td>{num(h.new_price)}</td><td>{h.admin_email}</td><td>{h.reason}</td></tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
      <ConfirmDialog open={Boolean(dlg)} onOpenChange={() => setDlg(null)} title={`Preis ändern: ${dlg?.p?.name || ''}`}
        onConfirm={async (reason) => { const ok = await act(() => panelApi.post(`products/${dlg.p.id}/price`, { field: dlg.field, price: dlg.price, reason }), 'Preis gespeichert'); if (ok) { products.reload(); history.reload(); } return ok; }}>
        {dlg && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Feld"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={dlg.field} onChange={(e) => setDlg({ ...dlg, field: e.target.value })}>
            {priceFields(dlg.p).map((f) => <option key={f} value={f}>{priceLabel(dlg.p, f)}</option>)}</select></Field>
          <Field label={`Neu (bisher ${num(dlg.p[dlg.field])})`}><Input type="number" step="any" min="0" value={dlg.price} onChange={(e) => setDlg({ ...dlg, price: e.target.value })} /></Field>
        </div>}
      </ConfirmDialog>
    </AdminSubpageLayout>
  );
}

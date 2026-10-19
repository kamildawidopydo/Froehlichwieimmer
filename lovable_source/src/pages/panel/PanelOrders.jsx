import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, TxBadge, OriginBadge, Input, Button, Field, act, ConfirmDialog, eur, num, dt, TX_LABEL } from './_ui';

export default function PanelOrders() {
  const [f, setF] = useState({ status: '', from: '', to: '', q: '' });
  const { data, error, loading, reload } = useLoad(() => panelApi.get('transactions', { status: f.status, from: f.from, to: f.to }), [f.status, f.from, f.to]);
  const [dialog, setDialog] = useState(null);
  const [exec, setExec] = useState({ price: '', fees: '' });
  const t = f.q.toLowerCase();
  const items = (data?.items || []).filter((x) => !t || [x.tx_no, x.customer?.customer_no, x.customer?.email, x.customer?.last_name, x.product?.name, x.product?.isin].some((v) => String(v || '').toLowerCase().includes(t)));
  const open = (s) => ['draft', 'submitted', 'in_review', 'accepted'].includes(s);
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Kauf- und Verkaufsaufträge" titleIcon={ClipboardList}
        description="Keine Börsen- oder Bankanbindung: Aufträge werden hier administrativ geprüft und ausgeführt. Bestände ändern sich erst beim Ausführen." />
      <AdminToolbarCard className="flex flex-wrap items-end gap-3">
        <Field label="Suche (Kunde, Produkt, Nr.)"><Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="w-64" /></Field>
        <Field label="Status"><select className="h-10 border border-bank-border bg-white px-3 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">Alle</option>{Object.entries(TX_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Von"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Bis"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      </AdminToolbarCard>
      <AdminSurfaceCard>
        <State loading={loading} error={error} onRetry={reload}>
          <Table head={['Transaktions-ID', 'Kunde', 'Produkt', 'Art', 'Menge/Betrag', 'Angezeigter Preis', 'Ausgeführt zu', 'Gebühren', 'Gesamt', 'Status', 'Zeit', 'Aktionen']} empty={items.length ? null : 'Keine Aufträge.'}>
            {items.map((x) => (
              <tr key={x.id} className="align-top">
                <td className="font-mono text-xs">{x.tx_no}<div className="mt-1"><OriginBadge o={x.origin} /></div></td>
                <td><Link className="hover:underline" to={`/admin/kunden/${x.customer_id}`}>{x.customer?.customer_no}</Link><p className="text-xs text-bank-text-muted">{x.customer?.email}</p></td>
                <td>{x.product?.name}<p className="font-mono text-[11px] text-bank-text-muted">{x.product?.isin}</p></td>
                <td>{x.side === 'buy' ? 'Kauf' : 'Verkauf'}</td>
                <td>{Number(x.quantity) ? `${num(x.quantity)} Stk.` : eur(x.amount)}</td>
                <td>{num(x.displayed_price)}</td><td>{num(x.executed_price)}</td><td>{eur(x.fees)}</td><td>{eur(x.total)}{Number(x.discount_amount) > 0 && <p className="text-xs text-bank-text-muted">Rabatt −{eur(x.discount_amount)}{x.discount_code ? ` (${x.discount_code})` : ''}</p>}</td>
                <td><TxBadge s={x.status} />{x.status_reason && <p className="text-xs text-bank-text-muted">{x.status_reason}</p>}{x.execution_note && <p className="text-xs text-bank-text-muted">{x.execution_note}</p>}</td>
                <td className="whitespace-nowrap text-xs">{dt(x.created_at)}{x.executed_at && <p>ausgef. {dt(x.executed_at)}</p>}</td>
                <td className="space-y-1">
                  {open(x.status) && <>
                    {x.status !== 'in_review' && x.status !== 'accepted' && <Button size="sm" variant="outline" className="w-full" onClick={() => act(() => panelApi.post(`transactions/${x.id}/status`, { status: 'in_review' }), 'In Prüfung').then((ok) => ok && reload())}>Prüfen</Button>}
                    {x.status !== 'accepted' && <Button size="sm" variant="outline" className="w-full" onClick={() => act(() => panelApi.post(`transactions/${x.id}/status`, { status: 'accepted' }), 'Angenommen').then((ok) => ok && reload())}>Annehmen</Button>}
                    <Button size="sm" className="w-full" onClick={() => { setExec({ price: x.displayed_price ?? '', fees: '' }); setDialog({ kind: 'exec', x }); }}>Ausführen</Button>
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => setDialog({ kind: 'rejected', x })}>Ablehnen</Button>
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => setDialog({ kind: 'cancelled', x })}>Stornieren</Button>
                  </>}
                </td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
      <ConfirmDialog open={dialog?.kind === 'exec'} onOpenChange={() => setDialog(null)} title={`Auftrag ${dialog?.x?.tx_no} ausführen`} confirmLabel="Ausführen & buchen"
        description="Administrativ erfasste Ausführung – kein echtes Börsengeschäft. Liquidität und Bestände werden atomar gebucht; Verkäufe über den Bestand hinaus werden abgelehnt."
        onConfirm={async (note) => { const ok = await act(() => panelApi.post(`transactions/${dialog.x.id}/execute`, { price: exec.price, fees: exec.fees || 0, note }), 'Ausgeführt und gebucht'); if (ok) reload(); return ok; }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dialog?.x?.product?.category === 'ipo' ? 'Zeichnungskurs je Stück' : Number(dialog?.x?.quantity) ? 'Tatsächlich vereinbarter Preis je Stück' : 'Vereinbarter Zinssatz %'}><Input type="number" step="any" min="0" value={exec.price} onChange={(e) => setExec({ ...exec, price: e.target.value })} /></Field>
          <Field label="Gebühren"><Input type="number" step="any" min="0" value={exec.fees} onChange={(e) => setExec({ ...exec, fees: e.target.value })} /></Field>
          {dialog?.x && <p className="text-sm sm:col-span-2">{Number(dialog.x.quantity) > 0
            ? <>Gesamt: <b>{eur(Number(dialog.x.quantity) * Number(exec.price || 0) + (dialog.x.side === 'buy' ? 1 : -1) * Number(exec.fees || 0))}</b></>
            : <>Betrag: <b>{eur(Number(dialog.x.amount || 0))}</b>{dialog.x.product?.category === 'ipo' && Number(exec.price) > 0 && <> · entspricht <b>{num(Math.round(Number(dialog.x.amount) / Number(exec.price) * 10000) / 10000)} Stück</b></>} · Gesamt: <b>{eur(Number(dialog.x.amount || 0) + (dialog.x.side === 'buy' ? 1 : -1) * Number(exec.fees || 0))}</b></>}</p>}
        </div>
        <p className="text-xs text-bank-text-muted">Begründung = Ausführungsdetails (z. B. „telefonisch mit Kunde vereinbart, Kurs 10:42 Uhr“).</p>
      </ConfirmDialog>
      <ConfirmDialog open={dialog?.kind === 'rejected' || dialog?.kind === 'cancelled'} onOpenChange={() => setDialog(null)} danger
        title={`Auftrag ${dialog?.x?.tx_no} ${dialog?.kind === 'rejected' ? 'ablehnen' : 'stornieren'}`}
        onConfirm={async (reason) => { const ok = await act(() => panelApi.post(`transactions/${dialog.x.id}/status`, { status: dialog.kind, reason }), 'Gespeichert'); if (ok) reload(); return ok; }} />
    </AdminSubpageLayout>
  );
}

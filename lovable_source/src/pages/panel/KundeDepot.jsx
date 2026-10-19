import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { kundeApi } from '@/lib/panelApi';
import { useLoad, State, Table, TxBadge, KycBadge, Pill, Button, Field, Input, act, ConfirmDialog, eur, num, pct, d, dt, CAT_LABEL } from './_ui';

export default function KundeDepot() {
  const { data, error, loading, reload } = useLoad(() => kundeApi.get('depot'));
  const products = useLoad(() => (data?.can_trade ? kundeApi.get('products') : Promise.resolve({ items: [] })), [data?.can_trade]);
  const [order, setOrder] = useState(null);
  const [cancel, setCancel] = useState(null);
  const open = useMemo(() => (data?.positions || []).filter((p) => p.status === 'open'), [data]);
  const pr = (products.data?.items || []).find((p) => p.id === order?.product_id);
  const sec = pr && ['aktie', 'anleihe'].includes(pr.category);

  const section = (cat, title) => {
    const rows = open.filter((p) => p.product?.category === cat);
    if (!rows.length) return null;
    const s = ['aktie', 'anleihe'].includes(cat);
    return (
      <div className="mb-6">
        <h3 className="mb-2 font-display text-lg">{title}</h3>
        <div className="border border-bank-border bg-white">
          <Table head={s ? ['Produkt', 'Stückzahl', 'Kaufpreis je Stück', 'Kaufbetrag gesamt', 'Aktueller Stückpreis', 'Aktueller Gesamtwert', 'Gewinn / Verlust', 'Kaufdatum'] : ['Produkt', 'Betrag', 'Zinssatz', 'Zinsertrag bisher', 'Startdatum', 'Verfügbar ab', 'Enddatum']}>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.product?.name}<p className="font-mono text-[11px] text-bank-text-muted">{p.product?.isin}</p></td>
                {s ? <>
                  <td>{num(p.quantity)}</td><td>{eur(p.unit_price, p.currency)}</td><td>{eur(p.booked_value, p.currency)}</td>
                  <td>{p.product?.market_price != null ? eur(p.product.market_price, p.currency) : '–'}</td>
                  <td>{p.market_value != null ? eur(p.market_value, p.currency) : '–'}</td>
                  <td>{p.market_value != null && p.booked_value != null ? <span className={p.market_value >= p.booked_value ? 'text-bank-success' : 'text-bank-error'}>{p.market_value >= p.booked_value ? '+' : ''}{eur(p.market_value - p.booked_value, p.currency)}{p.booked_value > 0 && <p className="text-xs">{num((p.market_value - p.booked_value) / p.booked_value * 100, 2)} %</p>}</span> : '–'}</td>
                  <td>{d(p.purchase_date)}</td>
                </> : <>
                  <td>{eur(p.amount, p.currency)}</td><td>{pct(p.interest_rate)}</td><td>{eur(p.accrued_interest, p.currency)}</td><td>{d(p.purchase_date)}</td><td>{d(p.available_from || p.purchase_date)}</td><td>{p.maturity_date ? d(p.maturity_date) : 'offen'}</td>
                </>}
              </tr>
            ))}
          </Table>
        </div>
      </div>
    );
  };

  const ipoRows = open.filter((p) => p.product?.category === 'ipo');
  const ipoSection = () => {
    if (!ipoRows.length) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-2 font-display text-lg">Börsengänge (IPO-Zeichnungen)</h3>
        <div className="border border-bank-border bg-white">
          <Table head={['Produkt', 'Zeichnungsbetrag gesamt', 'Kaufpreis je Stück', 'Stückzahl', 'Kaufdatum', 'Aktueller Stückpreis', 'Aktueller Gesamtwert', 'Gewinn / Verlust']}>
            {ipoRows.map((p) => {
              const diff = p.market_value != null && p.booked_value ? Math.round(((p.market_value - p.booked_value) / p.booked_value) * 10000) / 100 : null;
              return (
                <tr key={p.id}>
                  <td>{p.product?.name}<p className="font-mono text-[11px] text-bank-text-muted">{[p.product?.isin, p.product?.ticker].filter(Boolean).join(' · ')}</p></td>
                  <td>{eur(p.amount, p.currency)}</td>
                  <td>{p.unit_price != null ? <>{eur(p.unit_price, p.currency)}<p className="text-[11px] text-bank-text-muted">je Stück</p></> : <span className="text-xs text-bank-text-muted">nicht erfasst</span>}</td>
                  <td>{Number.isInteger(Number(p.quantity)) ? num(p.quantity, 0) : num(Math.round(Number(p.quantity) * 100) / 100, 2)}</td>
                  <td>{d(p.purchase_date)}</td>
                  <td>{(p.current_price ?? p.product?.market_price) != null ? eur(p.current_price ?? p.product.market_price, p.product?.currency || p.currency) : <span className="text-xs text-bank-text-muted">noch nicht notiert</span>}</td>
                  <td>{p.market_value != null ? eur(p.market_value, p.currency) : <>{eur(p.booked_value ?? p.amount, p.currency)}<p className="text-[11px] text-bank-text-muted">wie gezeichnet</p></>}</td>
                  <td>{diff == null ? <span className="text-xs text-bank-text-muted">–</span> : <span className={diff >= 0 ? 'text-bank-success' : 'text-bank-error'}>{diff >= 0 ? '+' : ''}{eur(p.market_value - p.booked_value, p.currency)}<p className="text-xs">{diff >= 0 ? '+' : ''}{num(diff, 2)} %</p></span>}</td>
                </tr>
              );
            })}
          </Table>
        </div>
        <p className="mt-2 text-xs text-bank-text-muted">Der Zeichnungskurs ist der Preis, zu dem Ihre Zeichnung ausgeführt wurde. Der aktuelle Kurs wird von unserem Team gepflegt und kann davon abweichen.</p>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Mein Depot</p>
      <h1 className="mt-2 font-display text-3xl font-light text-bank-text">Depotübersicht</h1>
      <State loading={loading} error={error} onRetry={reload}>
        {data && <>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-bank-text-muted">Kunden-ID {data.customer.customer_no} · Depot {data.portfolio?.portfolio_no} <KycBadge s={data.customer.kyc_status} /></p>
          {!data.can_trade && (
            <div className="mt-5 flex gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>Ihr Depot wird noch geprüft. Kauf und Verkauf sind erst nach erfolgreicher Verifizierung möglich. <Link to="/dashboard/verifizierung" className="font-medium underline">Zur Verifizierung</Link></div>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-7">
            {[['Gesamtwert', data.totals.gesamt], ['Liquidität', data.totals.liquiditaet], ['Aktien', data.totals.aktien], ['Börsengänge', data.totals.ipo], ['Anleihen', data.totals.anleihen], ['Festgeld', data.totals.festgeld], ['Flexgeld', data.totals.flexgeld]].map(([l, v]) => (
              <div key={l} className="border border-bank-border bg-white p-3"><p className="text-xs text-bank-text-muted">{l}</p><p className="font-display text-lg">{eur(v)}</p></div>
            ))}
          </div>
          <p className="mb-6 mt-2 text-xs text-bank-text-muted">Bewertungen beruhen auf dokumentierten Kaufpreisen bzw. manuell gepflegten Preisen; es besteht keine Live-Börsenanbindung.</p>
          {section('aktie', 'Aktien')}{section('anleihe', 'Anleihen')}{ipoSection()}{section('festgeld', 'Festgeld')}{section('flexgeld', 'Flexgeld')}
          {!open.length && <p className="mb-6 border border-bank-border bg-white p-6 text-center text-sm text-bank-text-muted">Ihr Depot enthält noch keine Bestände.</p>}

          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg">Aufträge & Historie</h3>
            <Button disabled={!data.can_trade} onClick={() => setOrder({ product_id: '', side: 'buy', quantity: '', amount: '', key: crypto.randomUUID() })}>Auftrag erteilen</Button>
          </div>
          <div className="border border-bank-border bg-white">
            <Table head={['Nr.', 'Produkt', 'Art', 'Menge/Betrag', 'Kurs/Zinssatz', 'Gesamt', 'Status', 'Datum', '']} empty={data.transactions.length ? null : 'Noch keine Aufträge.'}>
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.tx_no}</td><td>{t.product?.name}</td><td>{t.side === 'buy' ? 'Kauf' : 'Verkauf'}</td>
                  <td>{Number(t.quantity) ? num(t.quantity) : eur(t.amount)}</td><td>{['festgeld', 'flexgeld', 'tagesgeld'].includes(t.product?.category) ? pct(t.executed_price ?? t.displayed_price ?? t.product?.interest_rate) : eur(t.executed_price ?? t.displayed_price, t.currency)}</td><td>{eur(t.total)}</td>
                  <td><TxBadge s={t.status} />{t.status_reason && <p className="text-xs text-bank-text-muted">{t.status_reason}</p>}</td><td>{dt(t.executed_at || t.created_at)}</td>
                  <td>{['draft', 'submitted'].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => setCancel(t)}>Stornieren</Button>}</td>
                </tr>
              ))}
            </Table>
          </div>
        </>}
      </State>

      <ConfirmDialog open={Boolean(order)} onOpenChange={() => setOrder(null)} requireReason={false} confirmLabel="Auftrag verbindlich einreichen" title="Auftrag erteilen"
        description="Ihr Auftrag wird von unserem Team geprüft und anschließend ausgeführt. Der endgültige Preis wird bei der Ausführung festgelegt."
        onConfirm={async () => { const ok = await act(() => kundeApi.post('orders', { product_id: order.product_id, side: order.side, quantity: order.quantity || 0, amount: order.amount || 0, idempotency_key: order.key }), 'Auftrag eingereicht'); if (ok) reload(); return ok; }}>
        {order && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Produkt" className="sm:col-span-2"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={order.product_id} onChange={(e) => setOrder({ ...order, product_id: e.target.value })}>
            <option value="">Bitte wählen</option>{(products.data?.items || []).map((p) => <option key={p.id} value={p.id}>{CAT_LABEL[p.category]} · {p.name}</option>)}</select></Field>
          <Field label="Art"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={order.side} onChange={(e) => setOrder({ ...order, side: e.target.value })}><option value="buy">Kauf</option><option value="sell">Verkauf</option></select></Field>
          {pr && (sec
            ? <Field label="Stückzahl"><Input type="number" min="0" step="any" value={order.quantity} onChange={(e) => setOrder({ ...order, quantity: e.target.value })} /></Field>
            : <Field label="Betrag"><Input type="number" min="0" step="any" value={order.amount} onChange={(e) => setOrder({ ...order, amount: e.target.value })} /></Field>)}
          {pr && <p className="text-sm sm:col-span-2">{sec ? <>Angezeigter Preis: {eur(order.side === 'buy' ? (pr.buy_price ?? pr.market_price) : (pr.sell_price ?? pr.market_price), pr.currency)} (manuell gepflegt)</> : pr.category === 'ipo' ? <>Zeichnungskurs: {eur(pr.market_price, pr.currency)} je Stück{pr.min_amount && ` · Mindestzeichnung ${eur(pr.min_amount, pr.currency)}`}</> : <>Zinssatz: {pct(pr.interest_rate)}{pr.min_amount && ` · Mindestanlage ${eur(pr.min_amount)}`}</>}{pr.conditions && <span className="block text-xs text-bank-text-muted">{pr.conditions}</span>}</p>}
        </div>}
      </ConfirmDialog>
      <ConfirmDialog open={Boolean(cancel)} onOpenChange={() => setCancel(null)} requireReason={false} danger confirmLabel="Stornieren" title={`Auftrag ${cancel?.tx_no} stornieren`}
        onConfirm={async () => { const ok = await act(() => kundeApi.post(`orders/${cancel.id}/cancel`), 'Storniert'); if (ok) reload(); return ok; }} />
      <span className="sr-only"><Pill>Demo</Pill></span>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { kundeApi, extractErrorMessage } from '@/lib/panelApi';
import { eur, num, pct, d, dt } from '@/pages/panel/_ui';

const TABS = [
  { key: 'aktie', label: 'Aktien' },
  { key: 'anleihe', label: 'Anleihen' },
  { key: 'ipo', label: 'IPO' },
];
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const capUsd = (v) => { const n = Number(v); return n >= 1e12 ? `${(n / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio. USD` : `${(n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd. USD`; };

export default function KundeMarkt() {
  const [tab, setTab] = useState('aktie');
  const [items, setItems] = useState(null);
  const [depot, setDepot] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null); // { product, side }
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [p, dp] = await Promise.all([kundeApi.get('products'), kundeApi.get('depot')]);
      setItems(p.items || []);
      setDepot(dp);
      setErr('');
    } catch (e) {
      setErr(extractErrorMessage(e) || 'Marktdaten konnten nicht geladen werden.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const held = useMemo(() => {
    const m = {};
    for (const p of depot?.positions || []) {
      if (p.status !== 'open') continue;
      const k = p.product_id;
      m[k] = m[k] || { quantity: 0, amount: 0 };
      m[k].quantity += Number(p.quantity || 0);
      m[k].amount += Number(p.amount || 0);
    }
    return m;
  }, [depot]);

  const qq = q.trim().toLowerCase();
  const list = (items || []).filter((p) => p.category === tab && (!qq || [p.name, p.ticker, p.isin].some((v) => String(v || '').toLowerCase().includes(qq))));
  const canTrade = depot?.can_trade;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" data-testid="kunde-markt">
      <p className="text-xs uppercase tracking-[0.2em] text-bank-text-muted">Markt &amp; Handel</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl text-bank-text">Markt</h1>
        <div className="flex items-center gap-3 text-sm text-bank-text-muted">
          <span>Verfügbare Liquidität: <strong className="text-bank-text">{eur(depot?.portfolio?.cash_balance ?? 0)}</strong></span>
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={`mr-1 h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Aktualisieren
          </Button>
        </div>
      </div>

      {depot && !canTrade && (
        <div className="mt-5 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            Kauf und Verkauf sind erst nach erfolgreicher Verifizierung möglich. Die Kurse können Sie bereits ansehen.{' '}
            <Link to="/dashboard/verifizierung" className="underline">Zur Verifizierung</Link>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-bank-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-bank-primary text-bank-text' : 'border-transparent text-bank-text-muted hover:text-bank-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen nach Name oder Kürzel, z. B. Mercedes, SAP, Apple" aria-label="Produkt suchen" className="mt-4 h-10 w-full max-w-md border border-bank-border bg-white px-3 text-sm" />
      {items && <p className="mt-2 text-xs text-bank-text-muted">{list.length} Werte</p>}

      {err && <p className="mt-6 text-sm text-rose-700">{err}</p>}
      {!items && !err && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-bank-text-muted" /></div>}
      {items && list.length === 0 && <p className="py-12 text-center text-sm text-bank-text-muted">Derzeit sind keine Produkte in dieser Kategorie verfügbar.</p>}

      {list.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bank-border text-left text-xs uppercase tracking-wide text-bank-text-muted">
                <th className="py-2 pr-4">Name</th>
                {tab === 'aktie' && <><th className="py-2 pr-4 text-right">Kurs</th><th className="py-2 pr-4 text-right">Heute</th></>}
                {tab === 'anleihe' && <><th className="py-2 pr-4 text-right">Kupon</th><th className="py-2 pr-4">Fällig</th><th className="py-2 pr-4 text-right">Kaufen / Verkaufen</th></>}
                {tab === 'ipo' && <><th className="py-2 pr-4">Börsengang</th><th className="py-2 pr-4 text-right">Marktkapitalisierung</th><th className="py-2 pr-4 text-right">Kurs</th><th className="py-2 pr-4 text-right">Mindestzeichnung</th><th className="py-2 pr-4">Bedingungen</th></>}
                <th className="py-2 pr-4 text-right">Im Depot</th>
                <th className="py-2 text-right">Handeln</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const h = held[p.id];
                const up = Number(p.change_percent || 0) >= 0;
                return (
                  <tr key={p.id} className="border-b border-bank-border/60">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-bank-text">{p.name}</div>
                      <div className="text-xs text-bank-text-muted">{[p.isin, p.ticker].filter(Boolean).join(' · ') || p.issuer}</div>
                    </td>
                    {tab === 'aktie' && (
                      <>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {eur(p.market_price, p.currency)}
                          <div className="text-[11px] text-bank-text-muted">{p.market_price_source === 'live' && p.market_price_at ? `Stand ${dt(p.market_price_at)}` : 'letzter Stand'}</div>
                        </td>
                        <td className={`py-3 pr-4 text-right tabular-nums ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {p.change_percent != null ? (
                            <span className="inline-flex items-center gap-1">{up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{up ? '+' : ''}{num(p.change_percent, 2)} %</span>
                          ) : '–'}
                        </td>
                      </>
                    )}
                    {tab === 'anleihe' && (
                      <>
                        <td className="py-3 pr-4 text-right">{pct(p.coupon_rate)}</td>
                        <td className="py-3 pr-4">{d(p.maturity_date)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{eur(p.buy_price ?? p.market_price)} / {eur(p.sell_price ?? p.market_price)}</td>
                      </>
                    )}
                    {tab === 'ipo' && (
                      <>
                        <td className="py-3 pr-4 text-xs">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${p.ipo_status === 'notiert' ? 'bg-emerald-100 text-emerald-800' : 'bg-bank-border/40 text-bank-text-muted'}`}>{({ notiert: 'Börsennotiert', eingereicht: 'Antrag eingereicht', geplant: 'Geplant' })[p.ipo_status] || 'Vorbörslich'}</span>
                          <div className="mt-1 text-bank-text">{p.ipo_date_label || 'Noch kein Termin angekündigt'}</div>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {p.market_cap != null ? <>{capUsd(p.market_cap)}{p.market_cap_note && <div className="text-[11px] text-bank-text-muted">{p.market_cap_note}</div>}</> : <span className="text-xs text-bank-text-muted">nicht bekannt</span>}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {p.market_price != null ? <>{eur(p.market_price, p.currency)}<div className="text-[11px] text-bank-text-muted">{p.market_price_source === 'live' ? `live · ${num(p.change_percent ?? 0, 2)} % heute` : 'je Stück'}</div></> : <span className="text-xs text-bank-text-muted">noch nicht notiert</span>}
                        </td>
                        <td className="py-3 pr-4 text-right">{eur(p.min_amount)}</td>
                        <td className="py-3 pr-4 text-xs text-bank-text-muted">{p.conditions}</td>
                      </>
                    )}
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {h ? (tab === 'ipo' ? <>{eur(h.amount)}{Number(h.quantity) > 0 && <div className="text-[11px] text-bank-text-muted">{num(h.quantity)} Stück</div>}</> : `${num(h.quantity)} Stk.`) : '–'}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <Button size="sm" disabled={!canTrade} onClick={() => setOrder({ product: p, side: 'buy' })} className="mr-2">
                        {tab === 'ipo' ? 'Zeichnen' : 'Kaufen'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!canTrade || !h} onClick={() => setOrder({ product: p, side: 'sell' })}>
                        Verkaufen
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-bank-text-muted">
            Aktienkurse werden laufend aktualisiert (verzögert, in EUR). Aufträge werden von Ihrem Berater geprüft und zum dann gültigen Kurs ausgeführt.
          </p>
        </div>
      )}

      {order && (
        <OrderDialog
          {...order}
          cash={Number(depot?.portfolio?.cash_balance ?? 0)}
          held={held[order.product.id]}
          onClose={() => setOrder(null)}
          onDone={() => { setOrder(null); load(); }}
        />
      )}
    </div>
  );
}

function OrderDialog({ product, side, cash, held, onClose, onDone }) {
  const sec = product.category === 'aktie' || product.category === 'anleihe';
  const [val, setVal] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(newKey);
  const price = Number(side === 'buy' ? (product.buy_price ?? product.market_price) : (product.sell_price ?? product.market_price)) || 0;
  const n = Number(String(val).replace(',', '.'));
  const total = sec ? Math.round(n * price * 100) / 100 : n;
  const valid = Number.isFinite(n) && n > 0 && (!sec || Number.isInteger(n));
  const [code, setCode] = useState('');
  const [disc, setDisc] = useState(null);
  const [codeMsg, setCodeMsg] = useState('');
  const [checking, setChecking] = useState(false);
  useEffect(() => { setDisc(null); }, [val]);
  const discount = disc ? Math.min(disc.discount, total) : 0;
  const payable = Math.max(0, Math.round((total - discount) * 100) / 100);
  const checkCode = async () => {
    setChecking(true); setCodeMsg('');
    try {
      const r = await kundeApi.post('discount/check', { code, product_id: product.id, total: valid ? total : 0 });
      setDisc(r);
    } catch (e) { setDisc(null); setCodeMsg(extractErrorMessage(e) || 'Rabattcode ungültig.'); }
    finally { setChecking(false); }
  };

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      await kundeApi.post('orders', {
        product_id: product.id, side,
        quantity: sec ? n : 0, amount: sec ? 0 : n,
        idempotency_key: key,
        ...(side === 'buy' && disc ? { discount_code: disc.code } : {}),
      });
      toast.success('Ihr Auftrag wurde übermittelt und wird geprüft.');
      onDone();
    } catch (e) {
      setError(extractErrorMessage(e) || 'Auftrag konnte nicht übermittelt werden.');
    } finally {
      setSending(false);
    }
  };

  const title = side === 'buy' ? (product.category === 'ipo' ? 'Zeichnen' : 'Kaufen') : 'Verkaufen';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}: {product.name}</DialogTitle>
          <DialogDescription>
            {sec ? `Aktueller ${side === 'buy' ? 'Kauf' : 'Verkaufs'}kurs: ${eur(price, product.currency)}` : product.category === 'ipo' ? `Zeichnungskurs: ${price ? eur(price, product.currency) + ' je Stück' : 'noch nicht notiert'}. ${product.conditions || ''}` : product.conditions}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm text-bank-text-muted">
            {sec ? 'Stückzahl' : product.category === 'ipo' ? 'Zeichnungssumme in EUR' : 'Betrag in EUR'}
            <Input type="number" min="1" step={sec ? '1' : '100'} value={val} onChange={(e) => setVal(e.target.value)} autoFocus className="mt-1" />
          </label>
          <div className="space-y-1 border border-bank-border bg-bank-bg/40 p-3 text-sm">
            <div className="flex justify-between"><span>Voraussichtlicher Betrag</span><strong className="tabular-nums">{eur(valid ? total : 0)}</strong></div>
            {product.category === 'ipo' && price > 0 && valid && <div className="flex justify-between text-bank-text-muted"><span>Bei {eur(price, product.currency)} je Stück entspricht das</span><span className="tabular-nums">{num(Math.round((n / price) * 10000) / 10000)} Stück</span></div>}
            {side === 'buy' && disc && valid && <>
              <div className="flex justify-between text-bank-success"><span>Rabatt ({disc.code}{disc.kind === 'percent' ? ` · ${num(disc.value, 2)} %` : ''})</span><span className="tabular-nums">−{eur(discount)}</span></div>
              <div className="flex justify-between border-t border-bank-border pt-1"><span>Zu zahlen</span><strong className="tabular-nums">{eur(payable)}</strong></div>
            </>}
            {side === 'buy' && <div className="flex justify-between text-bank-text-muted"><span>Verfügbare Liquidität</span><span className="tabular-nums">{eur(cash)}</span></div>}
            {side === 'sell' && held && <div className="flex justify-between text-bank-text-muted"><span>Ihr Bestand</span><span className="tabular-nums">{sec ? `${num(held.quantity)} Stk.` : eur(held.amount)}</span></div>}
          </div>
          {side === 'buy' && (
            <div>
              <label className="block text-sm text-bank-text-muted" htmlFor="discount-code">Rabattcode (optional)</label>
              <div className="mt-1 flex gap-2">
                <Input id="discount-code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setDisc(null); setCodeMsg(''); }} placeholder="Code eingeben" />
                <Button type="button" variant="outline" disabled={!code.trim() || !valid || checking} onClick={checkCode}>{checking ? 'Prüfe…' : 'Einlösen'}</Button>
              </div>
              {!valid && code && <p className="mt-1 text-xs text-bank-text-muted">Bitte zuerst {sec ? 'die Stückzahl' : 'den Betrag'} eingeben.</p>}
              {disc && <p className="mt-1 text-xs text-bank-success">Rabattcode angewendet: −{eur(discount)}</p>}
              {codeMsg && <p className="mt-1 text-xs text-rose-700" role="alert">{codeMsg}</p>}
            </div>
          )}
          {side === 'buy' && valid && payable > cash && <p className="text-sm text-amber-700">Der Betrag übersteigt Ihre verfügbare Liquidität. Der Auftrag kann erst nach einer Einzahlung ausgeführt werden.</p>}
          {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Abbrechen</Button>
          <Button onClick={submit} disabled={!valid || sending}>{sending ? 'Wird gesendet…' : 'Auftrag senden'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

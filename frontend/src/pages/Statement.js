import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { Printer, ArrowLeft } from 'lucide-react';

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

const Statement = ({ embedded = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [positions, setPositions] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [bonds, setBonds] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);

  const today = new Date();

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    if (wasDark) root.classList.remove('dark');
    return () => { if (wasDark) root.classList.add('dark'); };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        profileRes,
        balanceRes,
        positionsRes,
        cacheRes,
        bondsRes,
        contractsRes,
        txRes,
        ordersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('cash_balance').eq('id', user.id).maybeSingle(),
        supabase.from('user_stock_positions').select('*').eq('user_id', user.id),
        supabase.from('stock_prices_cache').select('*'),
        supabase.from('user_bond_positions').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('user_depot_contracts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase
          .from('user_cash_transactions')
          .select('id, amount, type, description, balance_after, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_stock_orders')
          .select('id, symbol, side, quantity, requested_price, executed_price, status, created_at, executed_at, discount_percent_snapshot')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setProfile(profileRes.data);
      setCashBalance(Number(balanceRes.data?.cash_balance || 0));
      setPositions(positionsRes.data || []);
      const map = {};
      (cacheRes.data || []).forEach((p) => { map[p.symbol] = p; });
      setPriceMap(map);
      setBonds(bondsRes.data || []);
      setContracts(contractsRes.data || []);
      setTransactions(txRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Statement fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const positionRows = positions.map((p) => {
    const priceObj = priceMap[p.symbol];
    const price = Number(priceObj?.price ?? p.avg_cost ?? 0);
    const qty = Number(p.quantity || 0);
    const avg = Number(p.avg_cost || 0);
    const marktwert = qty * price;
    const einstand = qty * avg;
    const gv = marktwert - einstand;
    return { ...p, price, qty, avg, marktwert, einstand, gv };
  });

  const depotWert = positionRows.reduce((s, r) => s + r.marktwert, 0);
  const bondsWert = bonds.reduce((s, b) => s + (Number(b.nominal_betrag || 0) * Number(b.aktueller_kurs || 100)) / 100, 0);
  const contractsWert = contracts.reduce((s, c) => s + Number(c.amount_eur || 0), 0);
  const gesamtvermoegen = cashBalance + depotWert + bondsWert + contractsWert;

  const handlePrint = () => {
    window.print();
  };

  if (loading || !user) {
    return (
      <div
        className={
          embedded
            ? 'flex items-center justify-center py-16'
            : 'min-h-screen bg-white flex items-center justify-center'
        }
      >
        <p className="text-bank-text-muted">Auszug wird erstellt...</p>
      </div>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email;

  return (
    <div
      className={
        embedded
          ? 'py-2 print:bg-white print:py-0'
          : 'min-h-screen bg-slate-100 py-8 print:bg-white print:py-0'
      }
    >
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 14mm;
          }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header.sticky, nav, footer, .live-ticker-wrap, [class*="fixed"],
          aside, [aria-label="Hauptnavigation"], .dashboard-main { padding-bottom: 0 !important; }
          aside, [aria-label="Hauptnavigation"] { display: none !important; }
        }
      `}</style>

      {/* Print toolbar */}
      <div
        className={`no-print mb-5 flex items-center ${
          embedded ? 'justify-end' : 'max-w-4xl mx-auto justify-between px-4'
        }`}
      >
        {!embedded && (
          <Button variant="outline-ink" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} strokeWidth={1.5} /> Zurück
          </Button>
        )}
        <Button variant="primary" onClick={handlePrint}>
          <Printer size={14} strokeWidth={1.5} /> Drucken / Als PDF speichern
        </Button>
      </div>

      <div
        className={`print-page relative bg-white px-10 py-10 print:shadow-none print:px-0 print:py-0 ${
          embedded ? 'rounded-xl border border-bank-border shadow-sm' : 'mx-auto max-w-4xl shadow-md'
        }`}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent print:bg-bank-gold" />
        {/* Header */}
        <div className="mb-7 flex items-start justify-between border-b border-bank-text pb-5">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo imgClassName="h-10 w-auto object-contain object-left" />
            </div>
            <p className="mt-3 inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Depotauszug · Fröhlich Vermögensberatung
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
              Erstellt am
            </p>
            <p
              className="mt-1.5 font-display text-[1.05rem] font-light leading-tight tabular-nums text-bank-text"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              {today.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] tabular-nums text-bank-text-muted">
              Zeit · {today.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Kundeninfo */}
        <section className="mb-8">
          <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
            Kunde
          </h2>
          <div className="grid grid-cols-2 gap-5 text-sm">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Name</p>
              <p className="mt-1 font-medium text-bank-text">{fullName}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">E-Mail</p>
              <p className="mt-1 font-medium text-bank-text">{user.email}</p>
            </div>
            {profile?.kundennummer && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Kundennummer</p>
                <p className="mt-1 font-mono font-medium tabular-nums text-bank-text">{profile.kundennummer}</p>
              </div>
            )}
          </div>
        </section>

        {/* Übersicht */}
        <section className="mb-8">
          <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
            Gesamtübersicht
          </h2>
          <div className="mb-3 grid grid-cols-4 gap-3">
            {[
              { label: 'Kontoguthaben', val: cashBalance },
              { label: 'Aktien-Depot', val: depotWert },
              { label: 'Anleihen', val: bondsWert },
              { label: 'Festgeld / Tagesgeld', val: contractsWert },
            ].map((kv) => (
              <div key={kv.label} className="border border-bank-border p-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  {kv.label}
                </p>
                <p className="rate-figure mt-1.5 text-[14px] tabular-nums text-bank-text">
                  {formatEUR(kv.val)}
                </p>
              </div>
            ))}
          </div>
          <div className="relative flex items-center justify-between border border-bank-gold/65 bg-bank-ink p-4 text-white print:bg-bank-text print:text-white">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-bank-gold/65 print:bg-bank-gold" />
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
              Gesamtvermögen
            </span>
            <span className="rate-figure text-[1.4rem] tabular-nums">{formatEUR(gesamtvermoegen)}</span>
          </div>
        </section>

        {/* Aktien-Positionen */}
        {positionRows.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Aktien-Depot
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-bank-text text-bank-text">
                  <th className="text-left py-1.5 font-semibold">Symbol</th>
                  <th className="text-right py-1.5 font-semibold">Stück</th>
                  <th className="text-right py-1.5 font-semibold">Ø Einstand</th>
                  <th className="text-right py-1.5 font-semibold">Kurs</th>
                  <th className="text-right py-1.5 font-semibold">Marktwert</th>
                  <th className="text-right py-1.5 font-semibold">G/V</th>
                </tr>
              </thead>
              <tbody>
                {positionRows.map((r) => (
                  <tr key={r.id} className="border-b border-bank-border/60">
                    <td className="py-1.5 font-medium">{r.symbol}</td>
                    <td className="py-1.5 text-right tabular-nums">{Number(r.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatEUR(r.avg)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatEUR(r.price)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{formatEUR(r.marktwert)}</td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${r.gv >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {r.gv >= 0 ? '+' : ''}{formatEUR(r.gv)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2" colSpan={4}>Summe</td>
                  <td className="py-2 text-right tabular-nums">{formatEUR(depotWert)}</td>
                  <td className="py-2"></td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Festgeld / Tagesgeld / Flexgeld */}
        {contracts.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Festgeld · Tagesgeld · Flexgeld
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-bank-text text-bank-text">
                  <th className="text-left py-1.5 font-semibold">Typ</th>
                  <th className="text-left py-1.5 font-semibold">Vertragsnr.</th>
                  <th className="text-left py-1.5 font-semibold">Bank</th>
                  <th className="text-right py-1.5 font-semibold">Zins</th>
                  <th className="text-left py-1.5 font-semibold">Aktiv von</th>
                  <th className="text-right py-1.5 font-semibold">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-bank-border/60">
                    <td className="py-1.5">{c.product_type || '–'}</td>
                    <td className="py-1.5 tabular-nums">{c.vertragsnummer || '–'}</td>
                    <td className="py-1.5">{c.bank_name || '–'}</td>
                    <td className="py-1.5 text-right tabular-nums">{c.zinssatz ? `${Number(c.zinssatz).toFixed(2)}%` : '–'}</td>
                    <td className="py-1.5 tabular-nums">{formatDate(c.active_from)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{formatEUR(c.amount_eur)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2" colSpan={5}>Summe</td>
                  <td className="py-2 text-right tabular-nums">{formatEUR(contractsWert)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Anleihen */}
        {bonds.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Anleihen
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-bank-text text-bank-text">
                  <th className="text-left py-1.5 font-semibold">Emittent</th>
                  <th className="text-left py-1.5 font-semibold">ISIN</th>
                  <th className="text-right py-1.5 font-semibold">Nominal</th>
                  <th className="text-right py-1.5 font-semibold">Kaufkurs</th>
                  <th className="text-right py-1.5 font-semibold">Akt. Kurs</th>
                  <th className="text-right py-1.5 font-semibold">Marktwert</th>
                </tr>
              </thead>
              <tbody>
                {bonds.map((b) => {
                  const mw = (Number(b.nominal_betrag || 0) * Number(b.aktueller_kurs || 100)) / 100;
                  return (
                    <tr key={b.id} className="border-b border-bank-border/60">
                      <td className="py-1.5">{b.issuer || b.bond_name || '–'}</td>
                      <td className="py-1.5 tabular-nums">{b.isin || '–'}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatEUR(b.nominal_betrag)}</td>
                      <td className="py-1.5 text-right tabular-nums">{b.kaufkurs ? `${Number(b.kaufkurs).toFixed(2)}%` : '–'}</td>
                      <td className="py-1.5 text-right tabular-nums">{b.aktueller_kurs ? `${Number(b.aktueller_kurs).toFixed(2)}%` : '–'}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium">{formatEUR(mw)}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="py-2" colSpan={5}>Summe</td>
                  <td className="py-2 text-right tabular-nums">{formatEUR(bondsWert)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Aufträge */}
        {orders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Letzte Aufträge (max. 50)
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-bank-text text-bank-text">
                  <th className="text-left py-1.5 font-semibold">Datum</th>
                  <th className="text-left py-1.5 font-semibold">Symbol</th>
                  <th className="text-left py-1.5 font-semibold">Seite</th>
                  <th className="text-right py-1.5 font-semibold">Stück</th>
                  <th className="text-right py-1.5 font-semibold">Kurs</th>
                  <th className="text-right py-1.5 font-semibold">Rabatt</th>
                  <th className="text-left py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-bank-border/60">
                    <td className="py-1.5 tabular-nums">{formatDate(o.created_at)}</td>
                    <td className="py-1.5 font-medium">{o.symbol}</td>
                    <td className="py-1.5 capitalize">{o.side === 'buy' ? 'Kauf' : 'Verkauf'}</td>
                    <td className="py-1.5 text-right tabular-nums">{Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}</td>
                    <td className="py-1.5 text-right tabular-nums">{o.executed_price != null ? formatEUR(o.executed_price) : (o.requested_price != null ? formatEUR(o.requested_price) : '–')}</td>
                    <td className="py-1.5 text-right tabular-nums text-emerald-800">
                      {o.side === 'buy' &&
                      o.discount_percent_snapshot != null &&
                      Number(o.discount_percent_snapshot) > 0
                        ? `${Number(o.discount_percent_snapshot).toLocaleString('de-DE', { maximumFractionDigits: 2 })}%`
                        : '–'}
                    </td>
                    <td className="py-1.5 capitalize">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Cash Transaktionen */}
        {transactions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold print:bg-bank-text" />
              Kontobewegungen (max. 50)
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-bank-text text-bank-text">
                  <th className="text-left py-1.5 font-semibold">Datum</th>
                  <th className="text-left py-1.5 font-semibold">Typ</th>
                  <th className="text-left py-1.5 font-semibold">Beschreibung</th>
                  <th className="text-right py-1.5 font-semibold">Betrag</th>
                  <th className="text-right py-1.5 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-bank-border/60">
                    <td className="py-1.5 tabular-nums">{formatDate(t.created_at)}</td>
                    <td className="py-1.5">{t.type}</td>
                    <td className="py-1.5 max-w-[200px] truncate">{t.description || '–'}</td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${Number(t.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{formatEUR(t.amount)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{formatEUR(t.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-bank-border pt-6 text-[10px] leading-relaxed text-bank-text-muted">
          <p className="mb-2">
            <span className="font-mono uppercase tracking-[0.16em] text-bank-text">Hinweis</span> · Dieser Auszug dient ausschließlich zu Informationszwecken.
            Alle Werte beziehen sich auf den Stand am{' '}
            <span className="tabular-nums">{today.toLocaleDateString('de-DE')}</span>.
            Kurse und Marktwerte können sich fortlaufend ändern.
          </p>
          <p className="font-mono uppercase tracking-[0.16em]">Fröhlich Vermögensberatung · Alle Angaben ohne Gewähr</p>
        </div>
      </div>
    </div>
  );
};

export default Statement;

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminSubpageLayout, AdminSubpageHeader } from '@/components/admin/AdminSubpageChrome';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Users,
  UserPlus,
  Clock,
  RefreshCw,
  Briefcase,
  LineChart as LineIcon,
  BarChart3,
  Trophy,
  CheckCircle2,
  XCircle,
  Hourglass,
  Mail,
  Send,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  CHART_COLORS,
  CHART_CURSOR_LINE,
  CHART_GRID_STROKE,
  chartMargin,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/dashboard/charts/chartTheme';
import ChartEmpty from '@/components/dashboard/charts/ChartEmpty';
import { ChartTooltipContent } from '@/components/dashboard/charts/ChartTooltip';

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const formatEURFull = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const formatInt = (v) => Number(v || 0).toLocaleString('de-DE');

const RANGES = [
  { key: 30, label: '30T' },
  { key: 90, label: '90T' },
  { key: 365, label: '1J' },
];

const AdminAnalytics = () => {
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);

  // KPI data
  const [totalAum, setTotalAum] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [active24h, setActive24h] = useState(0);
  const [active7d, setActive7d] = useState(0);
  const [newUsers7d, setNewUsers7d] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  // Chart data
  const [aumSeries, setAumSeries] = useState([]);
  const [regSeries, setRegSeries] = useState([]);

  // Tables
  const [topHoldings, setTopHoldings] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  // Orders
  const [orderStats, setOrderStats] = useState({ pending: 0, executed: 0, rejected: 0, total: 0 });
  const [digestSending, setDigestSending] = useState(false);
  const { user } = useAuth();

  const sendDigest = async (mode) => {
    if (mode === 'all') {
      if (!window.confirm('Wochenbericht an alle aktiven Kunden senden?')) return;
    }
    setDigestSending(true);
    try {
      const payload = mode === 'single' ? { mode: 'single', user_id: user?.id } : { mode: 'all' };
      const { data, error } = await supabase.functions.invoke('send-weekly-digest', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Wochenbericht versendet', {
        description: `${data?.sent ?? 0} von ${data?.total ?? 0} Mails erfolgreich`,
      });
    } catch (err) {
      Sentry.captureException(err);
      console.error('digest send failed', err);
      toast.error('Fehler beim Versand', { description: err?.message || String(err) });
    } finally {
      setDigestSending(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: serverData, error: serverError } = await supabase.rpc('admin_analytics_overview', {
        p_range_days: rangeDays,
      });
      if (!serverError && serverData) {
        setTotalAum(Number(serverData.totalAum || 0));
        setTotalUsers(Number(serverData.totalUsers || 0));
        setActive24h(Number(serverData.active24h || 0));
        setActive7d(Number(serverData.active7d || 0));
        setNewUsers7d(Number(serverData.newUsers7d || 0));
        setPendingOrders(Number(serverData.pendingOrders || 0));
        setAumSeries(Array.isArray(serverData.aumSeries) ? serverData.aumSeries : []);
        setRegSeries(Array.isArray(serverData.regSeries) ? serverData.regSeries : []);
        setTopHoldings(Array.isArray(serverData.topHoldings) ? serverData.topHoldings : []);
        setTopUsers(Array.isArray(serverData.topUsers) ? serverData.topUsers : []);
        setOrderStats(serverData.orderStats || { pending: 0, executed: 0, rejected: 0, total: 0, cancelled: 0 });
        return;
      }

      await Promise.all([
        fetchKPIs(),
        fetchAumSeries(),
        fetchRegistrations(),
        fetchTopHoldings(),
        fetchTopUsers(),
        fetchOrderStats(),
      ]);
    } catch (err) {
      Sentry.captureException(err);
      console.error('Analytics fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const d7 = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

    // Current AUM — sum latest snapshot per user if available, else fallback to raw totals
    const { data: snap } = await supabase
      .from('user_portfolio_snapshots')
      .select('user_id, total_value, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(5000);

    let aum = 0;
    if (snap && snap.length > 0) {
      const seen = new Set();
      for (const row of snap) {
        if (seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        aum += Number(row.total_value || 0);
      }
    }
    // fallback: sum live positions if snapshots empty
    if (aum === 0) {
      const [{ data: profs }, { data: positions }, { data: cache }, { data: bonds }, { data: contracts }] = await Promise.all([
        supabase.from('profiles').select('cash_balance'),
        supabase.from('user_stock_positions').select('quantity, avg_cost, symbol'),
        supabase.from('stock_prices_cache').select('symbol, price'),
        supabase.from('user_bond_positions').select('nominal_betrag, aktueller_kurs, is_active').eq('is_active', true),
        supabase.from('user_depot_contracts').select('amount_eur, is_active').eq('is_active', true),
      ]);
      const priceMap = {};
      (cache || []).forEach((c) => { priceMap[c.symbol] = Number(c.price || 0); });
      const cash = (profs || []).reduce((s, r) => s + Number(r.cash_balance || 0), 0);
      const stocks = (positions || []).reduce((s, r) => s + Number(r.quantity || 0) * (priceMap[r.symbol] ?? Number(r.avg_cost || 0)), 0);
      const bondsV = (bonds || []).reduce((s, b) => s + (Number(b.nominal_betrag || 0) * Number(b.aktueller_kurs || 100)) / 100, 0);
      const contractsV = (contracts || []).reduce((s, c) => s + Number(c.amount_eur || 0), 0);
      aum = cash + stocks + bondsV + contractsV;
    }
    setTotalAum(aum);

    const [a24, a7, tot, nu7, pend] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen_at', h24),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen_at', d7),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', d7),
      supabase.from('user_stock_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setActive24h(a24.count || 0);
    setActive7d(a7.count || 0);
    setTotalUsers(tot.count || 0);
    setNewUsers7d(nu7.count || 0);
    setPendingOrders(pend.count || 0);
  };

  const fetchAumSeries = async () => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - rangeDays);
    const { data } = await supabase
      .from('user_portfolio_snapshots')
      .select('snapshot_date, total_value')
      .gte('snapshot_date', fromDate.toISOString().slice(0, 10))
      .order('snapshot_date', { ascending: true });
    const buckets = new Map();
    (data || []).forEach((r) => {
      const d = r.snapshot_date;
      buckets.set(d, (buckets.get(d) || 0) + Number(r.total_value || 0));
    });
    const arr = Array.from(buckets.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
    setAumSeries(arr);
  };

  const fetchRegistrations = async () => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - rangeDays);
    const { data } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: true });
    const buckets = new Map();
    (data || []).forEach((r) => {
      const d = (r.created_at || '').slice(0, 10);
      if (!d) return;
      buckets.set(d, (buckets.get(d) || 0) + 1);
    });
    const arr = Array.from(buckets.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    setRegSeries(arr);
  };

  const fetchTopHoldings = async () => {
    const [{ data: positions }, { data: stocks }, { data: cache }] = await Promise.all([
      supabase.from('user_stock_positions').select('user_id, symbol, quantity, avg_cost'),
      supabase.from('stocks').select('symbol, name, sector'),
      supabase.from('stock_prices_cache').select('symbol, price'),
    ]);
    const stockMap = {};
    (stocks || []).forEach((s) => { stockMap[s.symbol] = s; });
    const priceMap = {};
    (cache || []).forEach((c) => { priceMap[c.symbol] = Number(c.price || 0); });
    const agg = new Map();
    (positions || []).forEach((p) => {
      const qty = Number(p.quantity || 0);
      const price = priceMap[p.symbol] ?? Number(p.avg_cost || 0);
      const mv = qty * price;
      const curr = agg.get(p.symbol) || { symbol: p.symbol, qty: 0, value: 0, users: new Set() };
      curr.qty += qty;
      curr.value += mv;
      curr.users.add(p.user_id);
      agg.set(p.symbol, curr);
    });
    const arr = Array.from(agg.values())
      .map((r) => ({
        symbol: r.symbol,
        name: stockMap[r.symbol]?.name || r.symbol,
        sector: stockMap[r.symbol]?.sector,
        qty: r.qty,
        value: r.value,
        userCount: r.users.size,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    setTopHoldings(arr);
  };

  const fetchTopUsers = async () => {
    const { data: snap } = await supabase
      .from('user_portfolio_snapshots')
      .select('user_id, total_value, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(5000);
    const seen = new Map();
    (snap || []).forEach((r) => {
      if (!seen.has(r.user_id)) seen.set(r.user_id, Number(r.total_value || 0));
    });
    const top = Array.from(seen.entries())
      .map(([user_id, value]) => ({ user_id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    if (top.length === 0) { setTopUsers([]); return; }
    const userIds = top.map((t) => t.user_id);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);
    const profMap = {};
    (profs || []).forEach((p) => { profMap[p.id] = p; });
    setTopUsers(top.map((t) => ({ ...t, profile: profMap[t.user_id] })));
  };

  const fetchOrderStats = async () => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const { data } = await supabase
      .from('user_stock_orders')
      .select('status')
      .gte('created_at', fromDate.toISOString());
    const s = { pending: 0, executed: 0, rejected: 0, total: 0, cancelled: 0 };
    (data || []).forEach((r) => {
      s.total++;
      if (s[r.status] != null) s[r.status]++;
    });
    setOrderStats(s);
  };

  const aumLatest = aumSeries.length > 0 ? aumSeries[aumSeries.length - 1].total : 0;
  const aumFirst = aumSeries.length > 0 ? aumSeries[0].total : 0;
  const aumChangePct = useMemo(() => {
    if (aumFirst > 0) return ((aumLatest - aumFirst) / aumFirst) * 100;
    return 0;
  }, [aumFirst, aumLatest]);

  const regTotal = regSeries.reduce((s, r) => s + r.count, 0);

  const formatXAxis = (d) => {
    const date = new Date(d);
    if (rangeDays <= 30) return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    if (rangeDays <= 365) return date.toLocaleDateString('de-DE', { month: 'short', day: '2-digit' });
    return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
  };

  return (
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Auswertung"
          title="Analytics"
          titleIcon={BarChart3}
          description="Plattform-Kennzahlen, AUM-Entwicklung, Neuanmeldungen und Top-Positionen."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRangeDays(r.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    rangeDays === r.key
                      ? 'bg-bank-ink text-white border-bank-ink shadow-sm'
                      : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg shadow-sm'
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                onClick={fetchAll}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-bank-border bg-white text-bank-text hover:bg-bank-bg transition-colors disabled:opacity-50 shadow-sm"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Aktualisieren
              </button>
            </div>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiCard
            icon={<TrendingUp size={18} />}
            label="Gesamt-AUM"
            value={formatEUR(totalAum)}
            sub={`${totalUsers} aktive Kunden`}
            tone="primary"
          />
          <KpiCard
            icon={<Users size={18} />}
            label="Aktiv (24h)"
            value={formatInt(active24h)}
            sub={`${active7d} in 7 Tagen`}
            tone="emerald"
          />
          <KpiCard
            icon={<UserPlus size={18} />}
            label="Neue User (7T)"
            value={formatInt(newUsers7d)}
            sub={`Gesamt ${formatInt(totalUsers)}`}
            tone="blue"
          />
          <KpiCard
            icon={<Hourglass size={18} />}
            label="Offene Aufträge"
            value={formatInt(pendingOrders)}
            sub="warten auf Ausführung"
            tone="amber"
          />
        </div>

        {/* Wochenbericht / Weekly digest */}
        <div className="bg-bank-surface border border-bank-border rounded-xl p-5 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bank-primary/10 flex items-center justify-center">
              <Mail size={18} className="text-bank-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-bank-text">Wochenbericht</h3>
              <p className="text-xs text-bank-text-muted mt-0.5">
                Personalisierte E-Mail mit 7-Tage Portfolio-Zusammenfassung. Jeden Sonntag automatisch (pg_cron).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => sendDigest('single')}
              disabled={digestSending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-bank-border bg-bank-surface text-bank-text hover:bg-bank-bg transition-colors disabled:opacity-50"
            >
              <Send size={13} className={digestSending ? 'animate-pulse' : ''} /> Testmail an mich
            </button>
            <button
              onClick={() => sendDigest('all')}
              disabled={digestSending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-bank-ink text-white hover:bg-bank-ink-elev transition-colors disabled:opacity-50"
            >
              <Send size={13} /> An alle senden
            </button>
          </div>
        </div>

        {/* AUM trend chart */}
        <div className="bg-bank-surface border border-bank-border rounded-xl p-5 shadow-sm mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
                <LineIcon size={16} className="text-bank-primary" /> Plattform-AUM Verlauf
              </h3>
              <p className="text-xs text-bank-text-muted mt-0.5">
                {aumSeries.length > 0 ? (
                  <>
                    Aktuell <strong className="text-bank-text">{formatEURFull(aumLatest)}</strong>
                    {aumFirst > 0 && (
                      <span className={`ml-2 font-medium ${aumChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {aumChangePct >= 0 ? '+' : ''}{aumChangePct.toFixed(2)}% in {rangeDays}T
                      </span>
                    )}
                  </>
                ) : (
                  'Noch keine Snapshots'
                )}
              </p>
            </div>
          </div>
          <div className="h-64">
            {aumSeries.length === 0 ? (
              <ChartEmpty height={256} hint="Keine AUM-Snapshots im Zeitraum" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aumSeries} margin={chartMargin}>
                  <defs>
                    <linearGradient id="g_aum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} {...chartXAxisProps} minTickGap={40} />
                  <YAxis tickFormatter={(v) => formatEUR(v)} {...chartYAxisProps} width={80} />
                  <Tooltip
                    cursor={CHART_CURSOR_LINE}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(d) =>
                          new Date(d).toLocaleDateString('de-DE', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        }
                        rows={(payload) => (
                          <p className="tabular-nums text-bank-text">
                            AUM:{' '}
                            <span className="font-semibold">{formatEURFull(payload[0]?.value)}</span>
                          </p>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#g_aum)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Registrations */}
          <div className="lg:col-span-2 bg-bank-surface border border-bank-border rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
                  <UserPlus size={16} className="text-bank-primary" /> Neuanmeldungen
                </h3>
                <p className="text-xs text-bank-text-muted mt-0.5">{formatInt(regTotal)} neue Kunden in {rangeDays} Tagen</p>
              </div>
            </div>
            <div className="h-52">
              {regSeries.length === 0 ? (
                <ChartEmpty height={208} hint="Keine neuen Anmeldungen" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regSeries} margin={chartMargin}>
                    <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatXAxis} {...chartXAxisProps} minTickGap={40} />
                    <YAxis allowDecimals={false} {...chartYAxisProps} width={36} />
                    <Tooltip
                      cursor={CHART_CURSOR_LINE}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(d) =>
                            new Date(d).toLocaleDateString('de-DE', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'long',
                            })
                          }
                          rows={(payload) => (
                            <p className="tabular-nums text-bank-text">
                              Anmeldungen:{' '}
                              <span className="font-semibold">{formatInt(payload[0]?.value)}</span>
                            </p>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.success}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Order stats (30d) */}
          <div className="bg-bank-surface border border-bank-border rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-4">
              <Briefcase size={16} className="text-bank-primary" /> Aufträge (30T)
            </h3>
            <div className="space-y-2.5">
              <OrderRow icon={<Hourglass size={14} />} label="Offen" value={orderStats.pending} tone="amber" />
              <OrderRow icon={<CheckCircle2 size={14} />} label="Ausgeführt" value={orderStats.executed} tone="emerald" />
              <OrderRow icon={<XCircle size={14} />} label="Abgelehnt" value={orderStats.rejected} tone="rose" />
              <div className="pt-2.5 mt-2.5 border-t border-bank-border flex items-center justify-between">
                <span className="text-xs text-bank-text-muted">Gesamt</span>
                <span className="text-sm font-bold text-bank-text tabular-nums">{formatInt(orderStats.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Holdings + Top Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-bank-surface border border-bank-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-bank-border">
              <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
                <TrendingUp size={16} className="text-bank-primary" /> Top 10 Positionen
              </h3>
              <p className="text-xs text-bank-text-muted mt-0.5">Nach Marktwert aggregiert über alle Kunden</p>
            </div>
            {topHoldings.length === 0 ? (
              <div className="p-10 text-center text-sm text-bank-text-muted">Noch keine Positionen</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-bank-text-muted">
                      <th className="text-left py-2.5 px-5 font-medium">Symbol</th>
                      <th className="text-right py-2.5 px-2 font-medium">Stück</th>
                      <th className="text-right py-2.5 px-2 font-medium">Kunden</th>
                      <th className="text-right py-2.5 px-5 font-medium">Marktwert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHoldings.map((h, i) => (
                      <tr key={h.symbol} className="border-t border-bank-border hover:bg-bank-bg/40">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-bank-primary/10 text-bank-primary text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium text-bank-text">{h.symbol}</p>
                              <p className="text-[11px] text-bank-text-muted truncate max-w-[200px]">{h.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-bank-text-muted">
                          {Number(h.qty).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-bank-text-muted">{h.userCount}</td>
                        <td className="py-3 px-5 text-right tabular-nums font-semibold text-bank-text">{formatEUR(h.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-bank-surface border border-bank-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-bank-border">
              <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
                <Trophy size={16} className="text-bank-primary" /> Top 10 Kunden
              </h3>
              <p className="text-xs text-bank-text-muted mt-0.5">Nach aktuellem Gesamtvermögen</p>
            </div>
            {topUsers.length === 0 ? (
              <div className="p-10 text-center text-sm text-bank-text-muted">
                <p>Noch keine Snapshots vorhanden</p>
                <p className="text-[11px] mt-1 text-bank-text-muted/80">Daily Snapshots werden automatisch erstellt (pg_cron)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-bank-text-muted">
                      <th className="text-left py-2.5 px-5 font-medium">Kunde</th>
                      <th className="text-right py-2.5 px-5 font-medium">Gesamtvermögen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u, i) => {
                      const name = u.profile ? [u.profile.first_name, u.profile.last_name].filter(Boolean).join(' ') : '—';
                      return (
                        <tr key={u.user_id} className="border-t border-bank-border hover:bg-bank-bg/40">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-bank-primary/10 text-bank-primary text-[10px] font-bold">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-bank-text truncate">{name || u.profile?.email || '—'}</p>
                                {name && <p className="text-[11px] text-bank-text-muted truncate">{u.profile?.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right tabular-nums font-semibold text-bank-text">{formatEUR(u.value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    </AdminSubpageLayout>
  );
};

const TONE = {
  primary: { bg: 'bg-bank-primary/10', text: 'text-bank-primary' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
};

const KpiCard = ({ icon, label, value, sub, tone = 'primary' }) => {
  const t = TONE[tone] || TONE.primary;
  return (
    <div className="bg-bank-surface border border-bank-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-bank-text-muted uppercase tracking-wider font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-md ${t.bg} ${t.text} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-bank-text tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[11px] text-bank-text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
};

const OrderRow = ({ icon, label, value, tone }) => {
  const t = TONE[tone] || TONE.primary;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-md ${t.bg} ${t.text} flex items-center justify-center`}>{icon}</span>
        <span className="text-sm text-bank-text">{label}</span>
      </div>
      <span className="text-sm font-bold text-bank-text tabular-nums">{formatInt(value)}</span>
    </div>
  );
};

export default AdminAnalytics;

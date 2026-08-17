import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  X,
  Save,
  CheckCircle,
  PauseCircle,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';

const EMPTY_FORM = {
  symbol: '',
  name: '',
  exchange: '',
  currency: 'USD',
  sector: '',
  logo_url: '',
  display_order: 0,
  is_active: true,
};

const AdminStocks = () => {
  const [stocks, setStocks] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sdata, error: sErr }, { data: pdata }] = await Promise.all([
      supabase.from('stocks').select('*').order('display_order', { ascending: true }).order('symbol', { ascending: true }),
      supabase.from('stock_prices_cache').select('*'),
    ]);
    if (sErr) toast.error('Fehler beim Laden der Aktien: ' + sErr.message);
    setStocks(sdata || []);
    const map = {};
    (pdata || []).forEach((p) => { map[p.symbol] = p; });
    setPriceMap(map);
    setLoading(false);
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-prices', { body: {} });
      if (error) throw error;
      toast.success(`Preise aktualisiert (${data?.cached ?? 0} Symbole)`);
      const { data: pdata } = await supabase.from('stock_prices_cache').select('*');
      const map = {};
      (pdata || []).forEach((p) => { map[p.symbol] = p; });
      setPriceMap(map);
    } catch (err) {
      toast.error('Preise konnten nicht geladen werden: ' + (err?.message || 'unbekannt'));
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      symbol: s.symbol || '',
      name: s.name || '',
      exchange: s.exchange || '',
      currency: s.currency || 'USD',
      sector: s.sector || '',
      logo_url: s.logo_url || '',
      display_order: s.display_order ?? 0,
      is_active: s.is_active ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const setField = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim()) {
      toast.error('Symbol und Name sind erforderlich.');
      return;
    }
    setSaving(true);
    const payload = {
      symbol: form.symbol.trim().toUpperCase(),
      name: form.name.trim(),
      exchange: form.exchange.trim() || null,
      currency: form.currency.trim() || 'USD',
      sector: form.sector.trim() || null,
      logo_url: form.logo_url.trim() || null,
      display_order: Number(form.display_order || 0),
      is_active: !!form.is_active,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('stocks').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('stocks').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success(editingId ? 'Aktie aktualisiert' : 'Aktie hinzugefügt');
    closeModal();
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Diese Aktie wirklich löschen? (Cache-Einträge werden automatisch entfernt)')) return;
    const { error } = await supabase.from('stocks').delete().eq('id', id);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Aktie gelöscht');
    fetchAll();
  };

  const toggleActive = async (s) => {
    const { error } = await supabase.from('stocks').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    fetchAll();
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stocks.filter((s) => {
      if (filterStatus === 'active' && !s.is_active) return false;
      if (filterStatus === 'inactive' && s.is_active) return false;
      if (term) {
        const hay = [s.symbol, s.name, s.exchange, s.sector].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [stocks, filterStatus, searchTerm]);

  const formatCurrency = (v, currency = 'USD') =>
    v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

  const formatPct = (v) =>
    v == null ? '–' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

  const formatTime = (t) => {
    if (!t) return '–';
    const d = new Date(t);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
    return d.toLocaleString('de-DE');
  };

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Märkte"
          title="Aktien-Universum"
          titleIcon={LineChart}
          description="Handelbare Aktien und Kurs-Cache — Yahoo-kompatible Symbole."
          actions={
            <>
              <Button
                variant="outline"
                onClick={refreshPrices}
                disabled={refreshing}
                className="gap-2 rounded-xl"
              >
                <Download size={15} className={refreshing ? 'animate-pulse' : ''} />
                {refreshing ? 'Lade Kurse...' : 'Kurse aktualisieren'}
              </Button>
              <Button onClick={openAdd} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl">
                <Plus size={16} /> Aktie hinzufügen
              </Button>
            </>
          }
        />

        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 mb-6 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-Update alle 10 min
        </div>

        <AdminToolbarCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Symbol, Name, Börse, Sektor..."
              className="pl-9"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <Button variant="outline" onClick={fetchAll} className="gap-2 rounded-xl">
            <RefreshCw size={15} /> Neu laden
          </Button>
        </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
              <p className="text-bank-text-muted text-sm">Wird geladen...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-bank-text-muted/70">
              <LineChart size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Aktien gefunden.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Börse</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Sektor</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">Kurs</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">Änd.</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Cache</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const p = priceMap[s.symbol];
                  const chg = p ? Number(p.change_pct) : null;
                  const up = chg != null && chg >= 0;
                  return (
                    <tr key={s.id} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                      <td className="py-3 px-4 text-sm font-semibold text-bank-text">{s.symbol}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="text-bank-text">{s.name}</div>
                        <div className="text-xs text-bank-text-muted">Currency: {s.currency}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{s.exchange || '–'}</td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{s.sector || '–'}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-bank-text">
                        {p ? formatCurrency(p.price, p.currency || s.currency) : '–'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {chg != null ? (
                          <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {formatPct(chg)}
                          </span>
                        ) : (
                          <span className="text-bank-text-muted">–</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-bank-text-muted">
                        {p ? formatTime(p.fetched_at) : 'noch kein Cache'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActive(s)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${s.is_active
                              ? 'bg-bank-success/10 text-bank-success border-bank-success/25 hover:bg-bank-success/15'
                              : 'bg-bank-border/20 text-bank-text-muted border-bank-border hover:bg-bank-border/30'
                            }`}
                        >
                          {s.is_active ? <CheckCircle size={12} /> : <PauseCircle size={12} />}
                          {s.is_active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-bank-accent hover:bg-bank-accent/10 rounded" title="Bearbeiten">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-bank-error hover:bg-bank-error/10 rounded" title="Löschen">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AdminSurfaceCard>

        <p className="mt-4 text-xs text-bank-text-muted">
          Tipp: Symbole in Yahoo-Finance-Notation angeben. US-Aktien z.B. <code>AAPL</code>, deutsche Aktien <code>SAP.DE</code>, schweizer <code>NESN.SW</code>.
        </p>
    </AdminSubpageLayout>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {editingId ? 'Aktie bearbeiten' : 'Neue Aktie'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Symbol <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    value={form.symbol} onChange={setField('symbol')}
                    placeholder="z.B. AAPL" required
                    className="uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Börse</label>
                  <Input value={form.exchange} onChange={setField('exchange')} placeholder="z.B. NASDAQ, XETRA" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Name <span className="text-bank-error">*</span>
                  </label>
                  <Input value={form.name} onChange={setField('name')} placeholder="z.B. Apple Inc." required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Währung</label>
                  <Input value={form.currency} onChange={setField('currency')} placeholder="USD, EUR, CHF..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Sektor</label>
                  <Input value={form.sector} onChange={setField('sector')} placeholder="Technology, Finance..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Logo-URL</label>
                  <Input value={form.logo_url} onChange={setField('logo_url')} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Reihenfolge</label>
                  <Input type="number" value={form.display_order} onChange={setField('display_order')} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-bank-text cursor-pointer select-none">
                <input
                  type="checkbox" checked={!!form.is_active}
                  onChange={setField('is_active')}
                  className="w-4 h-4 accent-bank-primary"
                />
                Aktie ist aktiv (handelbar)
              </label>
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-bank-border shrink-0">
              <Button variant="outline" onClick={closeModal} className="flex-1" disabled={saving}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-bank-ink hover:bg-bank-ink-elev text-white gap-2"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminStocks;

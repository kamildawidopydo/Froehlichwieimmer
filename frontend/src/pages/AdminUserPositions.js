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
  RefreshCw, Plus, Edit, Trash2, Search, Users, Briefcase, X,
} from 'lucide-react';

const formatEUR = (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const formatNum = (v, d = 4) => Number(v || 0).toLocaleString('de-DE', { maximumFractionDigits: d });

const EMPTY_FORM = {
  user_id: '',
  symbol: '',
  quantity: '',
  avg_cost: '',
  deduct_cash: false,
};

const AdminUserPositions = () => {
  // Session 82.90c — DOMAIN_REVIEW_REQUIRED: Direkte Stock-Position-Mutationen
  // (Upsert/Delete) bleiben blockiert bis dedizierter Adjustment-Service mit
  // Ledger-Trail existiert. Diese Seite bleibt aktuell auf Legacy-Supabase.
  const [positions, setPositions] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [profilesList, setProfilesList] = useState([]);
  const [stocksList, setStocksList] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [posRes, profRes, stockRes, cacheRes] = await Promise.all([
        supabase.from('user_stock_positions').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id, email, first_name, last_name, cash_balance').order('first_name'),
        supabase.from('stocks').select('*').eq('is_active', true).order('symbol'),
        supabase.from('stock_prices_cache').select('*'),
      ]);
      setPositions(posRes.data || []);
      setProfilesList(profRes.data || []);
      const pm = {};
      (profRes.data || []).forEach((p) => { pm[p.id] = p; });
      setProfilesMap(pm);
      setStocksList(stockRes.data || []);
      const cm = {};
      (cacheRes.data || []).forEach((p) => { cm[p.symbol] = p; });
      setPriceMap(cm);
    } catch (err) {
      toast.error('Fehler: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setIsEdit(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (pos) => {
    setIsEdit(true);
    setEditingId(pos.id);
    setForm({
      user_id: pos.user_id,
      symbol: pos.symbol,
      quantity: String(pos.quantity),
      avg_cost: String(pos.avg_cost),
      deduct_cash: false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.user_id || !form.symbol) { toast.error('Kunde und Symbol erforderlich'); return; }
    const qty = Number(form.quantity);
    const avg = Number(form.avg_cost);
    if (!Number.isFinite(qty) || qty < 0) { toast.error('Ungültige Stückzahl'); return; }
    if (!Number.isFinite(avg) || avg < 0) { toast.error('Ungültiger Einstand'); return; }

    setSubmitting(true);
    const { error } = await supabase.rpc('admin_upsert_stock_position', {
      p_user_id: form.user_id,
      p_symbol: form.symbol,
      p_quantity: qty,
      p_avg_cost: avg,
      p_deduct_cash: !!form.deduct_cash,
    });
    setSubmitting(false);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success(isEdit ? 'Position aktualisiert' : 'Position hinzugefügt');
    setShowModal(false);
    fetchAll();
  };

  const handleDelete = async (pos) => {
    if (!window.confirm(`Position ${pos.symbol} (${formatNum(pos.quantity)} Stk) von ${profilesMap[pos.user_id]?.email} wirklich löschen?`)) return;
    const { error } = await supabase.from('user_stock_positions').delete().eq('id', pos.id);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Position gelöscht');
    fetchAll();
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return positions.filter((p) => {
      if (userFilter !== 'all' && p.user_id !== userFilter) return false;
      if (term) {
        const prof = profilesMap[p.user_id];
        const hay = [p.symbol, prof?.email, prof?.first_name, prof?.last_name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [positions, userFilter, searchTerm, profilesMap]);

  const stockCurrency = (symbol) => priceMap[symbol]?.currency || stocksList.find((s) => s.symbol === symbol)?.currency || 'USD';
  const estTotal = form.quantity && form.avg_cost
    ? Number(form.quantity) * Number(form.avg_cost)
    : 0;

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Wertpapiere"
          title="Kunden-Positionen"
          titleIcon={Briefcase}
          description="Aktien-Positionen manuell pflegen — Stückzahl, Einstand und Marktwert."
          actions={
            <>
              <Button onClick={fetchAll} variant="outline" className="gap-2 rounded-xl">
                <RefreshCw size={14} /> Aktualisieren
              </Button>
              <Button onClick={openAdd} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl">
                <Plus size={16} /> Position hinzufügen
              </Button>
            </>
          }
        />

        <AdminToolbarCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Symbol, Kunde, E-Mail..." className="pl-9" />
            </div>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm">
              <option value="all">Alle Kunden</option>
              {profilesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-bank-text-muted mt-3">
            <Briefcase size={11} className="inline mb-0.5 mr-1" />
            {filtered.length} von {positions.length} Positionen
          </p>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
              <p className="text-bank-text-muted text-sm">Wird geladen...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-bank-text-muted/70">
              <Briefcase size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Positionen vorhanden.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Kunde</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Symbol</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Stück</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Ø Einstand</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Kurs</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Marktwert</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">G/V</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const prof = profilesMap[p.user_id];
                    const currency = stockCurrency(p.symbol);
                    const livePrice = priceMap[p.symbol]?.price;
                    const qty = Number(p.quantity);
                    const avg = Number(p.avg_cost);
                    const marktwert = livePrice != null ? qty * Number(livePrice) : qty * avg;
                    const einstand = qty * avg;
                    const gv = marktwert - einstand;
                    const pct = einstand > 0 ? (gv / einstand) * 100 : 0;
                    const up = gv >= 0;
                    return (
                      <tr key={p.id} className={`border-b border-bank-border/60 ${adminRowHover}`}>
                        <td className="py-2.5 px-4 text-xs">
                          <p className="font-medium text-bank-text">{prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email : '–'}</p>
                          <p className="text-bank-text-muted">{prof?.email || ''}</p>
                        </td>
                        <td className="py-2.5 px-4 text-sm font-semibold text-bank-text">{p.symbol}</td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text">{formatNum(qty)}</td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text-muted">{Number(avg).toLocaleString('de-DE', { style: 'currency', currency })}</td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text">{livePrice != null ? Number(livePrice).toLocaleString('de-DE', { style: 'currency', currency }) : '–'}</td>
                        <td className="py-2.5 px-4 text-sm text-right font-medium text-bank-text">{marktwert.toLocaleString('de-DE', { style: 'currency', currency })}</td>
                        <td className={`py-2.5 px-4 text-sm text-right font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {up ? '+' : ''}{gv.toLocaleString('de-DE', { style: 'currency', currency })}<br />
                          <span className="text-[10px]">{up ? '+' : ''}{pct.toFixed(2)}%</span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="h-7 px-2 text-xs mr-1">
                            <Edit size={12} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(p)} className="h-7 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50">
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceCard>
    </AdminSubpageLayout>

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setShowModal(false)}>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-bank-text">{isEdit ? 'Position bearbeiten' : 'Position hinzufügen'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-bank-border/25 rounded" disabled={submitting}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">
                  <Users size={11} className="inline mb-0.5 mr-1" /> Kunde *
                </label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  disabled={isEdit}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm disabled:bg-bank-bg"
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {profilesList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email} — {formatEUR(p.cash_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">Symbol *</label>
                <select
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  disabled={isEdit}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm disabled:bg-bank-bg"
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {stocksList.map((s) => (
                    <option key={s.id} value={s.symbol}>{s.symbol} — {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bank-text-muted mb-1">Stückzahl *</label>
                  <Input
                    type="number" step="0.000001" min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bank-text-muted mb-1">Ø Einstand *</label>
                  <Input
                    type="number" step="0.0001" min="0"
                    value={form.avg_cost}
                    onChange={(e) => setForm({ ...form, avg_cost: e.target.value })}
                    placeholder="150.00"
                    required
                  />
                </div>
              </div>

              {estTotal > 0 && (
                <div className="bg-bank-bg border border-bank-border rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-bank-text-muted">Gesamtwert (Stk × Einstand)</span>
                    <span className="font-semibold text-bank-text">
                      {estTotal.toLocaleString('de-DE', { style: 'currency', currency: form.symbol ? stockCurrency(form.symbol) : 'USD' })}
                    </span>
                  </div>
                </div>
              )}

              {!isEdit && (
                <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.deduct_cash}
                    onChange={(e) => setForm({ ...form, deduct_cash: e.target.checked })}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-amber-800">Gesamtbetrag vom Guthaben abziehen</p>
                    <p className="text-amber-700 mt-0.5">
                      Wenn aktiv: Kontoguthaben wird reduziert und eine <code className="bg-amber-100 px-1 rounded">stock_buy</code> Transaktion erstellt. Wenn nicht aktiv: reine Positions-Zuweisung ohne Cash-Effekt.
                    </p>
                  </div>
                </label>
              )}

              {isEdit && (
                <p className="text-xs text-bank-text-muted bg-bank-bg border border-bank-border rounded-lg p-3">
                  Hinweis: Beim Bearbeiten einer Position wird das Kontoguthaben nicht automatisch angepasst.
                  Für Cash-Änderungen bitte manuell unter <strong>Kontoguthaben</strong> korrigieren.
                </p>
              )}

              <p className="text-[11px] text-bank-text-muted">
                Stückzahl <strong>0</strong> löscht die Position.
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={submitting}>Abbrechen</Button>
              <Button type="submit" className="flex-1 bg-bank-ink hover:bg-bank-ink-elev text-white" disabled={submitting}>
                {submitting ? 'Speichern...' : (isEdit ? 'Speichern' : 'Hinzufügen')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AdminUserPositions;

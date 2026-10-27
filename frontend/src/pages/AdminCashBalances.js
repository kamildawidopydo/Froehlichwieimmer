import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
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
  Search,
  RefreshCw,
  CreditCard,
  Plus,
  X,
  Save,
  History,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const TX_TYPES = [
  { value: 'deposit', label: 'Einzahlung', sign: 'positive' },
  { value: 'interest', label: 'Zinsgutschrift', sign: 'positive' },
  { value: 'payout', label: 'Auszahlung (Festgeld)', sign: 'positive' },
  { value: 'fee', label: 'Gebühr', sign: 'negative' },
  { value: 'adjustment', label: 'Korrektur', sign: 'any' },
];

const TX_META = {
  deposit: { label: 'Einzahlung', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  withdrawal: { label: 'Auszahlung', color: 'text-bank-error', bg: 'bg-bank-error/10' },
  interest: { label: 'Zinsgutschrift', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  payout: { label: 'Festgeld-Auszahlung', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  fee: { label: 'Gebühr', color: 'text-bank-error', bg: 'bg-bank-error/10' },
  adjustment: { label: 'Korrektur', color: 'text-amber-600', bg: 'bg-amber-100' },
};

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatEURSigned = (v) => {
  const n = Number(v || 0);
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return sign + n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
};

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    : '–';

const API = getApiBase();

// Session 82.90c — Cash-Balances vollständig auf FastAPI/Mongo-Ledger.
// Reads: /api/admin/users (mit cash_balance-Enrichment) und
// /api/admin/portfolio/cash/summary?user_id=X für Detail-Historie.
// Writes: /api/admin/portfolio/cash/{deposit,adjustment} — Ledger-basiert.

const AdminCashBalances = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [txModal, setTxModal] = useState(null);
  const [txForm, setTxForm] = useState({ amount: '', type: 'deposit', description: '' });
  const [saving, setSaving] = useState(false);

  const [historyModal, setHistoryModal] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/users?include_balances=true`, {
        withCredentials: true,
      });
      const list = (Array.isArray(data) ? data : data?.items || []).filter(
        (u) => (u.role || 'user') !== 'admin',
      );
      setUsers(list);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const openTxModal = (user, presetSign = null) => {
    setTxModal(user);
    setTxForm({
      amount: '',
      type: presetSign === 'withdrawal' ? 'withdrawal' : 'deposit',
      description: '',
    });
  };

  const closeTxModal = () => {
    setTxModal(null);
    setTxForm({ amount: '', type: 'deposit', description: '' });
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    if (!txModal) return;

    const raw = Number(txForm.amount);
    if (!raw || Number.isNaN(raw) || raw <= 0) {
      toast.error('Bitte einen gültigen positiven Betrag eingeben.');
      return;
    }

    const typeMeta = TX_TYPES.find((t) => t.value === txForm.type);
    let signedAmount = raw;
    if (typeMeta?.sign === 'negative') signedAmount = -raw;
    // 'any' (adjustment) — pozitif gir, istersen eksi ile yaz:
    if (typeMeta?.sign === 'any' && txForm.amount.startsWith('-')) {
      signedAmount = -Math.abs(raw);
    }

    setSaving(true);
    try {
      // Session 82.90c — Ledger-basiert: deposit für Einzahlungen/Zinsen,
      // adjustment für Withdrawal/Fee/Adjustment. Kein direkter Balance-Write.
      const endpoint = signedAmount >= 0 && txForm.type === 'deposit'
        ? '/api/admin/portfolio/cash/deposit'
        : '/api/admin/portfolio/cash/adjustment';
      const payload = {
        user_id: txModal.id,
        amount: String(Math.abs(signedAmount)),
        direction: signedAmount >= 0 ? 'credit' : 'debit',
        event_type: txForm.type,
        description: txForm.description.trim() || null,
      };
      await axios.post(`${API}${endpoint}`, payload, { withCredentials: true });
      toast.success('Buchung gespeichert.');
      closeTxModal();
      fetchUsers();
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (user) => {
    setHistoryModal(user);
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/api/admin/portfolio/cash/summary?user_id=${encodeURIComponent(user.id)}`,
        { withCredentials: true },
      );
      setHistoryRows(Array.isArray(data?.history) ? data.history : []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setHistoryLoading(false);
    }
    return;
  };
  const _unused_openHistory_legacy = async (user) => {
    setHistoryLoading(false);
    if (false) {
      return;
    }
    setHistoryRows([]);
  };

  const closeHistory = () => {
    setHistoryModal(null);
    setHistoryRows([]);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const hay = [u.first_name, u.last_name, u.email, u.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [users, searchTerm]);

  const totalBalance = useMemo(
    () => users.reduce((s, u) => s + Number(u.cash_balance || 0), 0),
    [users]
  );

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Zahlungsverkehr"
          title="Kontoguthaben"
          titleIcon={CreditCard}
          description="Kundengelder buchen — Einzahlungen, Auszahlungen, Gebühren und Korrekturen."
          actions={
            <Button variant="outline" onClick={fetchUsers} className="gap-2 rounded-xl">
              <RefreshCw size={15} /> Neu laden
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-bank-border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-bank-text-muted mb-1">Gesamtvolumen</p>
            <p className="text-2xl font-bold text-bank-text">{formatEUR(totalBalance)}</p>
          </div>
          <div className="bg-white border border-bank-border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-bank-text-muted mb-1">Benutzer</p>
            <p className="text-2xl font-bold text-bank-text">{users.length}</p>
          </div>
          <div className="bg-white border border-bank-border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-bank-text-muted mb-1">Durchschnitt</p>
            <p className="text-2xl font-bold text-bank-text">
              {users.length ? formatEUR(totalBalance / users.length) : formatEUR(0)}
            </p>
          </div>
        </div>

        <AdminToolbarCard>
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, E-Mail..."
              className="pl-9"
            />
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
              <CreditCard size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Benutzer gefunden.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Benutzer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">E-Mail</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">Kontoguthaben</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '–';
                  return (
                    <tr key={u.id} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">{fullName}</div>
                        <div className="text-xs text-bank-text-muted">{u.country || '–'}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{u.email || '–'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-bank-text">
                          {formatEUR(u.cash_balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openTxModal(u, 'deposit')}
                            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 transition-colors"
                            title="Gutschrift"
                          >
                            <Plus size={12} /> Einzahlung
                          </button>
                          <button
                            onClick={() => openHistory(u)}
                            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-white text-bank-text-muted border border-bank-border text-xs font-medium hover:bg-bank-bg transition-colors"
                            title="Verlauf anzeigen"
                          >
                            <History size={12} /> Verlauf
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
    </AdminSubpageLayout>

      {/* Tx Modal */}
      {txModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border">
              <div>
                <h2 className="text-lg font-semibold text-bank-text">Buchung erstellen</h2>
                <p className="text-xs text-bank-text-muted">
                  {`${txModal.first_name || ''} ${txModal.last_name || ''}`.trim()} · {txModal.email}
                </p>
              </div>
              <button onClick={closeTxModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Aktueller Saldo</label>
                <p className="text-2xl font-bold text-bank-text">{formatEUR(txModal.cash_balance)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Buchungsart</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                >
                  {TX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                  Betrag (EUR) <span className="text-bank-error">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={txForm.amount}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="z.B. 500.00"
                  required
                />
                {txForm.type === 'adjustment' && (
                  <p className="text-xs text-bank-text-muted mt-1">
                    Tipp: Für negative Korrektur den Betrag mit Minus (–) davor eingeben.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Beschreibung</label>
                <Input
                  value={txForm.description}
                  onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="z.B. Erstauszahlung Festgeld BR-2026-0001"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeTxModal} className="flex-1" disabled={saving}>
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-bank-ink hover:bg-bank-ink-elev text-white gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Buchen
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-bank-text">Buchungsverlauf</h2>
                <p className="text-xs text-bank-text-muted">
                  {`${historyModal.first_name || ''} ${historyModal.last_name || ''}`.trim()} · Saldo: {formatEUR(historyModal.cash_balance)}
                </p>
              </div>
              <button onClick={closeHistory} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="py-10 text-center">
                  <RefreshCw size={20} className="animate-spin text-bank-text-muted/70 mx-auto" />
                </div>
              ) : historyRows.length === 0 ? (
                <div className="py-10 text-center text-bank-text-muted/70 text-sm">
                  Keine Buchungen vorhanden.
                </div>
              ) : (
                <ul className="divide-y divide-bank-border/70">
                  {historyRows.map((r) => {
                    const meta = TX_META[r.type] || TX_META.adjustment;
                    const positive = Number(r.amount) >= 0;
                    const Icon = positive ? ArrowUpRight : ArrowDownRight;
                    return (
                      <li key={r.id} className="px-5 py-3 flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon size={16} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs text-bank-text-muted/70">·</span>
                            <span className="text-xs text-bank-text-muted">{formatDateTime(r.created_at)}</span>
                          </div>
                          {r.description && (
                            <p className="text-sm text-bank-text mt-0.5">{r.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-bank-error'}`}>
                            {formatEURSigned(r.amount)}
                          </p>
                          {r.balance_after != null && (
                            <p className="text-[11px] text-bank-text-muted">
                              Saldo: {formatEUR(r.balance_after)}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-6 py-3 border-t border-bank-border shrink-0 text-right">
              <Button variant="outline" onClick={closeHistory}>Schliessen</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCashBalances;

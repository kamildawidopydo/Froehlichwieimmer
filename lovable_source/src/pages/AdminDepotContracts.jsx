import React, { useEffect, useMemo, useState } from 'react';
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
  Wallet,
} from 'lucide-react';
import {
  applyDepotContractDates,
  formatISODateDE,
  TAGESGELD_DEFAULT_LAUFZEIT,
  toISODateLocal,
} from '@/lib/depotContractDates';

const PRODUCT_OPTIONS = [
  { value: 'festgeld', label: 'Festgeld' },
  { value: 'tagesgeld', label: 'Tagesgeld' },
  { value: 'flexgeld', label: 'Flexgeld' },
];

const PRODUCT_BADGE = {
  festgeld: 'bg-bank-primary/10 text-bank-primary border-bank-primary/20',
  tagesgeld: 'bg-bank-accent/15 text-bank-accent border-bank-accent/30',
  flexgeld: 'bg-violet-100 text-violet-700 border-violet-200',
};

const ZINS_AUSZAHLUNG_OPTIONS = [
  { value: 'endfaellig', label: 'Endfällig' },
  { value: 'jaehrlich', label: 'Jährlich' },
  { value: 'monatlich', label: 'Monatlich' },
];

const EARLY_WITHDRAWAL_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'percent_interest', label: '% der Zinsen' },
  { value: 'percent_principal', label: '% des Anlagebetrags' },
  { value: 'fixed_eur', label: 'Pauschal (EUR)' },
  { value: 'forfeit_accrued', label: 'Aufgelaufene Zinsen verfallen' },
];

const EMPTY_FORM = {
  user_id: '',
  bank_id: '',
  vertragsnummer: '',
  amount_eur: '',
  product_type: 'festgeld',
  is_active: true,
  active_from: '',
  active_until: '',
  zinssatz: '',
  laufzeit_monate: '',
  zins_auszahlung: 'endfaellig',
  notes: '',
  early_withdrawal_penalty_type: 'none',
  early_withdrawal_penalty_value: '',
  lock_until: '',
};

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatDate = formatISODateDE;

const withComputedDates = (formState) => applyDepotContractDates(formState);

const AdminDepotContracts = () => {
  const [users, setUsers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [filterUserId, setFilterUserId] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchBanks();
    fetchContracts();
  }, []);

  const fetchBanks = async () => {
    // Session 82.103c · FastAPI /api/admin/banks/list statt Supabase.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/banks/list`, { withCredentials: true });
      setBanks(data?.items || []);
    } catch (e) {
      toast.error('Fehler beim Laden der Banken: ' + (e?.response?.data?.detail || e.message));
    }
  };

  const fetchUsers = async () => {
    // Session 82.103c · Legacy `profiles`-Read deaktiviert (kein Admin-User-List-Endpoint gebunden).
    setUsers([]);
  };

  const fetchContracts = async () => {
    // Session 82.103c · FastAPI /api/admin/depot-contracts/list statt Supabase.
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/depot-contracts/list`, { withCredentials: true });
      setContracts(data?.items || []);
    } catch (e) {
      toast.error('Fehler beim Laden der Verträge: ' + (e?.response?.data?.detail || e.message));
    }
    setLoading(false);
  };

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.id] = u;
    });
    return m;
  }, [users]);

  const userLabel = (u) => {
    if (!u) return '–';
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name ? `${name} (${u.email || '–'})` : u.email || u.id;
  };

  useEffect(() => {
    if (!showModal) return;
    setForm((prev) => {
      const next = withComputedDates(prev);
      if (
        next.active_from === prev.active_from &&
        next.active_until === prev.active_until &&
        next.lock_until === prev.lock_until
      ) {
        return prev;
      }
      return next;
    });
  }, [showModal, form.product_type, form.active_from, form.laufzeit_monate]);

  const openAdd = () => {
    setEditingId(null);
    setForm(
      withComputedDates({
        ...EMPTY_FORM,
        active_from: toISODateLocal(),
      }),
    );
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      user_id: c.user_id || '',
      bank_id: c.bank_id || '',
      vertragsnummer: c.vertragsnummer || '',
      amount_eur: c.amount_eur != null ? String(c.amount_eur) : '',
      product_type: c.product_type || 'festgeld',
      is_active: c.is_active ?? true,
      active_from: c.active_from || '',
      active_until: c.active_until || '',
      zinssatz: c.zinssatz != null ? String(c.zinssatz) : '',
      laufzeit_monate: c.laufzeit_monate != null ? String(c.laufzeit_monate) : '',
      zins_auszahlung: c.zins_auszahlung || 'endfaellig',
      notes: c.notes || '',
      early_withdrawal_penalty_type: c.early_withdrawal_penalty_type || 'none',
      early_withdrawal_penalty_value:
        c.early_withdrawal_penalty_value != null
          ? String(c.early_withdrawal_penalty_value)
          : '',
      lock_until: c.lock_until || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleProductTypeChange = (productType) => {
    setForm((prev) => {
      const next = { ...prev, product_type: productType };
      if (productType === 'tagesgeld' && !prev.laufzeit_monate) {
        next.laufzeit_monate = String(TAGESGELD_DEFAULT_LAUFZEIT);
      }
      if (!next.active_from) {
        next.active_from = toISODateLocal();
      }
      return withComputedDates(next);
    });
  };

  const setField = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'active_from' || key === 'laufzeit_monate') {
        return withComputedDates(next);
      }
      return next;
    });
  };

  const validate = () => {
    if (!form.user_id) return 'Bitte einen Benutzer auswählen.';
    if (!form.amount_eur || Number(form.amount_eur) < 0) return 'Bitte gültigen Betrag eingeben.';
    if (!form.product_type) return 'Bitte Produkttyp wählen.';
    if (form.product_type === 'festgeld') {
      if (!form.laufzeit_monate || Number(form.laufzeit_monate) <= 0)
        return 'Festgeld benötigt eine Laufzeit in Monaten.';
      if (!form.zinssatz) return 'Festgeld benötigt einen Zinssatz.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);

    const payload = {
      user_id: form.user_id,
      bank_id: form.bank_id || null,
      vertragsnummer: form.vertragsnummer.trim() || null,
      amount_eur: Number(form.amount_eur),
      product_type: form.product_type,
      is_active: !!form.is_active,
      active_from: form.active_from || null,
      active_until: form.active_until || null,
      zinssatz: form.zinssatz === '' ? null : Number(form.zinssatz),
      laufzeit_monate: form.laufzeit_monate === '' ? null : Number(form.laufzeit_monate),
      zins_auszahlung: form.zins_auszahlung || 'endfaellig',
      notes: form.notes.trim() || null,
      early_withdrawal_penalty_type: form.early_withdrawal_penalty_type || 'none',
      early_withdrawal_penalty_value:
        form.early_withdrawal_penalty_value === ''
          ? 0
          : Number(form.early_withdrawal_penalty_value),
      lock_until: form.lock_until || null,
    };

    // Session 82.103c · Alle Depot-Contract-Writes deaktiviert (kein FastAPI-Endpoint).
    let error = { message: 'legacy_write_disabled_82_103c' };
    toast.info('Legacy-Mutation deaktiviert (Session 82.103c). Kein FastAPI-Endpoint verfügbar.');

    setSaving(false);

    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success(editingId ? 'Vertrag aktualisiert' : 'Vertrag erstellt');
    closeModal();
    fetchContracts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Diesen Vertrag wirklich löschen?')) return;
    toast.info('Legacy-Mutation deaktiviert (Session 82.91b · BLOCKED_SEMANTICS). Neuer FastAPI-Endpoint noch nicht freigeschaltet.');
  };

  const toggleActive = async () => {
    // Session 82.103c · Toggle-Mutation deaktiviert (kein FastAPI-Endpoint).
    toast.info('Legacy-Mutation deaktiviert (Session 82.103c). Kein FastAPI-Toggle-Endpoint verfügbar.');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contracts.filter((c) => {
      if (filterUserId !== 'all' && c.user_id !== filterUserId) return false;
      if (filterProduct !== 'all' && c.product_type !== filterProduct) return false;
      if (filterStatus === 'active' && !c.is_active) return false;
      if (filterStatus === 'inactive' && c.is_active) return false;
      if (term) {
        const u = userMap[c.user_id];
        const hay = [
          c.vertragsnummer,
          u?.first_name,
          u?.last_name,
          u?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [contracts, filterUserId, filterProduct, filterStatus, searchTerm, userMap]);

  return (
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Portfolio"
          title="Depotverträge"
          titleIcon={Wallet}
          description="Festgeld, Tagesgeld und Flexgeld — Zuordnung zu Benutzern und Banken."
          actions={
            <Button onClick={openAdd} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl">
              <Plus size={16} /> Neuer Vertrag
            </Button>
          }
        />

        <AdminToolbarCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Vertragsnr., Name, E-Mail..."
              className="pl-9"
            />
          </div>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
          >
            <option value="all">Alle Benutzer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
          >
            <option value="all">Alle Produkte</option>
            {PRODUCT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm flex-1"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
            <Button variant="outline" onClick={fetchContracts} className="gap-2 rounded-xl">
              <RefreshCw size={15} />
            </Button>
          </div>
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
              <Wallet size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Verträge gefunden.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Benutzer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Bank</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Vertragsnr.</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Produkt</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Betrag</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Zins</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Laufzeit</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktiv ab</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktiv bis</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const u = userMap[c.user_id];
                  return (
                    <tr key={c.id} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">
                          {u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || '–' : '–'}
                        </div>
                        <div className="text-xs text-bank-text-muted">{u?.email || c.user_id}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {c.banks?.name || '–'}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {c.vertragsnummer || '–'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${PRODUCT_BADGE[c.product_type] || ''
                            }`}
                        >
                          {PRODUCT_OPTIONS.find((p) => p.value === c.product_type)?.label || c.product_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-bank-text">
                        {formatEUR(c.amount_eur)}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {c.zinssatz != null ? `${Number(c.zinssatz).toLocaleString('de-DE')} %` : '–'}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {c.laufzeit_monate != null ? `${c.laufzeit_monate} M` : '–'}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{formatDate(c.active_from)}</td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{formatDate(c.active_until)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${c.is_active
                              ? 'bg-bank-success/10 text-bank-success border-bank-success/25 hover:bg-bank-success/15'
                              : 'bg-bank-border/20 text-bank-text-muted border-bank-border hover:bg-bank-border/30'
                            }`}
                          title="Status umschalten"
                        >
                          {c.is_active ? <CheckCircle size={12} /> : <PauseCircle size={12} />}
                          {c.is_active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-bank-accent hover:bg-bank-accent/10 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-bank-error hover:bg-bank-error/10 rounded transition-colors"
                            title="Löschen"
                          >
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

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {editingId ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-bank-border/15 rounded-lg transition-colors"
              >
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                  Benutzer <span className="text-bank-error">*</span>
                </label>
                <select
                  value={form.user_id}
                  onChange={setField('user_id')}
                  required
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                >
                  <option value="">Benutzer auswählen...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                  Produkttyp <span className="text-bank-error">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCT_OPTIONS.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => handleProductTypeChange(p.value)}
                      className={`h-10 rounded-md border text-sm font-medium transition-colors ${form.product_type === p.value
                          ? 'bg-bank-ink text-white border-bank-ink'
                          : 'bg-white text-bank-text border-bank-border hover:bg-bank-bg'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Bank</label>
                  <select
                    value={form.bank_id}
                    onChange={setField('bank_id')}
                    className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  >
                    <option value="">— Keine Bank —</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.country ? ` (${b.country})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Vertragsnummer
                  </label>
                  <Input
                    value={form.vertragsnummer}
                    onChange={setField('vertragsnummer')}
                    placeholder="z.B. BR-2026-0001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Betrag (EUR) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_eur}
                    onChange={setField('amount_eur')}
                    placeholder="z.B. 10000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Zins-Auszahlung
                  </label>
                  <select
                    value={form.zins_auszahlung}
                    onChange={setField('zins_auszahlung')}
                    className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  >
                    {ZINS_AUSZAHLUNG_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Zinssatz (%)
                    {form.product_type === 'festgeld' && <span className="text-bank-error"> *</span>}
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.zinssatz}
                    onChange={setField('zinssatz')}
                    placeholder="z.B. 3.45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Laufzeit (Monate)
                    {form.product_type === 'festgeld' && <span className="text-bank-error"> *</span>}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.laufzeit_monate}
                    onChange={setField('laufzeit_monate')}
                    placeholder={
                      form.product_type === 'flexgeld'
                        ? 'z.B. 12 (erste 3 Monate Lock)'
                        : form.product_type === 'tagesgeld'
                          ? `z.B. ${TAGESGELD_DEFAULT_LAUFZEIT} (Promo)`
                          : 'z.B. 12'
                    }
                  />
                  {form.product_type === 'tagesgeld' && (
                    <p className="text-[11px] text-bank-text-muted mt-1">
                      Leer = {TAGESGELD_DEFAULT_LAUFZEIT} Monate Promo. „Aktiv bis“ wird automatisch berechnet.
                    </p>
                  )}
                  {form.product_type === 'flexgeld' && (
                    <p className="text-[11px] text-bank-text-muted mt-1">
                      Die ersten 3 Monate gelten als Festbindung (Lock), danach flexibel bis Laufzeitende.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Aktiv ab</label>
                  <Input
                    type="date"
                    value={form.active_from}
                    onChange={setField('active_from')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Aktiv bis</label>
                  <div
                    className="flex h-9 w-full items-center rounded-md border border-input bg-bank-bg/80 px-3 text-sm font-medium text-bank-text"
                    aria-live="polite"
                  >
                    {formatDate(form.active_until)}
                  </div>
                  <p className="text-[11px] text-bank-text-muted mt-1">Automatisch berechnet</p>
                </div>
              </div>

              {form.product_type === 'festgeld' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                      Vorzeitige Kündigung
                    </label>
                    <select
                      value={form.early_withdrawal_penalty_type}
                      onChange={setField('early_withdrawal_penalty_type')}
                      className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                    >
                      {EARLY_WITHDRAWAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                      Strafwert
                      {form.early_withdrawal_penalty_type === 'fixed_eur'
                        ? ' (EUR)'
                        : form.early_withdrawal_penalty_type?.startsWith('percent_')
                          ? ' (%)'
                          : ''}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.early_withdrawal_penalty_value}
                      onChange={setField('early_withdrawal_penalty_value')}
                      disabled={
                        form.early_withdrawal_penalty_type === 'none' ||
                        form.early_withdrawal_penalty_type === 'forfeit_accrued'
                      }
                    />
                  </div>
                </div>
              )}

              {form.product_type === 'flexgeld' && (
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Festbindung bis (Lock)
                  </label>
                  <div
                    className="flex h-9 w-full items-center rounded-md border border-input bg-bank-bg/80 px-3 text-sm font-medium text-bank-text"
                    aria-live="polite"
                  >
                    {formatDate(form.lock_until)}
                  </div>
                  <p className="text-[11px] text-bank-text-muted mt-1">
                    Automatisch: erste 3 Monate der Laufzeit sind gesperrt.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                  Notizen (intern)
                </label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary resize-none"
                  placeholder="Optionaler Vermerk"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-bank-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={setField('is_active')}
                  className="w-4 h-4 accent-bank-primary"
                />
                Vertrag ist aktiv
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
    </AdminSubpageLayout>
  );
};

export default AdminDepotContracts;

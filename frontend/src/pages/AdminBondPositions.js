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
  FileBarChart2,
} from 'lucide-react';

const FREQUENZ_OPTIONS = [
  { value: 'yearly', label: 'Jährlich' },
  { value: 'semi', label: 'Halbjährlich' },
  { value: 'quarterly', label: 'Quartal' },
  { value: 'monthly', label: 'Monatlich' },
];

const EMPTY_FORM = {
  user_id: '',
  bond_name: '',
  isin: '',
  issuer: '',
  nominal_betrag: '',
  kupon_rate: '',
  zins_frequenz: 'yearly',
  kaufdatum: '',
  kaufkurs: '100',
  aktueller_kurs: '100',
  faelligkeitsdatum: '',
  is_active: true,
  notes: '',
};

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatPct = (v, digits = 2) =>
  v == null || v === '' ? '–' : `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

const AdminBondPositions = () => {
  const [users, setUsers] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [stockTemplates, setStockTemplates] = useState([]);
  const [catalogTemplates, setCatalogTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [templateSource, setTemplateSource] = useState('stocks');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [filterUserId, setFilterUserId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchBonds();
    fetchTemplates();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .neq('role', 'admin')
      .order('first_name', { ascending: true });
    if (error) {
      toast.error('Fehler beim Laden der Benutzer: ' + error.message);
      return;
    }
    setUsers(data || []);
  };

  const fetchBonds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_bond_positions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Fehler beim Laden: ' + error.message);
      setLoading(false);
      return;
    }
    setBonds(data || []);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const [{ data: stocks }, { data: catalog }] = await Promise.all([
      supabase
        .from('stocks')
        .select('id, symbol, name, sector')
        .eq('is_active', true)
        .order('symbol', { ascending: true }),
      supabase
        .from('bond_catalog')
        .select(
          'id, isin, bond_name, issuer, kupon_rate, kaufkurs, aktueller_kurs, faelligkeitsdatum, min_order_eur',
        )
        .order('bond_name', { ascending: true }),
    ]);
    setStockTemplates(stocks || []);
    setCatalogTemplates(catalog || []);
  };

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const userLabel = (u) => {
    if (!u) return '–';
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name ? `${name} (${u.email || '–'})` : u.email || u.id;
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTemplateSource('stocks');
    setSelectedTemplate('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setForm({
      user_id: b.user_id || '',
      bond_name: b.bond_name || '',
      isin: b.isin || '',
      issuer: b.issuer || '',
      nominal_betrag: b.nominal_betrag != null ? String(b.nominal_betrag) : '',
      kupon_rate: b.kupon_rate != null ? String(b.kupon_rate) : '',
      zins_frequenz: b.zins_frequenz || 'yearly',
      kaufdatum: b.kaufdatum || '',
      kaufkurs: b.kaufkurs != null ? String(b.kaufkurs) : '100',
      aktueller_kurs: b.aktueller_kurs != null ? String(b.aktueller_kurs) : '100',
      faelligkeitsdatum: b.faelligkeitsdatum || '',
      is_active: b.is_active ?? true,
      notes: b.notes || '',
    });
    setTemplateSource('catalog');
    setSelectedTemplate('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTemplateSource('stocks');
    setSelectedTemplate('');
  };

  const applyTemplate = (source, value) => {
    if (!value) return;
    if (source === 'stocks') {
      const stock = stockTemplates.find((s) => s.id === value);
      if (!stock) return;
      setForm((prev) => ({
        ...prev,
        bond_name: stock.name ? `${stock.name} Bond` : prev.bond_name,
        isin: stock.symbol || prev.isin,
        issuer: stock.name || stock.sector || prev.issuer,
        kupon_rate: prev.kupon_rate || '',
        nominal_betrag: prev.nominal_betrag || '1000',
      }));
      return;
    }
    const catalog = catalogTemplates.find((c) => c.id === value);
    if (!catalog) return;
    setForm((prev) => ({
      ...prev,
      bond_name: catalog.bond_name || '',
      isin: catalog.isin || '',
      issuer: catalog.issuer || '',
      nominal_betrag:
        prev.nominal_betrag || (catalog.min_order_eur != null ? String(catalog.min_order_eur) : '1000'),
      kupon_rate: catalog.kupon_rate != null ? String(catalog.kupon_rate) : '',
      kaufkurs: catalog.kaufkurs != null ? String(catalog.kaufkurs) : '100',
      aktueller_kurs: catalog.aktueller_kurs != null ? String(catalog.aktueller_kurs) : '100',
      faelligkeitsdatum: catalog.faelligkeitsdatum || '',
    }));
  };

  const setField = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.user_id) return 'Bitte einen Benutzer auswählen.';
    if (!form.bond_name.trim()) return 'Bond-Name erforderlich.';
    if (!form.nominal_betrag || Number(form.nominal_betrag) <= 0) return 'Nominalbetrag erforderlich.';
    if (!form.kupon_rate || Number(form.kupon_rate) < 0) return 'Kupon-Satz erforderlich.';
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
      bond_name: form.bond_name.trim(),
      isin: form.isin.trim() || null,
      issuer: form.issuer.trim() || null,
      nominal_betrag: Number(form.nominal_betrag),
      kupon_rate: Number(form.kupon_rate),
      zins_frequenz: form.zins_frequenz || 'yearly',
      kaufdatum: form.kaufdatum || null,
      kaufkurs: form.kaufkurs === '' ? null : Number(form.kaufkurs),
      aktueller_kurs: form.aktueller_kurs === '' ? null : Number(form.aktueller_kurs),
      faelligkeitsdatum: form.faelligkeitsdatum || null,
      is_active: !!form.is_active,
      notes: form.notes.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('user_bond_positions').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('user_bond_positions').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success(editingId ? 'Anleihe aktualisiert' : 'Anleihe erstellt');
    closeModal();
    fetchBonds();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Diese Anleihe wirklich löschen?')) return;
    const { error } = await supabase.from('user_bond_positions').delete().eq('id', id);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Anleihe gelöscht');
    fetchBonds();
  };

  const toggleActive = async (b) => {
    const { error } = await supabase
      .from('user_bond_positions')
      .update({ is_active: !b.is_active })
      .eq('id', b.id);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    fetchBonds();
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bonds.filter((b) => {
      if (filterUserId !== 'all' && b.user_id !== filterUserId) return false;
      if (filterStatus === 'active' && !b.is_active) return false;
      if (filterStatus === 'inactive' && b.is_active) return false;
      if (term) {
        const u = userMap[b.user_id];
        const hay = [b.bond_name, b.isin, b.issuer, u?.first_name, u?.last_name, u?.email]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [bonds, filterUserId, filterStatus, searchTerm, userMap]);

  const computeMetrics = (b) => {
    const nominal = Number(b.nominal_betrag || 0);
    const kauf = Number(b.kaufkurs || 0);
    const current = Number(b.aktueller_kurs || 0);
    const einstand = nominal * kauf / 100;
    const marktwert = nominal * current / 100;
    const kursgv = marktwert - einstand;
    const rendite = einstand > 0 ? (kursgv / einstand) * 100 : 0;
    return { einstand, marktwert, kursgv, rendite };
  };

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Renten"
          title="Anleihen"
          titleIcon={FileBarChart2}
          description="Bond-Positionen der Benutzer — Kupon, Kurs und Fälligkeit."
          actions={
            <Button onClick={openAdd} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl">
              <Plus size={16} /> Neue Anleihe
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
              placeholder="Name, ISIN, Emittent, Benutzer..."
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
              <option key={u.id} value={u.id}>{userLabel(u)}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <Button variant="outline" onClick={fetchBonds} className="gap-2 rounded-xl">
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
              <FileBarChart2 size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Anleihen gefunden.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Benutzer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Anleihe</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Nominal</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Kupon</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Kaufkurs</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Akt. Kurs</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">G/V</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Fälligkeit</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const u = userMap[b.user_id];
                  const m = computeMetrics(b);
                  const gvPositive = m.kursgv >= 0;
                  return (
                    <tr key={b.id} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">
                          {u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || '–' : '–'}
                        </div>
                        <div className="text-xs text-bank-text-muted">{u?.email || b.user_id}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">{b.bond_name}</div>
                        {(b.isin || b.issuer) && (
                          <div className="text-xs text-bank-text-muted">
                            {b.isin || ''}
                            {b.isin && b.issuer ? ' · ' : ''}
                            {b.issuer || ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-bank-text">
                        {formatEUR(b.nominal_betrag)}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {formatPct(b.kupon_rate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {formatPct(b.kaufkurs)}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {formatPct(b.aktueller_kurs)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`font-semibold ${gvPositive ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {gvPositive ? '+' : ''}{m.kursgv.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <div className="text-xs text-bank-text-muted">
                          {gvPositive ? '+' : ''}{m.rendite.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {formatDate(b.faelligkeitsdatum)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActive(b)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${b.is_active
                              ? 'bg-bank-success/10 text-bank-success border-bank-success/25 hover:bg-bank-success/15'
                              : 'bg-bank-border/20 text-bank-text-muted border-bank-border hover:bg-bank-border/30'
                            }`}
                          title="Status umschalten"
                        >
                          {b.is_active ? <CheckCircle size={12} /> : <PauseCircle size={12} />}
                          {b.is_active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 text-bank-accent hover:bg-bank-accent/10 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
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
    </AdminSubpageLayout>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {editingId ? 'Anleihe bearbeiten' : 'Neue Anleihe'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              {!editingId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-bank-border bg-bank-bg/50 p-3">
                  <div>
                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                      Vorlage-Quelle
                    </label>
                    <select
                      value={templateSource}
                      onChange={(e) => {
                        setTemplateSource(e.target.value);
                        setSelectedTemplate('');
                      }}
                      className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                    >
                      <option value="stocks">Markt-Liste (stocks)</option>
                      <option value="catalog">Anleihen-Katalog</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                      Vorlage übernehmen
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        applyTemplate(templateSource, e.target.value);
                      }}
                      className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                    >
                      <option value="">Vorlage auswählen...</option>
                      {templateSource === 'stocks'
                        ? stockTemplates.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.symbol} - {s.name}
                            </option>
                          ))
                        : catalogTemplates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.bond_name || c.isin || 'Ohne Name'}
                              {c.isin ? ` (ISIN ${c.isin})` : ''}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              )}

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
                    <option key={u.id} value={u.id}>{userLabel(u)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Bond-Name <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    value={form.bond_name}
                    onChange={setField('bond_name')}
                    placeholder="z.B. Photon Energy 6,5% 2027"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">ISIN</label>
                  <Input value={form.isin} onChange={setField('isin')} placeholder="z.B. XS2410997177" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Emittent</label>
                  <Input value={form.issuer} onChange={setField('issuer')} placeholder="z.B. Photon Energy" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Nominalbetrag (EUR) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={form.nominal_betrag} onChange={setField('nominal_betrag')}
                    placeholder="z.B. 10000" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Kupon (% p.a.) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number" step="0.0001" min="0"
                    value={form.kupon_rate} onChange={setField('kupon_rate')}
                    placeholder="z.B. 6.5" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Kupon-Frequenz</label>
                  <select
                    value={form.zins_frequenz}
                    onChange={setField('zins_frequenz')}
                    className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  >
                    {FREQUENZ_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Kaufdatum</label>
                  <Input type="date" value={form.kaufdatum} onChange={setField('kaufdatum')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Kaufkurs (%)</label>
                  <Input
                    type="number" step="0.0001" min="0"
                    value={form.kaufkurs} onChange={setField('kaufkurs')}
                    placeholder="z.B. 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Aktueller Kurs (%)</label>
                  <Input
                    type="number" step="0.0001" min="0"
                    value={form.aktueller_kurs} onChange={setField('aktueller_kurs')}
                    placeholder="z.B. 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">Fälligkeitsdatum</label>
                  <Input type="date" value={form.faelligkeitsdatum} onChange={setField('faelligkeitsdatum')} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Notizen (intern)</label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-bank-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={setField('is_active')}
                  className="w-4 h-4 accent-bank-primary"
                />
                Anleihe ist aktiv
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

export default AdminBondPositions;

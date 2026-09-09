import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Session 82.100 — Supabase-CRUD durch FastAPI-Admin-Endpoints ersetzt (dynamic axios import).
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
  RefreshCw,
  Search,
  Plus,
  Pencil,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
  ListChecks,
} from 'lucide-react';

const EMPTY_FORM = {
  bank_id: '',
  purpose: 'Freie Verwendung',
  min_amount_eur: '1000',
  max_amount_eur: '100000',
  min_term_months: '12',
  max_term_months: '120',
  default_term_months: '84',
  effective_rate_from: '',
  nominal_rate_from: '',
  monthly_rate_from: '',
  payout_days_min: '',
  payout_days_max: '',
  rating_value: '',
  rating_count: '',
  note_small: '',
  featuresText: '',
  sort_priority: '100',
  is_active: true,
};

const AdminCreditOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchBanks = async () => {
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/banks/list`, { withCredentials: true });
      setBanks(data?.items || []);
    } catch { toast.error('Banken konnten nicht geladen werden.'); }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/credit-offers`, { withCredentials: true });
      setOffers(data?.items || []);
    } catch { toast.error('Kredit-Angebote konnten nicht geladen werden.'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
    fetchOffers();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setEditingOffer(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setModalMode('edit');
    setEditingOffer(offer);
    setFormData({
      bank_id: offer.bank_id || '',
      purpose: offer.purpose || 'Freie Verwendung',
      min_amount_eur: String(offer.min_amount_eur ?? ''),
      max_amount_eur: String(offer.max_amount_eur ?? ''),
      min_term_months: String(offer.min_term_months ?? ''),
      max_term_months: String(offer.max_term_months ?? ''),
      default_term_months: String(offer.default_term_months ?? ''),
      effective_rate_from: String(offer.effective_rate_from ?? ''),
      nominal_rate_from: String(offer.nominal_rate_from ?? ''),
      monthly_rate_from: String(offer.monthly_rate_from ?? ''),
      payout_days_min: String(offer.payout_days_min ?? ''),
      payout_days_max: String(offer.payout_days_max ?? ''),
      rating_value: String(offer.rating_value ?? ''),
      rating_count: String(offer.rating_count ?? ''),
      note_small: offer.note_small || '',
      featuresText: (offer.features || []).join('\n'),
      sort_priority: String(offer.sort_priority ?? 100),
      is_active: offer.is_active ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOffer(null);
    setFormData(EMPTY_FORM);
  };

  const parseOptionalNumber = (value, parser = parseFloat) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const parsed = parser(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSave = async () => {
    if (!formData.bank_id || !formData.effective_rate_from) {
      toast.error('Bank und Effektivzins sind Pflichtfelder.');
      return;
    }
    setSaving(true);

    const payload = {
      bank_id: formData.bank_id,
      purpose: formData.purpose || 'Freie Verwendung',
      min_amount_eur: Number(formData.min_amount_eur || 0),
      max_amount_eur: Number(formData.max_amount_eur || 0),
      min_term_months: Number(formData.min_term_months || 0),
      max_term_months: Number(formData.max_term_months || 0),
      default_term_months: Number(formData.default_term_months || 0),
      effective_rate_from: Number(formData.effective_rate_from),
      nominal_rate_from: parseOptionalNumber(formData.nominal_rate_from),
      monthly_rate_from: parseOptionalNumber(formData.monthly_rate_from),
      payout_days_min: parseOptionalNumber(formData.payout_days_min, parseInt),
      payout_days_max: parseOptionalNumber(formData.payout_days_max, parseInt),
      rating_value: parseOptionalNumber(formData.rating_value),
      rating_count: parseOptionalNumber(formData.rating_count, parseInt),
      note_small: formData.note_small.trim() || null,
      features: (formData.featuresText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      sort_priority: Number(formData.sort_priority || 100),
      is_active: !!formData.is_active,
    };

    let error;
    if (modalMode === 'add') {
      try { const _axios = (await import('axios')).default; const _api = (await import('@/lib/apiBase')).getApiBase(); await _axios.post(`${_api}/api/admin/credit-offers`, payload, { withCredentials: true }); error = null; } catch (e) { error = { message: e?.response?.data?.detail || e.message }; }
    } else {
      try { const _axios = (await import('axios')).default; const _api = (await import('@/lib/apiBase')).getApiBase(); await _axios.patch(`${_api}/api/admin/credit-offers/${editingOffer.id}`, payload, { withCredentials: true }); error = null; } catch (e) { error = { message: e?.response?.data?.detail || e.message }; }
    }

    if (error) {
      toast.error(`Fehler: ${error.message}`);
    } else {
      toast.success(modalMode === 'add' ? 'Kredit-Angebot erstellt.' : 'Kredit-Angebot aktualisiert.');
      await fetchOffers();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Angebot von "${offer.banks?.name || 'Unbekannt'}" wirklich löschen?`)) return;
    let error = null;
    try { const _axios = (await import('axios')).default; const _api = (await import('@/lib/apiBase')).getApiBase(); await _axios.delete(`${_api}/api/admin/credit-offers/${offer.id}`, { withCredentials: true }); } catch (e) { error = { message: e?.response?.data?.detail || e.message }; }
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      return;
    }
    toast.success('Kredit-Angebot gelöscht.');
    await fetchOffers();
  };

  const handleToggleActive = async (offer) => {
    // Session 82.103c · FastAPI-PATCH statt Supabase.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.patch(
        `${_api}/api/admin/credit-offers/${offer.id}`,
        { is_active: !offer.is_active },
        { withCredentials: true },
      );
      await fetchOffers();
    } catch (e) {
      toast.error(`Fehler: ${e?.response?.data?.detail || e.message}`);
    }
  };

  const filteredOffers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((offer) =>
      [offer.banks?.name, offer.banks?.country, offer.purpose]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [offers, searchTerm]);

  return (
    <>
      <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Kredit"
          title="Kredit-Angebote"
          titleIcon={FileSpreadsheet}
          description={`${offers.length} Angebote fuer den Fröhlich Vermögensberatung Kreditvergleich.`}
          actions={
            <Button
              onClick={() => navigate('/admin/credit-bank-details')}
              variant="outline"
              className="rounded-xl"
            >
              <ListChecks size={16} className="mr-2" />
              Bankdetails bearbeiten
            </Button>
          }
        />

        <AdminToolbarCard>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nach Bank, Land oder Zweck suchen..."
                className="pl-9"
              />
            </div>
            <Button onClick={fetchOffers} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw size={16} />
              Aktualisieren
            </Button>
            <Button onClick={openAddModal} className="gap-2 rounded-xl bg-bank-ink hover:bg-bank-ink-elev text-white">
              <Plus size={16} />
              Angebot hinzufuegen
            </Button>
          </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-16 text-center text-bank-text-muted">Lade Kredit-Angebote...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Konditionen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Rate / Monat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border/60">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center text-bank-text-muted">
                        Keine Kredit-Angebote gefunden.
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer) => (
                      <tr key={offer.id} className={adminRowHover}>
                        <td className="px-4 py-4">
                          <p className="font-medium text-bank-text">{offer.banks?.name || 'Unbekannt'}</p>
                          <p className="text-xs text-bank-text-muted">{offer.banks?.country || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-bank-text-muted">
                          <p>ab {offer.effective_rate_from}% eff.</p>
                          <p>{offer.min_term_months} - {offer.max_term_months} Monate</p>
                          <p>{Number(offer.min_amount_eur).toLocaleString('de-DE')} - {Number(offer.max_amount_eur).toLocaleString('de-DE')} EUR</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-bank-text-muted">
                          {offer.monthly_rate_from ? `ab ${Number(offer.monthly_rate_from).toLocaleString('de-DE')} EUR` : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleToggleActive(offer)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                              offer.is_active
                                ? 'border-bank-success/25 bg-bank-success/10 text-bank-success'
                                : 'border-bank-border bg-bank-border/15 text-bank-text-muted'
                            }`}
                          >
                            {offer.is_active ? (
                              <>
                                <ToggleRight size={12} />
                                Aktiv
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={12} />
                                Inaktiv
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/credit-bank-details?offer=${offer.id}`)}
                            >
                              Details
                            </Button>
                            <button
                              onClick={() => openEditModal(offer)}
                              className="rounded-md p-1.5 text-bank-text-muted transition-colors hover:bg-bank-border/15"
                              title="Bearbeiten"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(offer)}
                              className="rounded-md p-1.5 text-bank-text-muted/70 transition-colors hover:bg-bank-error/10 hover:text-bank-error"
                              title="Loeschen"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceCard>
      </AdminSubpageLayout>

      {showModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50">
          <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
              <h2 className="text-lg font-semibold text-bank-text">
                {modalMode === 'add' ? 'Neues Kredit-Angebot' : 'Kredit-Angebot bearbeiten'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 hover:bg-bank-border/15">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Bank *</label>
                  <select
                    value={formData.bank_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bank_id: e.target.value }))}
                    className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  >
                    <option value="">Bank auswaehlen...</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} ({bank.country}) {bank.is_active ? '' : '[inaktiv]'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Zweck</label>
                  <Input
                    value={formData.purpose}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Freie Verwendung"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Min. Betrag (EUR)</label>
                  <Input
                    type="number"
                    value={formData.min_amount_eur}
                    onChange={(e) => setFormData((prev) => ({ ...prev, min_amount_eur: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Max. Betrag (EUR)</label>
                  <Input
                    type="number"
                    value={formData.max_amount_eur}
                    onChange={(e) => setFormData((prev) => ({ ...prev, max_amount_eur: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Default Laufzeit</label>
                  <Input
                    type="number"
                    value={formData.default_term_months}
                    onChange={(e) => setFormData((prev) => ({ ...prev, default_term_months: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Min. Laufzeit</label>
                  <Input
                    type="number"
                    value={formData.min_term_months}
                    onChange={(e) => setFormData((prev) => ({ ...prev, min_term_months: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Max. Laufzeit</label>
                  <Input
                    type="number"
                    value={formData.max_term_months}
                    onChange={(e) => setFormData((prev) => ({ ...prev, max_term_months: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Sortierung</label>
                  <Input
                    type="number"
                    value={formData.sort_priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_priority: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Effektivzins ab (%) *</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.effective_rate_from}
                    onChange={(e) => setFormData((prev) => ({ ...prev, effective_rate_from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Sollzins ab (%)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.nominal_rate_from}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nominal_rate_from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Monatsrate ab (EUR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_rate_from}
                    onChange={(e) => setFormData((prev) => ({ ...prev, monthly_rate_from: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Auszahlungstage min</label>
                  <Input
                    type="number"
                    value={formData.payout_days_min}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payout_days_min: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Auszahlungstage max</label>
                  <Input
                    type="number"
                    value={formData.payout_days_max}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payout_days_max: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Rating (z.B. 4.5)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.rating_value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rating_value: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Features (je Zeile ein Punkt)</label>
                  <textarea
                    rows={4}
                    value={formData.featuresText}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featuresText: e.target.value }))}
                    className="w-full rounded-md border border-bank-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                    placeholder="kostenlose Sondertilgung&#10;kostenlose Gesamttilgung&#10;Auszahlung in 1 bis 2 Tagen"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-medium text-bank-text-muted">Hinweiszeile unter Karte</label>
                  <textarea
                    rows={2}
                    value={formData.note_small}
                    onChange={(e) => setFormData((prev) => ({ ...prev, note_small: e.target.value }))}
                    className="w-full rounded-md border border-bank-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                    placeholder="2/3 aller angenommenen Kunden erhalten ..."
                  />
                </div>

                <div className="md:col-span-3 flex items-center justify-between rounded-lg border border-bank-border bg-bank-bg p-3">
                  <div>
                    <p className="text-sm font-medium text-bank-text">Angebot aktiv</p>
                    <p className="text-xs text-bank-text-muted">Nur aktive Angebote erscheinen im Vergleich.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span className={`h-6 w-11 rounded-full ${formData.is_active ? 'bg-bank-primary' : 'bg-bank-border'} relative`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${formData.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-bank-border px-6 py-4">
              <Button variant="outline" onClick={closeModal}>Abbrechen</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.bank_id || !formData.effective_rate_from}
                className="bg-bank-ink text-white hover:bg-bank-ink-elev"
              >
                {saving ? 'Wird gespeichert...' : modalMode === 'add' ? 'Angebot erstellen' : 'Aenderungen speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCreditOffers;

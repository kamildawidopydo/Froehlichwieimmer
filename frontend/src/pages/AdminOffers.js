import React, { useState, useEffect } from 'react';
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
  Plus, Pencil, Trash2, X,
  ToggleLeft, ToggleRight,
  Search, Building2, RefreshCw, Shield, Euro,
} from 'lucide-react';

const emptyOffer = {
  bank_id: '',
  interest_rate: '',
  deposit_term: '',
  min_deposit: '',
  max_deposit: '',
  deposit_protection: '',
  bank_link: '',
  description: '',
  investment_type: 'Festgeld',
  is_active: true,
};

const investmentTypes = ['Festgeld', 'Tagesgeld'];

const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOffer, setEditingOffer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState(emptyOffer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBanks();
    fetchOffers();
  }, []);

  const fetchBanks = async () => {
    // Session 82.103c · FastAPI /api/admin/banks/list statt Supabase.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/banks/list`, { withCredentials: true });
      setBanks((data?.items || []).filter((b) => b.is_active !== false));
    } catch {
      setBanks([]);
    }
  };

  const fetchOffers = async () => {
    // Session 82.103c · FastAPI /api/admin/offers/list statt Supabase.
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/offers/list`, { withCredentials: true });
      setOffers(data?.items || []);
    } catch {
      toast.error('Fehler beim Laden der Angebote');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setFormData(emptyOffer);
    setEditingOffer(null);
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setFormData({
      bank_id: offer.bank_id || '',
      interest_rate: String(offer.interest_rate ?? ''),
      deposit_term: String(offer.deposit_term ?? ''),
      min_deposit: String(offer.min_deposit ?? ''),
      max_deposit: offer.max_deposit ? String(offer.max_deposit) : '',
      deposit_protection: offer.deposit_protection || '',
      bank_link: offer.bank_link || '',
      description: offer.description || '',
      investment_type: offer.investment_type || 'Festgeld',
      is_active: offer.is_active ?? true,
    });
    setEditingOffer(offer);
    setModalMode('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOffer(null);
    setFormData(emptyOffer);
  };

  const handleSave = async () => {
    if (!formData.bank_id || !formData.interest_rate || !formData.deposit_term || !formData.min_deposit || !formData.deposit_protection) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }
    setSaving(true);
    const payload = {
      bank_id: formData.bank_id,
      interest_rate: parseFloat(formData.interest_rate),
      deposit_term: parseInt(formData.deposit_term),
      min_deposit: parseFloat(formData.min_deposit),
      max_deposit: formData.max_deposit ? parseFloat(formData.max_deposit) : null,
      deposit_protection: formData.deposit_protection,
      bank_link: formData.bank_link || null,
      description: formData.description || '',
      investment_type: formData.investment_type,
      is_active: formData.is_active,
    };

    let error = null;
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      if (modalMode === 'add') {
        await _axios.post(`${_api}/api/admin/offers`, payload, { withCredentials: true });
      } else {
        await _axios.put(`${_api}/api/admin/offers/${editingOffer.id}`, payload, { withCredentials: true });
      }
    } catch (err) {
      const d = err?.response?.data?.detail;
      error = { message: Array.isArray(d) ? d.map((x) => x.msg).join(', ') : d || err.message };
    }

    if (error) {
      toast.error('Fehler: ' + error.message);
    } else {
      toast.success(modalMode === 'add' ? 'Angebot erstellt' : 'Angebot aktualisiert');
      await fetchOffers();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = async (offerId) => {
    if (!window.confirm('Möchten Sie dieses Angebot wirklich löschen?')) return;
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.delete(`${_api}/api/admin/offers/${offerId}`, { withCredentials: true });
      toast.success('Angebot gelöscht');
      await fetchOffers();
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (offer) => {
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.patch(`${_api}/api/admin/offers/${offer.id}/active?is_active=${!(offer.is_active ?? true)}`, null, { withCredentials: true });
      await fetchOffers();
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const filteredOffers = offers.filter((offer) => {
    const bankName = offer.banks?.name || '';
    const country = offer.banks?.country || '';
    const term = searchTerm.toLowerCase();
    return bankName.toLowerCase().includes(term) || country.toLowerCase().includes(term);
  });

  const isFormValid = formData.bank_id && formData.interest_rate && formData.deposit_term && formData.min_deposit && formData.deposit_protection;

  if (loading) {
    return (
      <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Angebote"
          title="Angebote verwalten"
          titleIcon={Euro}
          description="Zinssätze und Konditionen für den öffentlichen Vergleich."
        />
        <AdminSurfaceCard>
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-bank-primary mx-auto mb-3" />
            <p className="text-bank-text-muted text-sm">Angebote werden geladen...</p>
          </div>
        </AdminSurfaceCard>
      </AdminSubpageLayout>
    );
  }

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Angebote"
          title="Angebote verwalten"
          titleIcon={Euro}
          description={`${offers.length} Angebote — Festgeld und Tagesgeld im Vergleich.`}
        />

        <AdminToolbarCard>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nach Bank oder Land suchen..."
              className="pl-9"
            />
          </div>
          <Button onClick={fetchOffers} variant="outline" className="gap-2 rounded-xl">
            <RefreshCw size={16} /> Aktualisieren
          </Button>
          <Button onClick={openAddModal} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl" data-testid="add-offer-btn">
            <Plus size={16} /> Angebot hinzufügen
          </Button>
        </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          <table className="w-full">
            <thead className={adminTheadClass}>
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Bank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Land</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Zinssatz</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Laufzeit</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Mindesteinlage</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Typ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-bank-text-muted/70">
                    {searchTerm ? 'Keine Ergebnisse für Ihre Suche.' : 'Keine Angebote vorhanden.'}
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className={`border-b border-bank-border/80 ${adminRowHover}`} data-testid={`offer-row-${offer.id}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-bank-text-muted/70 shrink-0" />
                        <span className="font-medium text-bank-text text-sm">{offer.banks?.name || '–'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-bank-text-muted">{offer.banks?.country || '–'}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-bank-success">{offer.interest_rate}%</td>
                    <td className="py-3 px-4 text-sm text-bank-text-muted">{offer.deposit_term} M</td>
                    <td className="py-3 px-4 text-sm text-bank-text-muted">
                      €{offer.min_deposit.toLocaleString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-bank-border/15 text-bank-text-muted px-2 py-0.5 rounded-full">
                        {offer.investment_type || 'Festgeld'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(offer)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${offer.is_active
                            ? 'bg-bank-success/10 text-bank-success border-bank-success/25 hover:bg-bank-success/15'
                            : 'bg-bank-border/15 text-bank-text-muted border-bank-border hover:bg-bank-border/25'
                          }`}
                      >
                        {offer.is_active ? <><ToggleRight size={12} /> Aktiv</> : <><ToggleLeft size={12} /> Inaktiv</>}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-1.5 hover:bg-bank-border/15 rounded-md text-bank-text-muted hover:text-bank-text-muted transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="p-1.5 hover:bg-bank-error/10 rounded-md text-bank-text-muted/70 hover:text-bank-error transition-colors"
                          title="Löschen"
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
        </AdminSurfaceCard>
    </AdminSubpageLayout>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {modalMode === 'add' ? 'Neues Angebot erstellen' : 'Angebot bearbeiten'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg" data-testid="close-modal">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              {/* Bank Dropdown */}
              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                  Bank <span className="text-bank-error">*</span>
                </label>
                <select
                  value={formData.bank_id}
                  onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  data-testid="select-bank"
                >
                  <option value="">Bank auswählen...</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
                {banks.length === 0 && (
                  <p className="text-xs text-bank-secondary mt-1">
                    Keine Banken gefunden. Bitte zuerst Banken unter "Banken verwalten" anlegen.
                  </p>
                )}
              </div>

              {/* Zinssatz + Laufzeit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Zinssatz (%) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number" step="0.01" min="0" max="20"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    placeholder="z.B. 3.50"
                    data-testid="input-interest-rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Laufzeit (Monate) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number" min="1"
                    value={formData.deposit_term}
                    onChange={(e) => setFormData({ ...formData, deposit_term: e.target.value })}
                    placeholder="z.B. 12"
                    data-testid="input-deposit-term"
                  />
                </div>
              </div>

              {/* Mindest + Maximalanlage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Mindestanlage (€) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number" min="0"
                    value={formData.min_deposit}
                    onChange={(e) => setFormData({ ...formData, min_deposit: e.target.value })}
                    placeholder="z.B. 500"
                    data-testid="input-min-deposit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Maximalanlage (€)
                  </label>
                  <Input
                    type="number"
                    value={formData.max_deposit}
                    onChange={(e) => setFormData({ ...formData, max_deposit: e.target.value })}
                    placeholder="optional"
                    data-testid="input-max-deposit"
                  />
                </div>
              </div>

              {/* Einlagensicherung + Bank Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Einlagensicherung <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    value={formData.deposit_protection}
                    onChange={(e) => setFormData({ ...formData, deposit_protection: e.target.value })}
                    placeholder="z.B. €100.000 (EU-Einlagensicherung)"
                    data-testid="input-deposit-protection"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bank-text-muted mb-1">
                    Bank-Link
                  </label>
                  <Input
                    type="url"
                    value={formData.bank_link}
                    onChange={(e) => setFormData({ ...formData, bank_link: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-bank-link"
                  />
                </div>
              </div>

              {/* Anlagetyp */}
              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Anlagetyp</label>
                <select
                  value={formData.investment_type}
                  onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  data-testid="select-investment-type"
                >
                  {investmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-bank-text-muted mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-bank-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                  rows={3}
                  placeholder="Kurze Beschreibung des Angebots..."
                  data-testid="textarea-description"
                />
              </div>

              {/* Aktiv Toggle */}
              <div className="flex items-center justify-between p-3 bg-bank-bg rounded-lg border border-bank-border">
                <div>
                  <p className="text-sm font-medium text-bank-text-muted">Angebot aktiv</p>
                  <p className="text-xs text-bank-text-muted mt-0.5">Inaktive Angebote werden Nutzern nicht angezeigt</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                    data-testid="toggle-active-form"
                  />
                  <div className="w-11 h-6 bg-bank-border/25 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-bank-accent/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bank-ink" />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-bank-border shrink-0">
              <Button variant="outline" onClick={closeModal}>Abbrechen</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="bg-bank-ink hover:bg-bank-ink-elev text-white"
                data-testid="save-offer-btn"
              >
                {saving ? 'Wird gespeichert...' : modalMode === 'add' ? 'Angebot erstellen' : 'Änderungen speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminOffers;
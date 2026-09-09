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
    Search, Building2, RefreshCw, Globe, Shield,
    ToggleLeft, ToggleRight,
} from 'lucide-react';

const countries = [
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Austria', 'Belgium', 'Sweden', 'Portugal', 'Ireland',
    'Poland', 'Czech Republic', 'Greece', 'Finland', 'Denmark',
];

const depositProtectionOptions = [
    { value: '€100,000 (EU Deposit Guarantee Scheme)', label: '€100.000 (EU Einlagensicherung)' },
    { value: '€100,000 (German Deposit Protection)', label: '€100.000 (Deutsche Einlagensicherung)' },
    { value: '€100,000 (French Deposit Protection)', label: '€100.000 (Französische Einlagensicherung)' },
    { value: '€100,000 (Italian Deposit Protection)', label: '€100.000 (Italienische Einlagensicherung)' },
    { value: '€100,000 (Spanish Deposit Protection)', label: '€100.000 (Spanische Einlagensicherung)' },
];

const emptyBank = {
    name: '',
    slug: '',
    country: 'Germany',
    logo_url: '',
    website_url: '',
    deposit_protection: '€100,000 (EU Deposit Guarantee Scheme)',
    deposit_protection_amount: '€100.000',
    is_active: true,
};

function toSlug(name) {
    return name
        .toLowerCase()
        .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const AdminBanks = () => {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingBank, setEditingBank] = useState(null);
    const [formData, setFormData] = useState(emptyBank);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('banks')
            .select('*')
            .order('name', { ascending: true });
        if (error) {
            toast.error('Fehler beim Laden der Banken');
        } else {
            setBanks(data || []);
        }
        setLoading(false);
    };

    const openAddModal = () => {
        setFormData(emptyBank);
        setEditingBank(null);
        setModalMode('add');
        setShowModal(true);
    };

    const openEditModal = (bank) => {
        setFormData({
            name: bank.name || '',
            slug: bank.slug || '',
            country: bank.country || 'Germany',
            logo_url: bank.logo_url || '',
            website_url: bank.website_url || '',
            deposit_protection: bank.deposit_protection || '€100,000 (EU Deposit Guarantee Scheme)',
            deposit_protection_amount: bank.deposit_protection_amount || '€100.000',
            is_active: bank.is_active ?? true,
        });
        setEditingBank(bank);
        setModalMode('edit');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBank(null);
        setFormData(emptyBank);
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setFormData((prev) => ({
            ...prev,
            name,
            // Slug nur im Hinzufügen-Modus automatisch setzen
            ...(modalMode === 'add' ? { slug: toSlug(name) } : {}),
        }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.slug || !formData.country) {
            toast.error('Name, Slug und Land sind Pflichtfelder.');
            return;
        }
        setSaving(true);
        const payload = {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            country: formData.country,
            logo_url: formData.logo_url || null,
            website_url: formData.website_url || null,
            deposit_protection: formData.deposit_protection || null,
            deposit_protection_amount: formData.deposit_protection_amount || '€100.000',
            is_active: formData.is_active,
        };

        let error;
        if (modalMode === 'add') {
            toast.info('Legacy-Mutation deaktiviert (Session 82.91b · BLOCKED_SEMANTICS). Neuer FastAPI-Endpoint noch nicht freigeschaltet.'); const error = { message: 'legacy_write_disabled' };
        } else {
            toast.info('Legacy-Mutation deaktiviert (Session 82.91b · BLOCKED_SEMANTICS). Neuer FastAPI-Endpoint noch nicht freigeschaltet.'); const error = { message: 'legacy_write_disabled' };
        }

        if (error) {
            toast.error('Fehler: ' + error.message);
        } else {
            toast.success(modalMode === 'add' ? 'Bank erstellt' : 'Bank aktualisiert');
            await fetchBanks();
            closeModal();
        }
        setSaving(false);
    };

    const handleDelete = async (bankId, bankName) => {
        if (!window.confirm(`Möchten Sie "${bankName}" wirklich löschen? Alle verknüpften Angebote werden ebenfalls gelöscht.`)) return;
        toast.info('Legacy-Mutation deaktiviert (Session 82.91b · BLOCKED_SEMANTICS). Neuer FastAPI-Endpoint noch nicht freigeschaltet.');
    };

    const handleToggleActive = async (bank) => {
        const { error } = await supabase
            .from('banks')
            .update({ is_active: !bank.is_active })
            .eq('id', bank.id);
        if (error) {
            toast.error('Fehler: ' + error.message);
        } else {
            await fetchBanks();
        }
    };

    const filteredBanks = banks.filter(
        (b) =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
        <AdminSubpageLayout>
                <AdminSubpageHeader
                    eyebrow="Admin · Stammdaten"
                    title="Banken verwalten"
                    description={`${banks.length} Banken — Logos, Einlagensicherung und Sichtbarkeit im Vergleich.`}
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
                    <Button onClick={fetchBanks} variant="outline" className="gap-2">
                        <RefreshCw size={16} /> Aktualisieren
                    </Button>
                    <Button onClick={openAddModal} className="bg-bank-ink hover:bg-bank-ink-elev text-white gap-2 rounded-xl">
                        <Plus size={16} /> Bank hinzufügen
                    </Button>
                </div>
                </AdminToolbarCard>

                <AdminSurfaceCard>
                    {loading ? (
                        <div className="py-20 text-center">
                            <RefreshCw size={24} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
                            <p className="text-bank-text-muted text-sm">Banken werden geladen...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className={adminTheadClass}>
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Bank</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Land</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Website</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Einlagensicherung</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBanks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-bank-text-muted/70">
                                            {searchTerm ? 'Keine Ergebnisse für Ihre Suche.' : 'Keine Banken vorhanden.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBanks.map((bank) => (
                                        <tr key={bank.id} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-bank-border/15 rounded-lg flex items-center justify-center shrink-0">
                                                        {bank.logo_url ? (
                                                            <img src={bank.logo_url} alt={bank.name} className="w-6 h-6 object-contain" />
                                                        ) : (
                                                            <Building2 size={16} className="text-bank-text-muted/70" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-bank-text text-sm">{bank.name}</p>
                                                        <p className="text-xs text-bank-text-muted/70">{bank.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-bank-text-muted">{bank.country}</td>
                                            <td className="py-3 px-4">
                                                {bank.website_url ? (
                                                    <a
                                                        href={bank.website_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-bank-primary hover:text-bank-secondary text-sm"
                                                    >
                                                        <Globe size={13} /> Link
                                                    </a>
                                                ) : (
                                                    <span className="text-bank-text-muted/70 text-sm">–</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1 text-sm text-bank-text-muted">
                                                    <Shield size={13} className="text-bank-success shrink-0" />
                                                    <span className="truncate max-w-[160px]">{bank.deposit_protection_amount || '€100.000'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleToggleActive(bank)}
                                                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${bank.is_active
                                                            ? 'bg-bank-success/10 text-bank-success border border-bank-success/25 hover:bg-bank-success/15'
                                                            : 'bg-bank-border/15 text-bank-text-muted border border-bank-border hover:bg-bank-border/25'
                                                        }`}
                                                >
                                                    {bank.is_active ? (
                                                        <><ToggleRight size={12} /> Aktiv</>
                                                    ) : (
                                                        <><ToggleLeft size={12} /> Inaktiv</>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(bank)}
                                                        className="p-1.5 hover:bg-bank-border/15 rounded-md transition-colors text-bank-text-muted hover:text-bank-text-muted"
                                                        title="Bearbeiten"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bank.id, bank.name)}
                                                        className="p-1.5 hover:bg-bank-error/10 rounded-md transition-colors text-bank-text-muted/70 hover:text-bank-error"
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
                    )}
                </AdminSurfaceCard>
        </AdminSubpageLayout>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
                            <h2 className="text-lg font-semibold text-bank-text">
                                {modalMode === 'add' ? 'Neue Bank hinzufügen' : 'Bank bearbeiten'}
                            </h2>
                            <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                                <X size={20} className="text-bank-text-muted" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
                            {/* Name + Slug */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                                        Bankname <span className="text-bank-error">*</span>
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={handleNameChange}
                                        placeholder="z.B. Deutsche Bank"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">
                                        Slug <span className="text-bank-error">*</span>
                                    </label>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="z.B. deutsche-bank"
                                    />
                                </div>
                            </div>

                            {/* Land */}
                            <div>
                                <label className="block text-sm font-medium text-bank-text-muted mb-1">
                                    Land <span className="text-bank-error">*</span>
                                </label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                                >
                                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Logo URL + Website */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">Logo URL</label>
                                    <Input
                                        type="url"
                                        value={formData.logo_url}
                                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">Website URL</label>
                                    <Input
                                        type="url"
                                        value={formData.website_url}
                                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Einlagensicherung */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">Einlagensicherung</label>
                                    <select
                                        value={formData.deposit_protection}
                                        onChange={(e) => setFormData({ ...formData, deposit_protection: e.target.value })}
                                        className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary"
                                    >
                                        {depositProtectionOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-bank-text-muted mb-1">Betrag</label>
                                    <Input
                                        value={formData.deposit_protection_amount}
                                        onChange={(e) => setFormData({ ...formData, deposit_protection_amount: e.target.value })}
                                        placeholder="€100.000"
                                    />
                                </div>
                            </div>

                            {/* Aktiv Toggle */}
                            <div className="flex items-center justify-between p-3 bg-bank-bg rounded-lg border border-bank-border">
                                <div>
                                    <p className="text-sm font-medium text-bank-text-muted">Bank aktiv</p>
                                    <p className="text-xs text-bank-text-muted mt-0.5">Inaktive Banken und ihre Angebote werden nicht angezeigt</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
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
                                disabled={saving || !formData.name || !formData.slug || !formData.country}
                                className="bg-bank-ink hover:bg-bank-ink-elev text-white"
                            >
                                {saving ? 'Wird gespeichert...' : modalMode === 'add' ? 'Bank erstellen' : 'Änderungen speichern'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminBanks;
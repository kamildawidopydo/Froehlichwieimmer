import React, { useEffect, useState } from 'react';
import { FileBarChart2, Plus, Edit, Trash2, X, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

const EMPTY = {
  isin: '',
  bond_name: '',
  issuer: '',
  kupon_rate: '',
  kaufkurs: '',
  aktueller_kurs: '',
  faelligkeitsdatum: '',
  min_order_eur: '',
  denomination: '',
  is_available: true,
};

const AdminBondCatalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [stockTemplates, setStockTemplates] = useState([]);
  const [catalogTemplates, setCatalogTemplates] = useState([]);
  const [templateSource, setTemplateSource] = useState('stocks');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bond_catalog')
        .select('*')
        .order('kupon_rate', { ascending: false });
      if (error) {
        if (error.message?.toLowerCase().includes('relation') || error.code === '42P01') {
          setTableMissing(true);
        } else {
          toast.error('Fehler beim Laden: ' + error.message);
        }
        setItems([]);
      } else {
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      const [{ data: stocks }, { data: catalog }] = await Promise.all([
        supabase
          .from('stocks')
          .select('id, symbol, name, sector')
          .eq('is_active', true)
          .order('symbol', { ascending: true }),
        supabase
          .from('bond_catalog')
          .select('id, isin, bond_name, issuer, kupon_rate, kaufkurs, aktueller_kurs, faelligkeitsdatum, min_order_eur, denomination')
          .order('bond_name', { ascending: true }),
      ]);
      setStockTemplates(stocks || []);
      setCatalogTemplates(catalog || []);
    };
    loadTemplates();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setTemplateSource('stocks');
    setSelectedTemplate('');
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      isin: row.isin || '',
      bond_name: row.bond_name || '',
      issuer: row.issuer || '',
      kupon_rate: String(row.kupon_rate ?? ''),
      kaufkurs: String(row.kaufkurs ?? ''),
      aktueller_kurs: String(row.aktueller_kurs ?? ''),
      faelligkeitsdatum: row.faelligkeitsdatum || '',
      min_order_eur: String(row.min_order_eur ?? ''),
      denomination: String(row.denomination ?? ''),
      is_available: row.is_available ?? true,
    });
    setTemplateSource('catalog');
    setSelectedTemplate('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY);
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
        issuer: stock.name || prev.issuer,
        isin: prev.isin || '',
      }));
      return;
    }
    const catalog = catalogTemplates.find((c) => c.id === value);
    if (!catalog) return;
    setForm((prev) => ({
      ...prev,
      isin: catalog.isin || '',
      bond_name: catalog.bond_name || '',
      issuer: catalog.issuer || '',
      kupon_rate: catalog.kupon_rate != null ? String(catalog.kupon_rate) : '',
      kaufkurs: catalog.kaufkurs != null ? String(catalog.kaufkurs) : '',
      aktueller_kurs: catalog.aktueller_kurs != null ? String(catalog.aktueller_kurs) : '',
      faelligkeitsdatum: catalog.faelligkeitsdatum || '',
      min_order_eur: catalog.min_order_eur != null ? String(catalog.min_order_eur) : '',
      denomination: catalog.denomination != null ? String(catalog.denomination) : '',
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      isin: form.isin || null,
      bond_name: form.bond_name || null,
      issuer: form.issuer || null,
      kupon_rate: form.kupon_rate ? Number(form.kupon_rate) : null,
      kaufkurs: form.kaufkurs ? Number(form.kaufkurs) : null,
      aktueller_kurs: form.aktueller_kurs ? Number(form.aktueller_kurs) : null,
      faelligkeitsdatum: form.faelligkeitsdatum || null,
      min_order_eur: form.min_order_eur ? Number(form.min_order_eur) : null,
      denomination: form.denomination ? Number(form.denomination) : null,
      is_available: !!form.is_available,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('bond_catalog').update(payload).eq('id', editing.id));
      if (!error) toast.success('Anleihe aktualisiert');
    } else {
      ({ error } = await supabase.from('bond_catalog').insert(payload));
      if (!error) toast.success('Anleihe hinzugefügt');
    }
    if (error) toast.error('Fehler: ' + error.message);
    else {
      await load();
      closeModal();
    }
    setSaving(false);
  };

  const remove = async (row) => {
    if (!window.confirm('Anleihe wirklich entfernen?')) return;
    const { error } = await supabase.from('bond_catalog').delete().eq('id', row.id);
    if (error) toast.error('Fehler: ' + error.message);
    else {
      toast.success('Entfernt');
      load();
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Anleihen-Katalog"
        titleIcon={FileBarChart2}
        description="Pflegen Sie das Universum kaufbarer Anleihen, das Kunden im Bereich „Neue Anleihe kaufen“ sehen."
        actions={
          <Button
            className="bg-bank-ink text-white hover:bg-bank-ink-elev"
            onClick={openAdd}
            disabled={tableMissing}
          >
            <Plus size={16} className="mr-2" />
            Anleihe hinzufügen
          </Button>
        }
      />

      {tableMissing ? (
        <AdminSurfaceCard className="p-6 text-sm text-bank-text-muted">
          <p className="font-semibold text-bank-text mb-1">Tabelle <code>bond_catalog</code> fehlt</p>
          <p>
            Legen Sie die Tabelle in Supabase an, um Anleihen verwaltbar zu machen. Erwartete Felder:{' '}
            <code>isin</code>, <code>bond_name</code>, <code>issuer</code>, <code>kupon_rate</code>,{' '}
            <code>kaufkurs</code>, <code>aktueller_kurs</code>, <code>faelligkeitsdatum</code>,{' '}
            <code>min_order_eur</code>, <code>denomination</code>, <code>is_available</code>.
          </p>
        </AdminSurfaceCard>
      ) : (
        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Bond</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Emittent</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Kupon</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Akt. Kurs</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Fälligkeit</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-bank-text-muted">
                      <RefreshCw size={16} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-bank-text-muted/70">
                      Noch keine Anleihen im Katalog.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-bank-border/70 ${adminRowHover}`}
                    >
                      <td className="py-3 px-4 font-medium text-bank-text">
                        {row.bond_name || '–'}
                        {row.isin && (
                          <p className="text-[11px] text-bank-text-muted">ISIN {row.isin}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">{row.issuer || '–'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.kupon_rate != null ? `${row.kupon_rate}%` : '–'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.aktueller_kurs != null ? `${row.aktueller_kurs}%` : '–'}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">
                        {row.faelligkeitsdatum
                          ? new Date(row.faelligkeitsdatum).toLocaleDateString('de-DE')
                          : '–'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_available ? 'bg-bank-success/10 text-bank-success border border-bank-success/25' : 'bg-bank-border/15 text-bank-text-muted border border-bank-border/40'}`}
                        >
                          {row.is_available ? 'Verfügbar' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 text-bank-accent hover:bg-bank-accent/10 rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => remove(row)}
                            className="p-1.5 text-bank-error hover:bg-bank-error/10 rounded transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {editing ? 'Anleihe bearbeiten' : 'Neue Anleihe'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form
              id="bond-form"
              onSubmit={submit}
              className="overflow-y-auto px-6 py-5 space-y-4 flex-1"
            >
              {!editing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-bank-border bg-bank-bg/50 p-3">
                  <div>
                    <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                      Vorlage-Quelle
                    </label>
                    <select
                      value={templateSource}
                      onChange={(e) => {
                        setTemplateSource(e.target.value);
                        setSelectedTemplate('');
                      }}
                      className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm"
                    >
                      <option value="stocks">Markt-Aktienliste (stocks)</option>
                      <option value="catalog">Bestehender Bond-Katalog</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                      Vorlage übernehmen
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        applyTemplate(templateSource, e.target.value);
                      }}
                      className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm"
                    >
                      <option value="">Vorlage auswählen…</option>
                      {templateSource === 'stocks'
                        ? stockTemplates.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.symbol} - {s.name}
                            </option>
                          ))
                        : catalogTemplates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.bond_name || c.isin || 'Ohne Name'}{c.isin ? ` (ISIN ${c.isin})` : ''}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Bond-Name
                  </label>
                  <Input
                    value={form.bond_name}
                    onChange={(e) => setForm((p) => ({ ...p, bond_name: e.target.value }))}
                    placeholder="z. B. Bundesanleihe 0.50% 2030"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">ISIN</label>
                  <Input
                    value={form.isin}
                    onChange={(e) => setForm((p) => ({ ...p, isin: e.target.value }))}
                    placeholder="DE0001102457"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                  Emittent
                </label>
                <Input
                  value={form.issuer}
                  onChange={(e) => setForm((p) => ({ ...p, issuer: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Kupon (% p.a.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.kupon_rate}
                    onChange={(e) => setForm((p) => ({ ...p, kupon_rate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Kaufkurs (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.kaufkurs}
                    onChange={(e) => setForm((p) => ({ ...p, kaufkurs: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Akt. Kurs (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.aktueller_kurs}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, aktueller_kurs: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Fälligkeit
                  </label>
                  <Input
                    type="date"
                    value={form.faelligkeitsdatum}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, faelligkeitsdatum: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Min. Order (€)
                  </label>
                  <Input
                    type="number"
                    value={form.min_order_eur}
                    onChange={(e) => setForm((p) => ({ ...p, min_order_eur: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Stückelung (€)
                  </label>
                  <Input
                    type="number"
                    value={form.denomination}
                    onChange={(e) => setForm((p) => ({ ...p, denomination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-bank-bg rounded-lg border border-bank-border">
                <div>
                  <p className="text-sm font-medium text-bank-text-muted">Verfügbar</p>
                  <p className="text-xs text-bank-text-muted mt-0.5">
                    Anleihe ist im Kunden-Katalog sichtbar.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_available: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-bank-border/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bank-ink" />
                </label>
              </div>
            </form>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-bank-border shrink-0">
              <Button type="button" variant="outline" onClick={closeModal}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                form="bond-form"
                disabled={saving}
                className="bg-bank-ink hover:bg-bank-ink-elev text-white"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" /> Speichert…
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />{' '}
                    {editing ? 'Änderungen speichern' : 'Anleihe anlegen'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminBondCatalog;

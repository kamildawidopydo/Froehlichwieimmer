import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Save, RefreshCw } from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { normalizeIpoCatalogRow } from '@/lib/decodeHtmlEntities';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

const STATUS_OPTIONS = ['upcoming', 'open', 'priced', 'filed', 'listed', 'cancelled'];

const EMPTY = {
  company_name: '',
  ticker_proposed: '',
  isin: '',
  exchange: '',
  market: '',
  sector: '',
  status: 'upcoming',
  ipo_date: '',
  expected_ipo_window: '',
  subscription_start: '',
  subscription_end: '',
  price_range_low: '',
  price_range_high: '',
  price_currency: 'EUR',
  valuation_last_private: '',
  min_investment_eur: '',
  lot_size: '1',
  prospectus_url: '',
  description: '',
  is_visible: true,
};

const AdminIpoCatalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ipo_catalog')
        .select('*')
        .order('ipo_date', { ascending: true, nullsFirst: false });
      if (error) {
        if (error.message?.toLowerCase().includes('relation') || error.code === '42P01') {
          setTableMissing(true);
        } else {
          toast.error('Fehler beim Laden: ' + error.message);
        }
        setItems([]);
      } else {
        setItems((data || []).map(normalizeIpoCatalogRow));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ipo-sync', {
        body: { force: true },
      });
      if (error) throw error;
      if (data?.errors?.length) {
        toast.warning(`Sync mit Hinweisen: ${data.errors.join('; ')}`);
      } else {
        toast.success(`IPO-Sync abgeschlossen (${data?.upserted ?? 0} aktualisiert)`);
      }
      await load();
    } catch (err) {
      toast.error('Sync fehlgeschlagen: ' + (err?.message || 'unbekannt'));
    } finally {
      setSyncing(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company_name: row.company_name || '',
      ticker_proposed: row.ticker_proposed || '',
      isin: row.isin || '',
      exchange: row.exchange || '',
      market: row.market || '',
      sector: row.sector || '',
      status: row.status || 'upcoming',
      ipo_date: row.ipo_date || '',
      expected_ipo_window: row.expected_ipo_window || '',
      subscription_start: row.subscription_start || '',
      subscription_end: row.subscription_end || '',
      price_range_low: row.price_range_low != null ? String(row.price_range_low) : '',
      price_range_high: row.price_range_high != null ? String(row.price_range_high) : '',
      price_currency: row.price_currency || 'EUR',
      valuation_last_private:
        row.valuation_last_private != null ? String(row.valuation_last_private) : '',
      min_investment_eur: row.min_investment_eur != null ? String(row.min_investment_eur) : '',
      lot_size: String(row.lot_size ?? 1),
      prospectus_url: row.prospectus_url || '',
      description: row.description || '',
      is_visible: row.is_visible ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error('Firmenname ist erforderlich.');
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      ticker_proposed: form.ticker_proposed || null,
      isin: form.isin || null,
      exchange: form.exchange || null,
      market: form.market || null,
      sector: form.sector || null,
      status: form.status,
      ipo_date: form.ipo_date || null,
      expected_ipo_window: form.expected_ipo_window || null,
      subscription_start: form.subscription_start || null,
      subscription_end: form.subscription_end || null,
      price_range_low: form.price_range_low ? Number(form.price_range_low) : null,
      price_range_high: form.price_range_high ? Number(form.price_range_high) : null,
      price_currency: form.price_currency || 'EUR',
      valuation_last_private: form.valuation_last_private
        ? Number(form.valuation_last_private)
        : null,
      min_investment_eur: form.min_investment_eur ? Number(form.min_investment_eur) : null,
      lot_size: Number(form.lot_size) || 1,
      prospectus_url: form.prospectus_url || null,
      description: form.description || null,
      is_visible: !!form.is_visible,
      is_manual_override: true,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('ipo_catalog').update(payload).eq('id', editing.id));
      if (!error) toast.success('IPO aktualisiert');
    } else {
      const key = form.isin
        ? `isin:${form.isin.toUpperCase()}`
        : `manual:${form.ticker_proposed || 'x'}:${form.ipo_date || 'nodate'}`;
      ({ error } = await supabase.from('ipo_catalog').insert({
        ...payload,
        external_key: key,
        source: 'manual',
      }));
      if (!error) toast.success('IPO hinzugefügt');
    }
    if (error) toast.error('Fehler: ' + error.message);
    else {
      await load();
      closeModal();
    }
    setSaving(false);
  };

  const remove = async (row) => {
    if (!window.confirm('IPO wirklich entfernen?')) return;
    const { error } = await supabase.from('ipo_catalog').delete().eq('id', row.id);
    if (error) toast.error('Fehler: ' + error.message);
    else {
      toast.success('Entfernt');
      load();
    }
  };

  const toggleVisible = async (row) => {
    const { error } = await supabase
      .from('ipo_catalog')
      .update({ is_visible: !row.is_visible, is_manual_override: true })
      .eq('id', row.id);
    if (error) toast.error('Fehler: ' + error.message);
    else load();
  };

  const statusBadge = (status) => {
    const map = {
      upcoming: 'bg-sky-50 text-sky-700 border-sky-200',
      open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      priced: 'bg-violet-50 text-violet-700 border-violet-200',
      filed: 'bg-amber-50 text-amber-800 border-amber-200',
      listed: 'bg-slate-100 text-slate-600 border-slate-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || map.upcoming;
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="IPO-Katalog"
        titleIcon={PRODUCT_ICONS.ipo}
        description="Börsengänge vor dem Handelsstart — Euronext, Nasdaq und manuelle Einträge."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={runSync} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              Sync jetzt
            </Button>
            <Button className="bg-bank-ink text-white hover:bg-bank-ink-elev" onClick={openAdd}>
              <Plus size={16} />
              IPO hinzufügen
            </Button>
          </div>
        }
      />

      {tableMissing ? (
        <AdminSurfaceCard className="p-6">
          <p className="text-[13px] text-bank-text-muted">
            Tabelle <code className="font-mono">ipo_catalog</code> fehlt — Migration anwenden.
          </p>
        </AdminSurfaceCard>
      ) : (
        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Unternehmen</th>
                  <th className="px-4 py-3 text-left">Ticker</th>
                  <th className="px-4 py-3 text-left">Quelle</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sichtbar</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-bank-text-muted">
                      Lädt…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-bank-text-muted">
                      Keine IPOs — Sync starten oder manuell hinzufügen
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className={`border-b border-bank-border ${adminRowHover}`}>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums">
                        {row.ipo_date
                          ? new Date(row.ipo_date).toLocaleDateString('de-DE')
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium">{row.company_name}</td>
                      <td className="px-4 py-3 font-mono text-[12px]">{row.ticker_proposed || '–'}</td>
                      <td className="px-4 py-3 text-[12px] text-bank-text-muted">{row.source}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${statusBadge(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleVisible(row)}
                          className={`text-[12px] ${row.is_visible ? 'text-emerald-600' : 'text-bank-text-muted'}`}
                        >
                          {row.is_visible ? 'Ja' : 'Nein'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Edit size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(row)}>
                            <Trash2 size={14} className="text-rose-600" />
                          </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bank-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'IPO bearbeiten' : 'Neues IPO'}</h3>
              <button type="button" onClick={closeModal} aria-label="Schließen">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Input
                placeholder="Unternehmen *"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Ticker"
                  value={form.ticker_proposed}
                  onChange={(e) => setForm((f) => ({ ...f, ticker_proposed: e.target.value }))}
                />
                <Input
                  placeholder="ISIN"
                  value={form.isin}
                  onChange={(e) => setForm((f) => ({ ...f, isin: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Börse / Standort"
                  value={form.exchange}
                  onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                />
                <Input
                  placeholder="Marktsegment"
                  value={form.market}
                  onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-bank-text-muted">
                  Status
                  <select
                    className="mt-1 w-full rounded-md border border-bank-border px-2 py-2 text-[13px]"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  type="date"
                  placeholder="IPO-Datum"
                  value={form.ipo_date}
                  onChange={(e) => setForm((f) => ({ ...f, ipo_date: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Erwartetes IPO-Fenster (z. B. Q4 2026)"
                value={form.expected_ipo_window}
                onChange={(e) => setForm((f) => ({ ...f, expected_ipo_window: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Zeichnung von"
                  value={form.subscription_start}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_start: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="Zeichnung bis"
                  value={form.subscription_end}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_end: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Preisspanne von"
                  value={form.price_range_low}
                  onChange={(e) => setForm((f) => ({ ...f, price_range_low: e.target.value }))}
                />
                <Input
                  placeholder="Preisspanne bis"
                  value={form.price_range_high}
                  onChange={(e) => setForm((f) => ({ ...f, price_range_high: e.target.value }))}
                />
                <select
                  className="rounded-md border border-bank-border px-2 py-2 text-[13px]"
                  value={form.price_currency}
                  onChange={(e) => setForm((f) => ({ ...f, price_currency: e.target.value }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <Input
                placeholder="Letzte Privatbewertung (USD/EUR, voller Betrag)"
                value={form.valuation_last_private}
                onChange={(e) => setForm((f) => ({ ...f, valuation_last_private: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Min. Investition EUR"
                  value={form.min_investment_eur}
                  onChange={(e) => setForm((f) => ({ ...f, min_investment_eur: e.target.value }))}
                />
                <Input
                  placeholder="Losgröße"
                  value={form.lot_size}
                  onChange={(e) => setForm((f) => ({ ...f, lot_size: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Prospekt-URL"
                value={form.prospectus_url}
                onChange={(e) => setForm((f) => ({ ...f, prospectus_url: e.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-bank-border px-3 py-2 text-[13px]"
                rows={3}
                placeholder="Beschreibung"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm((f) => ({ ...f, is_visible: e.target.checked }))}
                />
                Für Kunden sichtbar
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminIpoCatalog;

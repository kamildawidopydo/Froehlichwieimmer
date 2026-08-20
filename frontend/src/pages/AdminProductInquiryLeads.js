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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ListChecks, Mail, Phone, Printer, RefreshCw, Search, Trash2, Filter } from 'lucide-react';
import { productInquiryLabels } from '@/data/productInquiryQuestions';

const STATUS_OPTIONS = ['new', 'contacted', 'closed'];

const productLabel = (p) => productInquiryLabels[p] || p;

function formatAnswers(answers) {
  if (!answers || typeof answers !== 'object') return [];
  return Object.entries(answers).map(([key, val]) => {
    const label = val && typeof val === 'object' && val.label != null ? val.label : String(val);
    return { key, label };
  });
}

const AdminProductInquiryLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase.from('product_inquiry_leads').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (productFilter !== 'all') {
        query = query.eq('product', productFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
      setSelected(new Set());
    } catch (error) {
      toast.error('Fehler beim Laden der Produktanfragen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when filters change
  }, [statusFilter, productFilter]);

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((item) =>
      [item.first_name, item.last_name, item.email, item.phone, item.customer_number, item.product]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [leads, searchTerm]);

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const ids = filteredLeads.map((l) => l.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(() => {
      if (allOn) return new Set();
      return new Set(ids);
    });
  };

  const updateStatus = async (leadId, status) => {
    setUpdatingId(leadId);
    try {
      const { error } = await supabase
        .from('product_inquiry_leads')
        .update({ status, handled_at: status === 'new' ? null : new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
      toast.success('Status aktualisiert.');
    } catch {
      toast.error('Status konnte nicht aktualisiert werden.');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteLead = async (leadId) => {
    const confirmed = window.confirm('Diese Anfrage wirklich dauerhaft löschen?');
    if (!confirmed) return;
    setUpdatingId(leadId);
    try {
      const { error } = await supabase.from('product_inquiry_leads').delete().eq('id', leadId);
      if (error) throw error;
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      toast.success('Anfrage gelöscht.');
    } catch {
      toast.error('Anfrage konnte nicht gelöscht werden.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateValue) =>
    new Date(dateValue).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const selectedRows = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);

  const handlePrintSelected = () => {
    if (selectedRows.length === 0) {
      toast.error('Bitte mindestens eine Zeile auswählen.');
      return;
    }
    window.print();
  };

  const allVisibleSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id));

  return (
    <>
      <div className="hidden print:block print:p-8 print:text-black">
        <h1 className="font-display text-2xl font-light">Fröhlich Vermögensberatung — Produktanfragen (Auswahl)</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Gedruckt am {new Date().toLocaleString('de-DE')} — {selectedRows.length} Einträge
        </p>
        <hr className="my-6 border-neutral-300" />
        {selectedRows.map((lead, idx) => (
          <section key={lead.id} className="mb-10 break-inside-avoid">
            <h2 className="text-lg font-semibold">
              {idx + 1}. {lead.first_name} {lead.last_name} — {productLabel(lead.product)}
            </h2>
            <p className="mt-1 text-sm">
              <strong>E-Mail:</strong> {lead.email} &nbsp;|&nbsp; <strong>Telefon:</strong> {lead.phone}
            </p>
            {lead.customer_number ? (
              <p className="text-sm">
                <strong>Kundennummer:</strong> {lead.customer_number}
              </p>
            ) : null}
            <p className="text-sm text-neutral-600">
              Status: {lead.status} · Eingang: {formatDate(lead.created_at)}
              {lead.user_id ? ` · User-ID: ${lead.user_id}` : ''}
            </p>
            <p className="mt-2 text-sm font-medium">Antworten</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {formatAnswers(lead.answers).map(({ key, label }) => (
                <li key={key}>
                  <span className="font-mono text-xs text-neutral-500">{key}:</span> {label}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-neutral-500">
              Marketing-Einwilligung: {lead.consent_marketing ? 'ja' : 'nein'}
            </p>
          </section>
        ))}
      </div>

      <div className="print:hidden">
        <AdminSubpageLayout>
          <AdminSubpageHeader
            eyebrow="Admin · Leads"
            title="Startseiten-Produktanfragen"
            titleIcon={ListChecks}
            description="Aktien, Anleihen und Spargeld: Kurzfragebogen mit Kontaktdaten."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handlePrintSelected} className="rounded-xl">
                  <Printer size={16} className="mr-2" />
                  Ausgewählte drucken ({selected.size})
                </Button>
                <Button variant="outline" onClick={fetchLeads} disabled={loading} className="rounded-xl">
                  <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              </div>
            }
          />

          <AdminToolbarCard className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, E-Mail, Telefon, Produkt…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-bank-text-muted/70" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-md border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
                >
                  <option value="all">Alle Status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="h-10 rounded-md border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
              >
                <option value="all">Alle Produkte</option>
                <option value="aktien">Aktien</option>
                <option value="anleihen">Anleihen</option>
                <option value="spargeld">Tagesgeld / Festgeld / Flexgeld</option>
              </select>
            </div>
          </AdminToolbarCard>

          <AdminSurfaceCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="w-10 px-2 py-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleAllVisible}
                        aria-label="Alle sichtbaren auswählen"
                        className="border-bank-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                      Produkt / Antworten
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                      Kontakt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">
                        Anfragen werden geladen...
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">
                        Keine Anfragen gefunden.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className={adminRowHover}>
                        <td className="px-2 py-4 align-top">
                          <Checkbox
                            checked={selected.has(lead.id)}
                            onCheckedChange={() => toggleOne(lead.id)}
                            aria-label={`Auswahl ${lead.email}`}
                            className="border-bank-border"
                          />
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-bank-text-muted">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-bank-text">{productLabel(lead.product)}</p>
                          <ul className="mt-2 max-w-md space-y-0.5 text-xs text-bank-text-muted">
                            {formatAnswers(lead.answers)
                              .slice(0, 4)
                              .map(({ key, label }) => (
                                <li key={key}>
                                  <span className="font-mono text-[10px] text-bank-text-muted/70">{key}:</span>{' '}
                                  {label}
                                </li>
                              ))}
                            {formatAnswers(lead.answers).length > 4 ? (
                              <li className="text-bank-text-muted/80">…</li>
                            ) : null}
                          </ul>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-bank-text-muted">
                          <p className="font-medium text-bank-text">
                            {lead.first_name} {lead.last_name}
                          </p>
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="mb-1 flex items-center gap-2 text-bank-accent hover:underline"
                            >
                              <Mail size={13} />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-bank-text">
                              <Phone size={13} />
                              {lead.phone}
                            </a>
                          )}
                          {lead.customer_number ? (
                            <p className="mt-1 text-xs">Kd-Nr. {lead.customer_number}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <select
                            value={lead.status}
                            disabled={updatingId === lead.id}
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            className="h-9 rounded-md border border-bank-border bg-white px-2 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteLead(lead.id)}
                            disabled={updatingId === lead.id}
                            className="h-8 gap-1 border-bank-border text-xs text-bank-text-muted hover:bg-bank-muted"
                          >
                            <Trash2 size={12} /> Löschen
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AdminSurfaceCard>
        </AdminSubpageLayout>
      </div>
    </>
  );
};

export default AdminProductInquiryLeads;

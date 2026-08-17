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
import { toast } from 'sonner';
import { Inbox, Search, Mail, Phone, RefreshCw, Filter, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'contacted', 'closed'];

const AdminCreditLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase.from('credit_leads').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Kreditanfragen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((item) =>
      [item.full_name, item.email, item.phone, item.purpose]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [leads, searchTerm]);

  const updateStatus = async (leadId, status) => {
    setUpdatingId(leadId);
    try {
      const { error } = await supabase
        .from('credit_leads')
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
    const confirmed = window.confirm('Diese Kreditanfrage wirklich dauerhaft löschen?');
    if (!confirmed) return;
    setUpdatingId(leadId);
    try {
      const { error } = await supabase.from('credit_leads').delete().eq('id', leadId);
      if (error) throw error;
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      toast.success('Kreditanfrage gelöscht.');
    } catch {
      toast.error('Kreditanfrage konnte nicht gelöscht werden.');
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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(Number(amount || 0));

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Leads"
        title="Kredit-Anfragen"
        titleIcon={Inbox}
        description="Neue Kontaktanfragen aus dem Kreditformular."
        actions={
          <Button variant="outline" onClick={fetchLeads} disabled={loading} className="rounded-xl">
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name, Kontakt oder Verwendungszweck..."
            className="pl-9"
          />
        </div>

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
      </AdminToolbarCard>

      <AdminSurfaceCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={adminTheadClass}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Anfrage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Kontakt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-bank-text-muted">
                    Anfragen werden geladen...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-bank-text-muted">
                    Keine Anfragen gefunden.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className={adminRowHover}>
                    <td className="px-4 py-4 text-sm text-bank-text-muted">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-bank-text">{lead.full_name || 'Unbekannt'}</p>
                      <p className="mt-1 text-sm text-bank-text-muted">
                        {formatCurrency(lead.requested_amount)} · {lead.requested_term_months} Monate
                      </p>
                      <p className="mt-0.5 text-xs text-bank-text-muted/80">{lead.purpose}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-bank-text-muted">
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
                      {!lead.email && !lead.phone && 'Kein Kontakt vorhanden'}
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteLead(lead.id)}
                        disabled={updatingId === lead.id}
                        className="h-8 text-xs gap-1 border-bank-border text-bank-text-muted hover:bg-bank-muted"
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
  );
};

export default AdminCreditLeads;

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { AlertTriangle, Search, Mail, Phone, RefreshCw, Filter, Trash2, ExternalLink } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu' },
  { value: 'handled', label: 'Erledigt' },
];

const AdminInsufficientBuyingPower = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('new');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('insufficient_buying_power_events')
        .select(
          'id, user_id, symbol, stock_name, required_amount, available_amount, quantity, order_type, currency, status, created_at, profiles:user_id(email, first_name, last_name, phone)',
        )
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch {
      toast.error('Fehler beim Laden der Kaufkraft-Warnungen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return events;
    return events.filter((item) => {
      const profile = item.profiles || {};
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      return [name, profile.email, profile.phone, item.symbol, item.stock_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [events, searchTerm]);

  const updateStatus = async (eventId, status) => {
    setUpdatingId(eventId);
    try {
      const { error } = await supabase
        .from('insufficient_buying_power_events')
        .update({ status, handled_at: status === 'new' ? null : new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? { ...event, status } : event)),
      );
      toast.success('Status aktualisiert.');
    } catch {
      toast.error('Status konnte nicht aktualisiert werden.');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteEvent = async (eventId) => {
    const confirmed = window.confirm('Diese Warnung wirklich dauerhaft löschen?');
    if (!confirmed) return;
    setUpdatingId(eventId);
    try {
      const { error } = await supabase
        .from('insufficient_buying_power_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      toast.success('Eintrag gelöscht.');
    } catch {
      toast.error('Eintrag konnte nicht gelöscht werden.');
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

  const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));

  const customerName = (profile) => {
    if (!profile) return 'Unbekannt';
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    return name || profile.email || 'Unbekannt';
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Depot"
        title="Kaufkraft-Warnungen"
        titleIcon={AlertTriangle}
        description="Kunden, die einen Kaufauftrag ohne ausreichende Kaufkraft eingereicht haben — für den Kundenservice."
        actions={
          <Button variant="outline" onClick={fetchEvents} disabled={loading} className="rounded-xl">
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
            placeholder="Kunde, E-Mail oder Symbol..."
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
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Kunde</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Aktie / Auftrag</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Kaufkraft</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">
                    Warnungen werden geladen...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">
                    Keine Warnungen gefunden.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const profile = event.profiles || {};
                  return (
                    <tr key={event.id} className={adminRowHover}>
                      <td className="px-4 py-4 text-sm text-bank-text-muted">{formatDate(event.created_at)}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-bank-text">{customerName(profile)}</p>
                        {profile.email && (
                          <a
                            href={`mailto:${profile.email}`}
                            className="mt-1 flex items-center gap-2 text-sm text-bank-accent hover:underline"
                          >
                            <Mail size={13} />
                            {profile.email}
                          </a>
                        )}
                        {profile.phone && (
                          <a href={`tel:${profile.phone}`} className="mt-1 flex items-center gap-2 text-sm text-bank-text-muted hover:text-bank-text">
                            <Phone size={13} />
                            {profile.phone}
                          </a>
                        )}
                        <Link
                          to={`/admin/users/${event.user_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-bank-accent hover:underline"
                        >
                          <ExternalLink size={12} />
                          Kundenprofil
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-bank-text-muted">
                        <p className="font-medium text-bank-text">{event.symbol}</p>
                        {event.stock_name && <p className="mt-0.5 text-xs">{event.stock_name}</p>}
                        <p className="mt-1 text-xs">
                          {event.quantity != null ? `${Number(event.quantity)} Stk.` : '—'}
                          {event.order_type ? ` · ${event.order_type}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="text-red-700 dark:text-red-300">
                          Benötigt: {formatCurrency(event.required_amount, event.currency)}
                        </p>
                        <p className="mt-0.5 text-bank-text-muted">
                          Verfügbar: {formatCurrency(event.available_amount, event.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={event.status}
                          disabled={updatingId === event.id}
                          onChange={(e) => updateStatus(event.id, e.target.value)}
                          className="h-9 rounded-md border border-bank-border bg-white px-2 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEvent(event.id)}
                          disabled={updatingId === event.id}
                          className="h-8 text-xs gap-1 border-bank-border text-bank-text-muted hover:bg-bank-muted"
                        >
                          <Trash2 size={12} /> Löschen
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
};

export default AdminInsufficientBuyingPower;

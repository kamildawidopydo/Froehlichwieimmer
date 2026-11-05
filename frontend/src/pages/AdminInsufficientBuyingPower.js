import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
// Session 82.103c — Supabase entfernt, ersetzt durch FastAPI (JWT-Cookie via withCredentials).
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
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'handled', label: 'Erledigt' },
];

const eur = (v) =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const AdminInsufficientBuyingPower = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('new');
  const [updatingId, setUpdatingId] = useState(null);
  const [assetFilter, setAssetFilter] = useState('all');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await _axios.get(
        `${_api}/api/admin/insufficient-buying-power-events`,
        { params, withCredentials: true },
      );
      setEvents(data?.items || []);
    } catch {
      toast.error('Fehler beim Laden der Kaufkraft-Warnungen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = assetFilter === 'all' ? events : events.filter((e) => (e.asset_type || 'stock') === assetFilter);
    if (!q) return base;
    return base.filter((item) => {
      const profile = item.profiles || {};
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      return [name, profile.email, profile.phone, item.symbol, item.stock_name, item.isin, item.customer_display_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [events, searchTerm, assetFilter]);

  const updateStatus = async (eventId, status) => {
    setUpdatingId(eventId);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.patch(
        `${_api}/api/admin/insufficient-buying-power-events/${eventId}`,
        { status },
        { withCredentials: true },
      );
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
    const confirmed = window.confirm('Diese Warnung wirklich als erledigt archivieren?');
    if (!confirmed) return;
    setUpdatingId(eventId);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.delete(
        `${_api}/api/admin/insufficient-buying-power-events/${eventId}`,
        { withCredentials: true },
      );
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      toast.success('Eintrag archiviert.');
    } catch {
      toast.error('Eintrag konnte nicht archiviert werden.');
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
        description="Kunden, die einen Kaufauftrag (Aktien oder Anleihen) ohne ausreichendes Guthaben auslösen wollten — Beratungsanfragen für den Kundenservice."
        actions={
          <Button variant="outline" onClick={fetchEvents} disabled={loading} className="rounded-xl" data-testid="admin-ibp-refresh-btn">
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
            data-testid="admin-ibp-search-input"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-bank-border bg-white p-0.5" data-testid="admin-ibp-asset-tabs">
            {[['all', 'Alle'], ['bond', 'Kaufanfragen – Guthaben nicht ausreichend (Anleihen)'], ['stock', 'Aktien']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setAssetFilter(v)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${assetFilter === v ? 'bg-bank-ink text-white' : 'text-bank-text-muted hover:text-bank-text'}`}
                data-testid={`admin-ibp-asset-${v}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Filter size={15} className="text-bank-text-muted/70" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
            data-testid="admin-ibp-status-filter"
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-bank-text-muted uppercase tracking-wider">Wertpapier / Auftrag</th>
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
                  <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted" data-testid="admin-ibp-empty">
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
                        <p className="font-medium text-bank-text">{event.customer_name || customerName(profile)}</p>
                        {event.customer_display_id && (
                          <p className="font-mono text-[10.5px] text-bank-text-muted">{event.customer_display_id}</p>
                        )}
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
                        {event.asset_type === 'bond' ? (
                          <>
                            <p className="font-medium text-bank-text">{event.stock_name}</p>
                            <p className="mt-0.5 font-mono text-xs">ISIN {event.isin || event.symbol}</p>
                            <p className="mt-1 text-xs" data-testid={`admin-ibp-requested-${event.id}`}>
                              Gewünschtes Kaufvolumen: {eur(event.requested_amount)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-bank-text">{event.symbol}</p>
                            {event.stock_name && <p className="mt-0.5 text-xs">{event.stock_name}</p>}
                            <p className="mt-1 text-xs">
                              {event.quantity != null ? `${Number(event.quantity)} Stk.` : '—'}
                              {event.order_type ? ` · ${event.order_type}` : ''}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="text-red-700 dark:text-red-300">
                          Benötigt: {formatCurrency(event.required_amount, event.currency)}
                        </p>
                        <p className="mt-0.5 text-bank-text-muted">
                          Verfügbar: {formatCurrency(event.available_amount, event.currency)}
                        </p>
                        {event.missing_amount != null && (
                          <p className="mt-0.5 font-semibold text-red-700" data-testid={`admin-ibp-missing-${event.id}`}>
                            Fehlend: {formatCurrency(event.missing_amount, event.currency)}
                          </p>
                        )}
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
                          data-testid={`admin-ibp-delete-btn-${event.id}`}
                        >
                          <Trash2 size={12} /> Archivieren
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

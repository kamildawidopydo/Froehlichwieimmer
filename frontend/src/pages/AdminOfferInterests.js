import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, Search, Mail, Phone, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Session 82.82 — Mongo-native. Kein Supabase-Import.
//   GET    /api/admin/offer-interests?q=&limit=&offset=
//   GET    /api/admin/offer-interests/{id}
//   DELETE /api/admin/offer-interests/{id}
// Preview: leere Collection ⇒ legitimer Empty State (kein Fake-Seed).

const API_BASE = process.env.REACT_APP_BACKEND_URL;

async function apiJson(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 204) return null;
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { /* keep raw */ }
  if (!res.ok) {
    const detail = (json && (json.detail || json.error)) || txt || `HTTP ${res.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return json;
}

const AdminOfferInterests = () => {
  const [interests, setInterests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce Search — Server-Side filtering.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchInterests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedQ) qs.set('q', debouncedQ);
      qs.set('limit', '200');
      const data = await apiJson(`/api/admin/offer-interests?${qs.toString()}`);
      setInterests(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (error) {
      toast.error('Fehler beim Laden der Interessenten: ' + (error?.message || ''));
      setInterests([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => { fetchInterests(); }, [fetchInterests]);

  const deleteInterest = async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) return;
    try {
      await apiJson(`/api/admin/offer-interests/${id}`, { method: 'DELETE' });
      toast.success('Eintrag erfolgreich gelöscht');
      setInterests((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (error) {
      toast.error('Fehler beim Löschen: ' + (error?.message || ''));
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Leads"
        title="Interessenten"
        titleIcon={Inbox}
        description="Anfragen zu Festgeld- und Tagesgeldangeboten — Kontakt und Zuordnung zur Bank."
      />

      <AdminToolbarCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" size={18} />
          <Input
            data-testid="offer-interests-search-input"
            placeholder="Suchen nach Name, E-Mail oder Bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
        <p className="text-sm text-bank-text-muted tabular-nums" data-testid="offer-interests-count">
          {total} {total === 1 ? 'Eintrag' : 'Einträge'} gefunden
        </p>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        <div className="overflow-x-auto" data-testid="offer-interests-table-wrap">
          <table className="w-full text-sm text-left">
            <thead className={adminTheadClass}>
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Datum</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Kontakt</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Bank / Angebot</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Nachricht</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-bank-text-muted">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-bank-text-muted" data-testid="offer-interests-loading">
                    Lädt Daten...
                  </td>
                </tr>
              ) : interests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-bank-text-muted" data-testid="offer-interests-empty">
                    Keine Interessenten gefunden.
                  </td>
                </tr>
              ) : (
                interests.map((item) => (
                  <tr key={item.id} data-testid={`offer-interests-row-${item.id}`} className={adminRowHover}>
                    <td className="px-6 py-4 whitespace-nowrap text-bank-text-muted">
                      {item.created_at ? format(new Date(item.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-bank-text">{item.name}</td>
                    <td className="px-6 py-4 text-bank-text-muted space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-bank-text-muted/70" />
                        <a href={`mailto:${item.email}`} className="text-bank-accent hover:underline">{item.email}</a>
                      </div>
                      {item.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-bank-text-muted/70" />
                          <a href={`tel:${item.phone}`} className="text-bank-text-muted hover:text-bank-text">{item.phone}</a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bank-accent/15 text-bank-text-muted">
                        {item.offer_bank_name || 'Unbekannt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-bank-text-muted max-w-xs truncate" title={item.message}>
                      {item.message || <span className="text-bank-text-muted/70 italic">Keine Nachricht</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        data-testid={`offer-interests-delete-btn-${item.id}`}
                        onClick={() => deleteInterest(item.id)}
                        className="p-2 text-bank-error hover:bg-bank-error/10 hover:text-bank-error rounded-lg transition-colors"
                        title="Eintrag löschen"
                      >
                        <Trash2 size={18} />
                      </button>
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

export default AdminOfferInterests;

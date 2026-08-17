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
import { MessageSquare, Search, Mail, RefreshCw, Filter, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'contacted', 'closed'];

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const AdminSocialPreviewMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      let query = supabase.from('social_preview_messages').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch {
      toast.error('Fehler beim Laden der Social-Nachrichten.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when filter changes
  }, [statusFilter]);

  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((item) =>
      [item.name, item.email, item.message_body, item.platform]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [messages, searchTerm]);

  const updateStatus = async (messageId, status) => {
    setUpdatingId(messageId);
    try {
      const { error } = await supabase
        .from('social_preview_messages')
        .update({ status, handled_at: status === 'new' ? null : new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
      setMessages((prev) => prev.map((row) => (row.id === messageId ? { ...row, status } : row)));
      toast.success('Status aktualisiert.');
    } catch {
      toast.error('Status konnte nicht aktualisiert werden.');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteMessage = async (messageId) => {
    const confirmed = window.confirm('Diese Nachricht wirklich dauerhaft löschen?');
    if (!confirmed) return;
    setUpdatingId(messageId);
    try {
      const { error } = await supabase.from('social_preview_messages').delete().eq('id', messageId);
      if (error) throw error;
      setMessages((prev) => prev.filter((row) => row.id !== messageId));
      toast.success('Nachricht gelöscht.');
    } catch {
      toast.error('Nachricht konnte nicht gelöscht werden.');
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

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Social-Vorschau"
        title="Nachrichten an Alexander Wahl Vermögensverwaltung GmbH"
        titleIcon={MessageSquare}
        description="Kontaktanfragen aus dem Instagram-Vorschau-Modal (Nachricht-Button)."
        actions={
          <Button variant="outline" onClick={fetchMessages} disabled={loading} className="rounded-xl">
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
            placeholder="Name, E-Mail oder Nachricht…"
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                  Absender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                  Nachricht
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">
                  Quelle
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
                    Nachrichten werden geladen…
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">
                    Keine Nachrichten gefunden.
                  </td>
                </tr>
              ) : (
                filteredMessages.map((row) => (
                  <tr key={row.id} className={adminRowHover}>
                    <td className="px-4 py-4 text-sm text-bank-text-muted">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-bank-text">{row.name}</p>
                      <a
                        href={`mailto:${row.email}`}
                        className="mt-1 flex items-center gap-2 text-sm text-bank-accent hover:underline"
                      >
                        <Mail size={13} />
                        {row.email}
                      </a>
                    </td>
                    <td className="max-w-md px-4 py-4 text-sm text-bank-text-muted">
                      <p className="line-clamp-4 whitespace-pre-wrap">{row.message_body}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-bank-text-muted">
                      {PLATFORM_LABELS[row.platform] ?? row.platform}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={row.status}
                        disabled={updatingId === row.id}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
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
                        onClick={() => deleteMessage(row.id)}
                        disabled={updatingId === row.id}
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
  );
};

export default AdminSocialPreviewMessages;

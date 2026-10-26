import { getApiBase } from '@/lib/apiBase';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  User,
  Mail,
  Plus,
  KeyRound,
  Copy,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { validatePersonName } from '@/lib/personName';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  AdminToolbarCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

// Session 82.81 — Mongo-native. Kein Supabase-Import, kein `profiles`-Read.
// Nur die 3 real existierenden Admin-Endpoints:
//   GET  /api/admin/users?q=&limit=&offset=  → { total, limit, offset, items[] }
//   GET  /api/admin/users/{id}               → user (whitelist)
//   POST /api/admin/users {email, name}      → { id, email, name, role, temporary_password }
// Approve/Reject bewusst entfernt — der `status`-Zustand existiert im Backend-
// Datenmodell nicht (Session-82.81-Audit) und wird gemäß Mandat nicht erfunden.

const API_BASE = getApiBase();
const PAGE_SIZE = 50;

async function apiJson(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
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

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (searchTerm.trim()) qs.set('q', searchTerm.trim());
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(offset));
      const data = await apiJson(`/api/admin/users?${qs.toString()}`);
      setUsers(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, offset]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset offset when search term changes
  useEffect(() => { setOffset(0); }, [searchTerm]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const nameCheck = validatePersonName(newUserName, { label: 'Name' });
    if (!nameCheck.ok) { toast.error(nameCheck.message); return; }
    const email = newUserEmail.trim().toLowerCase();
    if (!email) return;

    setCreatingUser(true);
    setTempCredentials(null);
    try {
      const data = await apiJson('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, name: nameCheck.value }),
      });
      setTempCredentials({
        email: data.email,
        name: data.name,
        temporaryPassword: data.temporary_password,
        userId: data.id,
      });
      setNewUserName('');
      setNewUserEmail('');
      toast.success('Benutzer angelegt. Zugangsdaten wurden per E-Mail an den Kunden gesendet.');
      fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Fehler beim Erstellen.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Kunde "${u.name || u.email}" (${u.email}) endgültig löschen?`)) return;
    try {
      await apiJson(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      toast.success('Kunde wurde gelöscht.');
      fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Löschen fehlgeschlagen.');
    }
  };

  const copyTemporaryPassword = async () => {
    if (!tempCredentials?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(tempCredentials.temporaryPassword);
      toast.success('Temporäres Passwort kopiert.');
    } catch { toast.error('Konnte nicht kopiert werden.'); }
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Kunden"
        title="Benutzerverwaltung"
        titleIcon={User}
        description="Kunden anlegen und Detailprofile mit Portfolio-Übersicht öffnen."
      />

      <div
        data-testid="admin-users-create-card"
        className="relative mb-8 overflow-hidden border border-bank-gold/45 bg-bank-ink p-5 text-bank-on-ink shadow-editorial-sm sm:p-6"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
        <div aria-hidden className="absolute inset-0 mesh-navy opacity-80" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-ink-elev text-bank-gold">
            <Plus size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">Provisioning</p>
            <h2 className="mt-1.5 font-display text-[1.2rem] font-light leading-tight text-white" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}>
              Neuen Benutzer anlegen
            </h2>
            <p className="mt-2 max-w-xl text-[12.5px] leading-snug text-white/75">
              Der Kunde erhält automatisch eine E-Mail mit seinen Zugangsdaten und einem vorläufigen Passwort. Bei der ersten Anmeldung legt er ein eigenes Passwort fest.
            </p>
            <form onSubmit={handleCreateUser} className="mt-4 flex flex-col gap-2" data-testid="admin-users-create-form">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input
                  data-testid="admin-users-create-name"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(sanitizeFormField('name', e.target.value))}
                  placeholder="Vor- und Nachname"
                  required
                  autoComplete="name"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/45 focus-visible:border-bank-gold/65 focus-visible:bg-white/10 focus-visible:ring-bank-gold/35 sm:min-w-[16rem] sm:flex-1"
                />
                <Input
                  data-testid="admin-users-create-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="kunde@beispiel.de"
                  required
                  autoComplete="email"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/45 focus-visible:border-bank-gold/65 focus-visible:bg-white/10 focus-visible:ring-bank-gold/35 sm:min-w-[14rem] sm:flex-1"
                />
              </div>
              <Button
                data-testid="admin-users-create-btn"
                type="submit"
                variant="outline-accent"
                disabled={creatingUser}
                className="w-full sm:w-auto sm:self-start"
              >
                {creatingUser ? <RefreshCw size={13} strokeWidth={1.5} className="animate-spin" /> : <Plus size={13} strokeWidth={1.5} />}
                Benutzer erstellen
              </Button>
            </form>

            {tempCredentials && (
              <div className="relative mt-5 border border-bank-gold/55 bg-bank-ink-elev p-4" data-testid="admin-users-temp-credentials">
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-bank-gold/65" />
                <div className="flex items-center gap-2 text-bank-gold">
                  <KeyRound size={13} strokeWidth={1.5} />
                  <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em]">Temporäre Zugangsdaten</span>
                </div>
                <div className="mt-3 space-y-1.5 text-[12.5px] text-white/85">
                  {tempCredentials.name && (
                    <p><span className="font-mono uppercase tracking-[0.16em] text-white/55">Name ·</span> {tempCredentials.name}</p>
                  )}
                  <p><span className="font-mono uppercase tracking-[0.16em] text-white/55">E-Mail ·</span> {tempCredentials.email}</p>
                  <p className="break-all font-mono tabular-nums">
                    <span className="font-mono uppercase not-italic tracking-[0.16em] text-white/55">Passwort ·</span>{' '}
                    {tempCredentials.temporaryPassword}
                  </p>
                  <p className="text-rose-300/90">Nur einmal sichtbar — bitte jetzt kopieren.</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline-accent" size="sm" onClick={copyTemporaryPassword} data-testid="admin-users-copy-pw">
                    <Copy size={12} strokeWidth={1.5} /> Passwort kopieren
                  </Button>
                  <Button type="button" variant="outline-accent" size="sm" onClick={() => navigate(`/admin/users/${tempCredentials.userId}`)}>
                    <Eye size={12} strokeWidth={1.5} /> Benutzer öffnen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[12.5px] text-bank-text-muted">
            <span className="font-mono uppercase tracking-[0.16em]">Gesamt · </span>
            <span className="font-mono tabular-nums text-bank-text">{total}</span>
            {total > 0 && (
              <span className="ml-2 text-bank-text-muted/85">
                (Zeige <span className="font-mono tabular-nums">{pageStart}</span>–<span className="font-mono tabular-nums">{pageEnd}</span>)
              </span>
            )}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:max-w-md">
            <div className="relative flex-1">
              <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
              <Input
                data-testid="admin-users-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name oder E-Mail…"
                className="pl-9"
              />
            </div>
            <Button variant="outline-ink" size="default" onClick={fetchUsers} data-testid="admin-users-refresh-btn">
              <RefreshCw size={13} strokeWidth={1.5} /> Aktualisieren
            </Button>
          </div>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-20 text-center" data-testid="admin-users-loading">
            <RefreshCw size={20} strokeWidth={1.5} className="mx-auto mb-3 animate-spin text-bank-gold/65" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Wird geladen…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center" data-testid="admin-users-empty">
            <User size={28} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              {searchTerm ? 'Keine Ergebnisse für Ihre Suche' : 'Keine Benutzer gefunden'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="admin-users-table-wrap">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Benutzer</th>
                  <th className="px-4 py-3 text-left">E-Mail</th>
                  <th className="px-4 py-3 text-left">Rolle</th>
                  <th className="px-4 py-3 text-left">Registriert</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid={`admin-users-row-${u.id}`} className={cn('border-b border-bank-border last:border-b-0', adminRowHover)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-bank-border bg-bank-bg/60">
                          <User size={14} strokeWidth={1.5} className="text-bank-text-muted" />
                        </div>
                        <span className="text-[13.5px] font-medium text-bank-text">{u.name || '–'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[13px] text-bank-text-muted">
                        <Mail size={12} strokeWidth={1.5} className="shrink-0 text-bank-gold" />
                        {u.email || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                        u.role === 'admin'
                          ? 'border-bank-gold/55 bg-bank-gold/10 text-bank-gold'
                          : 'border-bank-border bg-bank-bg/40 text-bank-text-muted',
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] tabular-nums text-bank-text-muted">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline-ink" onClick={() => navigate(`/admin/users/${u.id}`)} data-testid={`admin-users-open-btn-${u.id}`}>
                        <Eye size={12} strokeWidth={1.5} /> Öffnen
                      </Button>
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="outline" className="ml-2 border-red-300 text-red-700 hover:bg-red-50" onClick={() => handleDeleteUser(u)} data-testid={`admin-users-delete-btn-${u.id}`}>
                          <Trash2 size={12} strokeWidth={1.5} /> Löschen
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-2" data-testid="admin-users-pagination">
          <Button variant="outline-ink" size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={!canPrev || loading}>
            <ChevronLeft size={12} strokeWidth={1.5} /> Zurück
          </Button>
          <Button variant="outline-ink" size="sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!canNext || loading}>
            Weiter <ChevronRight size={12} strokeWidth={1.5} />
          </Button>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminUsers;

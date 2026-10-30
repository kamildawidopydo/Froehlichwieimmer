import { getApiBase } from '@/lib/apiBase';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  RefreshCw,
  User,
  Plus,
  KeyRound,
  Copy,
  Eye,
} from 'lucide-react';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { validatePersonName } from '@/lib/personName';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
} from '@/components/admin/AdminSubpageChrome';
import CustomerOverview from '@/components/admin/customers/CustomerOverview';

// Session 82.81 — Mongo-native. Kein Supabase-Import, kein `profiles`-Read.
// Nur die 3 real existierenden Admin-Endpoints:
//   GET  /api/admin/users?q=&limit=&offset=  → { total, limit, offset, items[] }
//   GET  /api/admin/users/{id}               → user (whitelist)
//   POST /api/admin/users {email, name}      → { id, email, name, role, temporary_password }
// Approve/Reject bewusst entfernt — der `status`-Zustand existiert im Backend-
// Datenmodell nicht (Session-82.81-Audit) und wird gemäß Mandat nicht erfunden.

const API_BASE = getApiBase();

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
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);

  // Read-only overview (all accounts); search/filter/sort happen client-side.
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await apiJson('/api/admin/customers/overview'));
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Kunden"
        title="Kundenverwaltung"
        titleIcon={User}
        description="Alle Kunden mit Vermögen, offenen Vorgängen und letzter Aktivität. Kunden anlegen und Detailprofile öffnen."
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

      <CustomerOverview
        data={overview}
        loading={loading}
        onRefresh={fetchUsers}
        onOpen={(c) => navigate(`/admin/users/${c.id}`)}
        onDelete={handleDeleteUser}
      />
    </AdminSubpageLayout>
  );
};

export default AdminUsers;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  User,
  Mail,
  Globe,
  AlertTriangle,
  Plus,
  KeyRound,
  Copy,
  Eye,
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

const STATUS_CONFIG = {
  pending: {
    label: 'Ausstehend',
    cls: 'border-amber-300/55 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Freigeschaltet',
    cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Abgelehnt',
    cls: 'border-rose-300/55 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, email, country, phone, role, status, verified, created_at, last_seen_at',
        )
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, name) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved', verified: true })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`${name} wurde erfolgreich freigeschaltet.`);
      await fetchUsers();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (userId, name) => {
    setRejectModal({ userId, name });
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          verified: false,
          rejection_reason: rejectReason.trim() || null,
        })
        .eq('id', rejectModal.userId);

      if (error) throw error;
      toast.success(`${rejectModal.name} wurde abgelehnt.`);
      setRejectModal(null);
      await fetchUsers();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const firstNameCheck = validatePersonName(newUserFirstName, { label: 'Vorname' });
    const lastNameCheck = validatePersonName(newUserLastName, { label: 'Nachname' });
    if (!firstNameCheck.ok) {
      toast.error(firstNameCheck.message);
      return;
    }
    if (!lastNameCheck.ok) {
      toast.error(lastNameCheck.message);
      return;
    }
    const email = newUserEmail.trim().toLowerCase();
    if (!email) return;

    setCreatingUser(true);
    setTempCredentials(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { email, first_name: firstNameCheck.value, last_name: lastNameCheck.value },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Benutzer konnte nicht erstellt werden.');

      setTempCredentials({
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        temporaryPassword: data.temporary_password,
        userId: data.user_id,
      });
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserEmail('');
      toast.success(
        data.email_sent === false
          ? 'Benutzer wurde angelegt. Die Willkommens-E-Mail konnte nicht versendet werden.'
          : 'Benutzer wurde angelegt. Zugangsdaten wurden per E-Mail versendet.',
      );
      setActiveTab('all');
      await fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Erstellen des Benutzers.');
    } finally {
      setCreatingUser(false);
    }
  };

  const copyTemporaryPassword = async () => {
    if (!tempCredentials?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(tempCredentials.temporaryPassword);
      toast.success('Temporäres Passwort kopiert.');
    } catch (err) {
      toast.error('Konnte nicht kopiert werden.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.country || '').toLowerCase().includes(term)
    );
  });

  const tabs = [
    { key: 'all', label: 'Alle' },
    { key: 'pending', label: 'Ausstehend' },
    { key: 'approved', label: 'Freigeschaltet' },
    { key: 'rejected', label: 'Abgelehnt' },
  ];

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Kunden"
        title="Benutzerverwaltung"
        titleIcon={User}
        description="Registrierungen prüfen, Benutzer anlegen und Detailprofile mit Portfolio-Übersicht öffnen."
      />

      {/* Create User Panel — ink editorial */}
      <div className="relative mb-8 overflow-hidden border border-bank-gold/45 bg-bank-ink p-5 text-bank-on-ink shadow-editorial-sm sm:p-6">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
        <div aria-hidden className="absolute inset-0 mesh-navy opacity-80" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-ink-elev text-bank-gold">
            <Plus size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
              Provisioning
            </p>
            <h2
              className="mt-1.5 font-display text-[1.2rem] font-light leading-tight text-white"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              Neuen Benutzer anlegen
            </h2>
            <p className="mt-2 max-w-xl text-[12.5px] leading-snug text-white/75">
              Konto ist sofort freigeschaltet. Zugangsdaten werden per E-Mail versendet; erster Login erzwingt Passwortwechsel.
            </p>
            <form
              onSubmit={handleCreateUser}
              className="mt-4 flex flex-col gap-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input
                  type="text"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(sanitizeFormField('first_name', e.target.value))}
                  placeholder="Vorname"
                  required
                  autoComplete="given-name"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/45 focus-visible:border-bank-gold/65 focus-visible:bg-white/10 focus-visible:ring-bank-gold/35 sm:max-w-[11rem]"
                />
                <Input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(sanitizeFormField('last_name', e.target.value))}
                  placeholder="Nachname"
                  required
                  autoComplete="family-name"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/45 focus-visible:border-bank-gold/65 focus-visible:bg-white/10 focus-visible:ring-bank-gold/35 sm:max-w-[11rem]"
                />
                <Input
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
                type="submit"
                variant="outline-accent"
                disabled={creatingUser}
                className="w-full sm:w-auto sm:self-start"
              >
                {creatingUser ? (
                  <RefreshCw size={13} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Plus size={13} strokeWidth={1.5} />
                )}
                Benutzer erstellen
              </Button>
            </form>

            {tempCredentials && (
              <div className="relative mt-5 border border-bank-gold/55 bg-bank-ink-elev p-4">
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-bank-gold/65" />
                <div className="flex items-center gap-2 text-bank-gold">
                  <KeyRound size={13} strokeWidth={1.5} />
                  <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em]">
                    Temporäre Zugangsdaten
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-[12.5px] text-white/85">
                  {(tempCredentials.firstName || tempCredentials.lastName) && (
                    <p>
                      <span className="font-mono uppercase tracking-[0.16em] text-white/55">
                        Name ·
                      </span>{' '}
                      {[tempCredentials.firstName, tempCredentials.lastName].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <p>
                    <span className="font-mono uppercase tracking-[0.16em] text-white/55">
                      E-Mail ·
                    </span>{' '}
                    {tempCredentials.email}
                  </p>
                  <p className="break-all font-mono tabular-nums">
                    <span className="font-mono uppercase not-italic tracking-[0.16em] text-white/55">
                      Passwort ·
                    </span>{' '}
                    {tempCredentials.temporaryPassword}
                  </p>
                  <p className="text-rose-300/90">
                    Nur einmal sichtbar — wurde auch per E-Mail versendet.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline-accent"
                    size="sm"
                    onClick={copyTemporaryPassword}
                  >
                    <Copy size={12} strokeWidth={1.5} />
                    Passwort kopieren
                  </Button>
                  <Button
                    type="button"
                    variant="outline-accent"
                    size="sm"
                    onClick={() => navigate(`/admin/users/${tempCredentials.userId}`)}
                  >
                    <Eye size={12} strokeWidth={1.5} />
                    Benutzer öffnen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + toolbar */}
      <AdminToolbarCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" className="inline-flex flex-wrap gap-2">
            {tabs.map(({ key, label }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'border px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                    active
                      ? 'border-bank-ink bg-bank-ink text-white'
                      : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:max-w-md">
            <div className="relative flex-1">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, E-Mail oder Land…"
                className="pl-9"
                aria-label="Benutzer suchen"
              />
            </div>
            <Button variant="outline-ink" size="default" onClick={fetchUsers}>
              <RefreshCw size={13} strokeWidth={1.5} /> Aktualisieren
            </Button>
          </div>
        </div>
      </AdminToolbarCard>

      {/* Table */}
      <AdminSurfaceCard>
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw
              size={20}
              strokeWidth={1.5}
              className="mx-auto mb-3 animate-spin text-bank-gold/65"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              Wird geladen…
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center">
            <User size={28} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              {searchTerm
                ? 'Keine Ergebnisse für Ihre Suche'
                : activeTab === 'all'
                  ? 'Keine Benutzer gefunden'
                  : `Keine ${STATUS_CONFIG[activeTab]?.label.toLowerCase()} Benutzer`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Benutzer</th>
                  <th className="px-4 py-3 text-left">E-Mail</th>
                  <th className="px-4 py-3 text-left">Land</th>
                  <th className="px-4 py-3 text-left">Registriert</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  {activeTab === 'pending' && <th className="px-4 py-3 text-left">Aktionen</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const cfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const fullName =
                    `${u.first_name || ''} ${u.last_name || ''}`.trim() || '–';
                  const isActing = actionLoading === u.id;
                  const isOnline =
                    u.last_seen_at &&
                    Date.now() - new Date(u.last_seen_at).getTime() < 2 * 60 * 1000;

                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        'border-b border-bank-border last:border-b-0',
                        adminRowHover,
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-bank-border bg-bank-bg/60">
                            <User size={14} strokeWidth={1.5} className="text-bank-text-muted" />
                            {isOnline && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-2 border-white bg-emerald-500"
                                title={`Online · zuletzt gesehen ${new Date(u.last_seen_at).toLocaleString('de-DE')}`}
                              />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="text-[13.5px] font-medium text-bank-text">
                              {fullName}
                            </span>
                            {u.last_seen_at && (
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
                                {isOnline
                                  ? 'Jetzt online'
                                  : `zuletzt ${new Date(u.last_seen_at).toLocaleString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[13px] text-bank-text-muted">
                          <Mail
                            size={12}
                            strokeWidth={1.5}
                            className="shrink-0 text-bank-gold"
                          />
                          {u.email || '–'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          <Globe
                            size={12}
                            strokeWidth={1.5}
                            className="shrink-0 text-bank-gold"
                          />
                          {u.country || '–'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] tabular-nums text-bank-text-muted">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                            cfg.cls,
                          )}
                        >
                          <StatusIcon size={10} strokeWidth={1.5} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline-ink"
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
                          <Eye size={12} strokeWidth={1.5} />
                          Öffnen
                        </Button>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApprove(u.id, fullName)}
                              disabled={isActing}
                            >
                              {isActing ? (
                                <RefreshCw size={12} strokeWidth={1.5} className="animate-spin" />
                              ) : (
                                <CheckCircle size={12} strokeWidth={1.5} />
                              )}
                              Freischalten
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectModal(u.id, fullName)}
                              disabled={isActing}
                              className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <XCircle size={12} strokeWidth={1.5} />
                              Ablehnen
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      {/* Reject Modal — editorial */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgb(11 21 32 / 0.62)' }}
          onClick={() => setRejectModal(null)}
        >
          <div
            className="relative w-full max-w-md border border-bank-border bg-white shadow-editorial-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
            <div className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-rose-300/55 bg-rose-50 text-rose-600">
                  <AlertTriangle size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Bestätigung erforderlich
                  </p>
                  <h3
                    className="mt-1.5 font-display text-[1.2rem] font-light leading-tight text-bank-text"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                  >
                    Benutzer ablehnen
                  </h3>
                  <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
                  <p className="mt-2 text-[13px] text-bank-text-muted">{rejectModal.name}</p>
                </div>
              </div>

              <p className="mb-4 text-[13px] leading-snug text-bank-text-muted">
                Der Benutzer erhält nach der Ablehnung eine Benachrichtigung per E-Mail.
              </p>

              <div className="mb-5">
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Ablehnungsgrund{' '}
                  <span className="font-mono normal-case tracking-normal text-bank-text-muted/65">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full resize-none border border-bank-border bg-white px-3 py-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                  rows={3}
                  placeholder="z.B. Unvollständige Angaben, außerhalb des Zielmarkts…"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline-ink"
                  onClick={() => setRejectModal(null)}
                  className="flex-1"
                  disabled={actionLoading === rejectModal.userId}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading === rejectModal.userId}
                  className="flex-1 border border-rose-700 bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                >
                  {actionLoading === rejectModal.userId ? (
                    <RefreshCw size={13} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <XCircle size={13} strokeWidth={1.5} />
                  )}
                  Ablehnen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminUsers;

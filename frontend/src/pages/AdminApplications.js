import React, { useState, useEffect } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  FileText, RefreshCw, Eye, Loader2, CheckCircle,
  Clock, Send, Filter, Search, User, Building2,
  Calendar, Mail, Phone, MapPin, ShieldCheck, Trash2,
} from 'lucide-react';

const statusOptions = [
  { value: 'Neu', label: 'Neu', icon: FileText, color: 'border-bank-border bg-bank-bg/45 text-bank-text-muted' },
  { value: 'In Bearbeitung', label: 'In Bearbeitung', icon: Clock, color: 'border-amber-300/55 bg-amber-50 text-amber-700' },
  { value: 'Weitergeleitet', label: 'Weitergeleitet', icon: Send, color: 'border-violet-300/55 bg-violet-50 text-violet-700' },
  { value: 'Abgeschlossen', label: 'Abgeschlossen', icon: CheckCircle, color: 'border-emerald-300/55 bg-emerald-50 text-emerald-700' },
];

const identityAnswerLabels = {
  full_name: 'Vollständiger Name',
  birth_date: 'Geburtsdatum',
  birth_city: 'Geburtsstadt',
  address: 'Wohnanschrift',
  self_applied: 'Konto/Depot selbst beantragt',
  email_access: 'Zugriff auf E-Mail-Adresse',
  own_document_confirm: 'Eigener Ausweis bestätigt',
  document_valid_confirm: 'Ausweis aktuell gültig',
  document_number: 'Ausweisnummer',
  all_data_correct: 'Alle Angaben korrekt',
  finish_process: 'Identifizierungsprozess abschließen',
};

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase
      .from('applications')
      .select('id, personal_data, investment_data, status, pdf_url, created_at')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Fehler beim Laden der Anträge');
    } else {
      // Liste normalisieren — flache Felder aus personal_data und investment_data
      const result = (data || []).map((app) => ({
        id: app.id,
        applicant_name: `${app.personal_data?.first_name || ''} ${app.personal_data?.last_name || ''}`.trim(),
        bank_name: app.investment_data?.bank_name || '–',
        investment_amount: app.investment_data?.investment_amount,
        term_months: app.investment_data?.term_months,
        email: app.personal_data?.email || '–',
        status: app.status,
        has_pdf: !!app.pdf_url,
        pdf_url: app.pdf_url || null,
        created_at: app.created_at,
        // Rohdaten für Detail-Modal
        personal_data: app.personal_data,
        investment_data: app.investment_data,
      }));
      setApplications(result);
    }
    setLoading(false);
  };

  const fetchApplicationDetail = async (appId) => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', appId)
      .single();

    if (error) {
      toast.error('Fehler beim Laden des Antrags');
    } else {
      setSelectedApp(data);
      setDetailModalOpen(true);
    }
  };

  const updateStatus = async (appId, newStatus) => {
    setStatusUpdateLoading(true);

    // Neuen Eintrag in status_history hinzufügen
    const currentHistory = selectedApp?.status_history || [];
    const newEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: statusNote || null,
    };

    const { error } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        status_history: [...currentHistory, newEntry],
      })
      .eq('id', appId);

    if (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    } else {
      toast.success('Status aktualisiert');
      setStatusNote('');
      // Detail und Liste neu laden
      await fetchApplications();
      await fetchApplicationDetail(appId);
    }
    setStatusUpdateLoading(false);
  };

  const deleteApplication = async (appId) => {
    const confirmed = window.confirm('Möchtest du diesen Antrag wirklich dauerhaft löschen?');
    if (!confirmed) return;

    toast.info('Legacy-Mutation deaktiviert (Session 82.91b · BLOCKED_SEMANTICS). Neuer FastAPI-Endpoint noch nicht freigeschaltet.');
    return;

    // eslint-disable-next-line no-unreachable
    toast.success('Antrag gelöscht');
    setApplications((prev) => prev.filter((app) => app.id !== appId));
    if (selectedApp?.id === appId) {
      setDetailModalOpen(false);
      setSelectedApp(null);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.applicant_name.toLowerCase().includes(q) ||
      app.bank_name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatCurrency = (amount) =>
    amount
      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount)
      : '–';

  const getStatusBadge = (status) => {
    const option = statusOptions.find((o) => o.value === status) || statusOptions[0];
    const Icon = option.icon;
    return (
      <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${option.color}`}>
        <Icon size={11} strokeWidth={1.5} />
        {status}
      </span>
    );
  };

  return (
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Anträge"
          title="Festgeldanträge"
          titleIcon={FileText}
          description="Eingegangene Anträge filtern, PDFs öffnen und Bearbeitungsstatus pflegen."
          actions={
            <Button variant="outline-ink" onClick={fetchApplications} disabled={loading} data-testid="btn-refresh">
              <RefreshCw size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
              Aktualisieren
            </Button>
          }
        />

        <AdminToolbarCard>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="relative">
                <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
                <Input
                  placeholder="Suchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:w-64"
                  data-testid="search-applications"
                  aria-label="Anträge suchen"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="filter-status">
                  <Filter size={14} strokeWidth={1.5} className="mr-2 text-bank-gold" />
                  <SelectValue placeholder="Alle Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={22} strokeWidth={1.5} className="animate-spin text-bank-gold" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={32} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Keine Anträge gefunden
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="applications-table">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Bank</th>
                    <th className="px-4 py-3 text-right">Anlagebetrag</th>
                    <th className="px-4 py-3 text-right">Laufzeit</th>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`} data-testid={`app-row-${app.id}`}>
                      <td className="px-4 py-3">
                        <p className="text-[13.5px] font-medium text-bank-text">
                          {app.applicant_name || '–'}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          <Mail size={10} strokeWidth={1.5} className="text-bank-gold" />
                          {app.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] text-bank-text">{app.bank_name}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rate-figure text-[13px] tabular-nums text-bank-text">
                          {formatCurrency(app.investment_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12px] tabular-nums text-bank-text-muted">
                        {app.term_months ? `${app.term_months} M` : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] tabular-nums text-bank-text-muted">
                          <Calendar size={11} strokeWidth={1.5} className="text-bank-gold" />
                          {formatDate(app.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.pdf_url && (
                            <Button
                              variant="outline-ink"
                              size="sm"
                              onClick={() => window.open(app.pdf_url, '_blank')}
                              title="PDF öffnen"
                              data-testid={`btn-open-${app.id}`}
                            >
                              PDF
                            </Button>
                          )}
                          <Button
                            variant="outline-ink"
                            size="sm"
                            onClick={() => fetchApplicationDetail(app.id)}
                            data-testid={`btn-view-${app.id}`}
                          >
                            <Eye size={12} strokeWidth={1.5} />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => deleteApplication(app.id)}
                            data-testid={`btn-delete-${app.id}`}
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
                            Löschen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredApplications.length > 0 && (
            <div className="border-t border-bank-border bg-bank-bg/45 px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] tabular-nums text-bank-text-muted">
              {filteredApplications.length} Antrag{filteredApplications.length !== 1 ? 'e' : ''} gefunden
            </div>
          )}
        </AdminSurfaceCard>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Antragsdetails
            </DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between bg-bank-bg rounded-lg p-4">
                <div>
                  <p className="text-sm text-bank-text-muted mb-1">Aktueller Status</p>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-bank-text-muted mb-1">Antragsnummer</p>
                  <p className="font-mono font-bold">{selectedApp.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Personal Data */}
              <div>
                <h3 className="font-semibold text-bank-text mb-3 flex items-center gap-2">
                  <User size={18} />Persönliche Daten
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-bank-text-muted">Name</p>
                    <p className="font-medium">
                      {selectedApp.personal_data?.first_name} {selectedApp.personal_data?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Geburtsdatum</p>
                    <p className="font-medium">{selectedApp.personal_data?.birth_date || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">E-Mail</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail size={14} />{selectedApp.personal_data?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Telefon</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone size={14} />{selectedApp.personal_data?.phone || '–'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-bank-text-muted">Adresse</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin size={14} />{selectedApp.personal_data?.address || '–'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Investment Data */}
              <div>
                <h3 className="font-semibold text-bank-text mb-3 flex items-center gap-2">
                  <Building2 size={18} />Anlagedetails
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-bank-text-muted">Bank</p>
                    <p className="font-medium">{selectedApp.investment_data?.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Anlagebetrag</p>
                    <p className="font-medium">{formatCurrency(selectedApp.investment_data?.investment_amount)}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Laufzeit</p>
                    <p className="font-medium">{selectedApp.investment_data?.term_months} Monate</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Zinssatz</p>
                    <p className="font-medium text-bank-primary">{selectedApp.investment_data?.interest_rate}% p.a.</p>
                  </div>
                </div>
              </div>

              {/* Identity Verification */}
              {selectedApp.personal_data?.identity_verification && (
                <div>
                  <h3 className="font-semibold text-bank-text mb-3 flex items-center gap-2">
                    <ShieldCheck size={18} />AI-Identifizierung
                  </h3>
                  <div className="rounded-xl border border-bank-border bg-bank-bg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-bank-text-muted">Ergebnis</p>
                        <p className="font-medium">
                          {selectedApp.personal_data?.identity_verification?.success_title || 'Identifizierung erfolgreich'}
                        </p>
                      </div>
                      <div>
                        <p className="text-bank-text-muted">Video-ID</p>
                        <p className="font-mono font-semibold">
                          {selectedApp.personal_data?.identity_verification?.video_id || '–'}
                        </p>
                      </div>
                      <div>
                        <p className="text-bank-text-muted">Abgeschlossen am</p>
                        <p className="font-medium">
                          {selectedApp.personal_data?.identity_verification?.completed_at
                            ? formatDate(selectedApp.personal_data.identity_verification.completed_at)
                            : '–'}
                        </p>
                      </div>
                      <div>
                        <p className="text-bank-text-muted">Liveness</p>
                        <p className="font-medium">
                          {selectedApp.personal_data?.identity_verification?.liveness_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-bank-text-muted text-sm">Success-Text</p>
                      <p className="text-sm font-medium text-bank-text">
                        {selectedApp.personal_data?.identity_verification?.success_message || '–'}
                      </p>
                    </div>
                    {Object.keys(selectedApp.personal_data?.identity_verification?.ai_answers || {}).length > 0 && (
                      <div>
                        <p className="text-bank-text-muted text-sm mb-2">AI-Fragen & Antworten</p>
                        <div className="space-y-2">
                          {Object.entries(selectedApp.personal_data.identity_verification.ai_answers).map(([key, value]) => (
                            <div key={key} className="rounded-lg border border-bank-border bg-white px-3 py-2 text-sm">
                              <p className="text-bank-text-muted text-xs">
                                {identityAnswerLabels[key] || key}
                              </p>
                              <p className="font-medium text-bank-text break-words">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PDF */}
              {selectedApp.pdf_url && (
                <div className="bg-bank-success/10 border border-bank-success/25 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-bank-success" />
                    <div>
                      <p className="font-medium text-bank-success">Festgeldvertrag (PDF)</p>
                      <p className="text-xs text-bank-success">Automatisch generiertes Vertragsdokument</p>
                    </div>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="text-bank-accent border-bank-border hover:bg-bank-accent/10"
                    onClick={() => window.open(selectedApp.pdf_url, '_blank')}
                  >
                    Öffnen
                  </Button>
                </div>
              )
              }

              {selectedApp.documents?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-bank-text mb-3 flex items-center gap-2">
                    <FileText size={18} />
                    Hochgeladene Dokumente ({selectedApp.documents.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedApp.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-bank-bg border border-bank-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={16} className="text-bank-text-muted shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-bank-text truncate">{doc.name}</p>
                            <p className="text-xs text-bank-text-muted capitalize">
                              {doc.type?.replace(/_/g, ' ')} · {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('de-DE') : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-bank-accent border-bank-border hover:bg-bank-accent/10 shrink-0 ml-3"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          Öffnen
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {selectedApp.status_history?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-bank-text mb-3 flex items-center gap-2">
                    <Clock size={18} />Status-Verlauf
                  </h3>
                  <div className="space-y-2">
                    {selectedApp.status_history.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-bank-accent/100 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium">{entry.status}</p>
                          <p className="text-bank-text-muted text-xs">{formatDate(entry.timestamp)}</p>
                          {entry.note && <p className="text-bank-text-muted text-xs mt-0.5">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Status */}
              <div className="border-t border-bank-border pt-4">
                <h3 className="font-semibold text-bank-text mb-3">Status aktualisieren</h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={selectedApp.status === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateStatus(selectedApp.id, option.value)}
                        disabled={statusUpdateLoading || selectedApp.status === option.value}
                        className="rounded-full"
                      >
                        <option.icon size={14} className="mr-1" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="status-note">Notiz (optional)</Label>
                    <Textarea
                      id="status-note"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Hinweis zur Statusänderung..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </AdminSubpageLayout>
  );
};

export default AdminApplications;
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
// Session 82.100 — Supabase-RPC + Storage-Signed-URL entfernt.
// Reads: `GET /api/admin/contract-form-submissions`; Downloads laufen über
// den 82.99-Storage-Proxy `GET /api/admin/document-uploads/files/{id}/download`.
const API = getApiBase();
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText,
  RefreshCw,
  Search,
  Eye,
  Mail,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

const PRODUCT_LABELS = {
  bbva_flexgeld: 'BBVA Flexgeld',
  bbva_festgeld: 'BBVA Festgeld',
  postbank_flexgeld: 'Postbank Flexgeld',
  postbank_festgeld: 'Postbank Festgeld',
  ing_flexgeld: 'ING Flexgeld',
  ing_festgeld: 'ING Festgeld',
  bunq_flexgeld: 'bunq NL Flexgeld',
  bunq_festgeld: 'bunq NL Festgeld',
  bunq_de_flexgeld: 'bunq DE Flexgeld',
  bunq_de_festgeld: 'bunq DE Festgeld',
  knab_flexgeld: 'Knab Flexgeld',
  knab_festgeld: 'Knab Festgeld',
};

const STATUS_LABEL = {
  new: { cls: 'border-amber-300/55 bg-amber-50 text-amber-800', label: 'Neu' },
  handled: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Erledigt' },
};

const STORAGE_BUCKET = 'contract-submissions';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSummaryValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('de-DE');
  return String(value);
}

const SUMMARY_LABELS = {
  investmentAmount: 'Anlagebetrag',
  interestRate: 'Zinssatz p.a.',
  term: 'Laufzeit',
  welcomeBonus: 'Willkommensbonus',
  interestPayment: 'Zinsgutschrift',
  iban: 'IBAN',
  secondInvestor: 'Zweiter Anleger',
  festgeldAmount: 'Festgeld Betrag',
  festgeldTerm: 'Festgeld Laufzeit',
  festgeldRate: 'Festgeld Zinssatz',
  flexgeldAmount: 'Flexgeld Betrag',
  flexgeldRate: 'Flexgeld Zinssatz',
};

const AdminContractSubmissions = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (productFilter !== 'all') params.product_key = productFilter;
      const { data } = await axios.get(`${API}/api/admin/contract-form-submissions`, {
        withCredentials: true, params,
      });
      setRows(data?.items || []);
    } catch (err) {
      toast.error('Vertrags-Einreichungen konnten nicht geladen werden: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [productFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.customer_name, r.customer_email, r.bank_name, r.product_key, PRODUCT_LABELS[r.product_key]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, searchTerm]);

  const resolveSignedUrl = async (storagePath) => {
    // Session 82.100 · Downloads laufen über Backend-Proxy — keine Signed-URL nötig.
    if (!storagePath) return null;
    return `${API}/api/admin/document-uploads/files/${encodeURIComponent(storagePath)}/download`;
  };

  const markHandled = async (id) => {
    try {
      await axios.patch(`${API}/api/admin/contract-form-submissions/${id}`, { status: 'handled' }, { withCredentials: true });
      toast.success('Als erledigt markiert');
      fetchRows();
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err.message));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'handled' } : r)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status: 'handled' } : prev));
  };

  const openDetail = async (row) => {
    setSelected(row);
    setDetailOpen(true);
    setSignedUrls({});

    if (row.status === 'new') {
      markHandled(row.id);
    }

    const paths = [
      row.contract_pdf_path,
      ...(Array.isArray(row.attachments) ? row.attachments.map((a) => a.storage_path) : []),
    ].filter(Boolean);

    await Promise.all(paths.map((p) => resolveSignedUrl(p)));
  };

  const openPdf = async (storagePath) => {
    const url = signedUrls[storagePath] || (await resolveSignedUrl(storagePath));
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast.error('PDF konnte nicht geöffnet werden.');
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        title="Vertrags-Einreichungen"
        description="Versendete Bankverträge (PDF per E-Mail) — Kunde, Anhänge und Zustellstatus."
        icon={FileText}
      />

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted" />
            <Input
              placeholder="Name, E-Mail, Bank…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <Filter className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <SelectValue placeholder="Produkt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Produkte</SelectItem>
              <SelectItem value="bbva_flexgeld">BBVA Flexgeld</SelectItem>
              <SelectItem value="bbva_festgeld">BBVA Festgeld</SelectItem>
              <SelectItem value="postbank_flexgeld">Postbank Flexgeld</SelectItem>
              <SelectItem value="postbank_festgeld">Postbank Festgeld</SelectItem>
              <SelectItem value="ing_flexgeld">ING Flexgeld</SelectItem>
              <SelectItem value="ing_festgeld">ING Festgeld</SelectItem>
              <SelectItem value="bunq_flexgeld">bunq NL Flexgeld</SelectItem>
              <SelectItem value="bunq_festgeld">bunq NL Festgeld</SelectItem>
              <SelectItem value="bunq_de_flexgeld">bunq DE Flexgeld</SelectItem>
              <SelectItem value="bunq_de_festgeld">bunq DE Festgeld</SelectItem>
              <SelectItem value="knab_flexgeld">Knab Flexgeld</SelectItem>
              <SelectItem value="knab_festgeld">Knab Festgeld</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <p className="py-12 text-center text-sm text-bank-text-muted">Laden…</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-bank-text-muted">Keine Einreichungen gefunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Produkt</th>
                  <th className="px-4 py-3 font-medium">Kunde</th>
                  <th className="px-4 py-3 font-medium">E-Mail</th>
                  <th className="px-4 py-3 font-medium">Admin-Mail</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className={adminRowHover}>
                    <td className="px-4 py-3 whitespace-nowrap text-bank-text-muted">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-bank-text">
                        {PRODUCT_LABELS[row.product_key] || row.product_key}
                      </span>
                      <span className="block text-xs text-bank-text-muted">{row.bank_name}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.customer_name || '—'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${row.customer_email}`}
                        className="text-bank-primary hover:underline"
                      >
                        {row.customer_email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {row.admin_email_sent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-700 text-xs"
                          title={row.admin_email_error || 'Admin-Benachrichtigung fehlgeschlagen'}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Fehler
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const sm = STATUS_LABEL[row.status] || STATUS_LABEL.handled;
                        return (
                          <span
                            className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                          >
                            {sm.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(row)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vertrags-Einreichung</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-bank-text-muted">Produkt</p>
                  <p className="font-medium">
                    {PRODUCT_LABELS[selected.product_key]} ({selected.bank_name})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-bank-text-muted">Eingegangen</p>
                  <p>{formatDate(selected.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-bank-text-muted">Kunde</p>
                  <p className="font-medium">{selected.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-bank-text-muted">E-Mail</p>
                  <a href={`mailto:${selected.customer_email}`} className="text-bank-primary hover:underline">
                    {selected.customer_email}
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-bank-border bg-bank-bg/40 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-bank-text-muted">
                  E-Mail-Zustellung
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-bank-text-muted" />
                  Admin (kundenservice@essenceinvest.com):{' '}
                  {selected.admin_email_sent ? 'versendet' : 'fehlgeschlagen'}
                  {selected.admin_resend_id && (
                    <span className="text-xs text-bank-text-muted">(ID: {selected.admin_resend_id})</span>
                  )}
                </p>
                {selected.admin_email_error && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    {selected.admin_email_error}
                  </p>
                )}
                <p className="text-xs text-bank-text-muted">
                  Es wird nur eine Admin-Benachrichtigung an kundenservice@essenceinvest.com gesendet (Betreff: „Neuer …antrag“).
                </p>
              </div>

              {selected.form_summary && Object.keys(selected.form_summary).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bank-text-muted mb-2">
                    Formulardaten
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(selected.form_summary).map(([key, val]) => (
                      <div key={key} className="rounded border border-bank-border/60 px-3 py-2">
                        <dt className="text-xs text-bank-text-muted">
                          {SUMMARY_LABELS[key] || key}
                        </dt>
                        <dd className="font-medium">{formatSummaryValue(val)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-bank-text-muted mb-2">
                  PDF-Dokumente
                </p>
                <ul className="space-y-2">
                  {selected.contract_pdf_path && (
                    <li className="flex items-center justify-between gap-2 rounded border border-bank-border px-3 py-2">
                      <span className="font-medium">Ausgefüllter Vertrag</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPdf(selected.contract_pdf_path)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Öffnen
                      </Button>
                    </li>
                  )}
                  {(selected.attachments || []).map((att) => (
                    <li
                      key={att.storage_path || att.filename}
                      className="flex items-center justify-between gap-2 rounded border border-bank-border px-3 py-2"
                    >
                      <span>{att.filename || 'Anhang'}</span>
                      {att.storage_path && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPdf(att.storage_path)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Öffnen
                        </Button>
                      )}
                    </li>
                  ))}
                  {!selected.contract_pdf_path && !(selected.attachments || []).length && (
                    <p className="text-bank-text-muted text-xs">
                      Keine PDFs in Storage verfügbar.
                    </p>
                  )}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminSubpageLayout>
  );
};

export default AdminContractSubmissions;

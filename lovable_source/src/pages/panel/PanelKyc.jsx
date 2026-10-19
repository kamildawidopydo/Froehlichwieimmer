import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, KycBadge, Pill, Button, act, ConfirmDialog, d, dt, DOC_LABEL } from './_ui';
import KycDocViewer from './KycDocViewer';
import AdminKycUpload from './AdminKycUpload';

export default function PanelKyc() {
  const [all, setAll] = useState(false);
  const { data, error, loading, reload } = useLoad(() => panelApi.get('kyc', all ? { all: 1 } : {}), [all]);
  const [dialog, setDialog] = useState(null);
  const items = data?.items || [];
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="KYC-Prüfung" titleIcon={ShieldCheck} description="Ausweis- und Adressnachweise prüfen. Erst nach Ihrer Bestätigung kann ein Kunde handeln." />
      <AdminToolbarCard>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Auch abgeschlossene und unvollständige Prüfungen zeigen</label>
      </AdminToolbarCard>
      <State loading={loading} error={error} onRetry={reload}>
        {!items.length && <AdminSurfaceCard className="p-10 text-center text-sm text-bank-text-muted">Aktuell sind keine Unterlagen zu prüfen.</AdminSurfaceCard>}
        <div className="space-y-4">
          {items.map((c) => {
            const byType = (t) => c.documents.filter((x) => x.doc_type === t);
            const last = c.reviews[0];
            return (
              <AdminSurfaceCard key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/admin/kunden/${c.id}`} className="font-display text-lg hover:underline">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</Link>
                    <p className="text-xs text-bank-text-muted">{c.customer_no} · {c.email} · registriert {d(c.created_at)}</p>
                  </div>
                  <KycBadge s={c.kyc_status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {['id_front', 'id_back', 'address_proof'].map((t) => (
                    <div key={t} className="border border-bank-border p-3 text-sm">
                      <p className="font-medium">{DOC_LABEL[t]}{t === 'id_back' && <span className="text-xs text-bank-text-muted"> (falls vorhanden)</span>}</p>
                      {byType(t).length === 0 ? <Pill tone={t === 'id_back' ? 'gray' : 'red'}>fehlt</Pill> : byType(t).map((doc) => (
                        <div key={doc.id} className="mt-1">
                          <p className="text-xs text-bank-text-muted">{doc.file_name} · {dt(doc.uploaded_at)}</p>
                          {t === 'address_proof' && <p className="text-xs">{doc.address_doc_kind} · Dokumentdatum <b>{d(doc.document_date)}</b></p>}
                          <KycDocViewer docId={doc.id} label="Öffnen & vergrößern" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {byType('other').length > 0 && <div className="mt-3 flex flex-wrap gap-3">{byType('other').map((doc) => <div key={doc.id} className="text-xs">{doc.file_name}<KycDocViewer docId={doc.id} /></div>)}</div>}
                {last && <p className="mt-3 text-xs text-bank-text-muted">Letzte Entscheidung: {dt(last.created_at)} · {last.admin_email}{last.reason && ` – „${last.reason}“`}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminKycUpload customerId={c.id} customerName={`${c.customer_no} · ${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}`} onDone={reload} />
                  <Button onClick={() => setDialog({ c, decision: 'approved' })}>Verifizierung bestätigen</Button>
                  <Button variant="outline" onClick={() => setDialog({ c, decision: 'more_documents' })}>Weitere Dokumente anfordern</Button>
                  <Button variant="destructive" onClick={() => setDialog({ c, decision: 'rejected' })}>Verifizierung ablehnen</Button>
                </div>
              </AdminSurfaceCard>
            );
          })}
        </div>
      </State>
      <ConfirmDialog open={Boolean(dialog)} onOpenChange={() => setDialog(null)} requireReason={dialog?.decision !== 'approved'} danger={dialog?.decision === 'rejected'}
        title={{ approved: 'Verifizierung bestätigen', more_documents: 'Weitere Dokumente anfordern', rejected: 'Verifizierung ablehnen' }[dialog?.decision]}
        description={dialog?.decision === 'approved' ? 'Der Kunde kann danach Kauf- und Verkaufsaufträge erteilen. Ihre Entscheidung wird mit Zeitstempel gespeichert.' : 'Die Begründung sieht der Kunde in seinem Bereich „Verifizierung“.'}
        onConfirm={async (reason) => { const ok = await act(() => panelApi.post(`kyc/${dialog.c.id}/decision`, { decision: dialog.decision, reason: reason || undefined }), 'Entscheidung gespeichert'); if (ok) reload(); return ok; }} />
    </AdminSubpageLayout>
  );
}

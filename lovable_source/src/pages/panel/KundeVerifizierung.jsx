import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { kundeApi, fileToBase64 } from '@/lib/panelApi';
import { useAuth } from '@/context/AuthContext';
import { useLoad, State, KycBadge, Pill, Button, Field, Input, act, d, dt, DOC_LABEL } from './_ui';

const HELP = {
  documents_missing: 'Bitte laden Sie die erforderlichen Dokumente hoch.',
  documents_submitted: 'Ihre Dokumente sind eingegangen.',
  review_pending: 'Ihre Unterlagen sind vollständig und werden geprüft. Das dauert in der Regel 1–2 Werktage.',
  more_documents_required: 'Wir benötigen weitere Unterlagen – siehe Hinweis unten.',
  verified: 'Ihre Identität ist bestätigt. Kauf- und Verkaufsaufträge sind freigeschaltet.',
  rejected: 'Ihre Verifizierung wurde abgelehnt. Bitte wenden Sie sich an den Kundenservice.',
};

function UploadBox({ type, required, kinds, maxAge, current, onDone, disabled }) {
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const isAddr = type === 'address_proof';
  const send = async () => {
    if (file.size > 10 * 1024 * 1024) return act(() => Promise.reject(new Error('Datei ist größer als 10 MB.')));
    setBusy(true);
    const ok = await act(async () => kundeApi.post('kyc/upload', {
      doc_type: type, file_base64: await fileToBase64(file), media_type: file.type || 'application/octet-stream', file_name: file.name,
      address_doc_kind: isAddr ? kind : undefined, document_date: isAddr ? date : undefined,
    }), 'Dokument hochgeladen');
    setBusy(false);
    if (ok) { setFile(null); onDone(); }
  };
  return (
    <div className="border border-bank-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{DOC_LABEL[type]} {required ? <span className="text-red-700">*</span> : <span className="text-xs text-bank-text-muted">(falls vorhanden)</span>}</p>
        {current ? <Pill tone={current.status === 'accepted' ? 'green' : current.status === 'rejected' ? 'red' : 'blue'}>{current.status === 'accepted' ? 'Geprüft' : current.status === 'rejected' ? 'Abgelehnt' : 'Eingereicht'}</Pill> : <Pill tone={required ? 'red' : 'gray'}>fehlt</Pill>}
      </div>
      {current && <p className="mt-1 text-xs text-bank-text-muted">{current.file_name} · {dt(current.uploaded_at)}{current.document_date && ` · Dokumentdatum ${d(current.document_date)}`}</p>}
      {isAddr && <p className="mt-1 text-xs text-bank-text-muted">Höchstens {maxAge} Monate alt. Zugelassen: {kinds.join(', ')}.</p>}
      {!disabled && <div className="mt-3 space-y-2">
        {isAddr && <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Art des Nachweises"><select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Bitte wählen</option>{kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Datum auf dem Dokument"><Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>}
        <Input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button size="sm" disabled={!file || busy || (isAddr && (!kind || !date))} onClick={send}><Upload className="mr-2 h-4 w-4" />{busy ? 'Wird hochgeladen…' : current ? 'Ersetzen' : 'Hochladen'}</Button>
      </div>}
    </div>
  );
}

export default function KundeVerifizierung() {
  const { refreshUser } = useAuth();
  const { data, error, loading, reload: load } = useLoad(() => kundeApi.get('status'));
  const reload = () => { load(); refreshUser?.(); };
  const c = data?.customer;
  const latest = (t) => (data?.documents || []).find((x) => x.doc_type === t);
  const locked = c && (c.kyc_status === 'verified' || c.kyc_status === 'rejected' || c.account_status !== 'active');
  const lastReview = data?.reviews?.[0];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Identitätsprüfung</p>
      <h1 className="mt-2 font-display text-3xl font-light text-bank-text">Verifizierung</h1>
      <p className="mt-2 text-sm text-bank-text-muted">Zum Abschluss Ihrer Registrierung benötigen wir Ihren Ausweis (Vorder- und ggf. Rückseite) und einen aktuellen Adressnachweis. Das ist für die Eröffnung Ihres Depots erforderlich.</p>
      <State loading={loading} error={error} onRetry={reload}>
        {c && <>
          <div className="mt-6 flex items-start gap-3 border border-bank-border bg-white p-5">
            {c.kyc_status === 'verified' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" /> : <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />}
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-bank-text-muted">Status:</span><KycBadge s={c.kyc_status} />{c.account_status !== 'active' && <Pill tone="red">Konto gesperrt</Pill>}</div>
              <p className="mt-2 text-sm">{c.account_status !== 'active' ? 'Ihr Konto ist derzeit gesperrt. Bitte kontaktieren Sie den Kundenservice.' : HELP[c.kyc_status]}</p>
              {lastReview?.reason && c.kyc_status !== 'verified' && <p className="mt-2 border-l-2 border-bank-gold pl-3 text-sm">Hinweis vom {d(lastReview.created_at)}: „{lastReview.reason}“</p>}
              <p className="mt-2 text-xs text-bank-text-muted">Kunden-ID {c.customer_no}. Ihre Dokumente werden verschlüsselt und nicht öffentlich gespeichert; nur berechtigte Prüfer können sie ansehen.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <UploadBox type="id_front" required current={latest('id_front')} onDone={reload} disabled={locked} kinds={data.address_doc_kinds} maxAge={data.address_doc_max_age_months} />
            <UploadBox type="id_back" current={latest('id_back')} onDone={reload} disabled={locked} kinds={data.address_doc_kinds} maxAge={data.address_doc_max_age_months} />
            <UploadBox type="address_proof" required current={latest('address_proof')} onDone={reload} disabled={locked} kinds={data.address_doc_kinds} maxAge={data.address_doc_max_age_months} />
            {c.kyc_status === 'more_documents_required' && <UploadBox type="other" current={latest('other')} onDone={reload} disabled={locked} kinds={data.address_doc_kinds} maxAge={data.address_doc_max_age_months} />}
          </div>
          <p className="mt-4 text-xs text-bank-text-muted">PDF oder Foto (JPG, PNG, WEBP, HEIC), höchstens 10 MB pro Datei. Personalausweis oder Reisepass; Rückseite nur, wenn vorhanden.</p>
        </>}
      </State>
    </div>
  );
}

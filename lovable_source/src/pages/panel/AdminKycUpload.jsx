import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { panelApi, fileToBase64, extractErrorMessage } from '@/lib/panelApi';
import { useLoad, Button, Input, Field, act, DOC_LABEL } from './_ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AdminKycUpload({ customerId, customerName, onDone }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('id_front');
  const [kind, setKind] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const config = useLoad(() => panelApi.get('kyc/upload-config'));
  const isAddress = type === 'address_proof';
  const send = async () => {
    if (!file || busy) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) { setError('Die Datei ist größer als 10 MB.'); return; }
    setBusy(true);
    try {
      const payload = { doc_type: type, file_name: file.name, media_type: file.type, file_base64: await fileToBase64(file),
        ...(isAddress ? { address_doc_kind: kind, document_date: date } : {}) };
      await panelApi.post(`kyc/${customerId}/upload`, payload);
      await act(() => Promise.resolve(true), 'Dokument beim Kunden gespeichert');
      setOpen(false); setFile(null); setDate(''); setKind('');
      onDone?.();
    } catch (e) { setError(extractErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" onClick={() => { setOpen(true); setError(''); }}><Upload className="mr-2 h-4 w-4" />Ausweis / Rechnung hochladen</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Kundendokument hochladen</DialogTitle><DialogDescription>{customerName}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <Field label="Dokument"><select aria-label="Dokument" className="h-10 w-full border border-bank-border bg-bank-surface px-3 text-sm" disabled={busy} value={type} onChange={(e) => { setType(e.target.value); setError(''); }}>
            {Object.entries(DOC_LABEL).map(([key, label]) => <option key={key} value={key}>{key === 'address_proof' ? 'Rechnung / Adressnachweis' : label}</option>)}
          </select></Field>
          {isAddress && <>
            <Field label="Art der Rechnung / des Nachweises"><select aria-label="Art der Rechnung / des Nachweises" className="h-10 w-full border border-bank-border bg-bank-surface px-3 text-sm" value={kind} disabled={busy} onChange={(e) => setKind(e.target.value)}>
              <option value="">Bitte wählen</option>{(config.data?.address_doc_kinds || []).map(k => <option key={k}>{k}</option>)}
            </select></Field>
            <Field label="Datum auf dem Dokument"><Input aria-label="Datum auf dem Dokument" type="date" max={new Date().toISOString().slice(0, 10)} value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></Field>
            {config.data && <p className="text-xs text-bank-text-muted">Adressnachweis: höchstens {config.data.address_doc_max_age_months} Monate alt.</p>}
          </>}
          <Field label="Datei · PDF, JPG, PNG oder WEBP · maximal 10 MB"><Input aria-label="Kundendokument auswählen" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); }} /></Field>
          {(error || config.error) && <p role="alert" className="text-sm text-bank-error">{error || config.error}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Abbrechen</Button><Button disabled={busy || !file || config.loading || Boolean(config.error) || (isAddress && (!kind || !date))} onClick={send}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{busy ? 'Wird gespeichert…' : 'Dokument speichern'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
import React, { useState } from 'react';
// Session 82.107 — Bestandskunden-Bestätigung generieren + versenden.
import { AdminSubpageLayout, AdminSubpageHeader, AdminToolbarCard, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Eye, Download, Printer, Mail, Send, Loader2 } from 'lucide-react';

const emptyForm = {
  anrede: 'Herr', vorname: '', nachname: '',
  strasse: '', plz: '', ort_kunde: '', land: 'Deutschland',
  email: '', kundennummer: '', aufnahmedatum: '', user_id: '', ort: 'Frankfurt am Main',
};

const AdminCustomerConfirmations = () => {
  const [form, setForm] = useState(emptyForm);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.vorname || !form.nachname || !form.kundennummer) {
      toast.error('Vorname, Nachname und Kundennummer sind Pflicht.');
      return;
    }
    setBusy(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const payload = { ...form };
      if (!payload.email) delete payload.email;
      if (!payload.user_id) delete payload.user_id;
      if (!payload.aufnahmedatum) delete payload.aufnahmedatum;
      const { data } = await _axios.post(`${_api}/api/admin/customer-confirmations`, payload, { withCredentials: true });
      setCurrent(data);
      setEmailTarget(form.email || '');
      toast.success('Bestätigung erstellt.');
    } catch (e) {
      toast.error(`Fehler: ${e?.response?.data?.detail || e.message}`);
    } finally { setBusy(false); }
  };

  const openPdf = async (mode) => {
    if (!current) return;
    const _axios = (await import('axios')).default;
    const _api = (await import('@/lib/apiBase')).getApiBase();
    const res = await _axios.get(`${_api}/api/admin/customer-confirmations/${current.id}/${mode}`, { responseType: 'blob', withCredentials: true });
    const url = URL.createObjectURL(res.data);
    if (mode === 'view') {
      const w = window.open(url, '_blank');
      // print via new tab
      if (w) setTimeout(() => { try { w.focus(); } catch {} }, 400);
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = 'Bestandskunden-Bestaetigung.pdf'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const printPdf = async () => {
    if (!current) return;
    const _axios = (await import('axios')).default;
    const _api = (await import('@/lib/apiBase')).getApiBase();
    const res = await _axios.get(`${_api}/api/admin/customer-confirmations/${current.id}/view`, { responseType: 'blob', withCredentials: true });
    const url = URL.createObjectURL(res.data);
    const w = window.open(url);
    if (w) w.addEventListener('load', () => { try { w.print(); } catch {} });
  };

  const sendEmail = async () => {
    if (!current || !emailTarget) return;
    setBusy(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.post(`${_api}/api/admin/customer-confirmations/${current.id}/send-email`,
        { email: emailTarget, message: emailMessage }, { withCredentials: true });
      toast.success(`E-Mail an ${emailTarget} versendet.`);
      setEmailModal(false);
    } catch (e) {
      toast.error(`E-Mail-Fehler: ${e?.response?.data?.detail || e.message}`);
    } finally { setBusy(false); }
  };

  const field = (label, key, type = 'text') => (
    <div key={key}>
      <label className="mb-1 block text-xs text-bank-text-muted">{label}</label>
      <Input value={form[key]} onChange={(e) => update(key, e.target.value)} type={type} data-testid={`ccf-${key}`} />
    </div>
  );

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader eyebrow="Admin · Dokumente" title="Bestandskunden-Bestätigung" titleIcon={FileText}
        description="PDF aus Kundendaten erzeugen, ansehen, drucken oder per E-Mail versenden." />

      <AdminToolbarCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="mb-1 block text-xs text-bank-text-muted">Anrede</label>
            <select value={form.anrede} onChange={(e) => update('anrede', e.target.value)} className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm">
              <option>Herr</option><option>Frau</option><option>Divers</option></select></div>
          {field('Vorname *', 'vorname')}
          {field('Nachname *', 'nachname')}
          {field('Straße', 'strasse')}
          {field('PLZ', 'plz')}
          {field('Ort', 'ort_kunde')}
          {field('Land', 'land')}
          {field('E-Mail (optional)', 'email', 'email')}
          {field('Kundennummer *', 'kundennummer')}
          {field('Aufnahmedatum (leer = heute)', 'aufnahmedatum')}
          {field('Ort (Briefkopf)', 'ort')}
          {field('User-ID (optional, für „Meine Dokumente")', 'user_id')}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={generate} disabled={busy} data-testid="ccf-generate-btn" className="rounded-xl bg-bank-ink text-white hover:bg-bank-ink-elev">
            {busy ? <Loader2 size={15} className="mr-2 animate-spin" /> : <FileText size={15} className="mr-2" />}
            Bestätigung erstellen
          </Button>
        </div>
      </AdminToolbarCard>

      {current && (
        <AdminSurfaceCard className="mt-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">PDF erstellt · ID {current.id}</p>
              <p className="text-xs text-bank-text-muted">{(current.size_bytes / 1024).toFixed(1)} KB · {new Date(current.created_at).toLocaleString('de-DE')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openPdf('view')} data-testid="ccf-view-btn"><Eye size={14} className="mr-1.5" />Ansehen</Button>
            <Button variant="outline" onClick={() => openPdf('download')} data-testid="ccf-download-btn"><Download size={14} className="mr-1.5" />Herunterladen</Button>
            <Button variant="outline" onClick={printPdf} data-testid="ccf-print-btn"><Printer size={14} className="mr-1.5" />Drucken</Button>
            <Button onClick={() => setEmailModal(true)} data-testid="ccf-email-btn" className="bg-bank-ink text-white hover:bg-bank-ink-elev">
              <Mail size={14} className="mr-1.5" />Per E-Mail senden</Button>
          </div>
        </AdminSurfaceCard>
      )}

      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEmailModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">E-Mail versenden</h3>
            <div className="space-y-3">
              <div><label className="mb-1 block text-xs text-bank-text-muted">Empfänger-E-Mail</label>
                <Input value={emailTarget} onChange={(e) => setEmailTarget(e.target.value)} type="email" placeholder="kunde@domain.de" data-testid="ccf-email-target" />
                <p className="mt-1 text-[11px] text-bank-text-muted">Hinweis: Der E-Mail-Provider (Resend) blockiert nicht-verifizierte Empfänger. Für QA-Zwecke <code>delivered@resend.dev</code> nutzen.</p></div>
              <div><label className="mb-1 block text-xs text-bank-text-muted">Nachricht (optional, HTML erlaubt)</label>
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4}
                  className="w-full rounded-md border border-bank-border bg-white p-2 text-sm"
                  placeholder="Standardtext wird verwendet wenn leer" /></div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Vorschau:</strong> PDF „Bestandskunden-Bestaetigung.pdf" wird als Anhang an <strong>{emailTarget || '–'}</strong> gesendet.
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailModal(false)}>Abbrechen</Button>
              <Button onClick={sendEmail} disabled={busy || !emailTarget} data-testid="ccf-email-send-btn" className="bg-bank-ink text-white hover:bg-bank-ink-elev">
                {busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}Senden
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminCustomerConfirmations;

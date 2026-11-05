import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Lock,
  ShieldCheck,
  ArrowUpRight,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
import PageMeta from '@/components/PageMeta';

// Session 82.96 — Supabase-RPC `verify_document_access_code` ersetzt durch
// `POST /api/formular-access/verify-document` (FastAPI/Mongo, generisches 401).
const API = getApiBase();
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseApiJsonResponse, apiErrorMessage } from '@/lib/parseApiJsonResponse';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];

function extFromName(name) {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

const DokumentHochladen = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = useCallback((incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;

    const next = [...files];
    let nextTotal = totalBytes;

    for (const file of list) {
      if (next.length >= MAX_FILES) {
        toast.error(`Maximal ${MAX_FILES} Dateien erlaubt`);
        break;
      }
      const ext = extFromName(file.name);
      if (!ALLOWED_EXT.includes(ext)) {
        toast.error(`Dateityp nicht erlaubt: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} ist zu groß (max. 10 MB pro Datei)`);
        continue;
      }
      if (nextTotal + file.size > MAX_TOTAL_BYTES) {
        toast.error('Gesamtgröße darf 20 MB nicht überschreiten');
        break;
      }
      next.push(file);
      nextTotal += file.size;
    }

    setFiles(next);
  }, [files, totalBytes]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName) {
      toast.error('Bitte geben Sie Ihren Namen ein');
      return;
    }
    if (!trimmedCode) {
      toast.error('Bitte geben Sie Ihren Zugangscode ein');
      return;
    }

    setVerifying(true);
    try {
      await axios.post(
        `${API}/api/formular-access/verify-document`,
        { code: trimmedCode },
        { withCredentials: true },
      );
      setStep(2);
    } catch (err) {
      setShaking(true);
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Ungültiger oder bereits verwendeter Zugangscode');
      setTimeout(() => setShaking(false), 500);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      toast.error('Bitte wählen Sie mindestens eine Datei aus');
      return;
    }

    setSubmitting(true);
    try {
      // Session 82.101b · Multipart-Upload gegen FastAPI/Emergent-Object-Storage.
      const form = new FormData();
      form.append('code', code.trim());
      form.append('used_by_name', name.trim());
      if (email.trim()) form.append('email', email.trim());
      if (message.trim()) form.append('message', message.trim());
      form.append('user_agent', typeof navigator !== 'undefined' ? navigator.userAgent : '');
      for (const f of files) form.append('files', f, f.name);

      const { data: result } = await axios.post(
        `${API}/api/document-uploads/submit`,
        form,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } },
      );

      if (!result?.submission_id) {
        throw new Error('Upload fehlgeschlagen — keine Bestätigung erhalten');
      }
      toast.success(`Dokumente erfolgreich übermittelt (${result.files_count} Datei${result.files_count === 1 ? '' : 'en'})`);
      setDone(true);
    } catch (err) {
      const status = err?.response?.status;
      const raw = err?.response?.data?.detail;
      const detail = typeof raw === 'string' ? raw : null;
      if (status === 401) {
        toast.error('Sitzung abgelaufen. Bitte Zugangscode erneut eingeben.');
        setStep(1);
      } else if (status === 413) {
        toast.error(detail || 'Datei zu groß');
      } else if (status === 415) {
        toast.error(detail || 'Dateityp nicht erlaubt');
      } else {
        toast.error(detail || err.message || 'Upload fehlgeschlagen');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <>
        <PageMeta title="Dokument hochladen" description="Sicherer Dokument-Upload bei Fröhlich Vermögensberatung" />
        <div className="flex min-h-[70vh] items-center justify-center bg-bank-bg px-6 py-16">
          <div className="w-full max-w-lg border border-bank-border bg-bank-surface p-10 text-center shadow-editorial-lg">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" strokeWidth={1.5} />
            <h1 className="font-display text-2xl font-light text-bank-text">Vielen Dank!</h1>
            <p className="mt-3 text-sm leading-relaxed text-bank-text-muted">
              Ihre Dokumente wurden erfolgreich übermittelt. Wir melden uns bei Ihnen, sobald wir
              alles geprüft haben.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Dokument hochladen" description="Sicherer Dokument-Upload bei Fröhlich Vermögensberatung" />
      <div
        className={`relative overflow-hidden ${step === 1 ? 'bg-[#F3F1EC]' : 'bg-bank-bg'} ${shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>

        {step === 1 ? (
          <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
            <div className="topo-pattern pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
            <div className="relative z-10 w-full max-w-md">
              <div className="relative border border-[#D8D3C9] bg-[#FBFAF7] px-7 py-12 shadow-[0_1px_3px_rgba(37,39,34,0.04),0_10px_28px_-8px_rgba(37,39,34,0.10)] sm:px-12 sm:py-14">
                <div className="mb-9 flex flex-col items-center text-center">
                  <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#B58A52]/40 bg-white">
                    <Lock className="h-7 w-7 text-[#B58A52]" strokeWidth={1.4} />
                  </div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#B58A52]">
                    Dokument · Upload
                  </p>
                  <h1 className="mt-4 font-display text-[1.75rem] font-light text-[#252722]">
                    Sicherer <em className="italic text-[#36A852]">Zugang</em>
                  </h1>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-[#686A64]">
                    Bitte geben Sie Ihren Namen und den Einmal-Zugangscode ein.
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#686A64]">
                      Ihr Name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Vor- und Nachname"
                      autoComplete="name"
                      className="block w-full border border-[#D8D3C9] bg-white px-5 py-4 text-center text-[15px] text-[#252722] placeholder-[#9B9A93] focus:border-[#36A852] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36A852]/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#686A64]">
                      Ihre E-Mail (für die Eingangsbestätigung)
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@beispiel.de"
                      autoComplete="email"
                      data-testid="doc-upload-email"
                      className="block w-full border border-[#D8D3C9] bg-white px-5 py-4 text-center text-[15px] text-[#252722] placeholder-[#9B9A93] focus:border-[#36A852] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36A852]/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#686A64]">
                      Zugangscode
                    </span>
                    <input
                      type="password"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="ABCD1234"
                      autoFocus
                      className="block w-full border border-[#D8D3C9] bg-white px-5 py-4 text-center font-mono text-[15px] tracking-[0.18em] text-[#252722] placeholder-[#9B9A93] focus:border-[#36A852] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36A852]/30"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[#36A852] bg-[#36A852] font-mono text-[10.5px] font-medium uppercase tracking-[0.28em] text-white transition-all hover:border-[#218739] hover:bg-[#218739] disabled:opacity-50"
                  >
                    {verifying ? 'Wird geprüft…' : 'Weiter'}
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#D8D3C9] pt-6">
                  <ShieldCheck className="h-4 w-4 text-[#36A852]" strokeWidth={1.5} />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#686A64]">
                    Einmal-Code · Verschlüsselt
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-bank-text-muted">
                Schritt 2 von 2
              </p>
              <h1 className="mt-2 font-display text-3xl font-light text-bank-text">Dokumente hochladen</h1>
              <p className="mt-2 text-sm text-bank-text-muted">
                Hallo {name.trim()}, laden Sie Ihre Dateien hoch und fügen Sie optional eine Nachricht hinzu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border border-dashed border-bank-border bg-bank-surface px-6 py-10 text-center transition-colors hover:border-bank-accent/50 hover:bg-bank-surface/80"
              >
                <Upload className="mx-auto mb-3 h-8 w-8 text-bank-accent-strong" strokeWidth={1.5} />
                <p className="text-sm font-medium text-bank-text">Dateien hier ablegen oder klicken</p>
                <p className="mt-1 text-xs text-bank-text-muted">
                  PDF, JPG, PNG, WEBP, DOC, DOCX · max. 10 Dateien · gesamt max. 20 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {files.length > 0 && (
                <ul className="divide-y divide-bank-border border border-bank-border bg-bank-surface">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-bank-accent-strong" strokeWidth={1.5} />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-bank-text">{file.name}</p>
                          <p className="text-xs text-bank-text-muted">{formatBytes(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 p-2 text-bank-text-muted transition-colors hover:text-rose-600"
                        aria-label={`${file.name} entfernen`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Nachricht (optional)
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Haben Sie Anmerkungen oder Hinweise zu den Dokumenten?"
                  rows={4}
                  maxLength={4000}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-bank-text-muted">
                  {files.length} Datei(en) · {formatBytes(totalBytes)} gesamt
                </p>
                <Button type="submit" variant="primary" disabled={submitting || !files.length} className="min-w-[180px]">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet…
                    </>
                  ) : (
                    'Dokumente senden'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default DokumentHochladen;

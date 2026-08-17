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
import { supabase } from '@/lib/supabase';
import PageMeta from '@/components/PageMeta';
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
    const { data: valid, error } = await supabase.rpc('verify_document_access_code', {
      p_code: trimmedCode,
    });
    setVerifying(false);

    if (error || !valid) {
      setShaking(true);
      toast.error('Ungültiger oder bereits verwendeter Zugangscode');
      setTimeout(() => setShaking(false), 500);
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      toast.error('Bitte wählen Sie mindestens eine Datei aus');
      return;
    }

    setSubmitting(true);
    try {
      const encoded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type || 'application/octet-stream',
          base64: await readFileAsBase64(file),
        })),
      );

      const response = await fetch('/api/submit-document-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          message: message.trim() || null,
          files: encoded,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      });

      const { data: result, raw } = await parseApiJsonResponse(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            'Upload-API nicht gefunden. Lokal: npm run dev starten. Live: neueste Version deployen.',
          );
        }
        throw new Error(apiErrorMessage(response, raw, result?.error || 'Upload fehlgeschlagen'));
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success('Dokumente erfolgreich übermittelt');
      }
      setDone(true);
    } catch (err) {
      toast.error(err.message || 'Upload fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <>
        <PageMeta title="Dokument hochladen" description="Sicherer Dokument-Upload bei Kapitalmitte" />
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
      <PageMeta title="Dokument hochladen" description="Sicherer Dokument-Upload bei Kapitalmitte" />
      <div
        className={`relative overflow-hidden ${step === 1 ? 'bg-bank-ink' : 'bg-bank-bg'} ${shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
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
            <div className="topo-pattern pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
            <div className="relative z-10 w-full max-w-md">
              <div className="relative border border-white/10 bg-white/[0.03] px-7 py-12 backdrop-blur-xl sm:px-12 sm:py-14">
                <div className="mb-9 flex flex-col items-center text-center">
                  <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-bank-accent-strong/45 bg-bank-ink/60">
                    <Lock className="h-7 w-7 text-bank-gold" strokeWidth={1.4} />
                  </div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">
                    Dokument · Upload
                  </p>
                  <h1 className="mt-4 font-display text-[1.75rem] font-light text-white">
                    Sicherer <em className="italic text-bank-gold-soft">Zugang</em>
                  </h1>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-white/80">
                    Bitte geben Sie Ihren Namen und den Einmal-Zugangscode ein.
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-white/80">
                      Ihr Name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Vor- und Nachname"
                      autoComplete="name"
                      className="block w-full border border-white/20 bg-white/[0.06] px-5 py-4 text-center text-[15px] text-white placeholder-white/55 focus:border-bank-gold/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-white/80">
                      Zugangscode
                    </span>
                    <input
                      type="password"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="ABCD1234"
                      autoFocus
                      className="block w-full border border-white/20 bg-white/[0.06] px-5 py-4 text-center font-mono text-[15px] tracking-[0.18em] text-white placeholder-white/55 focus:border-bank-gold/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 border border-bank-gold/70 bg-bank-gold/15 font-mono text-[10.5px] font-medium uppercase tracking-[0.28em] text-white transition-all hover:border-bank-gold hover:bg-bank-gold/25 disabled:opacity-50"
                  >
                    {verifying ? 'Wird geprüft…' : 'Weiter'}
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-6">
                  <ShieldCheck className="h-4 w-4 text-bank-gold" strokeWidth={1.5} />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-white/75">
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

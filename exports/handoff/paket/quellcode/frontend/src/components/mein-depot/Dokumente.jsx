import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, FileText, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { CUSTOMER_DOCUMENTS } from '@/data/customerDocuments';
import { fetchPdfBlob } from '@/lib/customerDocumentPdf';
import { downloadFile } from '@/lib/export';

/**
 * Dokumente — kompakte Vorschau der Depot-/Vertragsunterlagen auf /mein-depot (Schritt 6/7).
 *
 * Datenquelle: bestehende statische, öffentlich hinterlegte Kundendokumente unter
 * `/assets/documents/` (Freistellungsauftrag, Risiken der Kapitalanlage,
 * Kundendokumente, Informationsbogen Einlagenlösungen). KEINE Fake-Dokumente,
 * kein neuer Storage. Downloads laufen über den bestehenden `fetchPdfBlob` +
 * `downloadFile`-Flow, identisch zu `/dashboard/dokumente`.
 *
 * User-spezifische Dokumenttypen (Orderabrechnungen, Kontoauszüge,
 * Jahressteuerbescheinigung, individuelle Vertrags-PDFs) existieren in dieser
 * Codebasis derzeit NICHT als Datenquelle. Sie werden bewusst NICHT
 * synthetisiert (§8/§9/§10). Ein neutraler Hinweis dokumentiert das im UI.
 *
 * User-Isolation: Diese 4 Dokumente sind rechtliche/informative Firmen-PDFs,
 * gleich für alle authentifizierten Nutzer. Kein per-User-Filter nötig; keine
 * user_id in URLs/Query-Strings; keine signed URLs (statische Public-Assets).
 */

const Dokumente = () => {
  const [downloadingId, setDownloadingId] = useState(null);

  const onDownload = useCallback(async (doc) => {
    if (downloadingId) return;
    setDownloadingId(doc.id);
    try {
      const blob = await fetchPdfBlob(doc.file);
      downloadFile(blob, doc.downloadName, 'application/pdf');
      toast.success('Download gestartet.');
    } catch {
      toast.error('Download fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId]);

  const docs = CUSTOMER_DOCUMENTS;
  const hasDocs = docs.length > 0;

  return (
    <section aria-labelledby="mein-depot-dokumente-title" data-testid="mein-depot-dokumente" className="mb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Dokumente</p>
          <h2
            id="mein-depot-dokumente-title"
            className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
          >
            Ihre Depot- und Vertragsunterlagen im Überblick
          </h2>
        </div>
        <Link
          to="/dashboard/dokumente"
          data-testid="mdd-alle"
          className="inline-flex min-h-[36px] items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-primary hover:underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
        >
          Alle Dokumente ansehen <ChevronRight size={12} strokeWidth={1.6} aria-hidden />
        </Link>
      </div>

      <div className="mt-5">
        {!hasDocs ? (
          <div data-testid="mdd-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Dokumente</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Aktuell sind noch keine Depotdokumente hinterlegt.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {docs.map((d) => (
              <li key={d.id} data-testid={`mdd-doc-${d.id}`}>
                <div className="flex h-full flex-col rounded-sm border border-bank-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-bank-border bg-bank-bg text-bank-text-muted">
                      <FileText size={16} strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-bank-text">{d.title}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-bank-text-muted">{d.description}</p>
                      <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">PDF</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-bank-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() => onDownload(d)}
                      disabled={downloadingId === d.id}
                      data-testid={`mdd-download-${d.id}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm bg-bank-text px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-bank-text/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold disabled:opacity-60"
                    >
                      {downloadingId === d.id ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Download size={12} strokeWidth={1.6} aria-hidden />}
                      Download PDF
                      <span className="sr-only">— {d.title}</span>
                    </button>
                    <a
                      href={d.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`mdd-open-${d.id}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-bank-border px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-text transition-colors hover:bg-bank-bg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                    >
                      <ExternalLink size={12} strokeWidth={1.6} aria-hidden />
                      Öffnen
                      <span className="sr-only">— {d.title}</span>
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[11.5px] leading-relaxed text-bank-text-muted">
          Individuelle Unterlagen wie Orderabrechnungen, Kontoauszüge oder Jahressteuerbescheinigungen
          werden — sobald verfügbar — in <Link to="/dashboard/dokumente" className="underline decoration-bank-border underline-offset-2 hover:text-bank-text">Ihrem Dokumenten-Bereich</Link> bereitgestellt.
        </p>
      </div>
    </section>
  );
};

export default Dokumente;

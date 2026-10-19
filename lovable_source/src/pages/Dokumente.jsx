import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, FileText, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { CUSTOMER_DOCUMENTS } from '@/data/customerDocuments';
import { fetchPdfBlob } from '@/lib/customerDocumentPdf';
import { downloadFile } from '@/lib/export';
import { cn } from '@/lib/utils';

const Dokumente = () => {
  const [downloadingId, setDownloadingId] = useState(null);
  const reduce = useReducedMotion();

  const handleDownload = useCallback(async (doc) => {
    if (downloadingId) return;
    setDownloadingId(doc.id);
    try {
      const blob = await fetchPdfBlob(doc.file);
      downloadFile(blob, doc.downloadName, 'application/pdf');
    } catch {
      toast.error('Download fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId]);
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="min-h-screen w-full min-w-0 bg-bank-bg">
      <PageMeta
        title="Dokumente"
        description="Offizielle Fröhlich Vermögensberatung Kundendokumente zum Download: Kundendokumente, Risikohinweise, Freistellungsauftrag und Informationsbogen zu Einlagenlösungen."
        path="/dokumente"
      />

      <section className="relative overflow-hidden bg-bank-ink text-white">
        <div className="topo-pattern absolute inset-0 opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-20 right-0 h-[min(380px,70vw)] w-[min(380px,70vw)] translate-x-1/4 rounded-full bg-bank-gold/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto w-full min-w-0 max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <Eyebrow className="text-bank-gold/90">Information</Eyebrow>
          <h1
            className="mt-6 max-w-3xl break-words font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] sm:text-display-lg"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            <span className="block">Dokumente</span>
            <span className="block italic text-bank-gold-soft">zum Download.</span>
          </h1>
          <div className="mt-8 h-px w-24 bg-bank-gold/70" aria-hidden />
          <p className="mt-7 max-w-2xl font-sans text-[1.02rem] leading-[1.8] text-white/75">
            Hier finden Sie offizielle Unterlagen von Fröhlich Vermögensberatung — als PDF herunterladbar, zum
            Lesen, Ausdrucken oder für Ihre Unterlagen.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <motion.ul
          {...fade(0)}
          className="grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:gap-5"
          aria-label="Verfügbare Dokumente"
        >
          {CUSTOMER_DOCUMENTS.map((doc, index) => (
            <motion.li key={doc.id} {...fade(index + 1)}>
              <article
                className={cn(
                  'group relative flex h-full min-h-[12.5rem] flex-col border border-bank-border bg-bank-surface',
                  'shadow-editorial-sm transition-all duration-300 hover:border-bank-gold/45 hover:shadow-editorial-md',
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/30 to-transparent"
                />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-bank-gold/40 bg-bank-gold/[0.08] text-bank-gold">
                      <FileText className="h-5 w-5" strokeWidth={1.35} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[1.2rem] font-normal leading-snug text-bank-text">
                        {doc.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-[1.65] text-bank-text-muted">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-bank-border/80 pt-5">
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="inline-flex items-center gap-2 border border-bank-ink bg-bank-ink px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-bank-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.35} aria-hidden />
                      ) : (
                        <Download className="h-3.5 w-3.5" strokeWidth={1.35} aria-hidden />
                      )}
                      {downloadingId === doc.id ? 'Wird geladen…' : 'Herunterladen'}
                    </button>
                    <Link
                      to={`/dokumente/vorschau/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-bank-border bg-bank-surface px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-bank-text transition-colors hover:border-bank-gold/45 hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/40 focus-visible:ring-offset-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.35} aria-hidden />
                      Im Browser anzeigen
                    </Link>
                  </div>
                </div>
              </article>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          {...fade(5)}
          className="mt-10 max-w-2xl text-[13px] leading-relaxed text-bank-text-muted"
        >
          Die Dokumente werden in der angezeigten Fassung bereitgestellt. Bei Fragen zu Inhalten oder
          Einreichung wenden Sie sich bitte an unseren Kundenservice.
        </motion.p>
      </section>
    </div>
  );
};

export default Dokumente;

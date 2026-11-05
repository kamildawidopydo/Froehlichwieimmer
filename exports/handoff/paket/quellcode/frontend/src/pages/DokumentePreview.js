import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { getCustomerDocumentById } from '@/data/customerDocuments';
import { fetchPdfBlob } from '@/lib/customerDocumentPdf';

const DokumentePreview = () => {
  const { docId } = useParams();
  const doc = getCustomerDocumentById(docId);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!doc) return undefined;
    let objectUrl = null;
    let cancelled = false;

    (async () => {
      try {
        const blob = await fetchPdfBlob(doc.file);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  if (!doc) {
    return <Navigate to="/dokumente" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bank-ink">
      <PageMeta title={`${doc.title} — Vorschau`} description={doc.description} path={`/dokumente/vorschau/${doc.id}`} />
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link
          to="/dokumente"
          className="inline-flex items-center gap-2 text-[13px] text-white/75 transition-colors hover:text-bank-gold"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.35} aria-hidden />
          Zurück zu Dokumente
        </Link>
        <p className="truncate font-display text-[15px] font-normal text-bank-gold">{doc.title}</p>
      </header>
      <main className="relative min-h-0 flex-1 bg-bank-bg">
        {error && (
          <p className="p-8 text-center text-bank-text-muted">
            Vorschau konnte nicht geladen werden.{' '}
            <Link to="/dokumente" className="text-bank-primary underline-offset-4 hover:underline">
              Zurück zur Übersicht
            </Link>
          </p>
        )}
        {!error && !pdfUrl && (
          <div className="flex h-[calc(100vh-3.25rem)] items-center justify-center text-bank-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-bank-gold" strokeWidth={1.35} aria-hidden />
          </div>
        )}
        {pdfUrl && (
          <iframe
            title={doc.title}
            src={pdfUrl}
            className="h-[calc(100vh-3.25rem)] w-full border-0"
          />
        )}
      </main>
    </div>
  );
};

export default DokumentePreview;

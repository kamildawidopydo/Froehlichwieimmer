import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Loader2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageContainer, PageHeader, SurfaceCard } from '@/components/dashboard/PageHeader';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import { CUSTOMER_DOCUMENTS } from '@/data/customerDocuments';
import { fetchPdfBlob } from '@/lib/customerDocumentPdf';
import { downloadFile } from '@/lib/export';
import { apiUrl } from '@/lib/apiBase';

const PersonalDocuments = () => {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    fetch(apiUrl('/api/portfolio/documents'), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch(() => setDocs([]));
  }, []);
  const download = async (doc) => {
    try {
      const r = await fetch(apiUrl(`/api/portfolio/documents/${doc.id}/download`), { credentials: 'include' });
      if (!r.ok) throw new Error();
      downloadFile(await r.blob(), doc.filename || 'dokument', doc.content_type);
    } catch {
      toast.error('Download fehlgeschlagen. Bitte erneut versuchen.');
    }
  };
  if (!docs.length) return null;
  return (
    <section className="mb-8" data-testid="personal-documents">
      <h2 className="mb-3 text-[15px] font-semibold text-bank-text">Ihre persönlichen Dokumente</h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <li key={doc.id}>
            <SurfaceCard accent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-bank-text">{doc.title}</h3>
                <p className="mt-1 truncate text-[12px] text-bank-text-muted">{doc.filename}</p>
              </div>
              <button type="button" onClick={() => download(doc)} data-testid={`personal-doc-download-${doc.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-bank-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-bank-primary-hover">
                <Download size={14} strokeWidth={1.5} /> Herunterladen
              </button>
            </SurfaceCard>
          </li>
        ))}
      </ul>
    </section>
  );
};

const DokumentePage = () => {
  const { t } = useTranslation();
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = useCallback(
    async (doc) => {
      if (downloadingId) return;
      setDownloadingId(doc.id);
      try {
        const blob = await fetchPdfBlob(doc.file);
        downloadFile(blob, doc.downloadName, 'application/pdf');
        toast.success(t('dashboardShell.documents.downloadOk', { defaultValue: 'Download gestartet.' }));
      } catch {
        toast.error(
          t('dashboardShell.documents.downloadFail', {
            defaultValue: 'Download fehlgeschlagen. Bitte erneut versuchen.',
          }),
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, t],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
        <PageHeader
          eyebrow={t('dashboardShell.documents.eyebrow', { defaultValue: 'Konto' })}
          title={t('dashboardShell.documents.title', { defaultValue: 'Dokumente' })}
          icon={FileText}
          description={t('dashboardShell.documents.description', {
            defaultValue:
              'Offizielle Unterlagen von Fröhlich Vermögensberatung — PDF herunterladen, ausdrucken oder ablegen.',
          })}
        />

        <div className="mb-4 rounded-lg border border-bank-border bg-bank-bg/40 px-4 py-3 text-[13px] text-bank-text-muted">
          {t('dashboardShell.documents.hint', {
            defaultValue:
              'Steuerformulare und Produktinformationen finden Sie hier zentral. Bei Fragen hilft Ihnen der',
          })}{' '}
          <Link to="/dashboard/support" className="font-medium text-bank-primary hover:underline">
            {t('shell.user.support', { defaultValue: 'Support' })}
          </Link>
          .
        </div>

        <PersonalDocuments />

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CUSTOMER_DOCUMENTS.map((doc) => (
            <li key={doc.id} id={doc.id}>
              <SurfaceCard accent className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/10 text-bank-primary">
                    <FileText size={18} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold text-bank-text">{doc.title}</h3>
                    <p className="mt-1 text-[13px] leading-snug text-bank-text-muted">{doc.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-bank-border/70 pt-4">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-bank-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-bank-primary-hover disabled:opacity-60"
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} strokeWidth={1.5} />
                    )}
                    PDF
                  </button>
                  <a
                    href={doc.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-bank-border px-3 py-2 text-[12px] font-medium text-bank-text hover:bg-bank-bg"
                  >
                    <ExternalLink size={14} strokeWidth={1.5} />
                    {t('dashboardShell.documents.open', { defaultValue: 'Öffnen' })}
                  </a>
                </div>
              </SurfaceCard>
            </li>
          ))}
        </ul>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default DokumentePage;

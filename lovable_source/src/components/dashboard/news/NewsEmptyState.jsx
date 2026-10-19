import React from 'react';
import { Newspaper } from 'lucide-react';
import { SurfaceCard } from '@/components/dashboard/PageHeader';

const NewsEmptyState = ({
  title = 'Aktuell keine Meldungen gefunden.',
  description = 'Versuchen Sie eine andere Kategorie oder löschen Sie die Suche.',
}) => (
  <SurfaceCard accent className="py-14 text-center">
    <Newspaper size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/55" />
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
      Nachrichten
    </p>
    <h3
      className="dashboard-page-title mt-2 text-[1.2rem] font-semibold leading-tight text-bank-text"
    >
      {title}
    </h3>
    <span aria-hidden className="my-4 inline-block h-px w-12 bg-bank-gold/55" />
    {description && (
      <p className="mx-auto max-w-sm text-[13px] leading-snug text-bank-text-muted">
        {description}
      </p>
    )}
  </SurfaceCard>
);

export default NewsEmptyState;

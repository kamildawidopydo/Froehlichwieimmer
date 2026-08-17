import React from 'react';
import { Newspaper } from 'lucide-react';

const PublicNewsEmptyState = ({
  title = 'Aktuell keine Meldungen gefunden.',
  description = 'Versuchen Sie eine andere Kategorie oder löschen Sie die Suche.',
}) => (
  <div className="rounded-2xl border border-bank-border/60 bg-bank-surface px-6 py-16 text-center shadow-sm dark:bg-bank-ink/20">
    <Newspaper size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/50" />
    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
      News
    </p>
    <h3 className="font-display mt-2 text-[1.35rem] font-light text-bank-text">
      {title}
    </h3>
    {description && (
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-bank-text-muted">
        {description}
      </p>
    )}
  </div>
);

export default PublicNewsEmptyState;

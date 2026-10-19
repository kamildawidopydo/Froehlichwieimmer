import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PublicNewsErrorState = ({ error, onRetry }) => (
  <div className="rounded-2xl border border-bank-border/60 bg-bank-surface px-6 py-16 text-center shadow-sm dark:bg-bank-ink/20">
    <AlertTriangle size={28} strokeWidth={1.4} className="mx-auto mb-4 text-bank-error" />
    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
      Lade-Fehler
    </p>
    <h3 className="font-display mt-2 text-[1.35rem] font-light text-bank-text">
      Nachrichten konnten nicht geladen werden
    </h3>
    {error?.message && (
      <p className="mx-auto mt-2 max-w-md text-[13px] text-bank-text-muted">
        {error.message}
      </p>
    )}
    {onRetry && (
      <div className="mt-6">
        <Button onClick={onRetry} variant="outline-ink" size="sm">
          <RotateCcw size={13} strokeWidth={1.5} />
          Erneut versuchen
        </Button>
      </div>
    )}
  </div>
);

export default PublicNewsErrorState;

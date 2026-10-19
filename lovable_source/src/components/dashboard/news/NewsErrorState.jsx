import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/dashboard/PageHeader';

const NewsErrorState = ({ error, onRetry }) => (
  <SurfaceCard accent className="py-14 text-center">
    <AlertTriangle size={28} strokeWidth={1.4} className="mx-auto mb-4 text-bank-error" />
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
      Lade-Fehler
    </p>
    <h3
      className="dashboard-page-title mt-2 text-[1.2rem] font-semibold leading-tight text-bank-text"
    >
      Nachrichten konnten nicht geladen werden
    </h3>
    <span aria-hidden className="my-4 inline-block h-px w-12 bg-bank-gold/55" />
    {onRetry && (
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline-ink" size="sm">
          <RotateCcw size={13} strokeWidth={1.5} />
          Erneut versuchen
        </Button>
      </div>
    )}
  </SurfaceCard>
);

export default NewsErrorState;

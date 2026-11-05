import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

/**
 * Sticky Vergleichsleiste — sichtbar ab 2 ausgewählten Angeboten.
 * Max 4 Angebote gleichzeitig.
 */
export default function ComparisonBar({ selected = [], offersById, onRemove, onOpen, onClear }) {
  if (!selected.length) return null;
  return (
    <div
      data-testid="comparison-bar"
      className="fixed inset-x-0 bottom-0 z-[130] border-t border-bank-border bg-white/95 backdrop-blur shadow-editorial-md"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
            Vergleich
          </p>
          <p className="text-sm text-bank-text">
            <span className="rate-figure text-lg font-semibold text-bank-primary" data-numeric>
              {selected.length}
            </span>{' '}
            von 4 Angeboten ausgewählt
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.map((id) => {
            const o = offersById.get(id);
            if (!o) return null;
            const name = o.banks?.name || o.bank_name || o.product_name || '—';
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 border border-bank-border bg-bank-bg px-2 py-1 text-[11.5px] text-bank-text"
              >
                <span className="max-w-[110px] truncate">{name}</span>
                <button
                  type="button"
                  data-testid={`comparison-remove-${id}`}
                  onClick={() => onRemove(id)}
                  className="text-bank-text-muted hover:text-bank-primary"
                  aria-label={`${name} entfernen`}
                >
                  <X className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="comparison-clear"
            onClick={onClear}
            className="text-[12px] text-bank-text-muted underline-offset-4 hover:underline"
          >
            Auswahl löschen
          </button>
          <Button
            variant="primary"
            size="default"
            data-testid="comparison-open"
            disabled={selected.length < 2}
            className={cn(
              'h-10 px-5 text-[11px] font-semibold uppercase tracking-[0.14em]',
              selected.length < 2 && 'opacity-40'
            )}
            onClick={onOpen}
          >
            Jetzt vergleichen
          </Button>
        </div>
      </div>
    </div>
  );
}

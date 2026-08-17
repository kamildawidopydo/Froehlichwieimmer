import { useMemo, useState } from 'react';
import { BookOpen, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import {
  HOME_FAQ_CATEGORIES,
  HOME_FAQ_ITEMS,
  getHomeFaqByCategory,
  scrollToHomeSavingsInquiry,
} from '@/data/homeSavingsFaq';

const categoryLabel = (id) => HOME_FAQ_CATEGORIES.find((c) => c.id === id)?.label ?? id;

/**
 * @param {{ open: boolean; onOpenChange: (open: boolean) => void }} props
 */
export default function HomeSavingsFaqModal({ open, onOpenChange }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => getHomeFaqByCategory(activeCategory), [activeCategory]);

  const handleAskPersonal = () => {
    onOpenChange(false);
    requestAnimationFrame(() => scrollToHomeSavingsInquiry());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="flex max-h-[min(92dvh,880px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border border-bank-border bg-white p-0 sm:w-full"
      >
        <div className="shrink-0 border-b border-bank-border px-4 py-4 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bank-primary/10 text-bank-primary sm:h-11 sm:w-11">
              <BookOpen className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-bank-gold sm:tracking-[0.26em]">
                Wissenscenter
              </p>
              <DialogTitle className="font-display mt-1 text-left text-lg font-light leading-snug text-bank-text sm:text-2xl">
                Die wichtigsten Antworten — kompakt &amp; klar.
              </DialogTitle>
              <DialogDescription className="mt-2 text-left text-[13px] leading-relaxed text-bank-text-muted sm:text-sm">
                Alles, was Anleger zu Tagesgeld, Flexgeld und Zinsangeboten regulierter EU-Banken wissen sollten.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bank-border text-bank-text-muted transition-colors hover:text-bank-text"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </button>
          </div>

          <div
            className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2"
            role="tablist"
            aria-label="FAQ-Kategorien"
          >
            {HOME_FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.14em]',
                  activeCategory === cat.id
                    ? 'border-bank-signature bg-bank-signature text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-signature/35 hover:text-bank-signature',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
            <span className="text-bank-primary">{filtered.length}</span> Fragen in „
            {categoryLabel(activeCategory)}“
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 [scrollbar-width:thin]">
          <Accordion type="single" collapsible className="space-y-2">
            {filtered.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="overflow-hidden rounded-xl border border-bank-border bg-bank-bg/30 px-0"
              >
                <AccordionTrigger className="gap-3 px-4 py-4 text-left hover:no-underline sm:px-5">
                  <span className="shrink-0 rounded border border-bank-border bg-white px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-bank-text-muted">
                    {categoryLabel(item.category)}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-[15px] font-normal leading-snug text-bank-text">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-bank-text-muted sm:px-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-bank-border bg-bank-surface-elev px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-[12px] leading-relaxed text-bank-text-muted">
            Antwort nicht dabei? Wir helfen Ihnen persönlich weiter.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="h-auto min-h-11 w-full !whitespace-normal gap-2 sm:w-auto sm:shrink-0"
            onClick={handleAskPersonal}
          >
            Frage persönlich stellen
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={LUCIDE_STROKE} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

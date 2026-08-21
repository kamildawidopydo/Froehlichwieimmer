import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import {
  HOME_FAQ_ITEMS,
  HOME_FAQ_PREVIEW_IDS,
  scrollToHomeSavingsInquiry,
} from '@/data/homeSavingsFaq';
import HomeSavingsFaqModal from '@/components/home/HomeSavingsFaqModal';

const EASE = [0.22, 1, 0.36, 1];

export default function HomeSavingsFaqSection() {
  const prefersReduced = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);

  const previewItems = useMemo(
    () => HOME_FAQ_PREVIEW_IDS.map((id) => HOME_FAQ_ITEMS.find((item) => item.id === id)).filter(Boolean),
    [],
  );

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: prefersReduced ? 0 : 0.65, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  return (
    <>
      <HomeSavingsFaqModal open={modalOpen} onOpenChange={setModalOpen} />

      <section
        className="border-b border-bank-border bg-bank-surface-elev py-16 sm:py-20 lg:py-24"
        data-testid="home-savings-faq"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <motion.div {...reveal(0)} className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-bank-gold">
              Häufige Fragen
            </p>
            <h2
              className="font-display mt-4 text-[clamp(1.65rem,4vw,2.35rem)] font-light leading-tight text-bank-text"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Die wichtigsten Antworten —{' '}
              <span className="italic text-bank-primary">kompakt &amp; klar.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-bank-text-muted sm:text-lg">
              Wichtige Fragen zu Aktien, Anleihen, IPO und Krypto — kompakt beantwortet.
            </p>
          </motion.div>

          <motion.div {...reveal(1)} className="mx-auto mt-10 max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              {previewItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-sm"
                >
                  <AccordionTrigger className="px-5 py-4 text-left font-display text-[15px] font-normal text-bank-text hover:no-underline sm:px-6 sm:text-base">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-bank-text-muted sm:px-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-8">
              <Button
                type="button"
                variant="primary"
                size="xl"
                className="h-auto min-h-12 w-full max-w-full !whitespace-normal rounded-2xl px-4 py-3.5 text-center text-[13px] leading-snug sm:mx-auto sm:w-auto sm:max-w-md sm:rounded-full sm:px-8 sm:text-base"
                onClick={() => setModalOpen(true)}
                data-testid="home-faq-open-wissenscenter"
              >
                <BookOpen className="h-4 w-4 shrink-0" strokeWidth={LUCIDE_STROKE} />
                <span className="min-w-0">Alle wichtigen Antworten ansehen</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={LUCIDE_STROKE} />
              </Button>
            </div>
          </motion.div>

          <motion.div
            {...reveal(2)}
            className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-2xl border border-bank-border bg-white p-5 shadow-editorial-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6"
          >
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bank-border bg-bank-bg text-bank-primary">
                <CheckCircle2 className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
              </span>
              <p className="text-sm leading-relaxed text-bank-text-muted sm:text-[15px]">
                <span className="font-medium text-bank-text">Frage nicht gefunden?</span> Ihr persönlicher
                Ansprechpartner beantwortet sie gerne — unverbindlich und auf Deutsch.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="shrink-0 gap-2 rounded-full"
              onClick={scrollToHomeSavingsInquiry}
              data-testid="home-faq-ask-question"
            >
              Frage stellen
              <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </Button>
          </motion.div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-[12px] text-bank-text-muted">
            Mehr Antworten im{' '}
            <Link to="/faq" className="font-medium text-bank-primary hover:underline">
              vollständigen FAQ
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}

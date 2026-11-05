import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  Headphones,
  Mail,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import siteContact from '@/data/siteContact';

function splitEmailAddress(email) {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at < 1) return { local: value, domain: '' };
  return { local: value.slice(0, at + 1), domain: value.slice(at + 1) };
}

function EmailAddressText({ email, className }) {
  const { local, domain } = splitEmailAddress(email);
  if (!domain) return <span className={className}>{local}</span>;
  return (
    <span className={className}>
      <span className="whitespace-nowrap">{local}</span>
      <span className="break-words">{domain}</span>
    </span>
  );
}

const STEPS = [
  {
    id: 'received',
    title: 'Anfrage eingegangen',
    text: 'Ihre Angaben wurden sicher übermittelt und in unserem System erfasst.',
    active: true,
  },
  {
    id: 'review',
    title: 'Persönliche Prüfung',
    text: 'Unser Kundenservice prüft passende Tages-, Flex- und Festgeld-Konditionen regulierter EU-Partnerbanken.',
    active: false,
  },
  {
    id: 'reply',
    title: 'Rückmeldung an Sie',
    text: 'Wir melden uns in der Regel innerhalb von 2–3 Werktagen — telefonisch oder per E-Mail, wie von Ihnen gewünscht.',
    active: false,
  },
];

export default function HomeSavingsInquirySuccess({
  summary,
  onNewInquiry,
  prefersReduced = false,
}) {
  const displayName = summary?.firstName?.trim() || 'Ihre Anfrage';
  const ease = [0.22, 1, 0.36, 1];

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: prefersReduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: prefersReduced ? 0 : 0.5, ease, delay: prefersReduced ? 0 : delay },
  });

  return (
    <motion.div
      role="tabpanel"
      id="home-inquiry-tab-confirmation"
      aria-labelledby="home-inquiry-tab-confirmation-btn"
      className="px-5 py-8 sm:px-8 sm:py-10"
      initial={false}
    >
      <motion.div
        className="overflow-hidden rounded-xl border border-bank-primary/15 bg-gradient-to-br from-bank-primary/[0.06] via-white to-bank-gold/[0.04]"
        {...fade(0)}
      >
        <div className="border-b border-bank-primary/10 bg-bank-ink px-6 py-5 text-white sm:px-8">
          <div className="flex flex-wrap items-start gap-4 sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/45 bg-white/10">
              <CircleCheck className="h-6 w-6 text-white" strokeWidth={LUCIDE_STROKE} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
                Bestätigung · Unverbindlich
              </p>
              <h3
                className="font-display mt-2 text-[clamp(1.35rem,3.5vw,1.85rem)] font-light leading-tight text-white"
                style={{ fontVariationSettings: "'opsz' 132, 'SOFT' 100" }}
              >
                Vielen Dank, {displayName}
              </h3>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/90">
                Wir haben Ihre Anfrage erhalten und kümmern uns persönlich darum. Sie müssen nichts weiter
                unternehmen — wir melden uns bei Ihnen.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_minmax(0,280px)] lg:px-8 lg:py-8">
          <div>
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              So geht es weiter
            </p>
            <ol className="mt-5 space-y-0">
              {STEPS.map((step, index) => (
                <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < STEPS.length - 1 && (
                    <span
                      className="absolute left-[15px] top-8 bottom-0 w-px bg-bank-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                      step.active
                        ? 'border-bank-signature bg-bank-signature text-white'
                        : 'border-bank-border bg-white text-bank-text-muted',
                    )}
                  >
                    {step.active ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-display text-[1.05rem] font-medium text-bank-ink">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-bank-text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-w-0 space-y-4">
            {summary && (
              <div className="min-w-0 overflow-hidden rounded-lg border border-bank-border/80 bg-bank-bg/50 p-4">
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  Ihre Angaben
                </p>
                <dl className="mt-3 space-y-3 text-[13px]">
                  {[
                    ['Anlageform', summary.productType],
                    ['Summe', summary.amountLabel],
                    ['E-Mail', summary.email],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-bank-text-muted">{label}</dt>
                      <dd className="mt-0.5 font-medium text-bank-ink">
                        {label === 'E-Mail' ? (
                          <EmailAddressText email={value} className="block text-[13px]" />
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="min-w-0 overflow-hidden rounded-lg border border-bank-border/80 bg-white p-4">
              <div className="flex min-w-0 gap-3">
                <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-bank-ink">Persönliche Betreuung</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-bank-text-muted">
                    {siteContact.businessHoursLine}
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${siteContact.email}`}
                className="mt-3 flex w-full min-w-0 items-start gap-2 border-t border-bank-border/60 pt-3 text-[12px] font-medium leading-snug text-bank-primary hover:underline"
              >
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={LUCIDE_STROKE} aria-hidden />
                <EmailAddressText email={siteContact.email} className="min-w-0 flex-1 text-left" />
              </a>
            </div>

            <p className="flex gap-2 text-[11px] leading-relaxed text-bank-text-muted">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
              Unverbindliche Informationsanfrage — keine Verpflichtung zur Kontoeröffnung.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        {...fade(0.15)}
      >
        <p className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 text-[12px] leading-relaxed text-bank-text-muted">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
          <span>
            Bestätigung wurde an{' '}
            <EmailAddressText email={summary?.email} className="inline font-medium text-bank-ink" /> berücksichtigt.
          </span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline-ink" onClick={onNewInquiry}>
            Weitere Anfrage stellen
          </Button>
          <Button type="button" variant="primary" className="gap-2" asChild>
            <Link to="/comparison">
              Zum Vergleich
              <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </Link>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

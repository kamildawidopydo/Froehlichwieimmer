import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Clock3,
  Download,
  Euro,
  Loader2,
  Lock,
  Mail,
  Phone,
  Send,
  Shield,
  ShieldCheck,
  Target,
  User,
  IdCard,
} from 'lucide-react';
import BonusIcon from '@/components/BonusIcon';
import { useAuth } from '@/context/AuthContext';
import { mapProductInquiryInsertError, submitProductInquiryLead } from '@/lib/submitProductInquiryLead';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import {
  productInquiryQuestions,
  productInquiryLabels,
  productInquirySuccessCopy,
} from '@/data/productInquiryQuestions';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AktienHeaderPromo, AktienPremiumBanner } from '@/components/home/AktienInquiryPromo';
import {
  ANLEIHEN_VOLUME_ICONS,
  AnleihenBenefitsSidebar,
  AnleihenHeaderPromo,
  AnleihenPremiumBanner,
} from '@/components/home/AnleihenInquiryPromo';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { validatePersonName } from '@/lib/personName';
import { sanitizePhoneInput } from '@/lib/phoneNumber';

const initialContact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  customerNumber: '',
};

const QUESTION_ICONS = [Euro, Clock3, BarChart3, Shield, Target];

/**
 * @param {{ open: boolean; onOpenChange: (open: boolean) => void; product: 'aktien' | 'anleihen' | 'fonds' | 'tagesgeld' | 'festgeld' | 'flexgeld' | null; topic?: string | null; topicSlug?: string | null }} props
 */
const ProductInquiryWizard = ({ open, onOpenChange, product, topic = null, topicSlug = null }) => {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const questions = useMemo(
    () => (product ? productInquiryQuestions[product] || [] : []),
    [product],
  );
  const questionCount = questions.length;
  const totalSteps = questionCount + 1;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [contact, setContact] = useState(initialContact);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [contactErrors, setContactErrors] = useState({});
  // Report-PDF-Download (Session 75.1)
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  const reset = useCallback(() => {
    setStep(0);
    setAnswers({});
    setContact(initialContact);
    setConsentPrivacy(false);
    setConsentTerms(false);
    setConsentMarketing(false);
    setSubmitting(false);
    setSubmitError('');
    setDone(false);
    setContactErrors({});
    setDownloadingReport(false);
    setReportError('');
  }, []);

  /**
   * Lädt den personalisierten PDF-Report von POST /api/reports/pdf.
   * Nutzt ausschließlich bestehenden Wizard-State (Produkt + Antworten +
   * Kontaktdaten). Kein Wizard-Reset bei Fehlern — Success-Step bleibt
   * bestehen. Verhindert Mehrfachklicks über `downloadingReport`-Guard.
   */
  const handleDownloadReport = useCallback(async () => {
    if (downloadingReport || !product) return;
    setDownloadingReport(true);
    setReportError('');
    let blobUrl = null;
    try {
      const payload = {
        product,
        first_name: contact.firstName.trim(),
        last_name: contact.lastName.trim(),
        email: contact.email.trim(),
        phone: sanitizePhoneInput(contact.phone).trim(),
        customer_number: contact.customerNumber.trim() || null,
        answers,
      };
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/pdf')) {
        throw new Error(`report_failed:${res.status}`);
      }
      const blob = await res.blob();
      if (blob.size === 0 || !blob.type.includes('pdf')) {
        throw new Error('report_empty');
      }
      // Dateiname aus Content-Disposition extrahieren (RFC 5987 + fallback)
      const disp = res.headers.get('content-disposition') || '';
      let filename = `anlage-report-${product}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const utf8Match = disp.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = disp.match(/filename="?([^";]+)"?/i);
      if (utf8Match) {
        try { filename = decodeURIComponent(utf8Match[1]); } catch { /* keep fallback */ }
      } else if (asciiMatch) {
        filename = asciiMatch[1];
      }
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      try {
        await logEvent(EVENTS.PRODUCT_INQUIRY_SUBMIT, { product, action: 'report_download' }, { userId: user?.id ?? null });
      } catch (logErr) { /* non-fatal */ }
    } catch (err) {
      console.warn('[product-inquiry-wizard] report download failed:', err);
      setReportError('Der Report konnte gerade nicht erstellt werden. Bitte versuchen Sie es erneut.');
    } finally {
      // Kurze Verzögerung, damit der Browser den Download-Klick abschließen kann,
      // bevor die Object-URL freigegeben wird.
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      setDownloadingReport(false);
    }
  }, [downloadingReport, product, contact, answers, user]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Session 80.21c — Topic-Modus (Strategie-CTA):
  // Wenn beim Öffnen ein `topic` gesetzt ist, springt der Wizard direkt zur
  // Kontakt-Stufe (überspringt Produkt-Fragen) und initialisiert `answers`
  // mit dem Strategie-Thema, damit der Berater es in Report/Mail sieht.
  const topicInitedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      topicInitedRef.current = false;
      return;
    }
    if (topic && product && !topicInitedRef.current) {
      topicInitedRef.current = true;
      setStep(questionCount);
      setAnswers({
        _strategie_thema: { value: topicSlug || topic, label: topic },
        _strategie_anliegen: {
          value: 'strategie-cta',
          label: `Ich interessiere mich für das Thema ${topic} und möchte ein unverbindliches Gespräch.`,
        },
      });
    }
  }, [open, topic, topicSlug, product, questionCount]);

  const isContactStep = step >= questionCount;
  const currentQuestion = !isContactStep ? questions[step] : null;
  const progressPct = totalSteps > 0 ? Math.round(((step + 1) / totalSteps) * 100) : 0;
  const QuestionIcon = QUESTION_ICONS[Math.min(step, QUESTION_ICONS.length - 1)];

  const selectOption = (qid, option) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { value: option.value, label: option.label },
    }));
  };

  const canAdvanceQuestion = currentQuestion && answers[currentQuestion.id];

  const validateContact = () => {
    const firstNameCheck = validatePersonName(contact.firstName, { label: 'Vorname' });
    const lastNameCheck = validatePersonName(contact.lastName, { label: 'Nachname' });
    const em = contact.email.trim();
    const ph = sanitizePhoneInput(contact.phone).trim();
    const errors = {};
    if (!contact.firstName.trim()) {
      errors.firstName = 'Bitte geben Sie Ihren Vornamen ein.';
    } else if (!firstNameCheck.ok) {
      errors.firstName = firstNameCheck.message;
    }
    if (!contact.lastName.trim()) {
      errors.lastName = 'Bitte geben Sie Ihren Nachnamen ein.';
    } else if (!lastNameCheck.ok) {
      errors.lastName = lastNameCheck.message;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      errors.email = 'Bitte eine gültige E-Mail-Adresse angeben.';
    }
    if (!ph || ph.length < 6) {
      errors.phone = 'Bitte eine erreichbare Telefonnummer angeben.';
    }
    setContactErrors(errors);
    // Fokus auf das erste ungültige Feld — via requestAnimationFrame nach dem
    // State-Commit, damit das programmatische onFocus keinen Stale-Closure-
    // Race mit setContactErrors() ausloest.
    const scheduleFocus = (ref) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => ref.current?.focus());
      } else {
        setTimeout(() => ref.current?.focus(), 0);
      }
    };
    if (errors.firstName) { scheduleFocus(firstNameRef); toast.error(errors.firstName); return false; }
    if (errors.lastName)  { scheduleFocus(lastNameRef);  toast.error(errors.lastName);  return false; }
    if (errors.phone)     { scheduleFocus(phoneRef);     toast.error(errors.phone);     return false; }
    if (errors.email)     { scheduleFocus(emailRef);     toast.error(errors.email);     return false; }
    if (!consentPrivacy || !consentTerms) {
      toast.error('Bitte Datenschutz und AGB bestätigen.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!isContactStep) {
      if (!canAdvanceQuestion) {
        toast.error('Bitte eine Antwort auswählen.');
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validateContact() || !product) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const firstNameCheck = validatePersonName(contact.firstName, { label: 'Vorname' });
      const lastNameCheck = validatePersonName(contact.lastName, { label: 'Nachname' });
      const payload = {
        product,
        answers,
        first_name: firstNameCheck.value,
        last_name: lastNameCheck.value,
        email: contact.email.trim(),
        phone: sanitizePhoneInput(contact.phone).trim(),
        customer_number: contact.customerNumber.trim() || null,
        consent_privacy: true,
        consent_terms: true,
        consent_marketing: consentMarketing,
      };
      const result = await submitProductInquiryLead(payload);
      if (result.error) {
        console.error('[product-inquiry-wizard]', result.error);
        const message = mapProductInquiryInsertError(result.error);
        setSubmitError(
          'Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
        );
        toast.error(message);
        return;
      }
      try {
        await logEvent(EVENTS.PRODUCT_INQUIRY_SUBMIT, { product }, { userId: user?.id ?? null });
        logVisitorConversion('product_inquiry', { product });
      } catch (logErr) {
        console.warn(logErr);
      }
      setDone(true);
      toast.success('Vielen Dank — wir prüfen Ihre Anfrage persönlich und melden uns bei Ihnen.');
    } catch (e) {
      console.error(e);
      setSubmitError(
        'Die Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
      );
      toast.error(mapProductInquiryInsertError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const titleLabel = product ? productInquiryLabels[product] : '';
  const successCopy = product ? productInquirySuccessCopy[product] : null;
  const isAktien = product === 'aktien';
  const isAnleihen = product === 'anleihen';
  const compactQuestionStep = !isContactStep && !done;

  const linkClass =
    'font-medium text-bank-ink underline decoration-bank-ink/25 underline-offset-[3px] hover:decoration-bank-ink/50';

  /** Frage-Schritte: eine kompakte Spalte ohne Scroll. Kontakt: volle Infos, bei Bedarf scrollbar. */
  const sidebar = isContactStep ? (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-y-contain border-t border-bank-border bg-bank-surface p-3.5 [scrollbar-width:thin] sm:p-4 lg:w-[min(268px,32%)] lg:max-w-[300px] lg:border-l lg:border-t-0 lg:pl-4">
      <div className="rounded-xl border border-bank-border bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex items-center gap-2.5 text-bank-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--bank-ink)/0.06)] text-bank-ink shadow-none">
            <BonusIcon className="h-4 w-4" />
          </span>
          <p className="font-display text-[15px] font-light tracking-tight">Ihr Vorteil</p>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-bank-text-muted">
          Konditionen hängen von Anlageform und Volumen ab — wir melden uns mit einer klaren, unverbindlichen
          Ersteinschätzung.
        </p>
        <ul className="mt-3 space-y-2 text-[12px] leading-snug text-bank-text-muted">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-ink/30" />
            <span>
              <span className="font-medium text-bank-ink">Aktien:</span> mögliche Konditionsvorteile bei passendem
              Profil
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-ink/30" />
            <span>
              <span className="font-medium text-bank-ink">Anleihen:</span> Zugang zum Anleihen-Universum &amp; Beratung
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-ink/30" />
            <span>
              <span className="font-medium text-bank-ink">Einlagen:</span> Tages-, Fest- &amp; Flexgeld passend zu Ihrer
              Liquidität
            </span>
          </li>
        </ul>
      </div>
      <div className="mt-3 rounded-xl border border-bank-border bg-white p-3.5 shadow-sm sm:p-4">
        <p className="font-display text-[15px] font-light tracking-tight text-bank-ink">Warum Fröhlich Vermögensberatung GmbH?</p>
        <ul className="mt-3 space-y-2 text-[12px] text-bank-text-muted">
          {['Sicher & reguliert', 'Persönliche Beratung', 'Exklusive Konditionen', 'Schnell & unkompliziert'].map(
            (line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-ink/70" strokeWidth={2.35} />
                <span>{line}</span>
              </li>
            ),
          )}
        </ul>
        <div className="mt-3 flex gap-2.5 rounded-lg border border-bank-border bg-bank-surface-elev px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-bank-ink/80" strokeWidth={LUCIDE_STROKE} />
          <p className="text-[11px] leading-snug text-bank-text-muted">
            Erfahrung und Transparenz — nachvollziehbare Prozesse ohne versteckte Kleingedruckte-Tricks.
          </p>
        </div>
      </div>
    </aside>
  ) : isAnleihen ? (
    <aside
      className={cn(
        'flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-y-contain border-t border-bank-border bg-bank-surface [scrollbar-width:thin] lg:border-l lg:border-t-0',
        compactQuestionStep
          ? 'hidden p-3 sm:p-3.5 lg:flex lg:w-[min(280px,32%)] lg:max-w-[300px] lg:pl-3'
          : 'p-3 sm:p-3.5 lg:w-[min(280px,32%)] lg:max-w-[300px] lg:pl-3.5',
      )}
    >
      <AnleihenBenefitsSidebar compact={compactQuestionStep} />
    </aside>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="product-inquiry-wizard"
        data-product={product || ''}
        className={cn(
          'flex max-h-[min(98dvh,940px)] min-h-0 w-[min(calc(100%-0.75rem),960px)] max-w-[min(96%,960px)] flex-col overflow-hidden rounded-[1.25rem] border border-bank-border bg-white p-0 shadow-[0_24px_64px_-32px_rgb(7_18_34/0.18)]',
          'gap-0 print:hidden',
          '[&>button]:right-3 [&>button]:top-3 [&>button]:z-10 [&>button]:rounded-lg [&>button]:text-bank-text-muted [&>button]:opacity-100 [&>button]:hover:bg-bank-surface-elev [&>button]:hover:text-bank-ink sm:[&>button]:right-4 sm:[&>button]:top-4',
        )}
        onPointerDownOutside={(e) => {
          if (submitting) e.preventDefault();
        }}
      >
        <div
          className={cn(
            'relative shrink-0 overflow-visible border-b border-bank-border bg-bank-surface',
            compactQuestionStep ? 'px-5 pb-4 pt-8 sm:px-7 sm:pb-5 sm:pt-9' : 'px-4 pb-4 pt-10 sm:px-7 sm:pb-5 sm:pt-12',
            done && !compactQuestionStep && 'pb-8 sm:pb-10',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-primary/25 to-transparent"
          />
          <div className="relative z-[1] flex items-start gap-2 sm:gap-3">
            {step > 0 && !done && !topic ? (
              <button
                type="button"
                onClick={handleBack}
                data-testid="product-inquiry-back"
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg border border-bank-border bg-white text-bank-ink shadow-sm transition-colors hover:border-bank-primary/25 hover:bg-bank-surface-elev',
                  compactQuestionStep ? 'mt-0 h-8 w-8' : 'mt-0.5 h-9 w-9',
                )}
                aria-label="Zurück"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
              </button>
            ) : (
              <span className={cn('shrink-0', compactQuestionStep ? 'w-8' : 'w-9 sm:w-10')} aria-hidden />
            )}
            <div className="min-w-0 flex-1 pr-8 sm:pr-10">
              <p
                className={cn(
                  'flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.24em] text-bank-primary',
                  compactQuestionStep ? 'text-[10.5px]' : 'text-[9px] tracking-[0.26em] text-bank-text-muted',
                )}
              >
                <span className={cn('h-px', compactQuestionStep ? 'w-6 bg-bank-primary/40' : 'w-6 bg-bank-border')} aria-hidden />
                Kurzfragebogen
              </p>
              <DialogTitle
                className={cn(
                  'font-display font-light leading-[1.05] tracking-tight text-bank-ink',
                  compactQuestionStep
                    ? 'mt-1.5 text-[1.9rem] sm:text-[2.35rem] lg:text-[2.6rem]'
                    : 'mt-1 text-[1.35rem] sm:text-2xl',
                )}
              >
                {done ? 'Anfrage gesendet' : (topic ? `Persönliches Gespräch: ${topic}` : titleLabel)}
              </DialogTitle>
            </div>
            {isAktien && compactQuestionStep ? (
              <div className="hidden min-w-0 max-w-[min(340px,46%)] lg:block">
                <AktienHeaderPromo compact />
              </div>
            ) : null}
            {isAnleihen && compactQuestionStep ? (
              <div className="hidden min-w-0 max-w-[min(340px,46%)] lg:block">
                <AnleihenHeaderPromo compact />
              </div>
            ) : null}
          </div>
          {compactQuestionStep ? (
            <DialogDescription className="relative z-[1] mt-2 max-w-[54ch] text-left text-[13.5px] leading-relaxed text-bank-text-muted sm:text-[14.5px]">
              Wir finden gemeinsam die passende Anlagestrategie für Ihre Ziele.
            </DialogDescription>
          ) : (
            <DialogDescription className="relative z-[1] mt-2 max-w-[52ch] text-left text-[12px] leading-snug text-bank-text-muted sm:text-[13px] sm:leading-relaxed">
              {done
                ? 'Ihre Angaben wurden übermittelt.'
                : 'Beantworten Sie bitte einige kurze Fragen (ca. 2 Minuten). Unverbindliche Erstinformation — keine rechtsverbindliche Eignungsfeststellung.'}
            </DialogDescription>
          )}
          {!done && !topic && (
            <div
              className="relative z-[1] mt-2"
              data-testid="product-inquiry-progress"
              data-step={Math.min(step + 1, totalSteps)}
              data-total={totalSteps}
            >
              {compactQuestionStep ? (
                <div className="mt-4 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-bank-border">
                      <div
                        className="h-full rounded-full bg-bank-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-bank-ink">
                    {Math.min(step + 1, totalSteps)} / {totalSteps}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-bank-border">
                    <div
                      className="h-full rounded-full bg-bank-primary transition-[width] duration-500 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
                    Schritt {Math.min(step + 1, totalSteps)} von {totalSteps}
                  </p>
                </div>
              )}
            </div>
          )}
          {done && (
            <svg
              className="pointer-events-none absolute -bottom-px left-0 h-11 w-full text-bank-bg sm:h-14"
              viewBox="0 0 1200 70"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M0,32 Q300,8 600,32 T1200,32 L1200,70 L0,70Z"
              />
            </svg>
          )}
        </div>

        {done ? (
          <div
            className="relative flex flex-col bg-bank-bg px-4 pb-10 pt-2 sm:px-8 sm:pb-12 sm:pt-3"
            data-testid="product-inquiry-success"
          >
            <motion.div
              className="mx-auto flex w-full max-w-md flex-col items-center text-center"
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: reduceMotion
                    ? { duration: 0 }
                    : { staggerChildren: 0.1, delayChildren: 0.05 },
                },
              }}
            >
              <motion.div
                className="relative flex flex-col items-center"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.92 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: reduceMotion
                      ? { duration: 0.2 }
                      : { type: 'spring', stiffness: 380, damping: 26 },
                  },
                }}
              >
                {!reduceMotion && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-bank-ink/15"
                    initial={{ scale: 0.75, opacity: 0.35 }}
                    animate={{ scale: 1.45, opacity: 0 }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden
                  />
                )}
                <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-bank-primary/20 bg-white shadow-md sm:h-20 sm:w-20">
                  <motion.div
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.15 }
                        : { type: 'spring', stiffness: 520, damping: 22, delay: 0.12 }
                    }
                  >
                    <Check
                      className="h-9 w-9 text-bank-primary sm:h-10 sm:w-10"
                      strokeWidth={2.75}
                      aria-hidden
                    />
                  </motion.div>
                </div>
              </motion.div>

              <motion.p
                className="mt-6 font-display text-lg font-light tracking-tight text-bank-ink sm:text-xl"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                {successCopy?.title || 'Vielen Dank'}
              </motion.p>
              <motion.p
                className="mt-2 max-w-[44ch] text-[13px] leading-relaxed text-bank-text-muted sm:text-sm"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                {successCopy?.body ||
                  'Wir haben Ihre Angaben erhalten und prüfen persönlich, welche Lösung zu Ihrem Profil passt.'}
              </motion.p>
              <motion.p
                className="mt-3 max-w-[44ch] text-[13px] leading-relaxed text-bank-text-muted sm:text-sm"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.05 } },
                }}
              >
                {successCopy?.followUp ||
                  'Unser Team meldet sich werktags in der Regel innerhalb von 1–2 Werktagen bei Ihnen.'}
              </motion.p>

              <motion.div
                className="mt-8 flex w-full max-w-[320px] flex-col gap-3"
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                {/* Sekundärer CTA — Report herunterladen (Session 75.1) */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                  aria-busy={downloadingReport ? 'true' : 'false'}
                  aria-live="polite"
                  data-testid="product-inquiry-download-report"
                  className="group h-12 w-full rounded-xl border-bank-primary/30 bg-white px-6 text-[14px] font-semibold tracking-wide text-bank-primary transition-all hover:border-bank-primary/60 hover:bg-bank-primary/[0.05] focus-visible:ring-2 focus-visible:ring-bank-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {downloadingReport ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden strokeWidth={LUCIDE_STROKE} />
                      <span>Report wird erstellt…</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" aria-hidden strokeWidth={LUCIDE_STROKE} />
                      <span>Report herunterladen</span>
                    </span>
                  )}
                </Button>
                <p className="text-[11.5px] leading-snug text-bank-text-muted" data-testid="product-inquiry-download-hint">
                  Ihre persönliche Zusammenfassung als PDF.
                </p>
                {reportError ? (
                  <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-snug text-red-700"
                    data-testid="product-inquiry-download-error"
                  >
                    {reportError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="primary"
                  className="mt-1 h-12 w-full rounded-xl px-8 text-[15px] font-semibold tracking-wide shadow-[0_10px_28px_-12px_rgb(9_33_66/0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-14px_rgb(9_33_66/0.5)] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => onOpenChange(false)}
                  data-testid="product-inquiry-success-close"
                >
                  Schließen
                </Button>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:thin] lg:flex-row lg:overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bank-bg">
                <div
                  className={cn(
                    'min-h-0 flex-1 overscroll-y-contain px-4 sm:px-5',
                    isContactStep
                      ? 'py-4 sm:py-5 lg:overflow-y-auto'
                      : 'overflow-y-auto py-3.5 [scrollbar-width:thin] sm:py-4',
                  )}
                >
              {isContactStep ? (
                <>
                  {topic ? (
                    <div
                      className="mb-4 rounded-lg border border-bank-primary/20 bg-bank-primary/[0.04] px-4 py-3"
                      data-testid="product-inquiry-topic-banner"
                    >
                      <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Ihr Thema</p>
                      <p className="mt-1 font-serif text-[15px] leading-snug text-bank-ink">{topic}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-bank-text-muted">
                        Wir melden uns unverbindlich mit einer Ersteinschätzung zu diesem Thema.
                      </p>
                    </div>
                  ) : null}
                  <h4 className="font-display text-[1.25rem] font-medium tracking-tight text-bank-ink sm:text-[1.35rem]">
                    Ihre Kontaktdaten
                  </h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-bank-text-muted">
                    Pflichtfelder mit *. Optional: Kundennummer, falls Sie bereits Kunde sind.
                  </p>

                  <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pi-first" className="text-[13px] font-medium text-bank-ink">
                        Vorname *
                      </Label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted"
                          strokeWidth={LUCIDE_STROKE}
                        />
                        <Input
                          id="pi-first"
                          ref={firstNameRef}
                          value={contact.firstName}
                          onChange={(e) => {
                            const nextVal = sanitizeFormField('firstName', e.target.value);
                            setContact((c) => ({ ...c, firstName: nextVal }));
                            if (contactErrors.firstName && nextVal.trim().length >= 1) {
                              setContactErrors((p) => ({ ...p, firstName: undefined }));
                            }
                          }}
                          aria-invalid={contactErrors.firstName ? 'true' : undefined}
                          aria-describedby={contactErrors.firstName ? 'pi-first-error' : undefined}
                          className={cn(
                            'h-11 rounded-lg border-bank-border bg-white pl-10 text-[14px] shadow-none placeholder:font-normal placeholder:not-italic placeholder:text-bank-text-muted/55 focus-visible:border-bank-primary/60 focus-visible:ring-bank-primary/25',
                            contactErrors.firstName && 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/25',
                          )}
                          autoComplete="given-name"
                          placeholder="Max"
                        />
                      </div>
                      {contactErrors.firstName ? (
                        <p id="pi-first-error" role="alert" className="mt-1 text-[12px] leading-snug text-red-600" data-testid="pi-first-error">
                          {contactErrors.firstName}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pi-last" className="text-[13px] font-medium text-bank-ink">
                        Nachname *
                      </Label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted"
                          strokeWidth={LUCIDE_STROKE}
                        />
                        <Input
                          id="pi-last"
                          ref={lastNameRef}
                          value={contact.lastName}
                          onChange={(e) => {
                            const nextVal = sanitizeFormField('lastName', e.target.value);
                            setContact((c) => ({ ...c, lastName: nextVal }));
                            if (contactErrors.lastName && nextVal.trim().length >= 1) {
                              setContactErrors((p) => ({ ...p, lastName: undefined }));
                            }
                          }}
                          aria-invalid={contactErrors.lastName ? 'true' : undefined}
                          aria-describedby={contactErrors.lastName ? 'pi-last-error' : undefined}
                          className={cn(
                            'h-11 rounded-lg border-bank-border bg-white pl-10 text-[14px] shadow-none placeholder:font-normal placeholder:not-italic placeholder:text-bank-text-muted/55 focus-visible:border-bank-primary/60 focus-visible:ring-bank-primary/25',
                            contactErrors.lastName && 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/25',
                          )}
                          autoComplete="family-name"
                          placeholder="Mustermann"
                        />
                      </div>
                      {contactErrors.lastName ? (
                        <p id="pi-last-error" role="alert" className="mt-1 text-[12px] leading-snug text-red-600" data-testid="pi-last-error">
                          {contactErrors.lastName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5">
                    <Label htmlFor="pi-phone" className="text-[13px] font-medium text-bank-ink">
                      Telefonnummer *
                    </Label>
                    <div className="relative">
                      <Phone
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted"
                        strokeWidth={LUCIDE_STROKE}
                      />
                      <Input
                        id="pi-phone"
                        type="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, phone: sanitizeFormField('phone', e.target.value) }))
                        }
                        className="h-11 rounded-lg border-bank-border bg-white pl-10 text-[14px] shadow-none placeholder:font-normal placeholder:not-italic placeholder:text-bank-text-muted/55 focus-visible:border-bank-primary/60 focus-visible:ring-bank-primary/25"
                        autoComplete="tel"
                        placeholder="+49 …"
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5">
                    <Label htmlFor="pi-email" className="text-[13px] font-medium text-bank-ink">
                      E-Mail-Adresse *
                    </Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted"
                        strokeWidth={LUCIDE_STROKE}
                      />
                      <Input
                        id="pi-email"
                        type="email"
                        value={contact.email}
                        onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                        className="h-11 rounded-lg border-bank-border bg-white pl-10 text-[14px] shadow-none placeholder:font-normal placeholder:not-italic placeholder:text-bank-text-muted/55 focus-visible:border-bank-primary/60 focus-visible:ring-bank-primary/25"
                        autoComplete="email"
                        placeholder="name@beispiel.de"
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5">
                    <Label htmlFor="pi-cust" className="text-[13px] font-medium text-bank-text-muted">
                      Kundennummer <span className="font-normal">(optional)</span>
                    </Label>
                    <div className="relative">
                      <IdCard
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted"
                        strokeWidth={LUCIDE_STROKE}
                      />
                      <Input
                        id="pi-cust"
                        value={contact.customerNumber}
                        onChange={(e) => setContact((c) => ({ ...c, customerNumber: e.target.value }))}
                        className="h-11 rounded-lg border-bank-border bg-white pl-10 text-[14px] shadow-none placeholder:font-normal placeholder:not-italic placeholder:text-bank-text-muted/55 focus-visible:border-bank-primary/60 focus-visible:ring-bank-primary/25"
                        placeholder="falls vorhanden"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 rounded-lg border border-bank-border bg-white p-3.5 sm:p-4">
                    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-bank-text">
                      <Checkbox
                        checked={consentPrivacy}
                        onCheckedChange={(v) => setConsentPrivacy(Boolean(v))}
                        data-testid="product-inquiry-consent-privacy"
                        className="mt-0.5 border-bank-border data-[state=checked]:border-bank-primary data-[state=checked]:bg-bank-primary data-[state=checked]:text-white"
                      />
                      <span>
                        Ich habe die{' '}
                        <Link to="/legal/privacy" className={linkClass} target="_blank" rel="noreferrer">
                          Datenschutzerklärung
                        </Link>{' '}
                        gelesen und willige in die Verarbeitung meiner Daten zur Kontaktaufnahme ein. *
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-bank-text">
                      <Checkbox
                        checked={consentTerms}
                        onCheckedChange={(v) => setConsentTerms(Boolean(v))}
                        data-testid="product-inquiry-consent-terms"
                        className="mt-0.5 border-bank-border data-[state=checked]:border-bank-primary data-[state=checked]:bg-bank-primary data-[state=checked]:text-white"
                      />
                      <span>
                        Ich akzeptiere die{' '}
                        <Link to="/legal/terms" className={linkClass} target="_blank" rel="noreferrer">
                          AGB
                        </Link>
                        . *
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-bank-text-muted">
                      <Checkbox
                        checked={consentMarketing}
                        onCheckedChange={(v) => setConsentMarketing(Boolean(v))}
                        data-testid="product-inquiry-consent-marketing"
                        className="mt-0.5 border-bank-border"
                      />
                      <span>
                        Informationen zu Produkten per E-Mail (freiwillig, jederzeit widerruflich).
                      </span>
                    </label>
                  </div>

                  <p className="mt-4 flex items-start gap-2 text-[12px] text-bank-text-muted">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
                    <span>Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.</span>
                  </p>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'rounded-2xl border border-bank-border bg-white shadow-[0_2px_12px_-6px_rgb(9_33_66/0.08)]',
                      compactQuestionStep ? 'p-4 sm:p-5 lg:p-6' : 'p-4 sm:p-5',
                    )}
                  >
                    <p
                      className={cn(
                        'font-display font-light leading-[1.1] tracking-tight text-bank-ink',
                        compactQuestionStep
                          ? 'text-[1.45rem] sm:text-[1.7rem] lg:text-[1.85rem]'
                          : 'text-[1.25rem] sm:text-[1.4rem]',
                      )}
                    >
                      {questionCount} kurze Fragen zu Ihrer Anlage
                    </p>
                    <p
                      className={cn(
                        'text-bank-text-muted',
                        compactQuestionStep
                          ? 'mt-1.5 text-[13px] leading-relaxed sm:text-[13.5px]'
                          : 'mt-1.5 text-[12px] sm:text-[13px]',
                      )}
                    >
                      {compactQuestionStep
                        ? 'Ihre Antworten helfen uns, eine passende Empfehlung zu finden.'
                        : 'Bitte markieren Sie je eine Antwort.'}
                    </p>

                    <div
                      className={cn(
                        'flex flex-wrap items-start gap-3 border-t border-bank-border',
                        compactQuestionStep ? 'mt-4 pt-4 sm:mt-5 sm:pt-5' : 'mt-5 gap-3 pt-5 border-dashed border-[rgb(var(--bank-ink)/0.1)]',
                      )}
                    >
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className={cn(
                            'flex items-center justify-center rounded-xl bg-bank-primary font-semibold text-white shadow-[0_6px_16px_-6px_rgb(76_124_186/0.55)]',
                            compactQuestionStep ? 'h-11 w-11 text-[15px] sm:h-12 sm:w-12 sm:text-[16px]' : 'h-10 w-10 text-[13px]',
                          )}
                        >
                          {step + 1}
                        </div>
                        <div
                          className={cn(
                            'flex items-center justify-center rounded-xl border bg-bank-primary/[0.06] text-bank-primary',
                            compactQuestionStep
                              ? 'h-11 w-11 border-bank-primary/25 sm:h-12 sm:w-12'
                              : 'h-10 w-10 border-2 border-[rgb(var(--bank-primary)/0.3)] bg-white text-bank-ink shadow-sm',
                          )}
                        >
                          <QuestionIcon
                            className={compactQuestionStep ? 'h-[1.25rem] w-[1.25rem] sm:h-[1.4rem] sm:w-[1.4rem]' : 'h-[1.15rem] w-[1.15rem]'}
                            strokeWidth={LUCIDE_STROKE}
                          />
                        </div>
                      </div>
                      <p
                        data-testid="product-inquiry-question"
                        data-question-id={currentQuestion?.id || ''}
                        className={cn(
                          'min-w-0 flex-1 font-display font-light leading-[1.25] tracking-tight text-bank-ink',
                          compactQuestionStep
                            ? 'self-center text-[1.15rem] sm:text-[1.3rem] lg:text-[1.4rem]'
                            : 'text-[1.05rem] sm:text-[1.2rem]',
                        )}
                      >
                        {currentQuestion?.prompt}
                      </p>
                    </div>

                    {compactQuestionStep ? (
                      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] leading-snug text-bank-text-muted sm:text-[13px]">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-bank-primary/70" strokeWidth={LUCIDE_STROKE} aria-hidden />
                        <span>Ihre Angaben werden vertraulich behandelt.</span>
                      </p>
                    ) : null}

                    <div
                      className={cn(
                        'grid',
                        compactQuestionStep ? 'mt-4 gap-2.5 sm:mt-5 sm:gap-3' : 'mt-5 gap-2.5',
                        (currentQuestion?.options.length || 0) === 4 && (compactQuestionStep ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'),
                        (currentQuestion?.options.length || 0) === 3 && 'grid-cols-1 sm:grid-cols-3',
                        (currentQuestion?.options.length || 0) <= 2 && 'grid-cols-1 sm:grid-cols-2',
                        (currentQuestion?.options.length || 0) >= 5 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                      )}
                    >
                      {currentQuestion?.options.map((opt) => {
                        const selected = answers[currentQuestion.id]?.value === opt.value;
                        const OptionIcon =
                          isAnleihen && currentQuestion.id === 'volume'
                            ? ANLEIHEN_VOLUME_ICONS[opt.value]
                            : null;
                        if (compactQuestionStep) {
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => selectOption(currentQuestion.id, opt)}
                              data-testid={`product-inquiry-option-${opt.value}`}
                              data-selected={selected ? 'true' : 'false'}
                              className={cn(
                                'group/opt relative flex w-full items-center gap-3 rounded-xl border-2 bg-white px-4 py-3.5 text-left transition-all duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30 focus-visible:ring-offset-1',
                                'min-h-[3.5rem] sm:min-h-[3.75rem] sm:gap-3.5 sm:px-5 sm:py-4',
                                selected
                                  ? 'border-bank-primary bg-bank-primary/[0.06]'
                                  : 'border-bank-border hover:border-bank-primary/45 hover:bg-bank-primary/[0.03]',
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors sm:h-11 sm:w-11',
                                  selected
                                    ? 'border-bank-primary bg-bank-primary text-white'
                                    : 'border-bank-border bg-bank-surface text-bank-primary/80 group-hover/opt:border-bank-primary/30 group-hover/opt:bg-bank-primary/10 group-hover/opt:text-bank-primary',
                                )}
                              >
                                {OptionIcon ? (
                                  <OptionIcon className="h-[1.05rem] w-[1.05rem]" strokeWidth={LUCIDE_STROKE} />
                                ) : selected ? (
                                  <Check className="h-4 w-4" strokeWidth={2.6} />
                                ) : (
                                  <QuestionIcon className="h-[1.05rem] w-[1.05rem]" strokeWidth={LUCIDE_STROKE} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-bank-ink sm:text-[15.5px]">
                                {opt.label}
                              </span>
                              <ArrowRight
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-transform',
                                  selected
                                    ? 'text-bank-primary translate-x-0.5'
                                    : 'text-bank-text-muted/60 group-hover/opt:translate-x-0.5 group-hover/opt:text-bank-primary',
                                )}
                                strokeWidth={LUCIDE_STROKE}
                                aria-hidden
                              />
                            </button>
                          );
                        }
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => selectOption(currentQuestion.id, opt)}
                            data-testid={`product-inquiry-option-${opt.value}`}
                            data-selected={selected ? 'true' : 'false'}
                            className={cn(
                              'group/opt relative flex w-full items-center justify-center rounded-lg border px-3 text-center font-medium leading-snug transition-colors duration-150',
                              OptionIcon && 'gap-2',
                              'min-h-[3rem] py-3 text-[13px]',
                              selected
                                ? 'border-bank-signature bg-bank-signature/[0.08] text-bank-ink ring-1 ring-bank-signature/25'
                                : 'border-bank-border bg-white text-bank-ink hover:border-bank-signature/35 hover:bg-bank-signature/[0.04]',
                            )}
                          >
                            {OptionIcon ? (
                              <OptionIcon
                                className="relative z-[1] h-3.5 w-3.5 shrink-0 text-bank-text-muted"
                                strokeWidth={LUCIDE_STROKE}
                                aria-hidden
                              />
                            ) : null}
                            <span className="relative z-[1]">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isAktien ? <AktienPremiumBanner compact={compactQuestionStep} /> : null}
                    {isAnleihen ? <AnleihenPremiumBanner compact={compactQuestionStep} /> : null}

                    {compactQuestionStep ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-bank-border pt-4 sm:mt-6 sm:grid-cols-3 sm:gap-4 sm:pt-5">
                        {[
                          { Icon: ShieldCheck, title: 'Vertraulich & sicher', body: 'Ihre Angaben werden geschützt verarbeitet.' },
                          { Icon: Clock3, title: 'Nur wenige Minuten', body: 'Schnell zur passenden Orientierung.' },
                          { Icon: BadgeCheck, title: 'Kostenlos & unverbindlich', body: 'Sie entscheiden ohne Verpflichtung.' },
                        ].map(({ Icon, title, body }) => (
                          <div key={title} className="flex items-start gap-2.5">
                            <span
                              aria-hidden
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/[0.06] text-bank-primary"
                            >
                              <Icon className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold leading-tight text-bank-ink">{title}</p>
                              <p className="mt-0.5 text-[12px] leading-snug text-bank-text-muted">{body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}

                </div>

                <div
                  className={cn(
                    'shrink-0 border-t border-bank-border bg-white px-4 sm:px-5',
                    compactQuestionStep ? 'pb-3.5 pt-3 sm:pb-4 sm:pt-3.5' : 'pb-3 pt-3 sm:pb-4 sm:pt-3.5',
                  )}
                >
                  {isContactStep && submitError ? (
                    <div
                      role="alert"
                      data-testid="product-inquiry-error"
                      className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] leading-snug text-red-900"
                    >
                      {submitError}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    disabled={submitting}
                    data-testid={isContactStep ? 'product-inquiry-submit' : 'product-inquiry-next'}
                    className={cn(
                      'w-full rounded-xl border border-bank-signature/10 bg-bank-signature font-semibold tracking-wide text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-bank-signature-hover hover:shadow-md active:translate-y-0 active:scale-[0.99]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                      compactQuestionStep ? 'h-12 text-[15px] sm:h-[3.25rem] sm:text-[15.5px]' : 'h-11 text-[14px] sm:h-12 sm:text-[15px]',
                    )}
                    onClick={handleNext}
                  >
                    {isContactStep ? (
                      <>
                        {submitting ? 'Wird gesendet…' : submitError ? 'Erneut senden' : 'Anfrage absenden'}
                        <Send className="ml-2 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                      </>
                    ) : (
                      <>
                        Weiter
                        <ArrowRight className="ml-2 h-[1.05rem] w-[1.05rem]" strokeWidth={LUCIDE_STROKE} />
                      </>
                    )}
                  </Button>
                  {compactQuestionStep ? (
                    <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-bank-text-muted">
                      <Lock className="h-3 w-3" strokeWidth={LUCIDE_STROKE} aria-hidden />
                      <span>Sicher &amp; verschlüsselt · SSL/TLS</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {sidebar}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductInquiryWizard;

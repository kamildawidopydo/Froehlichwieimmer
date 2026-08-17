import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  Check,
  Headphones,
  Info,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Shield,
  User,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { useAuth } from '@/context/AuthContext';
import { mapProductInquiryInsertError, submitProductInquiryLead } from '@/lib/submitProductInquiryLead';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
import { sanitizeEmailInput, sanitizeFormField, validateEmail } from '@/lib/formInputSanitize';
import { sanitizePersonName, validatePersonName } from '@/lib/personName';
import { combinePhoneNumber, validatePhoneLocal } from '@/lib/phoneNumber';
import { DEFAULT_PHONE_DIAL_CODE } from '@/constants/phoneDialCodes';
import PhoneNumberInput from '@/components/profile/PhoneNumberInput';
import { HOME_SAVINGS_INQUIRY_ID } from '@/data/homeSavingsFaq';
import HomeSavingsInquirySuccess from '@/components/home/HomeSavingsInquirySuccess';

const EASE = [0.22, 1, 0.36, 1];

const AMOUNT_PRESETS = [
  { value: 10000, label: '10.000 €' },
  { value: 20000, label: '20.000 €' },
  { value: 30000, label: '30.000 €' },
  { value: 50000, label: '50.000 €' },
  { value: 75000, label: '75.000 €' },
  { value: 100000, label: '100.000 €' },
  { value: 150000, label: '150.000 €' },
  { value: 200000, label: '200.000 €' },
];

const PRODUCT_OPTIONS = [
  {
    id: 'Tagesgeld',
    title: 'Tagesgeld',
    Icon: Wallet,
    points: ['Tägliche Verfügbarkeit', '12 Monate volle Verfügbarkeit', 'Variable Zinsen'],
  },
  {
    id: 'Flexgeld',
    title: 'Flexgeld',
    Icon: RefreshCw,
    points: ['3 Monate feste Anlage', 'Kündigungsfrist laut Bank', 'Oft attraktivere Zinsen'],
  },
  {
    id: 'Festgeld',
    title: 'Festgeld',
    Icon: Lock,
    points: ['Feste Laufzeit 6–36 Monate', 'Garantierter Zinssatz', 'Planbare Erträge'],
  },
];

export default function HomeSavingsInquirySection() {
  const prefersReduced = useReducedMotion();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState(DEFAULT_PHONE_DIAL_CODE);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [amountPreset, setAmountPreset] = useState(null);
  const [amountCustom, setAmountCustom] = useState('');
  const [productType, setProductType] = useState('Tagesgeld');
  const [notes, setNotes] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState(null);

  useEffect(() => {
    if (!done) return;
    const el = document.getElementById(HOME_SAVINGS_INQUIRY_ID);
    el?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  }, [done, prefersReduced]);

  const resetInquiryForm = () => {
    setDone(false);
    setSubmittedSnapshot(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneDialCode(DEFAULT_PHONE_DIAL_CODE);
    setPhoneLocal('');
    setAmountPreset(null);
    setAmountCustom('');
    setNotes('');
    setConsentPrivacy(false);
    setConsentTerms(false);
  };

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: prefersReduced ? 0 : 0.65, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  const resolveAmount = () => {
    if (amountCustom.trim()) {
      const n = Number(amountCustom.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return { value: n, label: `${n.toLocaleString('de-DE')} € (individuell)` };
    }
    const preset = AMOUNT_PRESETS.find((p) => p.value === amountPreset);
    if (preset) return { value: preset.value, label: preset.label };
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstCheck = validatePersonName(firstName, { label: 'Vorname' });
    const lastCheck = validatePersonName(lastName, { label: 'Nachname' });
    const emailCheck = validateEmail(email);
    const phoneCheck = validatePhoneLocal(phoneLocal, { required: true });
    const amount = resolveAmount();

    if (!firstCheck.ok) {
      toast.error(firstCheck.message);
      return;
    }
    if (!lastCheck.ok) {
      toast.error(lastCheck.message);
      return;
    }
    if (!emailCheck.ok) {
      toast.error(emailCheck.message);
      return;
    }
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }
    const ph = combinePhoneNumber(phoneDialCode, phoneLocal);
    if (!amount) {
      toast.error('Bitte Anlagesumme wählen oder eingeben.');
      return;
    }
    if (!consentPrivacy || !consentTerms) {
      toast.error('Bitte Datenschutz und AGB bestätigen.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product: 'spargeld',
        answers: {
          source: 'home_savings_inquiry',
          investment_type: productType,
          amount_eur: amount.value,
          amount_label: amount.label,
          notes: notes.trim() || null,
        },
        first_name: firstCheck.value,
        last_name: lastCheck.value,
        email: emailCheck.value,
        phone: ph,
        customer_number: null,
        consent_privacy: true,
        consent_terms: true,
        consent_marketing: false,
      };
      const result = await submitProductInquiryLead(payload);
      if (result.error) {
        console.error('[home-savings-inquiry]', result.error);
        toast.error(mapProductInquiryInsertError(result.error));
        return;
      }
      try {
        await logEvent(
          EVENTS.PRODUCT_INQUIRY_SUBMIT,
          { product: 'spargeld', source: 'home_savings_inquiry' },
          { userId: user?.id ?? null },
        );
        logVisitorConversion('product_inquiry', { product: 'spargeld', source: 'home_savings_inquiry' });
      } catch (logErr) {
        console.warn(logErr);
      }
      setSubmittedSnapshot({
        firstName: firstCheck.value,
        lastName: lastCheck.value,
        email: emailCheck.value,
        productType,
        amountLabel: amount.label,
      });
      setDone(true);
      window.requestAnimationFrame(() => {
        document.getElementById('home-inquiry-tab-confirmation-btn')?.focus();
      });
    } catch (err) {
      console.error('[home-savings-inquiry]', err);
      toast.error(mapProductInquiryInsertError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id={HOME_SAVINGS_INQUIRY_ID}
      className="scroll-mt-28 border-b border-bank-border bg-bank-ink text-white"
      data-testid="home-savings-inquiry"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <motion.div {...reveal(0)} className="max-w-3xl">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.28em] text-white/90">
            03 — Anfrage
          </p>
          <h2 className="font-display mt-5 text-[clamp(1.65rem,4vw,2.5rem)] font-light leading-tight text-white">
            Anfrage · Vertraulich &amp; unverbindlich
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/90">
            Sichern Sie sich als Neukunde einen Bonus von bis zu{' '}
            <span className="font-semibold text-white">300&nbsp;€</span> durch ausgewählte
            Partnerbanken sowie zusätzlich{' '}
            <span className="font-semibold text-white">45&nbsp;€</span> Bonus von uns bei
            erfolgreicher Vermittlung.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/90">
            Erhalten Sie innerhalb kurzer Zeit eine unverbindliche Übersicht attraktiver Konditionen und
            Zinsangebote regulierter EU-Partnerbanken.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/90">
            Auf Basis Ihrer Angaben erstellen wir für Sie eine strukturierte Auswahl passender Angebote –
            selbstverständlich kostenfrei, unverbindlich und ohne Verpflichtung zur Kontoeröffnung.
          </p>
        </motion.div>

        <motion.div
          {...reveal(1)}
          className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white text-bank-text shadow-editorial-lg"
        >
          <div
            role="tablist"
            aria-label="Anfrageformular"
            className="flex border-b border-bank-border/80 bg-bank-bg/40"
          >
            <button
              type="button"
              role="tab"
              id="home-inquiry-tab-form-btn"
              aria-selected={!done}
              aria-controls="home-inquiry-tab-form"
              disabled={done}
              onClick={() => !done && resetInquiryForm()}
              className={cn(
                'flex-1 px-4 py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors sm:px-6',
                !done
                  ? 'border-b-2 border-bank-signature bg-white text-bank-ink'
                  : 'cursor-default text-bank-text-muted/60',
              )}
            >
              Ihre Anfrage
            </button>
            <button
              type="button"
              role="tab"
              id="home-inquiry-tab-confirmation-btn"
              aria-selected={done}
              aria-controls="home-inquiry-tab-confirmation"
              disabled={!done}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors sm:px-6',
                done
                  ? 'border-b-2 border-bank-signature bg-white text-bank-ink'
                  : 'cursor-default text-bank-text-muted/50',
              )}
            >
              {done && <Check className="h-3.5 w-3.5 text-bank-signature" strokeWidth={2.5} aria-hidden />}
              Bestätigung
            </button>
          </div>

          {done ? (
            <HomeSavingsInquirySuccess
              summary={submittedSnapshot}
              onNewInquiry={resetInquiryForm}
              prefersReduced={prefersReduced}
            />
          ) : (
            <form
              id="home-inquiry-tab-form"
              role="tabpanel"
              aria-labelledby="home-inquiry-tab-form-btn"
              onSubmit={handleSubmit}
              className="px-5 py-8 sm:px-8 sm:py-10"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    id: 'first',
                    label: 'Vorname *',
                    value: firstName,
                    onChange: (e) => setFirstName(sanitizePersonName(e.target.value)),
                    Icon: User,
                    type: 'text',
                    autoComplete: 'given-name',
                  },
                  {
                    id: 'last',
                    label: 'Nachname *',
                    value: lastName,
                    onChange: (e) => setLastName(sanitizePersonName(e.target.value)),
                    Icon: User,
                    type: 'text',
                    autoComplete: 'family-name',
                  },
                  {
                    id: 'email',
                    label: 'E-Mail *',
                    value: email,
                    onChange: (e) => setEmail(sanitizeEmailInput(e.target.value)),
                    Icon: Mail,
                    type: 'email',
                    autoComplete: 'email',
                    inputMode: 'email',
                  },
                ].map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={`inquiry-${field.id}`}
                      className="mb-1.5 block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted"
                    >
                      {field.label}
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-bank-border bg-bank-bg/40 px-3 focus-within:border-bank-primary/40 focus-within:ring-1 focus-within:ring-bank-accent/25">
                      <field.Icon className="h-4 w-4 shrink-0 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
                      <Input
                        id={`inquiry-${field.id}`}
                        type={field.type}
                        inputMode={field.inputMode}
                        required
                        autoComplete={field.autoComplete}
                        value={field.value}
                        onChange={field.onChange}
                        className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="inquiry-phone-local"
                  className="mb-1.5 block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted"
                >
                  Telefonnummer *
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-bank-border bg-bank-bg/40 px-3 py-1 focus-within:border-bank-primary/40 focus-within:ring-1 focus-within:ring-bank-accent/25">
                  <Phone className="h-4 w-4 shrink-0 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
                  <PhoneNumberInput
                    dialCode={phoneDialCode}
                    localNumber={phoneLocal}
                    onDialCodeChange={setPhoneDialCode}
                    onLocalNumberChange={setPhoneLocal}
                    dialCodeTestId="home-inquiry-phone-dial"
                    localNumberTestId="home-inquiry-phone-local"
                    localPlaceholder="170 1234567"
                    className="min-w-0 flex-1"
                    selectClassName="h-10 w-[5.65rem] shrink-0 appearance-none rounded-md border border-bank-border bg-white pl-1.5 pr-5 font-mono text-[12px] tabular-nums text-bank-text focus:border-bank-primary/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-bank-accent/25"
                    inputClassName="h-10 min-w-0 flex-1 rounded-md border border-bank-border bg-white px-3 text-sm focus-visible:border-bank-primary/40 focus-visible:ring-1 focus-visible:ring-bank-accent/25"
                  />
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  Anlagesumme *
                </p>
                <div className="flex flex-wrap gap-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setAmountPreset(preset.value);
                        setAmountCustom('');
                      }}
                      className={cn(
                        'rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors',
                        amountPreset === preset.value
                          ? 'border-bank-signature bg-bank-signature/5 text-bank-signature'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-signature/35 hover:text-bank-signature',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-bank-border bg-bank-bg/40 px-3">
                  <Wallet className="h-4 w-4 shrink-0 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Individuelle Summe eingeben"
                    value={amountCustom}
                    onChange={(e) => {
                      setAmountCustom(sanitizeFormField(e.target.value));
                      setAmountPreset(null);
                    }}
                    className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  Anlageform *
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {PRODUCT_OPTIONS.map(({ id, title, Icon, points }) => {
                    const selected = productType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setProductType(id)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-all',
                          selected
                            ? 'border-bank-signature bg-bank-signature/[0.06] ring-1 ring-bank-signature/30'
                            : 'border-bank-border bg-white hover:border-bank-signature/35 hover:bg-bank-signature/[0.03]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-lg',
                              selected
                                ? 'bg-bank-signature/15 text-bank-signature'
                                : 'bg-bank-signature/10 text-bank-signature',
                            )}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bank-signature text-[10px] text-white">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-display text-lg text-bank-ink">{title}</p>
                        <ul className="mt-2 space-y-1">
                          {points.map((pt) => (
                            <li key={pt} className="text-[11.5px] leading-snug text-bank-text-muted">
                              · {pt}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="flex gap-2 text-[11.5px] leading-relaxed text-bank-text-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                    Zinsgarantien und Kündigungsfristen sind produkt- und bankabhängig — Details im Vergleich und in den
                    Bankunterlagen.
                  </p>
                  <p className="flex gap-2 text-[11.5px] leading-relaxed text-bank-text-muted">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                    EU-Einlagensicherung bis 100.000 € pro Person und Institut bei regulierten Partnerbanken.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <label htmlFor="inquiry-notes" className="mb-1.5 block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  Anmerkungen (optional)
                </label>
                <textarea
                  id="inquiry-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(sanitizeFormField(e.target.value))}
                  placeholder="Besondere Wünsche, Laufzeit, bevorzugtes Land …"
                  className="w-full resize-y rounded-lg border border-bank-border bg-bank-bg/30 px-4 py-3 text-sm text-bank-text placeholder:text-bank-text-muted/60 focus:border-bank-primary/40 focus:outline-none focus:ring-1 focus:ring-bank-accent/25"
                />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: Shield, text: 'Gesetzliche Einlagensicherung' },
                  { Icon: Building2, text: 'Geprüfte Partnerbanken' },
                  { Icon: Headphones, text: 'Persönliche Rückmeldung' },
                ].map(({ Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2.5 rounded-lg border border-bank-border/80 bg-bank-bg/40 px-3 py-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                    <span className="text-[12px] font-medium text-bank-text-muted">{text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-bank-border pt-6">
                <label className="flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-bank-text-muted">
                  <Checkbox checked={consentPrivacy} onCheckedChange={(v) => setConsentPrivacy(Boolean(v))} />
                  <span>
                    Ich habe die{' '}
                    <Link to="/legal/privacy" className="font-medium text-bank-primary hover:underline">
                      Datenschutzerklärung
                    </Link>{' '}
                    gelesen. *
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-bank-text-muted">
                  <Checkbox checked={consentTerms} onCheckedChange={(v) => setConsentTerms(Boolean(v))} />
                  <span>
                    Ich akzeptiere die{' '}
                    <Link to="/legal/terms" className="font-medium text-bank-primary hover:underline">
                      AGB
                    </Link>{' '}
                    und bestätige, dass es sich um eine unverbindliche Informationsanfrage handelt. *
                  </span>
                </label>
              </div>

              <Button type="submit" variant="primary" size="xl" className="mt-8 w-full gap-2" disabled={submitting}>
                {submitting ? 'Wird gesendet …' : 'Anfrage absenden'}
                <Send className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </Button>
              <p className="mt-3 text-center text-[11px] text-bank-text-muted">
                Ihre Daten werden vertraulich behandelt und nur zur Bearbeitung dieser Anfrage verwendet.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}

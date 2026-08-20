import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import PageMeta from '@/components/PageMeta';
import { COUNTRIES } from '@/constants/countries';
import { getDialCodeForCountry } from '@/constants/phoneDialCodes';
import Eyebrow from '@/components/editorial/Eyebrow';
import AddressFields from '@/components/profile/AddressFields';
import PhoneNumberInput from '@/components/profile/PhoneNumberInput';
import {
  addressFormToDbPayload,
  addressFromProfile,
  formatLegacyAddress,
  hasStructuredAddress,
  validateAddressForm,
} from '@/lib/profileAddress';
import { combinePhoneNumber, phoneFormFromProfile, validatePhoneLocal } from '@/lib/phoneNumber';
import { validatePersonName } from '@/lib/personName';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    key: 'profile',
    title: 'Profil vervollständigen',
    description: 'Prüfen Sie Ihre Kontodaten und halten Sie Ihr Profil aktuell.',
  },
  {
    key: 'security',
    title: 'Sicherheit verstehen',
    description: 'Machen Sie sich mit dem Freigabeprozess, dem Datenschutz und den Rollen vertraut.',
    confirmText:
      '„Machen Sie sich mit dem Freigabeprozess, dem Datenschutz und den Rollen vertraut. Sie können diesen Schritt jederzeit später anpassen.“',
  },
  {
    key: 'portfolio',
    title: 'Portfolio starten',
    description: 'Vergleichen Sie Angebote und richten Sie Ihr erstes Portfolio ein.',
    confirmText:
      'Vergleichen Sie Angebote und richten Sie Ihr erstes Portfolio ein. Diesen Schritt können Sie jederzeit später anpassen.',
  },
  {
    key: 'notifications',
    title: 'Benachrichtigungen festlegen',
    description: 'Legen Sie fest, welche E-Mails und Updates Sie erhalten möchten.',
  },
];

// ─── Field-label helper (mono kicker w/ brass numeral) ───
const FieldLabel = ({ num, children }) => (
  <span className="mb-2.5 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
    {num && <span className="text-bank-gold">{num}</span>}
    <span>{children}</span>
  </span>
);

const inputClass =
  'h-11 w-full rounded-none border-bank-border bg-white text-sm focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, refreshUser } = useAuth();
  const initialStep = Math.max(0, STEPS.findIndex((s) => !user?.onboarding_completed_steps?.includes?.(s.key)));
  const [currentStep, setCurrentStep] = useState(initialStep === -1 ? 0 : initialStep);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    country: user?.country || '',
    ...phoneFormFromProfile(user),
    ...addressFromProfile(user),
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    weekly_digest: user?.notification_prefs?.weekly_digest ?? (user?.email_digest_enabled !== false),
    order_updates: user?.notification_prefs?.order_updates ?? true,
    marketing: user?.notification_prefs?.marketing ?? false,
    price_alerts: user?.notification_prefs?.price_alerts ?? true,
  });

  const doneKeys = useMemo(() => {
    const raw = Array.isArray(user?.onboarding_completed_steps) ? user.onboarding_completed_steps : [];
    return raw.filter((v) => typeof v === 'string');
  }, [user?.onboarding_completed_steps]);

  const firstIncompleteStepIndex = useMemo(
    () => STEPS.findIndex((s) => !doneKeys.includes(s.key)),
    [doneKeys],
  );

  const maxAccessibleStepIndex =
    firstIncompleteStepIndex === -1 ? STEPS.length - 1 : firstIncompleteStepIndex;

  const canOpenStep = (index) => index <= maxAccessibleStepIndex;

  useEffect(() => {
    if (user?.onboarding_completed && user?.role !== 'admin') {
      navigate('/dashboard/uebersicht', { replace: true });
    }
  }, [user?.onboarding_completed, user?.role, navigate]);

  useEffect(() => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      country: user?.country || '',
      ...phoneFormFromProfile(user),
      ...addressFromProfile(user),
    });
    setNotificationPrefs({
      weekly_digest: user?.notification_prefs?.weekly_digest ?? (user?.email_digest_enabled !== false),
      order_updates: user?.notification_prefs?.order_updates ?? true,
      marketing: user?.notification_prefs?.marketing ?? false,
      price_alerts: user?.notification_prefs?.price_alerts ?? true,
    });
  }, [user]);

  const saveProfileStep = async () => {
    const firstNameCheck = validatePersonName(profileForm.first_name, { label: 'Vorname' });
    if (!firstNameCheck.ok) { toast.error(firstNameCheck.message); return false; }
    const lastNameCheck = validatePersonName(profileForm.last_name, { label: 'Nachname' });
    if (!lastNameCheck.ok) { toast.error(lastNameCheck.message); return false; }
    const phoneCheck = validatePhoneLocal(profileForm.phone_local, { required: true });
    if (!phoneCheck.ok) { toast.error(phoneCheck.message); return false; }
    const nextPhone = combinePhoneNumber(profileForm.phone_dial_code, profileForm.phone_local);
    if (!profileForm.country) { toast.error('Bitte wählen Sie Ihr Land'); return false; }
    const addressCheck = validateAddressForm(profileForm);
    if (!addressCheck.ok) { toast.error(addressCheck.message); return false; }
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstNameCheck.value,
        last_name: lastNameCheck.value,
        phone: nextPhone,
        country: profileForm.country,
        ...addressFormToDbPayload(profileForm),
      })
      .eq('id', user.id);
    if (error) throw error;
    return true;
  };

  const saveNotificationStep = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_prefs: notificationPrefs,
        email_digest_enabled: notificationPrefs.weekly_digest,
      })
      .eq('id', user.id);
    if (error) throw error;
    return true;
  };

  const completeStep = async (stepKey) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (stepKey === 'profile') {
        const ok = await saveProfileStep();
        if (!ok) return;
      }
      if (stepKey === 'notifications') {
        const ok = await saveNotificationStep();
        if (!ok) return;
      }
      const nextSteps = Array.from(new Set([...doneKeys, stepKey]));
      const isDone = nextSteps.length >= STEPS.length;
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed_steps: nextSteps,
          onboarding_completed: isDone,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      if (isDone) {
        toast.success('Onboarding abgeschlossen');
        navigate('/dashboard');
        return;
      }
      setCurrentStep((v) => Math.min(v + 1, STEPS.length - 1));
    } catch (err) {
      toast.error('Onboarding konnte nicht gespeichert werden');
      console.error('onboarding save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const step = STEPS[currentStep];
  const done = doneKeys.includes(step.key);
  const isProfileStep = step.key === 'profile';
  const isNotificationsStep = step.key === 'notifications';
  const progress = Math.round(((doneKeys.length) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Onboarding"
        description="Geführter Einstieg in Fröhlich Vermögensberatung für neue Nutzer."
        path="/onboarding"
        noIndex
      />

      {/* ───── HEADER STRIP ───── */}
      <section className="relative overflow-hidden border-b border-bank-border bg-bank-ink text-white">
        <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
        <div className="relative mx-auto max-w-[1100px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <Eyebrow tone="gold">Konto · Onboarding</Eyebrow>
          <h1
            className="mt-5 font-display text-[2.2rem] font-light leading-[1.04] tracking-[-0.01em] text-white sm:text-[2.7rem]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Willkommen bei
            <span className="block italic text-bank-gold-soft">Fröhlich Vermögensberatung.</span>
          </h1>
          <div className="mt-6 h-px w-24 bg-bank-gold/70" aria-hidden />
          <p className="mt-6 max-w-xl text-[14.5px] leading-[1.75] text-white/75">
            In wenigen Schritten ist Ihr Konto startklar.
          </p>

          {/* Progress meter */}
          <div className="mt-9 flex items-center gap-5">
            <div className="relative h-[2px] flex-1 overflow-hidden bg-white/12">
              <motion.div
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-bank-gold/70 to-bank-gold-soft"
              />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-gold-soft tabular-nums">
              {String(progress).padStart(2, '0')} %
            </span>
          </div>
        </div>
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55 sm:px-8 lg:px-12">
            <span>04 Schritte · Geführter Einstieg</span>
            <span className="hidden sm:inline">{doneKeys.length}/{STEPS.length} abgeschlossen</span>
          </div>
        </div>
      </section>

      {/* ───── BODY ───── */}
      <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid grid-cols-12 gap-x-10 gap-y-12">
          {/* ─ Step rail ─ */}
          <aside className="col-span-12 lg:col-span-4">
            <p className="mb-5 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
              Schritte
            </p>
            <ol className="space-y-2">
              {STEPS.map((s, i) => {
                const doneItem = doneKeys.includes(s.key);
                const active = i === currentStep;
                const num = String(i + 1).padStart(2, '0');
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canOpenStep(i)) {
                          toast.error('Bitte schließen Sie zuerst die vorherigen Schritte ab.');
                          return;
                        }
                        setCurrentStep(i);
                      }}
                      disabled={!canOpenStep(i)}
                      className={cn(
                        'group relative flex w-full items-start gap-4 border-l-2 px-4 py-3.5 text-left transition-all duration-300',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-bg',
                        !canOpenStep(i) && 'cursor-not-allowed opacity-45',
                        active
                          ? 'border-bank-gold bg-white shadow-editorial-sm'
                          : doneItem
                            ? 'border-bank-gold/45 bg-white/60 hover:border-bank-gold/70'
                            : 'border-bank-border bg-transparent hover:border-bank-gold/35 hover:bg-white/40'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[10.5px] tabular-nums',
                          active
                            ? 'border-bank-gold bg-bank-gold-soft/20 text-bank-gold'
                            : doneItem
                              ? 'border-bank-gold/55 bg-bank-gold/10 text-bank-gold'
                              : 'border-bank-border bg-white text-bank-text-muted'
                        )}
                      >
                        {doneItem ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.6} /> : num}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'font-display text-[15px] font-light leading-snug',
                            active ? 'text-bank-text' : doneItem ? 'text-bank-text' : 'text-bank-text-muted'
                          )}
                          style={active ? { fontVariationSettings: "'opsz' 144, 'SOFT' 100" } : undefined}
                        >
                          {active ? <em className="italic">{s.title}</em> : s.title}
                        </p>
                        {active && (
                          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-gold">
                            ─ aktiv
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* ─ Active step panel ─ */}
          <main className="col-span-12 lg:col-span-8">
            <motion.section
              key={step.key}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden border border-bank-border bg-white p-7 sm:p-10"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />

              {/* PROFILE STEP */}
              {isProfileStep && (
                <div className="space-y-6">
                  <label className="block">
                    <FieldLabel num="01">E-Mail</FieldLabel>
                    <Input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className={cn(inputClass, 'cursor-not-allowed bg-bank-bg text-bank-text-muted')}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel num="02">Vorname</FieldLabel>
                      <Input
                        type="text"
                        value={profileForm.first_name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            first_name: sanitizeFormField('first_name', e.target.value),
                          }))
                        }
                        className={inputClass}
                        placeholder="Max"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel num="03">Nachname</FieldLabel>
                      <Input
                        type="text"
                        value={profileForm.last_name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            last_name: sanitizeFormField('last_name', e.target.value),
                          }))
                        }
                        className={inputClass}
                        placeholder="Mustermann"
                      />
                    </label>
                  </div>

                  <div>
                    <FieldLabel num="04">Adresse</FieldLabel>
                    {user?.address && !hasStructuredAddress(user) && (
                      <p className="mb-4 text-[13px] leading-relaxed text-bank-text-muted">
                        Bisherige Adresse: {formatLegacyAddress(user.address)} — bitte im Detail erfassen.
                      </p>
                    )}
                    <AddressFields
                      value={profileForm}
                      onChange={(next) => setProfileForm((prev) => ({ ...prev, ...next }))}
                      FieldLabel={FieldLabel}
                      startNum={5}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel num="10">Telefon</FieldLabel>
                      <PhoneNumberInput
                        dialCode={profileForm.phone_dial_code}
                        localNumber={profileForm.phone_local}
                        onDialCodeChange={(value) =>
                          setProfileForm((prev) => ({ ...prev, phone_dial_code: value }))
                        }
                        onLocalNumberChange={(value) =>
                          setProfileForm((prev) => ({ ...prev, phone_local: value }))
                        }
                        localPlaceholder="170 1234567"
                        inputClassName={inputClass}
                      />
                    </label>
                    <label className="block">
                      <FieldLabel num="11">Land</FieldLabel>
                      <select
                        value={profileForm.country}
                        onChange={(e) => {
                          const country = e.target.value;
                          setProfileForm((prev) => ({
                            ...prev,
                            country,
                            phone_dial_code: country ? getDialCodeForCountry(country) : prev.phone_dial_code,
                          }));
                        }}
                        className="h-11 w-full appearance-none border border-bank-border bg-white pl-3 pr-8 text-sm text-bank-text focus:border-bank-gold/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                      >
                        <option value="">Land wählen…</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* NOTIFICATION STEP */}
              {isNotificationsStep && (
                <div className="space-y-3">
                  {[
                    { key: 'weekly_digest', label: 'Wochenbericht per E-Mail', sub: 'Kuratiert · jeden Montag' },
                    { key: 'order_updates', label: 'Auftrags-Updates', sub: 'Status & Bestätigungen' },
                    { key: 'price_alerts', label: 'Preis-Alerts', sub: 'Wenn Konditionen steigen' },
                    { key: 'marketing', label: 'Produkt-News', sub: 'Selten · nur Wesentliches' },
                  ].map((item, i) => {
                    const enabled = !!notificationPrefs[item.key];
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between border border-bank-border bg-white px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="text-[14.5px] font-medium text-bank-text">{item.label}</p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
                              {item.sub}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={item.label}
                          className={cn(
                            'relative inline-flex h-6 w-11 transition-colors duration-300',
                            enabled ? 'bg-bank-primary' : 'bg-bank-border'
                          )}
                          onClick={() =>
                            setNotificationPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                          }
                          disabled={saving}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 inline-block h-5 w-5 transform bg-white shadow-sm transition-transform duration-300',
                              enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* INFO-ONLY STEPS (security, portfolio) */}
              {!isProfileStep && !isNotificationsStep && (
                <div className="space-y-5 border-l-2 border-bank-gold/55 bg-bank-bg p-6">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                    Lesen &amp; bestätigen
                  </p>
                  <p className="max-w-prose text-[14.5px] leading-[1.8] text-bank-text-muted">
                    {step.confirmText ?? `${step.description} Sie können diesen Schritt jederzeit später anpassen.`}
                  </p>
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-10 flex flex-col-reverse gap-3 border-t border-bank-border pt-6 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => completeStep(step.key)}
                  disabled={saving || done}
                  className="min-w-[220px]"
                >
                  {done ? (
                    <>
                      Abgeschlossen
                      <CheckCircle2 className="ml-2 h-4 w-4" strokeWidth={1.6} />
                    </>
                  ) : saving ? (
                    'Wird gespeichert…'
                  ) : (
                    <>
                      Schritt bestätigen
                      <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </>
                  )}
                </Button>
              </div>
            </motion.section>

            {/* Bottom mono colophon */}
            <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted lg:text-left">
              Fröhlich Vermögensberatung · Geführter Einstieg
            </p>
          </main>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

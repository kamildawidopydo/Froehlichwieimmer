import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle, Clock, Mail, ArrowUpRight, Compass } from 'lucide-react';
import { COUNTRIES } from '@/constants/countries';
import { getDialCodeForCountry } from '@/constants/phoneDialCodes';
import PhoneNumberInput from '@/components/profile/PhoneNumberInput';
import { combinePhoneNumber, validatePhoneLocal } from '@/lib/phoneNumber';
import AuthShell from '@/components/editorial/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import { validatePersonName } from '@/lib/personName';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import Eyebrow from '@/components/editorial/Eyebrow';

const Register = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    country: '',
    phone_dial_code: '+49',
    phone_local: '',
  });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { register } = useAuth();

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: sanitizeFormField(field, e.target.value) }));

  const handleCountryChange = (e) => {
    const country = e.target.value;
    setForm((prev) => ({
      ...prev,
      country,
      phone_dial_code: country ? getDialCodeForCountry(country) : prev.phone_dial_code,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    const passwordCheck = validatePassword(form.password);
    if (!passwordCheck.ok) {
      toast.error(passwordCheck.message);
      return;
    }
    const firstNameCheck = validatePersonName(form.first_name, { label: 'Vorname' });
    if (!firstNameCheck.ok) {
      toast.error(firstNameCheck.message);
      return;
    }
    const lastNameCheck = validatePersonName(form.last_name, { label: 'Nachname' });
    if (!lastNameCheck.ok) {
      toast.error(lastNameCheck.message);
      return;
    }
    if (!form.country) {
      toast.error('Bitte wählen Sie Ihr Land aus');
      return;
    }
    const phoneCheck = validatePhoneLocal(form.phone_local);
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        country: form.country,
        phone: combinePhoneNumber(form.phone_dial_code, form.phone_local) || undefined,
      });
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch (error) {
      const message =
        error.message?.includes('bereits registriert') || error.message?.includes('already registered')
          ? 'Diese E-Mail-Adresse ist bereits registriert.'
          : error.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ───── Success state — editorial confirmation card ─────
  if (registered) {
    return (
      <div className="min-h-screen bg-bank-bg px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-lg">
          <div className="relative overflow-hidden border border-bank-border bg-white p-10 text-center sm:p-14">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-primary/65 to-transparent" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-bank-primary/40 bg-bank-primary/[0.08] text-bank-primary">
              <Clock className="h-7 w-7" strokeWidth={1.25} />
            </div>
            <Eyebrow tone="gold" className="mt-8 justify-center">
              Registrierung eingegangen
            </Eyebrow>
            <h1
              className="mt-5 font-display text-[2rem] font-light leading-tight text-bank-text sm:text-[2.4rem]"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Vielen Dank — <em className="italic text-bank-text-muted">Fröhlich Vermögensberatung.</em>
            </h1>
            <div className="mx-auto mt-6 h-px w-16 bg-bank-primary/55" aria-hidden />

            <div className="mt-10 border border-bank-border bg-bank-bg p-6 text-left">
              <div className="flex gap-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-bank-primary" strokeWidth={1.5} />
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                    Prüfung durch unser Team
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.7] text-bank-text-muted">
                    In der Regel <strong className="font-semibold text-bank-text">1–2 Werktage</strong>. Eine E-Mail
                    erreicht Sie unter{' '}
                    <strong className="font-semibold text-bank-text">{registeredEmail}</strong>, sobald Ihr Konto
                    freigeschaltet ist.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 border-t border-bank-border pt-7 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
              <a
                href="mailto:kundenservice@kapital-direkt24.de"
                className="text-bank-primary underline-offset-4 hover:underline"
              >
                kundenservice@kapital-direkt24.de
              </a>
            </div>

            <Link to="/" className="mt-10 block">
              <Button size="lg" variant="primary" className="w-full">
                Zur Startseite
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ───── Form state — AuthShell with onboarding rail ─────
  return (
    <AuthShell
      eyebrow="Konto · Onboarding"
      title={
        <>
          Konto
          <span className="block italic text-bank-gold-soft">erstellen.</span>
        </>
      }
      subtitle="Einmal registrieren — Zugang zum Vergleich, Favoriten und Anträgen. Freischaltung in 1–2 Werktagen."
      formTitle={
        <>
          Ihre Daten — <em className="italic text-bank-text-muted">in einem Schritt.</em>
        </>
      }
      formLede="Pflichtfelder sind entsprechend gekennzeichnet."
      backLabel="Startseite"
    >
      {/* Onboarding mini-rail */}
      <ol className="mb-9 flex w-full items-start justify-between gap-1 border-b border-bank-border pb-7 sm:gap-2">
        {[
          { n: '01', t: 'Daten', d: 'eingeben' },
          { n: '02', t: 'Prüfung', d: '1–2 Werktage' },
          { n: '03', t: 'Loslegen', d: 'Vergleich starten' },
        ].map((s, i) => (
          <li key={s.n} className="flex min-w-0 flex-1 items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className={`font-mono text-[10px] uppercase tracking-[0.18em] sm:text-[10.5px] sm:tracking-[0.22em] ${i === 0 ? 'text-bank-primary' : 'text-bank-text-muted'}`}>
                  {s.n}
                </span>
                <span className={`font-display text-[0.875rem] font-light italic leading-tight sm:text-[1rem] ${i === 0 ? 'text-bank-text' : 'text-bank-text-muted'}`}>
                  {s.t}
                </span>
              </div>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-bank-text-muted sm:text-[10px] sm:tracking-[0.18em]">
                {s.d}
              </span>
            </div>
            {i < 2 && (
              <span className="mx-1 mt-3 h-px min-w-[0.35rem] flex-1 shrink bg-bank-border sm:mx-2" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Names */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <AuthShell.Label num="01">Vorname</AuthShell.Label>
            <Input
              value={form.first_name}
              onChange={handleChange('first_name')}
              placeholder="Max"
              required
              data-testid="register-first-name"
              autoComplete="given-name"
              className="h-11 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>
          <label className="block">
            <AuthShell.Label num="02">Nachname</AuthShell.Label>
            <Input
              value={form.last_name}
              onChange={handleChange('last_name')}
              placeholder="Mustermann"
              required
              data-testid="register-last-name"
              autoComplete="family-name"
              className="h-11 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>
        </div>

        {/* Email */}
        <label className="block">
          <AuthShell.Label num="03">E-Mail</AuthShell.Label>
          <Input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="ihre@email.de"
            required
            data-testid="register-email"
            autoComplete="email"
            className="h-11 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
          />
        </label>

        {/* Country & Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <AuthShell.Label num="04">Land</AuthShell.Label>
            <div className="relative">
              <Compass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-primary"
                strokeWidth={1.5}
              />
              <select
                value={form.country}
                onChange={handleCountryChange}
                required
                className="h-11 w-full appearance-none rounded-none border border-bank-border bg-white pl-9 pr-8 text-sm text-bank-text focus:border-bank-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/25"
                data-testid="register-country"
              >
                <option value="">Land wählen…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.2em] text-bank-text-muted">
                ▾
              </span>
            </div>
          </label>
          <label className="block">
            <AuthShell.Label num="05">
              Telefon
              <span className="ml-1 normal-case tracking-normal text-bank-text-muted/70">(optional)</span>
            </AuthShell.Label>
            <PhoneNumberInput
              dialCode={form.phone_dial_code}
              localNumber={form.phone_local}
              onDialCodeChange={(value) => setForm((prev) => ({ ...prev, phone_dial_code: value }))}
              onLocalNumberChange={(value) => setForm((prev) => ({ ...prev, phone_local: value }))}
              dialCodeTestId="register-phone-dial-code"
              localNumberTestId="register-phone"
              localPlaceholder="170 1234567"
            />
          </label>
        </div>

        {/* Passwords */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <AuthShell.Label num="06">Passwort</AuthShell.Label>
            <PasswordInput
              value={form.password}
              onChange={handleChange('password')}
              placeholder={`Mind. ${PASSWORD_MIN_LENGTH} Zeichen`}
              required
              minLength={PASSWORD_MIN_LENGTH}
              data-testid="register-password"
              autoComplete="new-password"
              className="h-11 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>
          <label className="block">
            <AuthShell.Label num="07">Bestätigen</AuthShell.Label>
            <PasswordInput
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="••••••••"
              required
              data-testid="register-confirm-password"
              autoComplete="new-password"
              className="h-11 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>
        </div>
        <PasswordRequirements password={form.password} className="mt-1" />

        <Button
          type="submit"
          size="lg"
          variant="primary"
          disabled={loading}
          data-testid="register-submit-btn"
          className="mt-2 w-full"
        >
          {loading ? (
            'Wird erstellt…'
          ) : (
            <>
              Konto erstellen
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </form>

      <div className="mt-9 flex items-center justify-between gap-4 border-t border-bank-border pt-6">
        <p className="text-[13.5px] text-bank-text-muted">
          Bereits registriert?{' '}
          <Link to="/login" className="font-medium text-bank-primary underline-offset-4 hover:underline">
            Anmelden
          </Link>
        </p>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted sm:block">
          DSGVO · 256-bit
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  ACCEPT_ALL_COOKIE_PREFS,
  COOKIE_CONSENT_KEY,
  RESIDENCE_COUNTRIES,
  VISITOR_ROLES,
  hasVisitorProfile,
  openCookieSettings,
  saveCookieConsent,
  saveVisitorProfile,
} from '@/lib/visitorGate';

const fieldClass =
  'h-11 w-full rounded-md border border-[rgb(var(--bank-border))] bg-white px-3 text-[14px] text-[rgb(var(--bank-text))] outline-none transition focus:border-[rgb(var(--bank-primary))] focus:ring-1 focus:ring-[rgb(var(--bank-primary))]';

const labelClass = 'mb-1.5 block text-[13px] font-medium text-[rgb(var(--bank-text))]';

const linkClass =
  'font-medium text-[rgb(var(--bank-primary))] underline underline-offset-2 hover:text-[rgb(var(--bank-primary-hover))]';

export default function VisitorWelcomeGate() {
  const _p = useLocation().pathname;
  const isAdminPath = ['/admin', '/karriere', '/recruiting'].some((p) => _p.startsWith(p));
  const [isVisible, setIsVisible] = useState(false);
  const [residence, setResidence] = useState('DE');
  const [role, setRole] = useState('');
  const [isUsPerson, setIsUsPerson] = useState(false);
  const [roleError, setRoleError] = useState(false);

  useEffect(() => {
    if (!hasVisitorProfile()) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      document.body.style.overflow = '';
    }
  }, [isVisible]);

  const canAccept = Boolean(role) && !isUsPerson;

  const handleResidenceChange = (value) => {
    setResidence(value);
    if (value === 'US') {
      setIsUsPerson(true);
    }
  };

  const handleAccept = () => {
    if (!role) {
      setRoleError(true);
      return;
    }
    if (isUsPerson) return;

    saveVisitorProfile({
      residence,
      role,
      isUsPerson: false,
    });
    // Keep fine-grained choices if visitor already configured cookies from the gate.
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
      saveCookieConsent(ACCEPT_ALL_COOKIE_PREFS);
    }
    setIsVisible(false);
  };

  if (!isVisible || isAdminPath) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgb(var(--bank-ink))]/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-welcome-title"
      data-testid="visitor-welcome-gate"
    >
      <div className="flex max-h-[min(92vh,860px)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-[#F4F1EA] shadow-2xl">
        <div className="overflow-y-auto px-6 py-7 sm:px-10 sm:py-9">
          <h1
            id="visitor-welcome-title"
            className="font-display text-[28px] font-semibold tracking-tight text-[rgb(var(--bank-text))] sm:text-[32px]"
          >
            Willkommen bei Fröhlich Vermögensberatung
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[rgb(var(--bank-text-muted))]">
            Um Ihnen passende Informationen bereitzustellen, machen Sie bitte folgende Angaben:
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="visitor-residence" className={labelClass}>
                Wohnort
              </label>
              <select
                id="visitor-residence"
                className={fieldClass}
                value={residence}
                onChange={(e) => handleResidenceChange(e.target.value)}
                data-testid="visitor-residence"
              >
                {RESIDENCE_COUNTRIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="visitor-role" className={labelClass}>
                Was ist Ihre Rolle?
              </label>
              <select
                id="visitor-role"
                className={cn(fieldClass, roleError && !role && 'border-[rgb(var(--bank-error))]')}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setRoleError(false);
                }}
                data-testid="visitor-role"
              >
                <option value="" disabled>
                  Bitte wählen Sie Ihre Besucherrolle
                </option>
                {VISITOR_ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {roleError && !role && (
                <p className="mt-1.5 text-[12px] text-[rgb(var(--bank-error))]">
                  Bitte wählen Sie Ihre Besucherrolle.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={isUsPerson}
                  onCheckedChange={(v) => setIsUsPerson(Boolean(v))}
                  className="mt-0.5 border-[rgb(var(--bank-primary))] data-[state=checked]:bg-[rgb(var(--bank-primary))] data-[state=checked]:text-white"
                  data-testid="visitor-us-person"
                />
                <span className="text-[14px] leading-snug text-[rgb(var(--bank-text))]">
                  Ich bin US-Bürger oder Einwohner der USA
                </span>
              </label>
              {isUsPerson && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-[rgb(var(--bank-error))]/30 bg-[rgb(var(--bank-error))]/8 px-3 py-2.5"
                  role="alert"
                  data-testid="visitor-us-warning"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--bank-error))]"
                    strokeWidth={1.75}
                  />
                  <p className="text-[13px] leading-snug text-[rgb(var(--bank-error))]">
                    Diese Website richtet sich nicht an US-Personen. Der Zugang ist für US-Bürger und
                    Einwohner der USA nicht freigeschaltet.
                  </p>
                </div>
              )}
            </div>
            <Link to="/legal/terms" className={cn(linkClass, 'shrink-0 text-[14px] sm:pt-0.5')}>
              Nutzungsbedingungen
            </Link>
          </div>

          <div className="mt-8 border-t border-black/10 pt-7">
            <h2 className="text-[17px] font-semibold text-[rgb(var(--bank-text))]">
              Bitte wählen Sie Ihre Einstellungen zum Schutz Ihrer Privatsphäre
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[rgb(var(--bank-text-muted))]">
              Wir und unsere Partner verwenden Cookies und Tracking-Technologien, um Ihnen personalisierte
              Inhalte und Werbung anzuzeigen sowie die Nutzung unserer Website zu analysieren. Mit dem
              Klick auf «Akzeptieren» willigen Sie in die Verwendung dieser Technologien ein. Weitere
              Informationen finden Sie in unserer{' '}
              <Link to="/legal/privacy" className={linkClass}>
                Cookie-Richtlinie
              </Link>
              .
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[rgb(var(--bank-text-muted))]">
              Sie können Ihre Einwilligung jederzeit widerrufen oder Ihre Präferenzen anpassen, indem Sie
              Ihre{' '}
              <button type="button" onClick={openCookieSettings} className={linkClass}>
                Cookie- und Tracking-Einstellungen
              </button>{' '}
              konfigurieren.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-black/10 bg-[#EDE9E0] px-6 py-4 sm:px-10">
          <Button
            type="button"
            disabled={!canAccept}
            onClick={handleAccept}
            className={cn(
              'h-11 min-w-[140px] rounded-full px-8 text-[15px] font-medium text-white',
              canAccept
                ? 'bg-[rgb(var(--bank-ink))] hover:bg-[rgb(var(--bank-ink-hover))]'
                : 'cursor-not-allowed bg-[rgb(var(--bank-text-muted))]/50 opacity-70',
            )}
            data-testid="visitor-accept-btn"
          >
            Akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowUpRight, Lock, AlertCircle } from 'lucide-react';
import AuthShell from '@/components/editorial/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/apiBase';

const API_BASE = getApiBase();

/**
 * Session 82.88 — ResetPassword vollständig auf FastAPI JWT-Cookie umgestellt.
 * Kein Supabase-Auth mehr. Zwei Modi:
 *   - Standard: `?token=…` aus Reset-Email → POST /api/auth/reset-password
 *   - Force:    `?mode=force` (User eingeloggt) → POST /api/auth/force-reset-password
 */
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const isForcedFlow = search.get('mode') === 'force';
  const token = search.get('token') || '';

  useEffect(() => {
    // Force-Flow: braucht eingeloggten User (JWT-Cookie).
    if (isForcedFlow) {
      setTokenValid(Boolean(user?.id));
      setChecking(false);
      return;
    }
    // Standard-Flow: braucht Token in URL. Wir validieren clientseitig nur die
    // Präsenz; die Server-Validierung passiert beim Submit (kein User-Enum).
    setTokenValid(Boolean(token));
    setChecking(false);
  }, [isForcedFlow, token, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const check = validatePassword(password);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    if (password !== confirm) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    setLoading(true);
    try {
      if (isForcedFlow) {
        await axios.post(
          `${API_BASE}/api/auth/force-reset-password`,
          { new_password: password },
          { withCredentials: true },
        );
        toast.success('Passwort wurde aktualisiert.');
        await refreshUser();
        const nextPath = user?.role === 'admin'
          ? '/admin'
          : user?.role === 'recruiting'
            ? '/recruiting'
            : user?.onboarding_completed
            ? '/dashboard'
            : '/onboarding';
        navigate(nextPath, { replace: true });
      } else {
        await axios.post(
          `${API_BASE}/api/auth/reset-password`,
          { token, password },
          { withCredentials: false },
        );
        toast.success('Passwort wurde aktualisiert. Sie können sich jetzt anmelden.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg =
        (typeof detail === 'string' && detail) ||
        (err?.response?.status === 400 && 'Link ungültig oder abgelaufen.') ||
        (err?.response?.status === 422 && 'Passwort erfüllt die Anforderungen nicht.') ||
        'Passwort konnte nicht gesetzt werden.';
      toast.error(msg);
      if (err?.response?.status === 400 && !isForcedFlow) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={isForcedFlow ? 'Konto · Pflicht-Reset' : 'Konto · Reset'}
      title={
        <>
          Neues Passwort
          <span className="block italic text-bank-gold-soft">festlegen.</span>
        </>
      }
      subtitle={
        isForcedFlow
          ? 'Aus Sicherheitsgründen müssen Sie Ihr Passwort einmal neu setzen, bevor Sie fortfahren.'
          : `Wählen Sie ein sicheres Passwort für Ihr Konto (mind. ${PASSWORD_MIN_LENGTH} Zeichen, Groß-/Kleinbuchstaben, Ziffer, Sonderzeichen).`
      }
      formTitle={
        <>
          Passwort <em className="italic text-bank-text-muted">zurücksetzen.</em>
        </>
      }
      formLede={
        isForcedFlow
          ? 'Aus Sicherheitsgründen müssen Sie zuerst ein neues Passwort setzen.'
          : 'Geben Sie Ihr neues Passwort ein.'
      }
      backHref="/login"
      backLabel="Zur Anmeldung"
    >
      {checking && (
        <div className="flex items-center gap-3 border-l-2 border-bank-border bg-bank-bg p-5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-bank-gold" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Link wird geprüft…</p>
        </div>
      )}

      {!checking && !tokenValid && (
        <div className="space-y-7" data-testid="reset-password-link-invalid">
          <div className="border-l-2 border-bank-error bg-bank-error/10 p-5">
            <div className="flex gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bank-error" strokeWidth={1.5} />
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-error">
                  {isForcedFlow ? 'Nicht angemeldet' : 'Link ungültig oder abgelaufen'}
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-bank-text">
                  {isForcedFlow
                    ? 'Bitte melden Sie sich zuerst an, um Ihr Passwort zu ändern.'
                    : 'Bitte fordern Sie eine neue E-Mail zum Zurücksetzen an.'}
                </p>
              </div>
            </div>
          </div>
          <Link to={isForcedFlow ? '/login' : '/forgot-password'}>
            <Button size="lg" variant="outline-ink" className="w-full" data-testid="reset-password-invalid-cta">
              {isForcedFlow ? 'Zur Anmeldung' : 'Passwort vergessen'}
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>
      )}

      {!checking && tokenValid && (
        <form onSubmit={handleSubmit} className="space-y-7" data-testid="reset-password-form">
          <label className="block">
            <AuthShell.Label num="01">Neues Passwort</AuthShell.Label>
            <div className="relative">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4" strokeWidth={1.5} />}
                className="h-12 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                data-testid="reset-password-new"
              />
            </div>
          </label>
          <PasswordRequirements password={password} className="mb-2" />
          <label className="block">
            <AuthShell.Label num="02">Bestätigen</AuthShell.Label>
            <div className="relative">
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                leftIcon={<Lock className="h-4 w-4" strokeWidth={1.5} />}
                className="h-12 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                data-testid="reset-password-confirm"
              />
            </div>
          </label>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={loading}
            className="w-full"
            data-testid="reset-password-submit"
          >
            {loading ? (
              'Speichern…'
            ) : (
              <>
                Passwort speichern
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </form>
      )}

      <p className="mt-10 border-t border-bank-border pt-6 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
        Sicheres Passwort erforderlich · Verschlüsselt gespeichert
      </p>
    </AuthShell>
  );
};

export default ResetPassword;

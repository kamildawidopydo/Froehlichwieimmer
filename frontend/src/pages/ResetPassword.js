import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowUpRight, Lock, AlertCircle } from 'lucide-react';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import AuthShell from '@/components/editorial/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import { useAuth } from '@/context/AuthContext';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const location = useLocation();
  const isForcedFlow = new URLSearchParams(location.search).get('mode') === 'force';

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session) setSessionReady(true);
      if (!cancelled) setChecking(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(!!session);
        setChecking(false);
      }
    });

    const t = setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      toast.error(passwordCheck.message);
      return;
    }
    if (password !== confirm) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (authUserId) {
        await supabase
          .from('profiles')
          .update({
            must_change_password: false,
            last_password_reset_at: new Date().toISOString(),
            verified: true,
          })
          .eq('id', authUserId);
        await logEvent(EVENTS.PASSWORD_RESET_COMPLETE, { forced: isForcedFlow }, { userId: authUserId });
      }

      if (isForcedFlow) {
        const { data: profile } = authUserId
          ? await supabase.from('profiles').select('role, onboarding_completed').eq('id', authUserId).single()
          : { data: null };
        const nextPath = profile?.role === 'admin'
          ? '/admin'
          : profile?.onboarding_completed
            ? '/dashboard'
            : '/onboarding';

        toast.success('Passwort wurde aktualisiert. Bitte vervollständigen Sie jetzt Ihre Angaben.');
        // Important: refresh local auth profile so ProtectedRoute sees must_change_password=false.
        await refreshUser();
        navigate(nextPath, { replace: true });
      } else {
        toast.success('Passwort wurde aktualisiert. Sie können sich jetzt anmelden.');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Passwort konnte nicht gesetzt werden.');
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

      {!checking && !sessionReady && (
        <div className="space-y-7">
          <div className="border-l-2 border-bank-error bg-bank-error/10 p-5">
            <div className="flex gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bank-error" strokeWidth={1.5} />
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-error">
                  Link ungültig oder abgelaufen
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-bank-text">
                  Bitte fordern Sie eine neue E-Mail zum Zurücksetzen an.
                </p>
              </div>
            </div>
          </div>
          <Link to="/forgot-password">
            <Button size="lg" variant="outline-ink" className="w-full">
              Passwort vergessen
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>
      )}

      {sessionReady && (
        <form onSubmit={handleSubmit} className="space-y-7">
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
              />
            </div>
          </label>

          <Button type="submit" size="lg" variant="primary" disabled={loading} className="w-full">
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

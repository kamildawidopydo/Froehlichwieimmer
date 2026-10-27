import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Clock, XCircle, ArrowUpRight, KeyRound } from 'lucide-react';
import AuthShell from '@/components/editorial/AuthShell';
import PasswordInput from '@/components/auth/PasswordInput';
import DashboardShowcase from '@/components/editorial/DashboardShowcase';
import TabletMockup from '@/components/editorial/TabletMockup';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState(null);
  const [otpDeviceHash, setOtpDeviceHash] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [authDecisionPending, setAuthDecisionPending] = useState(false);
  const [otpNextPath, setOtpNextPath] = useState('/dashboard');
  const { login, user, verifyEmailOtp, sendEmailOtpForCurrentSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');

  const isSafeNextPath = (path) => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
  const getPostLoginPath = (profileUser) => {
    if (nextParam && isSafeNextPath(nextParam)) return nextParam;
    if (profileUser?.role === 'admin') return '/admin';
    if (profileUser?.must_change_password) return '/reset-password?mode=force';
    if (profileUser?.role === 'recruiting') return '/recruiting';
    if (!profileUser?.onboarding_completed) return '/onboarding';
    return '/dashboard';
  };

  useEffect(() => {
    if (user && !otpRequired && !authDecisionPending) {
      navigate(getPostLoginPath(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, otpRequired, authDecisionPending, nextParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBlockedStatus(null);
    setAuthDecisionPending(true);

    try {
      const result = await login(email, password);
      if (result?.requiresOtp) {
        setOtpRequired(true);
        setOtpChallengeId(result.challengeId);
        setOtpDeviceHash(result.deviceHash || '');
        setOtpNextPath(result.nextPath || '/dashboard');
        toast.info('Neues Gerät erkannt. Bitte E-Mail-Code bestätigen.');
        setAuthDecisionPending(false);
        return;
      }
      toast.success('Erfolgreich angemeldet');
      setAuthDecisionPending(false);
      // Session 81.07 — nextParam-honoring redirect (statt result.nextPath).
      // getPostLoginPath (lokal) berücksichtigt ?next=... aus dem Query-String,
      // sodass Login mit next=/mein-depot direkt dorthin geht.
      navigate(getPostLoginPath(result?.user || user), { replace: true });
    } catch (error) {
      if (error.status === 'pending') {
        setBlockedStatus('pending');
        return;
      }
      if (error.status === 'rejected') {
        setBlockedStatus('rejected');
        return;
      }

      const message = error.message?.includes('Invalid login credentials')
        ? 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'
        : error.message || 'Anmeldung fehlgeschlagen';
      toast.error(message);
    } finally {
      setLoading(false);
      setAuthDecisionPending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpChallengeId) return toast.error('OTP-Challenge fehlt.');
    const codeDigits = String(otpCode || '').replace(/\D/g, '');
    if (codeDigits.length !== 6) return toast.error('Bitte 6-stelligen Code eingeben.');
    setOtpVerifying(true);
    try {
      await verifyEmailOtp({
        challengeId: otpChallengeId,
        code: codeDigits,
        deviceHash: otpDeviceHash,
        trustDevice: true,
      });
      setAuthDecisionPending(false);
      setOtpRequired(false);
      setOtpCode('');
      toast.success('Sicherheitscode bestätigt.');
      navigate(otpNextPath, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Code konnte nicht bestätigt werden.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpResending(true);
    try {
      const result = await sendEmailOtpForCurrentSession({ deviceHash: otpDeviceHash });
      if (!result?.required) {
        setOtpRequired(false);
        toast.success('Dieses Gerät ist bereits verifiziert.');
        navigate(getPostLoginPath(user), { replace: true });
        return;
      }
      if (result?.challengeId) setOtpChallengeId(result.challengeId);
      toast.success('Neuer Code wurde per E-Mail gesendet.');
    } catch (error) {
      toast.error(error.message || 'Code konnte nicht erneut gesendet werden.');
    } finally {
      setOtpResending(false);
    }
  };

  return (
    <AuthShell
      wide
      showcase={
        <TabletMockup>
          <DashboardShowcase />
        </TabletMockup>
      }
      brandPanel={
        <div className="relative z-10 max-w-md">
          <h2
            className="font-display text-[1.55rem] font-semibold leading-[1.05] tracking-[-0.02em] text-white xl:text-[1.85rem]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}
          >
            Ein Login.
            <span className="mt-1 block text-bank-accent">Alle Investments.</span>
          </h2>
          <div className="mt-2.5 h-px w-16 bg-bank-accent/80" aria-hidden />
          <p className="mt-2.5 text-[12.5px] font-semibold leading-snug text-white">
            Verwalten Sie sämtliche Kapitalanlagen über eine einzige Oberfläche.
          </p>
          <p className="mt-1 text-[11.5px] leading-[1.45] text-white/72">
            Ob Tagesgeld, Festgeld, Flexgeld, Aktien, Anleihen oder Fonds – Fröhlich Vermögensberatung ermöglicht Ihnen eine
            strukturierte Übersicht über Ihre Investments und Bankverbindungen. Behalten Sie Ihr Vermögen, Ihre
            Liquidität und Ihre Anlageentscheidungen jederzeit im Blick.
          </p>
          <p className="mt-1 text-[11px] font-semibold tracking-[0.04em] text-bank-accent">
            Alle Banken. Alle Investments. Eine Plattform.
          </p>
        </div>
      }
      formTitle={
        otpRequired ? (
          <>
            Sicherheits-<em className="italic text-bank-text-muted">code</em>
          </>
        ) : (
          <>
            Anmelden — <em className="italic text-bank-text-muted">Ihr Konto.</em>
          </>
        )
      }
      formLede={
        otpRequired
          ? 'Wir haben Ihnen einen 6-stelligen Code per E-Mail gesendet.'
          : 'Sicher anmelden über eine verschlüsselte Verbindung.'
      }
    >
      {/* Status banners */}
      {blockedStatus === 'pending' && (
        <div className="mb-7 border-l-2 border-bank-primary/55 bg-bank-primary/[0.06] p-5">
          <div className="flex gap-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-bank-primary" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Konto wird geprüft</p>
              <p className="mt-2 text-[13.5px] leading-[1.75] text-bank-text">
                Freischaltung durch einen Administrator. Sie erhalten eine E-Mail, sobald das Konto aktiv ist.
              </p>
            </div>
          </div>
        </div>
      )}

      {blockedStatus === 'rejected' && (
        <div className="mb-7 border-l-2 border-bank-error bg-bank-error/10 p-5">
          <div className="flex gap-4">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-bank-error" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-error">
                Registrierung nicht genehmigt
              </p>
              <p className="mt-2 text-[13.5px] leading-[1.75] text-bank-text">
                Bei Fragen:{' '}
                <a href="mailto:kundenservice@essenceinvest.com" className="text-bank-primary underline-offset-4 hover:underline">
                  kundenservice@essenceinvest.com
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {!otpRequired ? (
        <form onSubmit={handleSubmit} className="space-y-7">
          <label className="block">
            <AuthShell.Label num="01">E-Mail</AuthShell.Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
              data-testid="login-email-input"
              autoComplete="email"
              className="h-12 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>

          <label className="block">
            <div className="mb-3 flex items-center justify-between">
              <AuthShell.Label num="02" className="mb-0">
                Passwort
              </AuthShell.Label>
              <Link
                to="/forgot-password"
                className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary underline-offset-4 hover:underline"
              >
                Vergessen?
              </Link>
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="login-password-input"
              autoComplete="current-password"
              className="h-12 rounded-none border-bank-border focus-visible:border-bank-primary focus-visible:ring-2 focus-visible:ring-bank-primary/25"
            />
          </label>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={loading}
            data-testid="login-submit-btn"
            className="w-full"
          >
            {loading ? (
              'Anmeldung…'
            ) : (
              <>
                Anmelden
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-7">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center border border-bank-primary/40 bg-bank-primary/[0.08] text-bank-primary">
                <KeyRound className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">
                <span className="text-bank-text">06</span> · stelliger Code
              </p>
            </div>
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={otpVerifying}
            className="w-full"
          >
            {otpVerifying ? 'Prüfung…' : 'Code bestätigen'}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline-ink"
            onClick={handleResendOtp}
            disabled={otpResending}
            className="w-full"
          >
            {otpResending ? 'Wird gesendet…' : 'Code erneut senden'}
          </Button>
        </form>
      )}

      {/* Footer link + colophon */}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-bank-border pt-6">
        <p className="text-[13.5px] text-bank-text-muted">
          Noch kein Konto?{' '}
          <Link to="/register" className="font-medium text-bank-primary underline-offset-4 hover:underline">
            Registrieren
          </Link>
        </p>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted sm:block">
          256-bit SSL
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;

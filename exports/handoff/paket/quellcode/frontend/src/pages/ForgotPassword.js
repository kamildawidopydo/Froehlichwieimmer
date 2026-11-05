import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowUpRight, Mail, CheckCircle2 } from 'lucide-react';
import AuthShell from '@/components/editorial/AuthShell';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      toast.success('Wenn ein Konto existiert, erhalten Sie eine E-Mail mit einem Link.');
    } catch (err) {
      toast.error(err.message || 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Konto · Wiederherstellung"
      title={
        <>
          Passwort
          <span className="block italic text-bank-gold-soft">vergessen.</span>
        </>
      }
      subtitle="Wir senden Ihnen einen sicheren Link zum Zurücksetzen — gültig für eine begrenzte Zeit."
      formTitle={
        sent ? (
          <>
            E-Mail <em className="italic text-bank-text-muted">unterwegs.</em>
          </>
        ) : (
          <>
            Passwort <em className="italic text-bank-text-muted">vergessen?</em>
          </>
        )
      }
      formLede={
        sent
          ? null
          : 'Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Neusetzen des Passworts.'
      }
      backHref="/login"
      backLabel="Zur Anmeldung"
    >
      {sent ? (
        <div className="space-y-7">
          <div className="border-l-2 border-bank-gold/55 bg-bank-gold-soft/15 p-6">
            <div className="flex gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-bank-gold" strokeWidth={1.5} />
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Anfrage erfasst</p>
                <p className="mt-2 text-[14px] leading-[1.75] text-bank-text">
                  Bitte prüfen Sie Ihren Posteingang (und Spam). Der Link führt zur Seite{' '}
                  <em className="italic">„Passwort zurücksetzen"</em> auf dieser Website.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="flex-1">
              <Button size="lg" variant="primary" className="w-full">
                Zur Anmeldung
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Button>
            </Link>
            <Button
              type="button"
              size="lg"
              variant="outline-ink"
              className="flex-1"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
            >
              Erneut senden
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7">
          <label className="block">
            <AuthShell.Label num="01">E-Mail</AuthShell.Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-gold"
                strokeWidth={1.5}
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                autoComplete="email"
                className="h-12 rounded-none border-bank-border pl-9 focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
              />
            </div>
          </label>

          <Button type="submit" size="lg" variant="primary" disabled={loading} className="w-full">
            {loading ? (
              'Wird gesendet…'
            ) : (
              <>
                Link senden
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </form>
      )}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-bank-border pt-6">
        <p className="text-[13.5px] text-bank-text-muted">
          <Link to="/login" className="font-medium text-bank-primary underline-offset-4 hover:underline">
            Zur Anmeldung
          </Link>
        </p>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted sm:block">
          Einmal-Link · 60 min
        </p>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;

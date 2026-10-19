import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, ShieldCheck, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';

// Session 82.96 — Supabase-RPC `verify_formular_access_code` ersetzt durch
// `POST /api/formular-access/verify` (FastAPI/Mongo, SHA-256-Hash, 24-h-Session).

const SESSION_KEY = 'formular_session_id';
const CONDITIONS_KEY = 'formular_conditions';
const API = getApiBase();

const PasswordPage = () => {
  const [password, setPassword] = useState('');
  const [usedByName, setUsedByName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = usedByName.trim();
    const code = password.trim();
    if (!name) { toast.error('Bitte geben Sie Ihren Namen ein'); return; }
    if (!code) { toast.error('Bitte geben Sie Ihren Zugangscode ein'); return; }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${API}/api/formular-access/verify`,
        {
          code,
          used_by_name: name,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
        { withCredentials: true },
      );
      if (!data?.session_id) throw new Error('Keine Session zurückgegeben');
      sessionStorage.setItem(SESSION_KEY, data.session_id);
      sessionStorage.removeItem('formular_auth');
      const cond = data?.conditions;
      if (cond && typeof cond === 'object') {
        sessionStorage.setItem(CONDITIONS_KEY, JSON.stringify(cond));
      } else {
        sessionStorage.removeItem(CONDITIONS_KEY);
      }
      // Ist im Code eine Bank + Produkt hinterlegt, führt der Code direkt
      // zu genau diesem Vertrag — der Kunde sieht keine anderen Angebote.
      if (cond?.bank && cond?.product) {
        navigate(`/banks/${cond.bank}/${cond.product}/vertrag`, { replace: true });
      } else {
        navigate('/banks');
      }
    } catch (err) {
      setShaking(true);
      const detail = err?.response?.data?.detail;
      toast.error(detail || 'Zugang verweigert');
      setTimeout(() => setShaking(false), 500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F8FC]">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.28; transform: scale(1); }
          50%      { opacity: 0.55;  transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shake,
          .pulse-ring { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(236_245_252)_0%,transparent_55%),radial-gradient(ellipse_at_80%_100%,rgb(209_250_229/0.45)_0%,transparent_45%)]" aria-hidden />
      <div className="topo-pattern pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden />
      <div className="pointer-events-none absolute -left-28 top-[-12%] h-[480px] w-[480px] rounded-full bg-bank-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-[-18%] right-[-8%] h-[520px] w-[520px] rounded-full bg-bank-signature/12 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-signature/40 to-transparent" aria-hidden />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-primary/25 to-transparent" aria-hidden />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted sm:px-10">
        <span>Fröhlich Vermögensberatung · Sicherer Zugang</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted/80 sm:px-10">
        <span>Bad Kreuznach</span>
        <span>256-bit · Verschlüsselt</span>
      </div>

      <div className={`relative z-10 w-full max-w-md px-6 ${shaking ? 'animate-shake' : ''}`}>
        <div className="mb-12 flex justify-center">
          <img src="/assets/logo/frohlich-logo.png?v=4" alt="Fröhlich Vermögensberatung" className="mx-auto h-[5.25rem] w-full max-w-[min(100%,min(480px,90vw))] object-contain sm:h-[6rem] sm:max-w-[min(100%,540px)]" />
        </div>

        <div className="relative border border-bank-border/90 bg-white px-7 py-12 shadow-[0_20px_50px_-28px_rgba(33,86,140,0.28)] sm:px-12 sm:py-14">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-signature/70 to-transparent" />
          <span aria-hidden className="absolute left-0 top-0 h-7 w-px bg-bank-signature/70" />
          <span aria-hidden className="absolute right-0 top-0 h-7 w-px bg-bank-signature/70" />
          <span aria-hidden className="absolute bottom-0 left-0 h-7 w-px bg-bank-signature/40" />
          <span aria-hidden className="absolute bottom-0 right-0 h-7 w-px bg-bank-signature/40" />

          <div className="mb-9 flex flex-col items-center">
            <div className="relative mb-7">
              <div className="pulse-ring absolute -inset-3 rounded-full bg-bank-signature/25" style={{ animation: 'pulse-ring 3s ease-in-out infinite' }} />
              <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-bank-signature/55 bg-white shadow-[0_8px_28px_-10px_rgb(5_150_105/0.55)]">
                <Lock className="h-7 w-7 text-bank-signature" strokeWidth={2} />
              </div>
            </div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-signature">Zugang · Tresor</p>
            <h1 className="mt-4 font-display text-[1.75rem] font-light leading-tight text-bank-text sm:text-[2rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              Sicherer <em className="italic text-bank-signature">Zugang.</em>
            </h1>
            <div className="mt-4 h-px w-12 bg-bank-signature/60" aria-hidden />
            <p className="mt-5 max-w-xs text-center font-sans text-[13.5px] leading-[1.65] text-bank-text-muted">
              Bitte geben Sie Ihren Zugangscode ein.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="formular-verify-form">
            <label className="block">
              <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Ihr Name</span>
              <input
                type="text"
                value={usedByName}
                onChange={(e) => setUsedByName(e.target.value)}
                placeholder="Vor- und Nachname"
                autoComplete="name"
                aria-label="Ihr Name"
                data-testid="formular-verify-name"
                className="block w-full border border-bank-border bg-white px-5 py-4 text-center font-sans text-[15px] text-bank-text placeholder-bank-text-muted/70 transition-all duration-200 focus:border-bank-signature/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-signature/35"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-center font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Zugangscode</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ABCD1234"
                autoFocus
                aria-label="Zugangscode"
                data-testid="formular-verify-code"
                className="block w-full border border-bank-border bg-white px-5 py-4 text-center font-mono text-[15px] tracking-[0.18em] text-bank-text placeholder-bank-text-muted/70 transition-all duration-200 focus:border-bank-signature/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-signature/35"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              data-testid="formular-verify-submit"
              className="shine relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden bg-bank-signature font-mono text-[10.5px] font-medium uppercase tracking-[0.28em] text-white transition-all duration-300 hover:bg-bank-signature-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-signature/45 disabled:opacity-50"
            >
              {submitting ? 'Wird geprüft…' : 'Weiter'}
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>

          <div className="mt-10 flex items-center justify-center gap-2.5 border-t border-bank-border pt-7">
            <ShieldCheck className="h-4 w-4 text-bank-signature" strokeWidth={1.75} />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">256-bit · Verschlüsselt</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordPage;

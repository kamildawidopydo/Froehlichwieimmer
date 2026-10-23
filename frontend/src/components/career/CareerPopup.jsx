import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { hasVisitorProfile } from '@/lib/visitorGate';
import { CareerIntro } from './CareerIntro';
import { CareerForm } from './CareerForm';

const SEEN_KEY = 'career_popup_seen_session';
const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/login', '/register', '/formular', '/reset-password', '/forgot-password'];

const Done = ({ onClose }) => (
  <div className="flex h-full flex-col justify-center" data-testid="career-popup-success">
    <CheckCircle2 size={40} className="text-[#C9A54C]" strokeWidth={1.5} />
    <h2 className="mt-4 font-display text-3xl text-white">Vielen Dank!</h2>
    <p className="mt-3 text-sm leading-relaxed text-white/70">
      Ihre Bewerbung ist bei uns eingegangen. Sie erhalten eine Bestätigung per E-Mail, und wir melden uns zeitnah bei Ihnen.
    </p>
    <button type="button" onClick={onClose} data-testid="career-popup-success-close-btn" className="mt-8 w-fit rounded-full border border-white/25 px-6 py-2.5 text-sm text-white transition-colors hover:border-[#C9A54C]">
      Schließen
    </button>
  </div>
);

const useShouldShow = () => {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(hasVisitorProfile());
  useEffect(() => {
    const onProfile = () => setReady(true);
    window.addEventListener('visitor-profile-updated', onProfile);
    return () => window.removeEventListener('visitor-profile-updated', onProfile);
  }, []);
  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  return ready && !hiddenRoute && !sessionStorage.getItem(SEEN_KEY);
};

const CareerPopup = () => {
  const shouldShow = useShouldShow();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('intro');

  useEffect(() => {
    if (!shouldShow) {
      return undefined;
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [shouldShow]);

  const close = () => {
    sessionStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent
        data-testid="career-popup"
        className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-4xl gap-0 overflow-y-auto rounded-2xl border border-[#C9A54C]/25 bg-[#0F1B2D] p-0 shadow-2xl sm:overflow-hidden [&>button:last-child]:hidden"
      >
        <DialogTitle className="sr-only">Wir suchen Finanzberater in Hamburg</DialogTitle>
        <DialogDescription className="sr-only">Bewerben Sie sich als Finanzberater im Raum Hamburg.</DialogDescription>
        <div className="grid sm:grid-cols-[0.9fr_1.1fr]">
          <div className="relative h-44 sm:h-auto sm:min-h-[560px]">
            <img src="/assets/career/hamburg-speicherstadt.jpg" alt="Hamburger Speicherstadt im Abendlicht" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B2D]/80 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-[#0F1B2D]/30" />
          </div>
          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <span className="absolute left-0 top-10 hidden h-16 w-px bg-[#C9A54C] sm:block" />
            {step === 'intro' && <CareerIntro onApply={() => setStep('form')} onLater={close} />}
            {step === 'form' && <CareerForm onBack={() => setStep('intro')} onDone={() => setStep('done')} />}
            {step === 'done' && <Done onClose={close} />}
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Schließen" data-testid="career-popup-close-btn" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur transition-colors hover:bg-black/50 hover:text-white">
          <X size={18} />
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CareerPopup;

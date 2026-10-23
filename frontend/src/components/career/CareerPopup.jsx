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
  <div className="flex flex-col items-center text-center" data-testid="career-popup-success">
    <CheckCircle2 size={40} className="text-[#36A852]" strokeWidth={1.5} />
    <h2 className="mt-4 font-display text-3xl text-[#1F4D3A]">Vielen Dank!</h2>
    <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#6B6459]">
      Ihre Bewerbung ist bei uns eingegangen. Sie erhalten eine Bestätigung per E-Mail, und wir melden uns zeitnah bei Ihnen.
    </p>
    <button type="button" onClick={onClose} data-testid="career-popup-success-close-btn" className="mt-8 rounded-full bg-[#1F4D3A] px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#218739]">
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
        className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-xl grid-cols-[minmax(0,1fr)] gap-0 overflow-y-auto overflow-x-hidden rounded-3xl border-0 bg-white p-0 shadow-2xl outline-none focus:outline-none [&>button:last-child]:hidden"
      >
        <DialogTitle className="sr-only">Wir suchen Finanzberater in Hamburg</DialogTitle>
        <DialogDescription className="sr-only">Bewerben Sie sich als Finanzberater im Raum Hamburg.</DialogDescription>
        <div>
          {step !== 'form' && (
            <div className="relative h-44 overflow-hidden sm:h-56">
              <img src="/assets/career/hamburg-elbphilharmonie.jpg" alt="Elbphilharmonie in Hamburg" className="h-full w-full object-cover object-[center_40%]" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
            </div>
          )}
          <div className="min-w-0 px-6 pb-8 pt-4 sm:px-12 sm:pb-10">
            {step === 'intro' && <CareerIntro onApply={() => setStep('form')} onLater={close} />}
            {step === 'form' && <CareerForm onBack={() => setStep('intro')} onDone={() => setStep('done')} />}
            {step === 'done' && <Done onClose={close} />}
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Schließen" data-testid="career-popup-close-btn" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#1A1A1D] shadow-sm backdrop-blur transition-colors hover:bg-white">
          <X size={18} />
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CareerPopup;

import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight } from 'lucide-react';
import useCareerVisible from '@/lib/useCareerVisible';

export default function HomeCareerCta() {
  const visible = useCareerVisible();
  if (!visible) return null;
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-bank-primary/20 bg-bank-primary/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" data-testid="home-career-cta">
      <div className="flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bank-primary text-white"><Briefcase size={18} /></span>
        <div>
          <p className="font-serif text-lg leading-tight text-bank-text sm:text-xl">Karriere bei Essence Invest – Wir suchen Verstärkung</p>
          <p className="text-sm text-bank-text-muted">Entdecke unsere Karrieremöglichkeiten und werde Teil unseres Teams.</p>
        </div>
      </div>
      <Link to="/karriere/stellen" data-testid="home-career-apply-btn"
        className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-bank-primary px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(54,168,82,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-bank-primary-hover">
        Jetzt bewerben <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

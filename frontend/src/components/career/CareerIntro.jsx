import React from 'react';
import { ArrowRight, Briefcase, MapPin, Users } from 'lucide-react';

const PERKS = [
  { icon: Briefcase, text: 'Attraktive Vergütung' },
  { icon: Users, text: 'Persönliche Einarbeitung' },
  { icon: MapPin, text: 'Kunden im Raum Hamburg' },
];

export const CareerIntro = ({ onApply, onLater }) => (
  <div className="text-center" data-testid="career-popup-intro">
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-[#218739]">Karriere in Hamburg</p>
    <h2 className="mt-3 font-display text-3xl leading-tight text-[#1F4D3A] sm:text-[2.6rem]">Finanzberater gesucht</h2>
    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6B6459] sm:text-base">
      Verstärken Sie unser Team im Raum Hamburg. Sie beraten mit Leidenschaft? Dann bewerben Sie sich jetzt bei der
      Fröhlich Vermögensberatung.
    </p>
    <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2.5">
      {PERKS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 text-sm text-[#1A1A1D]">
          <Icon size={15} strokeWidth={1.7} className="text-[#36A852]" />
          {text}
        </li>
      ))}
    </ul>
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
      <button
        type="button"
        onClick={onApply}
        data-testid="career-popup-apply-btn"
        className="group inline-flex items-center gap-2 rounded-full bg-[#1F4D3A] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#218739]"
      >
        Jetzt bewerben
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
      </button>
      <button
        type="button"
        onClick={onLater}
        data-testid="career-popup-later-btn"
        className="text-sm text-[#8C8578] underline-offset-4 transition-colors hover:text-[#1A1A1D] hover:underline"
      >
        Später
      </button>
    </div>
  </div>
);

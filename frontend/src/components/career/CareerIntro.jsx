import React from 'react';
import { ArrowRight, Briefcase, MapPin, Users } from 'lucide-react';

const PERKS = [
  { icon: Briefcase, text: 'Attraktive, leistungsgerechte Vergütung' },
  { icon: Users, text: 'Persönliche Einarbeitung im Team' },
  { icon: MapPin, text: 'Kunden und Einsatz im Raum Hamburg' },
];

export const CareerIntro = ({ onApply, onLater }) => (
  <div className="flex h-full flex-col justify-center" data-testid="career-popup-intro">
    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#C9A54C]">Karriere · Hamburg</p>
    <h2 className="mt-4 font-display text-3xl leading-[1.1] text-white sm:text-4xl">
      Wir suchen Finanzberater in Hamburg
    </h2>
    <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
      Sie beraten mit Leidenschaft und möchten Menschen bei ihren Finanzen begleiten? Werden Sie Teil der
      Fröhlich Vermögensberatung und bewerben Sie sich jetzt.
    </p>
    <ul className="mt-6 space-y-3">
      {PERKS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-sm text-white/85">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A54C]/40 text-[#C9A54C]">
            <Icon size={15} strokeWidth={1.6} />
          </span>
          {text}
        </li>
      ))}
    </ul>
    <div className="mt-8 flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={onApply}
        data-testid="career-popup-apply-btn"
        className="group inline-flex items-center gap-2 rounded-full bg-[#C9A54C] px-7 py-3 text-sm font-semibold text-[#0F1B2D] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#D8B862]"
      >
        Jetzt bewerben
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
      </button>
      <button
        type="button"
        onClick={onLater}
        data-testid="career-popup-later-btn"
        className="text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        Später
      </button>
    </div>
  </div>
);

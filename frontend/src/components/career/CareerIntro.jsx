import React from 'react';

export const CareerIntro = ({ onApply, onLater }) => (
  <div className="text-center" data-testid="career-popup-intro">
    <p className="text-sm font-medium uppercase tracking-[0.06em] text-[#1F4D3A]">Karriere in Hamburg</p>
    <h2 className="mt-3 font-display text-4xl font-medium leading-tight text-[#1F4D3A] sm:text-5xl">Finanzberater gesucht</h2>
    <p className="mt-4 text-base text-[#1A1A1D] sm:text-lg">Verstärken Sie unser Team im Raum Hamburg.</p>
    <div className="mt-8 flex items-center justify-center gap-5">
      <button
        type="button"
        onClick={onApply}
        data-testid="career-popup-apply-btn"
        className="rounded-full bg-[#1F4D3A] px-7 py-3 text-base font-medium text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#163829]"
      >
        Jetzt bewerben
      </button>
      <button
        type="button"
        onClick={onLater}
        data-testid="career-popup-later-btn"
        className="text-base text-[#9A9A9A] underline underline-offset-4 transition-colors hover:text-[#1A1A1D]"
      >
        Später
      </button>
    </div>
  </div>
);

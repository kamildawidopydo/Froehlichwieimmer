import React from 'react';
import { ING_LOGO, ING_LEGAL_NAME } from '@/lib/ingTheme';

/** Light header with orange top rail — intentionally different from BBVA navy bar. */
const IngContractHeader = ({
  productTitle,
  productSubtitle = 'mit garantierter Verzinsung',
}) => {
  const contractDate = new Date().toLocaleDateString('de-DE');

  return (
    <header className="ing-contract-header overflow-hidden border-b border-[#FF6200]/25 bg-white md:rounded-t">
      <div className="h-1.5 bg-[#FF6200]" aria-hidden />
      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:gap-8 md:px-10 md:py-6">
        <img
          src={ING_LOGO}
          alt="ING"
          className="h-10 w-auto shrink-0 object-contain md:h-11"
        />

        <div className="hidden h-10 w-px shrink-0 bg-[#003087]/15 md:block" aria-hidden />

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-[#003087] md:text-[1.3rem]">
            {productTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#003087]/75">{productSubtitle}</p>
          <p className="mt-1 text-[11px] text-[#003087]/55">{ING_LEGAL_NAME} · Amsterdam</p>
        </div>

        <div className="flex gap-6 border-t border-[#FF6200]/20 pt-3 text-[12px] text-[#003087] md:border-l md:border-t-0 md:border-[#003087]/12 md:pl-6 md:pt-0">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#003087]/50">Datum</p>
            <p className="mt-0.5 font-semibold">{contractDate}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#003087]/50">Vertrag-Nr.</p>
            <p className="mt-0.5 font-semibold text-[#003087]/55">—</p>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-[#FF6200] via-[#FF8533] to-transparent" aria-hidden />
    </header>
  );
};

export const IngContractIntro = ({ title, children }) => (
  <div className="mb-10 border-l-4 border-[#FF6200] bg-[#FFF5F0] px-5 py-4 md:px-6">
    <h2 className="text-base font-bold text-[#003087]">{title}</h2>
    <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#003087]/85">{children}</div>
  </div>
);

export default IngContractHeader;

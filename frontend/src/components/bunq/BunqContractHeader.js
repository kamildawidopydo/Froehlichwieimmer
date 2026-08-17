import React from 'react';
import { BUNQ_LOGO, BUNQ_LEGAL_NAME } from '@/lib/bunqTheme';

/** White header + pumpkin top rail — distinct from BBVA navy and ING orange bar. */
const BunqContractHeader = ({
  productTitle,
  productSubtitle = 'mit garantierter Verzinsung',
}) => {
  const contractDate = new Date().toLocaleDateString('de-DE');

  return (
    <header className="bunq-contract-header overflow-hidden border-b border-[#0B4F6C]/15 bg-white md:rounded-t">
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-[2] bg-[#89cc53]" />
        <span className="flex-[2] bg-[#3394d7]" />
        <span className="flex-[2] bg-[#993233]" />
        <span className="flex-[3] bg-[#FF7819]" />
      </div>
      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:gap-8 md:px-10 md:py-6">
        <img
          src={BUNQ_LOGO}
          alt="bunq"
          className="h-9 w-auto shrink-0 object-contain md:h-10"
        />

        <div className="hidden h-10 w-px shrink-0 bg-[#0B4F6C]/15 md:block" aria-hidden />

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-[#0B4F6C] md:text-[1.3rem]">
            {productTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#0B4F6C]/75">{productSubtitle}</p>
          <p className="mt-1 text-[11px] text-[#0B4F6C]/55">{BUNQ_LEGAL_NAME} · Amsterdam</p>
        </div>

        <div className="flex gap-6 border-t border-[#FF7819]/25 pt-3 text-[12px] text-[#0B4F6C] md:border-l md:border-t-0 md:border-[#0B4F6C]/12 md:pl-6 md:pt-0">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#0B4F6C]/50">Datum</p>
            <p className="mt-0.5 font-semibold">{contractDate}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#0B4F6C]/50">Vertrag-Nr.</p>
            <p className="mt-0.5 font-semibold text-[#0B4F6C]/55">—</p>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-[#89cc53] via-[#3394d7] to-[#FF7819]" aria-hidden />
    </header>
  );
};

export const BunqContractIntro = ({ title, children }) => (
  <div className="mb-10 border-l-4 border-[#FF7819] bg-[#F2F8FA] px-5 py-4 md:px-6">
    <h2 className="text-base font-bold text-[#0B4F6C]">{title}</h2>
    <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#0B4F6C]/85">{children}</div>
  </div>
);

export default BunqContractHeader;

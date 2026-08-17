import React from 'react';
import { POSTBANK_LOGO, POSTBANK_LEGAL_NAME } from '@/lib/postbankTheme';

const PostbankContractHeader = ({
  productTitle,
  productSubtitle = 'mit garantierter Verzinsung',
}) => {
  const contractDate = new Date().toLocaleDateString('de-DE');

  return (
    <header className="postbank-contract-header overflow-hidden md:rounded-t bg-[#FFCC00]">
      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:gap-8 md:px-10 md:py-6">
        <img
          src={POSTBANK_LOGO}
          alt="Postbank"
          className="h-9 w-auto shrink-0 object-contain md:h-10"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-[#003366] md:text-[1.3rem]">
            {productTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#003366]/80">{productSubtitle}</p>
          <p className="mt-1 text-[11px] text-[#003366]/60">{POSTBANK_LEGAL_NAME}</p>
        </div>

        <div className="flex gap-6 border-t border-[#003366]/15 pt-3 text-[12px] text-[#003366] md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#003366]/55">Datum</p>
            <p className="mt-0.5 font-semibold">{contractDate}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#003366]/55">Vertrag-Nr.</p>
            <p className="mt-0.5 font-semibold text-[#003366]/70">—</p>
          </div>
        </div>
      </div>

      <div className="flex h-1" aria-hidden>
        <span className="flex-1 bg-[#003366]" />
        <span className="w-8 shrink-0 bg-[#E30613]" />
        <span className="flex-1 bg-[#003366]" />
      </div>
    </header>
  );
};

export const PostbankContractIntro = ({ title, children }) => (
  <div className="mb-10 border-l-4 border-[#FFCC00] bg-[#FFF9E6]/80 px-5 py-4 md:px-6">
    <h2 className="text-base font-bold text-[#003366]">{title}</h2>
    <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#003366]/85">{children}</div>
  </div>
);

export default PostbankContractHeader;

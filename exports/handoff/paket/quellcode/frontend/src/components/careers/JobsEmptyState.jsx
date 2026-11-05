import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function JobsEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white px-7 py-14 sm:px-12 lg:py-20" data-testid="jobs-perspective-empty">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#36A852]/10 blur-2xl" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#36A852]/10"><Compass size={22} className="text-[#36A852]" /></span>
        <h2 className="mt-6 font-display text-3xl leading-tight text-[#1E222C] sm:text-4xl" data-testid="jobs-perspective-title">Ihre Zukunft beginnt mit neuen Perspektiven.</h2>
        <p className="mt-5 text-base leading-relaxed text-[#555] md:text-lg">
          Wir bereiten derzeit unsere aktuellen Stellenangebote vor.
        </p>
        <p className="mt-3 text-base leading-relaxed text-[#555] md:text-lg">
          Lernen Sie in der Zwischenzeit die Fröhlich Vermögensberatung GmbH kennen und erfahren Sie mehr über unsere Tätigkeitsbereiche und beruflichen Perspektiven.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/karriere/ueber-uns" className="rounded-full bg-[#36A852] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="jobs-empty-company-btn">Unser Unternehmen kennenlernen</Link>
          <Link to="/karriere#karrierewege" className="rounded-full border border-black/10 px-7 py-3.5 text-[15px] font-semibold text-[#1E222C] transition-colors hover:bg-black/[0.03]" data-testid="jobs-empty-paths-btn">Karrierewege entdecken</Link>
        </div>
      </div>
    </div>
  );
}

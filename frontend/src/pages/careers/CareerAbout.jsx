import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import { CultureSection, DraftNote } from '@/components/careers/CareerSections';
import EmployerProfile from '@/components/careers/EmployerProfile';

export default function CareerAbout() {
  const { status } = useOutletContext();
  return (
    <>
      <PageMeta title="Über uns | Karriere bei der Fröhlich Vermögensberatung GmbH" description="Lernen Sie die Fröhlich Vermögensberatung GmbH und ihre Marke Essence Invest als Arbeitgeber kennen." path="/karriere/ueber-uns" />
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24" data-testid="career-about">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Über uns</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Fröhlich Vermögensberatung GmbH – Ihr Arbeitgeber<DraftNote show={status.is_staff} /></h1>
          <p className="mt-6 leading-relaxed text-[#555]">
            Die Fröhlich Vermögensberatung GmbH mit Sitz in Bad Kreuznach unterstützt Menschen dabei, ihr Vermögen übersichtlich und sicher anzulegen. Unter der Marke Essence Invest bieten wir Spar-, Festgeld- und Investmentlösungen europäischer Partnerbanken auf einer Plattform an.
          </p>
          {status.is_staff && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="career-about-placeholder">[Nur intern sichtbar – Platzhalter: Gründungsjahr, Teamgröße und Standorte bitte ergänzen]</p>}
          <Link to="/karriere/stellen" className="mt-8 inline-block rounded-full bg-[#36A852] px-7 py-3.5 font-semibold text-white" data-testid="career-about-jobs-btn">Stellenangebote ansehen</Link>
        </div>
        <img src="/assets/careers/team.jpg" alt="Team im Besprechungsraum" className="h-[420px] w-full rounded-3xl object-cover" loading="lazy" />
      </section>
      <EmployerProfile />
      <CultureSection isStaff={status.is_staff} />
    </>
  );
}

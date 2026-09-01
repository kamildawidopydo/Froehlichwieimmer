import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Session 80.62 — Sparkonten-Hero-Banner auf der Startseite.
 *
 * Nutzt exakt das vom Kunden bereitgestellte Bild
 * (`/assets/home/froehlich-sparkonten-hero.webp`, 2000×682) 1:1
 * ohne Verzerrung, Crop oder Neu-Generierung. Der grüne Button
 * „Jetzt Sparkonten vergleichen" ist Bestandteil des Bildes; ein
 * unsichtbarer, aber tastatur-fokussierbarer Link führt zum bereits
 * existierenden Sparkontenvergleich (`/comparison`).
 *
 * - Desktop: Volle Content-Breite, natürliches Seitenverhältnis (2.93:1)
 * - Mobile: Horizontal scrollbarer Rahmen mit Mindesthöhe, damit
 *   Frau, Firmenname, Aussage und Button vollständig sichtbar & lesbar
 *   bleiben (Original wird NICHT gecropped/verzerrt).
 * - Kein Card-Wrapper, keine Border, kein Shadow.
 */
const HomeSparkontenBanner = () => {
  const mobileScrollerRef = useRef(null);
  useEffect(() => {
    // Ensure mobile scroll starts at left edge (woman + company name visible first).
    if (mobileScrollerRef.current) {
      mobileScrollerRef.current.scrollLeft = 0;
    }
  }, []);
  return (
    <section
      data-testid="home-sparkonten-hero"
      className="bg-bank-bg"
      aria-label="Sparkonten vergleichen — Fröhlich Vermögensverwaltung"
    >
      <div className="mx-auto w-full min-w-0 max-w-[1440px] px-5 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pt-10 xl:px-16">
        {/* Desktop / Tablet (≥sm): natürliches Seitenverhältnis, volle Content-Breite */}
        <div className="relative hidden sm:block">
          <img
            src="/assets/home/froehlich-sparkonten-hero.webp"
            alt="Fröhlich Vermögensverwaltung: Sparkonten vergleichen – transparent, sicher und renditestark. Vergleichen Sie die besten Tagesgeld- und Sparkonten aus Deutschland und Europa – unabhängig und kostenlos."
            width={2000}
            height={682}
            fetchpriority="high"
            decoding="async"
            className="block h-auto w-full select-none"
            data-testid="home-sparkonten-hero-image"
          />
          {/*
            Der grüne Button „Jetzt Sparkonten vergleichen" liegt in der unteren
            rechten Bildhälfte (ca. 43%-65% X, 71%-93% Y bei 2000×682).
            Ein transparenter Link darüber macht den Button klickbar & fokussierbar.
          */}
          <Link
            to="/comparison"
            aria-label="Jetzt Sparkonten vergleichen"
            data-testid="home-sparkonten-hero-cta"
            className="absolute left-[43%] right-[35%] top-[71%] bottom-[7%] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-bank-primary"
          >
            <span className="sr-only">Jetzt Sparkonten vergleichen</span>
          </Link>
        </div>

        {/* Mobile (<sm): horizontal scrollbar, Mindesthöhe für Lesbarkeit,
            Bild bleibt vollständig sichtbar und in Originalproportion. */}
        <div className="block sm:hidden">
          <div
            ref={mobileScrollerRef}
            className="relative -mx-5 overflow-x-auto"
            data-testid="home-sparkonten-hero-mobile-scroller"
          >
            <div className="relative w-max px-5">
              <img
                src="/assets/home/froehlich-sparkonten-hero.webp"
                alt="Fröhlich Vermögensverwaltung: Sparkonten vergleichen – transparent, sicher und renditestark."
                width={2000}
                height={682}
                fetchpriority="high"
                decoding="async"
                className="block h-[220px] w-auto max-w-none select-none"
                data-testid="home-sparkonten-hero-image-mobile"
              />
              <Link
                to="/comparison"
                aria-label="Jetzt Sparkonten vergleichen"
                data-testid="home-sparkonten-hero-cta-mobile"
                className="absolute left-[calc(43%_+_1.25rem)] right-[calc(35%_+_1.25rem)] top-[71%] bottom-[7%] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-bank-primary"
              >
                <span className="sr-only">Jetzt Sparkonten vergleichen</span>
              </Link>
            </div>
          </div>
          <p className="mt-2 px-1 text-xs text-bank-text-muted">
            Zum Ansehen ggf. horizontal wischen.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomeSparkontenBanner;

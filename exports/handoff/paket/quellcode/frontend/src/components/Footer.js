import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CandlestickChart,
  GitCompareArrows,
  Landmark,
  Banknote,
  PieChart,
  ShieldCheck,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SAVINGS_PRODUCT_GUIDES, SAVINGS_PRODUCT_SLUGS } from '@/data/savingsProductGuides';
import siteCopy from '@/data/siteCopy';
import SocialFooterIcons from '@/components/social/SocialFooterIcons';
import FooterTrustBadges from '@/components/footer/FooterTrustBadges';
import FooterBenefitsBand from '@/components/footer/FooterBenefitsBand';
import BrandLogo from '@/components/BrandLogo';
import { openCookieSettings } from '@/lib/visitorGate';

const { footer: footerCopy, footerNav } = siteCopy;

const footerLink =
  'inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-bank-text-strong transition-colors duration-200 hover:text-bank-primary-strong';

const productIcons = {
  '/comparison': GitCompareArrows,
  '/partner-banks': Landmark,
  '/kredit': Banknote,
  '/handeln': CandlestickChart,
  '/spezial-aif': PieChart,
  '/fonds-grundlagen': BookOpen,
};

const productNav = footerNav.products.map((item) => ({
  ...item,
  Icon: productIcons[item.to],
}));

const savingsNav = SAVINGS_PRODUCT_SLUGS.map((slug) => ({
  to: `/produkte/${slug}`,
  label: SAVINGS_PRODUCT_GUIDES[slug].title,
}));

const colHead =
  'mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" data-hide-sticky-cta className="relative isolate">
      <FooterBenefitsBand />

      <div className="relative isolate overflow-hidden bg-bank-panel text-bank-text">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-border to-transparent"
        />

        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
          {/* Brand row — compact */}
          <div className="grid gap-10 border-b border-bank-border pb-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <Link to="/" className="inline-block max-w-full">
                <BrandLogo
                  imgClassName="h-11 w-auto max-w-[min(100%,26rem)] object-contain object-left sm:h-14 sm:max-w-[min(100%,30rem)]"
                />
              </Link>
              <p className="mt-6 max-w-lg text-xl font-semibold leading-snug text-bank-text sm:text-2xl">
                {footerCopy.sloganMain}{' '}
                <span className="text-bank-primary-strong">{footerCopy.sloganAccent}</span>
              </p>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-bank-text-muted">
                {footerCopy.lede}
              </p>
              <SocialFooterIcons className="mt-6" />
            </div>

            <div className="flex flex-col gap-6 lg:col-span-5 lg:items-end lg:justify-between">
              <FooterTrustBadges className="w-full lg:justify-end" />
              <div className="inline-flex items-center gap-2.5 rounded-md border border-bank-border bg-white px-4 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-bank-primary" strokeWidth={1.5} />
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-bank-primary-strong">
                  {footerCopy.securityBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Link grid — compact 4-col */}
          <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-3">
              <p className={colHead}>Produkte</p>
              <ul className="space-y-3">
                {productNav.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <Link to={to} className={footerLink}>
                      {Icon && (
                        <Icon
                          className="h-4 w-4 shrink-0 text-bank-primary/80"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <p className={colHead}>Sparen</p>
              <ul className="space-y-3">
                {savingsNav.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className={footerLink}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <p className={colHead}>Unternehmen</p>
              <ul className="space-y-3">
                {footerNav.company.map((item) => (
                  <li key={item.to}>
                    {item.accent ? (
                      <Link
                        to={item.to}
                        className="group flex cursor-pointer flex-col gap-0.5 transition-colors hover:opacity-95"
                      >
                        <span className="text-[14px] font-medium text-bank-text">{item.label}</span>
                        {item.desc && (
                          <span className="text-[12px] text-bank-text-muted">{item.desc}</span>
                        )}
                      </Link>
                    ) : item.to === '/news' ? (
                      <Link to={item.to} className={footerLink}>
                        <Newspaper
                          className="h-4 w-4 shrink-0 text-bank-primary/80"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        {item.label}
                      </Link>
                    ) : (
                      <Link to={item.to} className={footerLink}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <p className={colHead}>Rechtliches</p>
              <ul className="space-y-3">
                {footerNav.legal.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className={footerLink}>
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={openCookieSettings} className={footerLink}>
                    Cookie-Einstellungen
                  </button>
                </li>
              </ul>
            </div>

            <div className="min-w-0 lg:col-span-2">
              <h3
                className={cn(
                  'mb-4 w-fit border-b border-bank-border pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-bank-primary-strong',
                )}
              >
                {footerCopy.regulatedHeading}
              </h3>
              <Link
                to="/sicherheit-regulierung"
                className={footerLink}
                title="Sicherheit & Regulierung"
              >
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-bank-primary/80"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Sicherheit & Regulierung
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-bank-border bg-white text-bank-text-muted">
        <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-8 lg:px-12">
          <p className="text-center text-[12px] text-bank-text-soft" data-testid="footer-operator-line">
            EssenceInvest ist ein Angebot der{' '}
            <Link
              to="/legal/impressum"
              className="text-bank-text-strong underline-offset-2 hover:text-bank-primary-strong hover:underline"
            >
              Fröhlich Vermögensberatung GmbH
            </Link>
            {' '}· Bösgrunder Weg 62, 55543 Bad Kreuznach · Amtsgericht Bad Kreuznach HRB 23436.
          </p>
          <p className="mt-2 text-center text-[12px] text-bank-text-soft">
            {footerCopy.copyright(year)}
          </p>
          <p className="mx-auto mt-4 max-w-5xl text-center text-[11px] leading-relaxed text-bank-text-soft sm:mt-5 sm:text-[12px]">
            Gewisse Dienstleistungen und Produkte der Fröhlich Vermögensberatung GmbH sind Personen mit
            Wohnsitz in oder Staatsangehörigen von bestimmten Ländern nicht zugänglich. Der Website-Benutzer wird
            deshalb ersucht, die für diese Website geltenden{' '}
            <Link to="/legal/terms" className="text-bank-text-strong underline-offset-2 hover:text-bank-primary-strong hover:underline">
              Nutzungsbedingungen
            </Link>{' '}
            zu konsultieren und für Informationen über Produkte und Dienstleistungen in seinem Land Kontakt mit uns
            (
            <Link to="/contact" className="text-bank-text-strong underline-offset-2 hover:text-bank-primary-strong hover:underline">
              Kontakt
            </Link>
            ) aufzunehmen oder den{' '}
            <Link to="/newsletter" className="text-bank-text-strong underline-offset-2 hover:text-bank-primary-strong hover:underline" data-testid="footer-newsletter-link">
              wöchentlichen Finanznachrichten-Digest
            </Link>{' '}
            zu abonnieren. Überdies werden die Nutzer gebeten, sich bei Fragen zur Interpretation der
            Nutzungsbedingungen an ihren Rechts-/Steuerberater zu wenden.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

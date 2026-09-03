import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import BankingHero from '@/components/BankingHero';
import HomeNewsMarketShell from '@/components/home/HomeNewsMarketShell';
import HomePostHero from '@/components/home/HomePostHero';
import HomeSavingsFaqSection from '@/components/home/HomeSavingsFaqSection';
import HomeTestimonials from '@/components/home/HomeTestimonials';
import HomeTrustLine from '@/components/home/HomeTrustLine';
import HomePlatformShowcase from '@/components/home/HomePlatformShowcase';
import HomeGroessereVermoegenBand from '@/components/home/HomeGroessereVermoegenBand';
import HomeCreditOffersSection from '@/components/home/HomeCreditOffersSection';
import HomeSavingsOffersSection from '@/components/home/HomeSavingsOffersSection';
import { mapCreditOffersForCarousel } from '@/lib/creditOfferDisplay';
import StockResearchSection from '@/components/home/StockResearchSection';
import MarktMonitor from '@/components/home/MarktMonitor';
import DeutschlandFokus from '@/components/home/DeutschlandFokus';
import DividendenBlick from '@/components/home/DividendenBlick';
import HomeProductWizardSection from '@/components/home/HomeProductWizardSection';
import HomeFinanceNews from '@/components/home/HomeFinanceNews';
import NewsletterSignup from '@/components/home/NewsletterSignup';
import ProductInquiryWizard from '@/components/home/ProductInquiryWizard';
import ProductInquiryStickyCta from '@/components/home/ProductInquiryStickyCta';
import SpecialAifOverview from '@/components/home/SpecialAifOverview';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import Eyebrow from '@/components/editorial/Eyebrow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { supabase } from '@/lib/supabase';
import { getOfferRatingValue } from '@/lib/offerRating';
import { ArrowRight } from 'lucide-react';
import siteCopy from '@/data/siteCopy';
import siteImages from '@/data/siteImages';

const EASE = [0.22, 1, 0.36, 1];
const { homeCta: ctaCopy, brandSlogan } = siteCopy;

const Home = () => {
  const [creditOffers, setCreditOffers] = useState([]);
  const [savingsOffers, setSavingsOffers] = useState([]);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryProduct, setInquiryProduct] = useState(
    /** @type {'aktien' | 'anleihen' | 'fonds' | 'tagesgeld' | 'festgeld' | 'flexgeld' | null} */ (null),
  );
  const [inquiryTopic, setInquiryTopic] = useState(/** @type {string | null} */ (null));
  const [inquiryTopicSlug, setInquiryTopicSlug] = useState(/** @type {string | null} */ (null));
  const prefersReduced = useReducedMotion();
  const location = useLocation();

  const openProductInquiry = (key) => {
    setInquiryProduct(key);
    setInquiryTopic(null);
    setInquiryTopicSlug(null);
    setInquiryOpen(true);
  };

  useEffect(() => {
    const run = () => {
      fetchCreditOffers();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/' || location.hash !== '#produkt-uberblick') return;
    const el = document.getElementById('produkt-uberblick');
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname, location.hash, prefersReduced]);

  // Session 80.21c — Deep-Link Handler for Strategy-CTA:
  // `/?openInquiry=1&topic=Value+Investing&topicSlug=value-investing&product=aktien#home-product-wizard`
  // opens the Product-Inquiry-Wizard in „Gesprächsanfrage"-mode with topic prefilled.
  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams(location.search);
    if (params.get('openInquiry') !== '1') return;
    const validProducts = new Set(['aktien', 'anleihen', 'fonds', 'tagesgeld', 'festgeld', 'flexgeld']);
    const rawProduct = params.get('product') || 'fonds';
    const productKey = validProducts.has(rawProduct) ? rawProduct : 'fonds';
    const topicTitle = (params.get('topic') || '').trim();
    const topicSlug = (params.get('topicSlug') || '').trim();
    setInquiryProduct(productKey);
    setInquiryTopic(topicTitle || null);
    setInquiryTopicSlug(topicSlug || null);
    setInquiryOpen(true);
    // Scroll into view + strip the query params from URL so a page reload
    // won't re-trigger the modal.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById('home-product-wizard');
      if (el) el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      try {
        window.history.replaceState({}, '', '/#home-product-wizard');
      } catch {
        /* history API not available — non-fatal */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.search, prefersReduced]);

  const fetchCreditOffers = async () => {
    try {
      const [creditRes, savingsRes] = await Promise.all([
        supabase
          .from('credit_offers')
          .select('*, banks(id, name, country, logo_url, founded_year, regulator_name)')
          .eq('is_active', true),
        supabase
          .from('savings_offers')
          .select('*, banks(id, name, country, logo_url, founded_year, regulator_name)')
          .eq('is_active', true),
      ]);

      if (creditRes.error) throw creditRes.error;
      if (savingsRes.error) throw savingsRes.error;

      const savingsByBank = new Map();
      (savingsRes.data || []).forEach((item) => {
        if (!item.bank_id) return;
        const current = savingsByBank.get(item.bank_id);
        const nextRate = Number(item.interest_rate || 0);
        if (!current || nextRate > Number(current.interest_rate || 0)) {
          savingsByBank.set(item.bank_id, item);
        }
      });

      const enriched = (creditRes.data || []).map((offer) => {
        const savings = savingsByBank.get(offer.bank_id);
        const ratingFromSavings = savings
          ? getOfferRatingValue({
              bank_name: savings.banks?.name || offer.banks?.name || '',
              interest_rate: Number(savings.interest_rate || 0),
            })
          : null;
        return {
          ...offer,
          rating_value: ratingFromSavings ?? offer.rating_value ?? null,
        };
      });

      setCreditOffers(mapCreditOffersForCarousel(enriched));

      // Sparangebote fürs Home-Karussell: normalisieren wie /comparison-Konsumenten erwarten.
      const savingsForCarousel = (savingsRes.data || [])
        .filter((o) => o.bank_id && o.banks?.name)
        .map((o) => ({
          ...o,
          bank_name: o.banks?.name,
          country: o.banks?.country || o.country,
          logo_url: o.banks?.logo_url,
          founded_year: o.banks?.founded_year,
          regulator_name: o.banks?.regulator_name,
          rating_value: getOfferRatingValue({
            bank_name: o.banks?.name || '',
            interest_rate: Number(o.interest_rate || 0),
          }),
        }))
        .sort((a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0))
        .slice(0, 12);
      setSavingsOffers(savingsForCarousel);
    } catch (error) {
      console.error('Failed to fetch credit offers:', error);
    }
  };

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: prefersReduced ? 0 : 0.7, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-bank-bg">
      <PageMeta
        title={brandSlogan.title}
        description={brandSlogan.description}
        path="/"
      />
      <ProductInquiryWizard
        open={inquiryOpen}
        onOpenChange={(o) => {
          setInquiryOpen(o);
          if (!o) {
            setInquiryProduct(null);
            setInquiryTopic(null);
            setInquiryTopicSlug(null);
          }
        }}
        product={inquiryProduct}
        topic={inquiryTopic}
        topicSlug={inquiryTopicSlug}
      />
      <ProductInquiryStickyCta onOpenWizard={openProductInquiry} />
      <BankingHero />

      {/* ── News-Vorschau (kompakt, direkt unter dem Hero) ─────────────── */}
      <HomeNewsMarketShell />

      <HomeTrustLine />

      <HomePlatformShowcase />

      {/* ── Größere Vermögen — Sekundär-Einstieg (Session 80.85) ────── */}
      <HomeGroessereVermoegenBand />

      {/* ── Sparangebote (Cover-Flow, Daten aus savings_offers) ───────── */}
      <HomeSavingsOffersSection offers={savingsOffers} />

      {/* ── Kreditangebote (nach Anfrage, Daten wie /kredit) ─────────── */}
      <HomeCreditOffersSection offers={creditOffers} />

      {/* ── FAQ / Wissenscenter (inkl. integriertem Handeln-Teaser) ─── */}
      <HomeSavingsFaqSection />

      <HomeTestimonials />

      {/* ── Produktüberblick (Anleihen, Aktien, Kredit) ───────────────── */}
      <HomePostHero />

      <SpecialAifOverview />

      {/* ── Aktien mit Potenzial — Editorial Research-Bereich (Session 78.2) ── */}
      <StockResearchSection />

      {/* ── Deutschland im Fokus — Investment Cockpit Phase 3 (Session 80.99) ─ */}
      <DeutschlandFokus />

      {/* ── Dividenden im Blick — Investment Cockpit Phase 3 (Session 80.99) ── */}
      <DividendenBlick />

      {/* ── Märkte im Überblick — Investment-Marktmonitor (Session 80.97) ─── */}
      <MarktMonitor />

      {/* ── Große Inline-Produkt-Section (Session 72) ─────────────────── */}
      <HomeProductWizardSection onOpenWizard={openProductInquiry} />

      {/* ── Aktuelle Finanznachrichten (Live-Sync, mindestens stündlich) ─ */}
      <HomeFinanceNews />

      {/* ── Newsletter-Digest ──────────────────────────────────────────── */}
      <NewsletterSignup />

      {/* ── Bonus CTA — light private-banking accent ─────────────────────── */}
      <section
        className="relative overflow-hidden border-t border-bank-border bg-bank-mint py-20 sm:py-24"
        data-testid="bonus-cta-section"
      >
        <img
          src={siteImages.home.ctaBonusStrip}
          alt={siteImages.home.ctaBonusAlt}
          loading="lazy"
          decoding="async"
          width={1000}
          height={667}
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[min(52%,640px)] object-cover object-left opacity-[0.14] lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[min(52%,640px)] bg-gradient-to-r from-bank-mint via-bank-mint/94 to-transparent lg:block"
        />
        <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-10 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="flex max-w-2xl items-center gap-5 sm:gap-7">
            <div className="hidden h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center border border-bank-border bg-white p-1.5 shadow-sm sm:flex lg:h-[6.25rem] lg:w-[6.25rem]">
              <img
                src={siteImages.icons.bonusGift}
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-contain"
                decoding="async"
              />
            </div>
            <div>
              <Eyebrow>
                {ctaCopy.bonus.eyebrow}
              </Eyebrow>
              <h2 className="mt-3 text-display-sm font-semibold text-bank-text">
                {ctaCopy.bonus.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-bank-text-muted">
                {ctaCopy.bonus.lede}{' '}
                Bis zu{' '}
                <span className="rate-figure text-bank-primary-strong font-semibold" data-numeric>
                  300&nbsp;€
                </span>
                &nbsp;Neukundenbonus.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="xl"
            className="shrink-0 focus-visible:ring-offset-bank-mint"
            data-testid="bonus-cta-compare-btn"
            onClick={() => openProductInquiry('tagesgeld')}
          >
            {ctaCopy.bonus.button}
            <ArrowRight className="ml-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { fetchActiveInvestmentTopics } from '@/services/investmentTopics';
import { trackInvestmentEvent, InvestmentEvents } from '@/lib/investmentAnalytics';

const STORAGE_PREFIX = 'invtopic:dismissed:';
const SESSION_SHOWN_KEY = 'invtopic:shown_in_session';

const routeAllowed = (topic, path) => {
  const p = (path || '/').toLowerCase();
  const excluded = topic.excluded_routes || [];
  for (const ex of excluded) {
    const exL = (ex || '').toLowerCase();
    if (!exL) continue;
    if (p === exL || p.startsWith(exL.endsWith('/') ? exL : exL + '/')) return false;
    // Präfix-Match für Routen wie /admin, /dashboard
    if (p.startsWith(exL + '/') || p === exL) return false;
  }
  const allowed = topic.allowed_routes || [];
  if (allowed.length === 0) return true;
  return allowed.some((a) => {
    const aL = (a || '').toLowerCase();
    return p === aL || p.startsWith(aL + '/');
  });
};

const isDismissedRecently = (slug, cooldownDays) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slug);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!ts) return false;
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return days < (cooldownDays || 7);
  } catch { return false; }
};

const markDismissed = (slug) => {
  try { localStorage.setItem(STORAGE_PREFIX + slug, String(Date.now())); } catch {}
};

const alreadyShownThisSession = () => {
  try { return sessionStorage.getItem(SESSION_SHOWN_KEY) === '1'; } catch { return false; }
};

const markShownThisSession = () => {
  try { sessionStorage.setItem(SESSION_SHOWN_KEY, '1'); } catch {}
};

/**
 * Investment-Themen-Teaser (sitewide).
 * Erscheint nach `display_delay_ms` ODER `scroll_threshold_pct`, je nachdem
 * was zuerst eintritt. Max. 1 Teaser pro Session. Cooldown per LocalStorage.
 */
const InvestmentTopicTeaser = () => {
  const location = useLocation();
  const [topic, setTopic] = useState(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef(null);
  const scrollHandlerRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Topics laden (einmalig)
  useEffect(() => {
    let alive = true;
    fetchActiveInvestmentTopics()
      .then((items) => {
        if (!alive || !items?.length) return;
        setTopic(items[0]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const canShowOnRoute = useCallback(() => {
    if (!topic) return false;
    if (alreadyShownThisSession()) return false;
    if (isDismissedRecently(topic.slug, topic.cooldown_days)) return false;
    return routeAllowed(topic, location.pathname);
  }, [topic, location.pathname]);

  // Delay- und Scroll-Trigger
  useEffect(() => {
    if (!topic) return;
    if (!canShowOnRoute()) return;

    const trigger = () => {
      if (visible) return;
      if (!canShowOnRoute()) return;
      setVisible(true);
      setMounted(true);
      markShownThisSession();
      trackInvestmentEvent(InvestmentEvents.TEASER_VIEW, {
        topic: topic.headline, topic_slug: topic.slug, route: location.pathname,
      });
    };

    // Delay
    const delay = Math.max(2000, Number(topic.display_delay_ms) || 35000);
    timerRef.current = setTimeout(trigger, delay);

    // Scroll threshold
    const thresholdPct = Math.max(5, Math.min(95, Number(topic.scroll_threshold_pct) || 50));
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = (window.scrollY || 0);
      const height = Math.max(1, (doc.scrollHeight || 0) - (window.innerHeight || 0));
      const pct = (scrolled / height) * 100;
      if (pct >= thresholdPct) trigger();
    };
    scrollHandlerRef.current = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (scrollHandlerRef.current) window.removeEventListener('scroll', scrollHandlerRef.current);
    };
  }, [topic, location.pathname, canShowOnRoute, visible]);

  // Route-Wechsel: falls Teaser sichtbar, aber neue Route excluded → schließen
  useEffect(() => {
    if (visible && topic && !routeAllowed(topic, location.pathname)) {
      setVisible(false);
    }
  }, [location.pathname, topic, visible]);

  // Fokus auf Close-Button, wenn geöffnet (Accessibility)
  useEffect(() => {
    if (visible && closeBtnRef.current) {
      try { closeBtnRef.current.focus({ preventScroll: true }); } catch {}
    }
  }, [visible]);

  // ESC schließt
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    if (topic) markDismissed(topic.slug);
    setVisible(false);
  };

  const handleClick = () => {
    if (topic) markDismissed(topic.slug); // nach Klick nicht sofort wieder zeigen
    trackInvestmentEvent(InvestmentEvents.TEASER_CLICK, {
      topic: topic?.headline, topic_slug: topic?.slug, placement: 'floating',
    });
    setVisible(false);
  };

  if (!mounted || !topic) return null;

  return (
    <div
      role="complementary"
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-3 pb-3 transition-opacity duration-300 sm:inset-auto sm:bottom-6 sm:right-6 sm:pb-0 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        role="dialog"
        aria-labelledby="invtopic-teaser-headline"
        aria-describedby="invtopic-teaser-body"
        data-testid="invtopic-teaser"
        className={`pointer-events-auto w-full max-w-md border border-bank-border bg-white shadow-[0_18px_38px_-14px_rgba(15,25,45,0.28)] transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-4'
        }`}
      >
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            data-testid="invtopic-teaser-close"
            aria-label="Hinweis schließen"
            className="absolute right-2 top-2 rounded-sm p-1.5 text-bank-text-muted transition-colors hover:bg-bank-bg hover:text-bank-text focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
            {topic.category}
          </p>
          <h3
            id="invtopic-teaser-headline"
            className="mt-2 font-serif text-[20px] leading-snug text-bank-text"
          >
            {topic.headline}
          </h3>
          <p
            id="invtopic-teaser-body"
            className="mt-2.5 text-[13.5px] leading-relaxed text-bank-text-muted"
          >
            {topic.teaser}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <Link
              to={topic.target_url}
              onClick={handleClick}
              data-testid="invtopic-teaser-cta"
              className="inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary transition-colors hover:text-bank-primary/80"
            >
              Mehr erfahren <ArrowUpRight size={14} strokeWidth={1.7} />
            </Link>
            <button
              type="button"
              onClick={handleClose}
              className="text-[12px] uppercase tracking-[0.16em] text-bank-text-muted transition-colors hover:text-bank-text"
            >
              Schließen
            </button>
          </div>
          {topic.compliance_label && (
            <p className="mt-4 border-t border-bank-border pt-2.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-text-muted/80">
              {topic.compliance_label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentTopicTeaser;

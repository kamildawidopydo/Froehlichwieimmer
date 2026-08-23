/**
 * Investment-Funnel Event-Tracker.
 * Safe no-op when kein Analytics-Provider konfiguriert ist.
 * Beachtet bestehende Consent-Signale (window.__consent_analytics__).
 */

const isBrowser = typeof window !== 'undefined';

const consentAllows = () => {
  if (!isBrowser) return false;
  // Respekt gegenüber vorhandenem Consent-Manager, wenn er das Flag setzt
  if (typeof window.__consent_analytics__ === 'boolean') {
    return window.__consent_analytics__;
  }
  return true; // Standard: erlauben, wenn kein expliziter Opt-out existiert
};

export function trackInvestmentEvent(name, props = {}) {
  if (!isBrowser) return;
  if (!consentAllows()) return;
  try {
    // Keine PII in Analytics — Payload gezielt einschränken.
    const safe = {};
    ['topic', 'topic_slug', 'placement', 'route', 'source_page'].forEach((k) => {
      if (props[k] != null) safe[k] = String(props[k]).slice(0, 120);
    });
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, safe);
    }
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({ event: name, ...safe });
    }
    if (typeof window.plausible === 'function') {
      window.plausible(name, { props: safe });
    }
  } catch {
    /* ignore */
  }
}

export const InvestmentEvents = {
  TEASER_VIEW: 'investment_teaser_view',
  TEASER_CLICK: 'investment_teaser_click',
  TOPIC_PAGE_VIEW: 'investment_topic_page_view',
  TOPIC_CTA_CLICK: 'investment_topic_cta_click',
  EXISTING_CUSTOMER_CLICK: 'investment_existing_customer_click',
  APPOINTMENT_START: 'investment_appointment_start',
  APPOINTMENT_SUBMIT: 'investment_appointment_submit',
  TOPICS_OVERVIEW_VIEW: 'investment_topics_overview_view',
  TOPIC_CARD_CLICK: 'investment_topic_card_click',
  RELATED_TOPIC_CLICK: 'investment_related_topic_click',
};

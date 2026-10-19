/**
 * Lightweight UX event hooks for dashboard simplification rollout (Phase 5).
 * Wire to your analytics provider when ready — safe no-op by default.
 */

const ENABLED = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

export function trackDashboardEvent(name, props = {}) {
  if (!ENABLED) return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, props);
    }
  } catch {
    /* ignore */
  }
}

export const DashboardEvents = {
  ONBOARDING_COMPLETED: 'dashboard_onboarding_completed',
  ONBOARDING_SKIPPED: 'dashboard_onboarding_skipped',
  WIDGET_SETTINGS_OPEN: 'dashboard_widget_settings_open',
  VERMOEGEN_SUBNAV_CLICK: 'dashboard_vermoegen_subnav_click',
  SIDEBAR_VERMOEGEN_EXPAND: 'dashboard_sidebar_vermoegen_expand',
};

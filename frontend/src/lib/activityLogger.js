/**
 * Session 82.92: Activity-Logger auf No-Op neutralisiert (Supabase-Cutover).
 * Session 82.94: Doppelte `error`-Deklaration entfernt (Compile-Blocker).
 *
 * `logEvent` bleibt aus Kompatibilitätsgründen als Export erhalten, führt
 * jedoch keine Server-Persistierung mehr aus. Ein FastAPI-basierter
 * Activity-Log-Endpoint kann später additiv angebunden werden — bis dahin
 * ist das Verhalten still: alle Aufrufer laufen unverändert weiter.
 */
export async function logEvent(_eventType, _payload = null, _options = {}) {
  // No-op. Keine externen Writes.
  return;
}

export const EVENTS = {
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  FAVORITE_ADD: 'favorite_add',
  FAVORITE_REMOVE: 'favorite_remove',
  COMPARISON_RUN: 'comparison_run',
  APPLICATION_SUBMIT: 'application_submit',
  OFFER_INTEREST_SUBMIT: 'offer_interest_submit',
  PRODUCT_INQUIRY_SUBMIT: 'product_inquiry_submit',
  PROFILE_UPDATE: 'profile_update',
  CONTRACT_VIEW: 'contract_view',
  PAGE_VIEW: 'page_view',
  OFFER_REVIEW_SUBMIT: 'offer_review_submit',
  OFFER_REVIEW_GUEST_SUBMIT: 'offer_review_guest_submit',
  OFFER_REVIEW_APPROVE: 'offer_review_approve',
  OFFER_REVIEW_REJECT: 'offer_review_reject',
  OFFER_REVIEW_DELETE: 'offer_review_delete',
};

/**
 * Schreibt Nutzeraktivitäten in user_activity_log.
 * RLS: authenticated/anon dürfen eigene Zeilen einfügen; select nur Admin.
 * Fehler werden still geloggt — der Logger darf keinen Ablauf unterbrechen.
 */
export async function logEvent(eventType, payload = null, options = {}) {
  try {
    const data = { session: null, user: null }; const error = null; // 82.92 auth via JWT-Cookie
    const session = sessionData?.session ?? null;

    let userId = options.userId ?? null;
    if (userId === null && session?.user?.id) {
      userId = session.user.id;
    }

    // RLS: user_id IS NULL OR user_id = auth.uid()
    if (!session) {
      if (userId !== null) return;
    } else if (userId !== null && userId !== session.user.id) {
      userId = session.user.id;
    }

    const { error } = Promise.resolve({data: null, error: null}); // 82.92 neutralized (DATA_SOURCE_MISSING)

    if (error) {
      // Auth/session race or expired JWT — skip noisy console output.
      if (error.code === 'PGRST301' || String(error.message || '').includes('JWT')) return;
      if (typeof console !== 'undefined') {
        console.warn('[activityLogger] failed:', eventType, error.message);
      }
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[activityLogger] failed:', eventType, err?.message || err);
    }
  }
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

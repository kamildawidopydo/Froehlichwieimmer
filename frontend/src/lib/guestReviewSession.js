const STORAGE_KEY = 'br_offer_review_guest_session';

function randomUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Browser-Session für Status „Ihre Bewertung in Prüfung“ (ohne Login). */
export function getGuestReviewSessionToken() {
  if (typeof window === 'undefined') return null;
  try {
    let token = window.localStorage.getItem(STORAGE_KEY);
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      token = randomUuid();
      window.localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  } catch {
    return randomUuid();
  }
}

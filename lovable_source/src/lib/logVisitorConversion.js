/**
 * Decoupled conversion hook — dispatches a DOM event consumed by visitorTracker.
 * Kept import-free to avoid circular deps (AuthContext ↔ visitorTracker).
 */
export function logVisitorConversion(goal, meta = {}) {
  if (typeof window === 'undefined' || !goal) return;
  window.dispatchEvent(
    new CustomEvent('br-visitor-conversion', {
      detail: { goal, meta: meta || {} },
    }),
  );
}

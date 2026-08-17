export const formatCount = (n) => n.toLocaleString('de-DE');

/** Top-level comments plus nested replies (matches rendered thread). */
export const countPostComments = (comments) =>
  (comments ?? []).reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);

export default formatCount;

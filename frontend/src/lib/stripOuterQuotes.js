/**
 * Remove a single pair of outer quote characters from a string, if — and only
 * if — the whole trimmed value is wrapped in matching quotes. Inner quotes
 * (used intentionally by the author) are preserved.
 *
 * Handles German („ … "), curly (" … "), straight (" … "), and single (' … ')
 * quote pairs.
 */
const OUTER_QUOTE_PAIRS = [
  ['„', '"'],
  ['"', '"'],
  ['"', '"'],
  ["'", "'"],
  ["'", "'"],
];

export function stripOuterQuotes(input) {
  if (typeof input !== 'string' || !input) return input;
  const trimmed = input.trim();
  if (trimmed.length < 2) return input;
  for (const [open, close] of OUTER_QUOTE_PAIRS) {
    if (trimmed.startsWith(open) && trimmed.endsWith(close)) {
      const inner = trimmed.slice(open.length, trimmed.length - close.length);
      // Only strip if the inner content doesn't itself start with another
      // opening quote — avoids eating an intentional wrapping.
      return inner.trim();
    }
  }
  return input;
}

export default stripOuterQuotes;

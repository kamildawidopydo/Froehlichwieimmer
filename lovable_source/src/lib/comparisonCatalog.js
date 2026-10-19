/** Banks excluded from Sparvergleich (/comparison) and Partnerbanken listings. */
export const EXCLUDED_SAVINGS_BANK_SLUGS = new Set(['ing-diba']);

export function isExcludedSavingsBankSlug(slug) {
  return EXCLUDED_SAVINGS_BANK_SLUGS.has(String(slug || '').trim());
}

/**
 * Re-export FAQ from central siteCopy (Phase 5).
 */
import siteCopy from '@/data/siteCopy';

export const HOME_FAQ_CATEGORIES = siteCopy.faq.categories;
export const HOME_FAQ_ITEMS = siteCopy.faq.items;
export const HOME_FAQ_PREVIEW_IDS = siteCopy.faq.previewIds;

export function getHomeFaqByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return HOME_FAQ_ITEMS;
  return HOME_FAQ_ITEMS.filter((item) => item.category === categoryId);
}

export const HOME_SAVINGS_INQUIRY_ID = 'home-product-wizard';

export function scrollToHomeSavingsInquiry() {
  const el = document.getElementById(HOME_SAVINGS_INQUIRY_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

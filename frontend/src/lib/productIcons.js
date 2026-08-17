import {
  CalendarClock,
  Wallet,
  LockOpen,
  ChartCandlestick,
  FileChartLine,
  Rocket,
} from 'lucide-react';

/** Canonical Lucide icons for Vermögen product types — single source of truth. */
export const PRODUCT_ICONS = {
  festgeld: CalendarClock,
  tagesgeld: Wallet,
  flexgeld: LockOpen,
  aktien: ChartCandlestick,
  anleihen: FileChartLine,
  ipo: Rocket,
};

export const SAVINGS_PRODUCT_SLUGS = /** @type {const} */ (['festgeld', 'tagesgeld', 'flexgeld']);

export const VERMOEGEN_PRODUCT_SLUGS = /** @type {const} */ (
  ['festgeld', 'tagesgeld', 'flexgeld', 'anleihen', 'aktien', 'ipo']
);

/** Tailwind text color per product (public + dashboard). */
export const PRODUCT_ICON_ACCENT = {
  festgeld: 'text-bank-primary',
  tagesgeld: 'text-bank-accent',
  flexgeld: 'text-bank-gold',
  aktien: 'text-bank-primary',
  anleihen: 'text-bank-primary',
  ipo: 'text-bank-primary',
};

export function getProductIcon(product) {
  if (!product) return null;
  const key = String(product).toLowerCase();
  return PRODUCT_ICONS[key] ?? null;
}

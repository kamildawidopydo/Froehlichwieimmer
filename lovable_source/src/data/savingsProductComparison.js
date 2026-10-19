import { formatComparisonMinDepositLabel } from '@/lib/comparisonDisplay';

const COMPARISON_MIN_DEPOSIT_MATRIX = formatComparisonMinDepositLabel();

/** Gemeinsame Produktmatrix für Leitfaden-Seiten (Orientierung: Finanztip, Raisin, BaFin). */
export const SAVINGS_PRODUCT_MATRIX = {
  headers: ['Merkmal', 'Tagesgeld', 'Flexgeld', 'Festgeld'],
  rows: [
    {
      label: 'Verfügbarkeit',
      tagesgeld: 'Täglich',
      flexgeld: 'Nach Kündigungsfrist',
      festgeld: 'Am Laufzeitende',
    },
    {
      label: 'Zinssatz',
      tagesgeld: 'Variabel',
      flexgeld: 'Meist fest oder variabel',
      festgeld: 'Fest über Laufzeit',
    },
    {
      label: 'Laufzeit',
      tagesgeld: 'Keine',
      flexgeld: 'Flexibel',
      festgeld: 'z. B. 3–120 Monate',
    },
    {
      label: 'Planbarkeit',
      tagesgeld: 'Gering',
      flexgeld: 'Mittel',
      festgeld: 'Hoch',
    },
    {
      label: 'Typische Rendite',
      tagesgeld: 'Niedriger, liquid',
      flexgeld: 'Mittel',
      festgeld: 'Oft höher',
    },
    {
      label: 'Einlagensicherung',
      tagesgeld: 'bis 100.000 €',
      flexgeld: 'bis 100.000 €',
      festgeld: 'bis 100.000 €',
      numeric: true,
    },
    {
      label: 'Mindestanlage',
      tagesgeld: COMPARISON_MIN_DEPOSIT_MATRIX,
      flexgeld: COMPARISON_MIN_DEPOSIT_MATRIX,
      festgeld: COMPARISON_MIN_DEPOSIT_MATRIX,
      numeric: true,
    },
  ],
};

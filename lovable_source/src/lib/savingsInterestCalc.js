/** Standard-Abgeltungsteuer inkl. Solidaritätszuschlag (ohne Kirchensteuer). */
export const ABGELTUNG_TAX_RATE = 0.26375;

export const DEFAULT_SAVER_ALLOWANCE = 1000;

/**
 * Einfache Verzinsung (typisch Festgeld: Zinsen am Laufzeitende).
 * @param {{ principal: number, annualRatePercent: number, months: number }}
 */
export function calcSimpleInterest({ principal, annualRatePercent, months }) {
  const rate = annualRatePercent / 100;
  const years = months / 12;
  const interest = principal * rate * years;
  const final = principal + interest;
  return {
    interest: round2(interest),
    final: round2(final),
  };
}

/**
 * Jährlicher Zinseszins (z. B. jährliche Gutschrift mit Wiederanlage).
 * @param {{ principal: number, annualRatePercent: number, months: number }}
 */
export function calcCompoundYearly({ principal, annualRatePercent, months }) {
  const rate = annualRatePercent / 100;
  const years = months / 12;
  const final = principal * (1 + rate) ** years;
  const interest = final - principal;
  return {
    interest: round2(interest),
    final: round2(final),
  };
}

/**
 * @param {'simple' | 'compound'} mode
 */
export function calcInterest({ principal, annualRatePercent, months, mode }) {
  if (mode === 'compound') {
    return calcCompoundYearly({ principal, annualRatePercent, months });
  }
  return calcSimpleInterest({ principal, annualRatePercent, months });
}

/**
 * @param {{ grossInterest: number, allowance?: number, taxRate?: number }}
 */
export function applyWithholdingTax({
  grossInterest,
  allowance = 0,
  taxRate = ABGELTUNG_TAX_RATE,
}) {
  const taxable = Math.max(0, grossInterest - allowance);
  const tax = round2(taxable * taxRate);
  const netInterest = round2(grossInterest - tax);
  return { tax, netInterest, taxable: round2(taxable) };
}

/**
 * Zeitverlauf für Chart (Start + je volles Jahr bis Laufzeitende).
 * @param {{ principal: number, annualRatePercent: number, months: number, mode: 'simple' | 'compound', tax?: { enabled: boolean, allowance?: number, taxRate?: number } }}
 */
export function buildProjectionSeries({
  principal,
  annualRatePercent,
  months,
  mode,
  tax,
}) {
  const points = [];
  const addPoint = (label, m) => {
    const { interest, final } = calcInterest({
      principal,
      annualRatePercent,
      months: m,
      mode,
    });
    let netFinal = final;
    let netInterest = interest;
    let taxAmount = 0;
    if (tax?.enabled && m > 0) {
      const applied = applyWithholdingTax({
        grossInterest: interest,
        allowance: tax.allowance ?? 0,
        taxRate: tax.taxRate ?? ABGELTUNG_TAX_RATE,
      });
      netInterest = applied.netInterest;
      taxAmount = applied.tax;
      netFinal = round2(principal + netInterest);
    }
    points.push({
      label,
      months: m,
      balance: final,
      interest,
      netBalance: netFinal,
      netInterest,
      tax: taxAmount,
    });
  };

  addPoint('Start', 0);
  const fullYears = Math.floor(months / 12);
  const remainder = months % 12;

  for (let y = 1; y <= fullYears; y += 1) {
    addPoint(`Jahr ${y}`, y * 12);
  }
  if (remainder > 0) {
    addPoint(`${months} Mon.`, months);
  } else if (fullYears === 0 && months > 0) {
    addPoint(`${months} Mon.`, months);
  }

  return points;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

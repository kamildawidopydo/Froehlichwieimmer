/** Einheitliche Mindestanlage — /comparison und alle daran angebundenen Oberflächen. */
export const COMPARISON_MIN_DEPOSIT_EUR = 10_000;

export function formatComparisonMinDeposit() {
  return COMPARISON_MIN_DEPOSIT_EUR.toLocaleString('de-DE');
}

/** Karten & Tabellen: „10.000 €“ */
export function formatComparisonMinDepositWithCurrency() {
  return `${formatComparisonMinDeposit()} €`;
}

/** Leitfäden & Key Facts: „ab 10.000 €“ */
export function formatComparisonMinDepositLabel() {
  return `ab ${formatComparisonMinDeposit()} €`;
}

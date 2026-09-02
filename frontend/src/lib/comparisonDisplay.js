/** Einheitliche Mindestanlage — /comparison und alle daran angebundenen Oberflächen. */
export const COMPARISON_MIN_DEPOSIT_EUR = 20_000;

export function formatComparisonMinDeposit() {
  return COMPARISON_MIN_DEPOSIT_EUR.toLocaleString('de-DE');
}

/** Karten & Tabellen: „20.000 €“ */
export function formatComparisonMinDepositWithCurrency() {
  return `${formatComparisonMinDeposit()} €`;
}

/** Leitfäden & Key Facts: „ab 20.000 €“ */
export function formatComparisonMinDepositLabel() {
  return `ab ${formatComparisonMinDeposit()} €`;
}

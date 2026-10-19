import {
  BBVA_DEFAULT_CONDITIONS,
  EMPTY_CONTRACT_CONDITIONS,
} from '@/lib/contractAddress';

export const DEFAULT_CONTRACT_CONDITIONS = EMPTY_CONTRACT_CONDITIONS;

export const FORMULAR_BANKS = [
  { id: 'bbva', label: 'BBVA' },
  { id: 'postbank', label: 'Postbank' },
  { id: 'ing', label: 'ING' },
  { id: 'knab', label: 'Knab' },
  { id: 'bunq', label: 'bunq NL' },
  { id: 'bunq-de', label: 'bunq DE' },
];

export const FORMULAR_PRODUCTS = [
  { id: 'festgeld', label: 'Festgeld' },
  { id: 'flexgeld', label: 'Flexgeld' },
];

export const FORMULAR_BANK_LABEL = Object.fromEntries(FORMULAR_BANKS.map((b) => [b.id, b.label]));
export const FORMULAR_PRODUCT_LABEL = Object.fromEntries(FORMULAR_PRODUCTS.map((p) => [p.id, p.label]));

export const bankSupportsProduct = (bank, product) => {
  return product === 'festgeld' || product === 'flexgeld';
};

export const defaultConditionsForBank = (bank) =>
  bank === 'bbva' ? BBVA_DEFAULT_CONDITIONS : EMPTY_CONTRACT_CONDITIONS;

export const parseInvestmentAmountRaw = (display) => {
  const normalized = String(display || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? String(Math.round(n)) : '';
};

export const formatConditionsForStorage = ({ bank, product, investmentAmountDisplay, interestRate, term, welcomeBonus }) => ({
  bank: String(bank || '').trim().toLowerCase(),
  product: String(product || '').trim().toLowerCase(),
  investmentAmount: parseInvestmentAmountRaw(investmentAmountDisplay),
  investmentAmountDisplay: String(investmentAmountDisplay || '').trim(),
  interestRate: String(interestRate || '').trim(),
  term: String(term || '').trim(),
  welcomeBonus: String(welcomeBonus || '').trim(),
});

export const resolveContractConditions = (custom, fallback = DEFAULT_CONTRACT_CONDITIONS) => {
  if (!custom || typeof custom !== 'object') return fallback;
  return {
    investmentAmount: custom.investmentAmount || fallback.investmentAmount,
    investmentAmountDisplay: custom.investmentAmountDisplay || fallback.investmentAmountDisplay,
    interestRate: custom.interestRate || fallback.interestRate,
    term: custom.term || fallback.term,
    welcomeBonus: custom.welcomeBonus || fallback.welcomeBonus,
  };
};

export const conditionsSummaryLabel = (conditions) => {
  if (!conditions?.bank || !conditions?.product) return null;
  const bank = FORMULAR_BANK_LABEL[conditions.bank] || conditions.bank;
  const product = FORMULAR_PRODUCT_LABEL[conditions.product] || conditions.product;
  return `${bank} · ${product}`;
};

export const emptyConditionsForm = (existing = null) => {
  const bank = existing?.bank || 'bbva';
  const defaults = defaultConditionsForBank(bank);

  return {
    bank,
    product: existing?.product || 'festgeld',
    investmentAmountDisplay: existing?.investmentAmountDisplay ?? defaults.investmentAmountDisplay,
    interestRate: existing?.interestRate ?? defaults.interestRate,
    term: existing?.term ?? defaults.term,
    welcomeBonus: existing?.welcomeBonus ?? defaults.welcomeBonus,
  };
};

export const applyBankDefaultsToForm = (form, bank) => {
  const defaults = defaultConditionsForBank(bank);
  const product = bankSupportsProduct(bank, form.product) ? form.product : 'festgeld';

  return {
    ...form,
    bank,
    product,
    investmentAmountDisplay: defaults.investmentAmountDisplay,
    interestRate: defaults.interestRate,
    term: defaults.term,
    welcomeBonus: defaults.welcomeBonus,
  };
};

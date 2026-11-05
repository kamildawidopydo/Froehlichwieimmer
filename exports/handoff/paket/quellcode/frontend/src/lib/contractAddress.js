import { getNationalityForCountry } from '@/constants/countries';

export const combineStreetLine = (street, houseNumber) =>
  [street, houseNumber].map((v) => String(v || '').trim()).filter(Boolean).join(' ');

export const combinePostalCity = (postalCode, city) =>
  [postalCode, city].map((v) => String(v || '').trim()).filter(Boolean).join(' ');

export const validateContractAddress = (form, prefix = '') => {
  const street = String(form[`${prefix}street`] || '').trim();
  const houseNumber = String(form[`${prefix}houseNumber`] || '').trim();
  const postalCode = String(form[`${prefix}postalCode`] || '').trim();
  const city = String(form[`${prefix}city`] || '').trim();

  if (!street) return { ok: false, message: 'Straße ist erforderlich' };
  if (!houseNumber) return { ok: false, message: 'Hausnummer ist erforderlich' };
  if (!postalCode) return { ok: false, message: 'PLZ ist erforderlich' };
  if (!city) return { ok: false, message: 'Ort ist erforderlich' };

  return { ok: true };
};

export const EMPTY_CONTRACT_CONDITIONS = {
  investmentAmount: '',
  investmentAmountDisplay: '',
  interestRate: '',
  term: '',
  welcomeBonus: '',
};

/** BBVA standard Konditionen (Festgeld / Flexgeld) */
export const BBVA_DEFAULT_CONDITIONS = {
  investmentAmount: '10000',
  investmentAmountDisplay: '10.000,00',
  interestRate: '4,24 %',
  term: '12 Monate',
  welcomeBonus: '295,00',
};

export const BBVA_FLEXGELD_CONDITIONS = { ...BBVA_DEFAULT_CONDITIONS };
export const BBVA_FESTGELD_CONDITIONS = { ...BBVA_DEFAULT_CONDITIONS };
export const POSTBANK_FLEXGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const POSTBANK_FESTGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const ING_FLEXGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const ING_FESTGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const KNAB_FLEXGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const KNAB_FESTGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const BUNQ_FLEXGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const BUNQ_FESTGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const BUNQ_DE_FLEXGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };
export const BUNQ_DE_FESTGELD_CONDITIONS = { ...EMPTY_CONTRACT_CONDITIONS };

const withContractAddress = (formData) => ({
  street: combineStreetLine(formData.street, formData.houseNumber),
  postalCode: combinePostalCity(formData.postalCode, formData.city),
  s_street: combineStreetLine(formData.s_street, formData.s_houseNumber),
  s_postalCode: combinePostalCity(formData.s_postalCode, formData.s_city),
});

export const prepareBbvaPdfData = (formData, conditions = BBVA_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const preparePostbankPdfData = (formData, conditions = POSTBANK_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const preparePostbankFestgeldPdfData = (formData, conditions = POSTBANK_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareIngPdfData = (formData, conditions = ING_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareIngFestgeldPdfData = (formData, conditions = ING_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareBunqPdfData = (formData, conditions = BUNQ_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareBunqFestgeldPdfData = (formData, conditions = BUNQ_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareBunqDePdfData = (formData, conditions = BUNQ_DE_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareBunqDeFestgeldPdfData = (formData, conditions = BUNQ_DE_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareBbvaFestgeldPdfData = (formData, conditions = BBVA_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const flexgeldInterestPaymentLabel = (value) =>
  ({
    quarterly: 'vierteljährlich',
    'semi-annual': 'halbjährlich',
    maturity: 'am Laufzeitende',
  }[value] || '—');

export const prepareKnabFlexgeldPdfData = (formData, conditions = KNAB_FLEXGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareKnabFestgeldPdfData = (formData, conditions = KNAB_FESTGELD_CONDITIONS) => ({
  ...formData,
  ...conditions,
  ...withContractAddress(formData),
});

export const prepareKnabPdfData = (formData, conditions = BUNQ_FESTGELD_CONDITIONS) => {
  const primaryNationality = getNationalityForCountry(formData.nationality);
  const isGerman = primaryNationality === 'Deutsch';

  return {
    ...formData,
    ...conditions,
    ...withContractAddress(formData),
    rep1_street: combineStreetLine(formData.rep1_street, formData.rep1_houseNumber),
    rep2_street: combineStreetLine(formData.rep2_street, formData.rep2_houseNumber),
    nationality: isGerman ? 'deutsch' : 'andere',
    otherNationality: isGerman
      ? (formData.otherNationality || '')
      : (primaryNationality || formData.otherNationality || ''),
  };
};

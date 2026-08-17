/** @typedef {'festgeld' | 'tagesgeld' | 'flexgeld'} DepotProductType */

/** Feste Sperrfrist am Vertragsbeginn (Flexgeld). */
export const FLEXGELD_LOCK_MONTHS = 3;

/** Standard-Promo-Laufzeit (Tagesgeld), wenn nichts angegeben. */
export const TAGESGELD_DEFAULT_LAUFZEIT = 3;

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in local timezone
 */
export const toISODateLocal = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number|string} months
 * @returns {string}
 */
export const addMonthsISO = (isoDate, months) => {
  if (!isoDate || months === '' || months == null) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
  const [year, month, day] = parts;
  const monthsNum = Number(months);
  if (!Number.isFinite(monthsNum) || monthsNum <= 0) return '';

  const d = new Date(year, month - 1 + monthsNum, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISODateLocal(d);
};

/**
 * Months between two ISO dates (end - start), floored at 0.
 * @param {string} fromISO
 * @param {string} toISO
 * @returns {number}
 */
export const monthsBetweenISO = (fromISO, toISO) => {
  if (!fromISO || !toISO || toISO <= fromISO) return 0;
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
};

/**
 * Compute contract date fields from product rules.
 *
 * - Festgeld: active_until = active_from + Laufzeit
 * - Tagesgeld: active_until = active_from + Laufzeit (Default 3 Monate Promo)
 * - Flexgeld: active_until = active_from + Laufzeit;
 *             lock_until = active_from + min(3, Laufzeit) — erste 3 Monate gesperrt
 *
 * @param {object} params
 * @param {DepotProductType} params.productType
 * @param {string} [params.activeFrom]
 * @param {number|string} [params.laufzeitMonate]
 * @returns {{ activeFrom: string, activeUntil: string, lockUntil: string }}
 */
export const computeDepotContractDates = ({
  productType,
  activeFrom = '',
  laufzeitMonate = '',
}) => {
  const from = activeFrom || toISODateLocal();
  const laufzeitRaw = Number(laufzeitMonate);
  const hasLaufzeit = Number.isFinite(laufzeitRaw) && laufzeitRaw > 0;

  if (productType === 'festgeld') {
    return {
      activeFrom: from,
      activeUntil: hasLaufzeit ? addMonthsISO(from, laufzeitRaw) : '',
      lockUntil: '',
    };
  }

  if (productType === 'tagesgeld') {
    const months = hasLaufzeit ? laufzeitRaw : TAGESGELD_DEFAULT_LAUFZEIT;
    return {
      activeFrom: from,
      activeUntil: addMonthsISO(from, months),
      lockUntil: '',
    };
  }

  if (productType === 'flexgeld') {
    if (!hasLaufzeit) {
      return { activeFrom: from, activeUntil: '', lockUntil: '' };
    }

    const lockMonths = Math.min(FLEXGELD_LOCK_MONTHS, laufzeitRaw);
    return {
      activeFrom: from,
      activeUntil: addMonthsISO(from, laufzeitRaw),
      lockUntil: addMonthsISO(from, lockMonths),
    };
  }

  return { activeFrom: from, activeUntil: '', lockUntil: '' };
};

/**
 * @param {string} iso
 * @returns {string}
 */
export const formatISODateDE = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '—';
  return `${d}.${m}.${y}`;
};

/**
 * Merge computed dates into a depot contract form state.
 * @param {object} form
 * @returns {object}
 */
export const applyDepotContractDates = (form) => {
  const dates = computeDepotContractDates({
    productType: form.product_type,
    activeFrom: form.active_from,
    laufzeitMonate: form.laufzeit_monate,
  });

  return {
    ...form,
    active_from: dates.activeFrom,
    active_until: dates.activeUntil,
    lock_until: dates.lockUntil,
  };
};

import {
  addMonthsISO,
  applyDepotContractDates,
  computeDepotContractDates,
  FLEXGELD_LOCK_MONTHS,
  formatISODateDE,
  monthsBetweenISO,
  TAGESGELD_DEFAULT_LAUFZEIT,
  toISODateLocal,
} from '../depotContractDates';

describe('depotContractDates', () => {
  test('addMonthsISO handles month-end without UTC drift', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsISO('2026-04-21', 12)).toBe('2027-04-21');
    expect(addMonthsISO('2026-04-21', 3)).toBe('2026-07-21');
  });

  test('festgeld: active_until follows Laufzeit', () => {
    const r = computeDepotContractDates({
      productType: 'festgeld',
      activeFrom: '2026-04-21',
      laufzeitMonate: 12,
    });
    expect(r.activeUntil).toBe('2027-04-21');
    expect(r.lockUntil).toBe('');
  });

  test('tagesgeld: defaults to 3 month promo when Laufzeit empty', () => {
    const r = computeDepotContractDates({
      productType: 'tagesgeld',
      activeFrom: '2026-04-21',
    });
    expect(r.activeUntil).toBe('2026-07-21');
  });

  test('tagesgeld: uses explicit Laufzeit when provided', () => {
    const r = computeDepotContractDates({
      productType: 'tagesgeld',
      activeFrom: '2026-04-21',
      laufzeitMonate: 6,
    });
    expect(r.activeUntil).toBe('2026-10-21');
  });

  test('flexgeld: first 3 months lock, full Laufzeit as active_until', () => {
    const r = computeDepotContractDates({
      productType: 'flexgeld',
      activeFrom: '2026-04-21',
      laufzeitMonate: 12,
    });
    expect(r.lockUntil).toBe('2026-07-21');
    expect(r.activeUntil).toBe('2027-04-21');
    expect(FLEXGELD_LOCK_MONTHS).toBe(3);
  });

  test('flexgeld: short Laufzeit locks entire period', () => {
    const r = computeDepotContractDates({
      productType: 'flexgeld',
      activeFrom: '2026-04-21',
      laufzeitMonate: 2,
    });
    expect(r.lockUntil).toBe('2026-06-21');
    expect(r.activeUntil).toBe('2026-06-21');
  });

  test('formatISODateDE avoids timezone drift', () => {
    expect(formatISODateDE('2026-09-01')).toBe('01.09.2026');
    expect(formatISODateDE('')).toBe('—');
  });

  test('monthsBetweenISO', () => {
    expect(monthsBetweenISO('2026-04-21', '2027-04-21')).toBe(12);
    expect(monthsBetweenISO('2026-07-21', '2027-04-21')).toBe(9);
  });

  test('toISODateLocal returns YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 1);
    expect(toISODateLocal(d)).toBe('2026-06-01');
  });

  test('applyDepotContractDates writes dates into form state (tagesgeld)', () => {
    const result = applyDepotContractDates({
      product_type: 'tagesgeld',
      active_from: '2026-04-21',
      laufzeit_monate: '',
    });
    expect(result.active_until).toBe('2026-07-21');
    expect(result.lock_until).toBe('');
  });

  test('applyDepotContractDates writes dates into form state (flexgeld)', () => {
    const result = applyDepotContractDates({
      product_type: 'flexgeld',
      active_from: '2026-04-21',
      laufzeit_monate: '12',
    });
    expect(result.active_until).toBe('2027-04-21');
    expect(result.lock_until).toBe('2026-07-21');
  });

  test('tagesgeld default constant', () => {
    expect(TAGESGELD_DEFAULT_LAUFZEIT).toBe(3);
  });
});

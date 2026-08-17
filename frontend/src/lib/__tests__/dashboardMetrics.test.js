import {
  ABGELTUNG_TAX_RATE,
  DEFAULT_DEPOSIT_INSURANCE_EUR,
  PRODUCT_BADGE,
  PRODUCT_LABEL,
  SOLI_RATE_OF_TAX,
  aggregatePortfolio,
  buildAccrualSeries,
  buildLockTimeline,
  buildMaturityTimeline,
  buildPortfolioAccrualSeries,
  buildTaxPrefs,
  computeBankInsuranceExposure,
  computeBondMetrics,
  computeContractMetrics,
  computeEarlyWithdrawal,
  computeNetInterest,
} from '@/lib/dashboardMetrics';

describe('computeContractMetrics', () => {
  const baseContract = {
    amount_eur: 10000,
    zinssatz: 4,
    laufzeit_monate: 12,
    active_from: '2024-01-01',
    active_until: '2024-12-31',
  };

  test('returns numeric fields for a normal Festgeld contract', () => {
    const m = computeContractMetrics(baseContract);
    expect(m.amount).toBe(10000);
    expect(m.rate).toBe(4);
    expect(m.laufzeitMonate).toBe(12);
    expect(m.totalDays).toBeGreaterThan(360);
    expect(m.gesamtzinsen).toBeCloseTo(400, 0);
    expect(m.auszahlung).toBeCloseTo(10400, 0);
  });

  test('handles missing dates by falling back to laufzeit_monate', () => {
    const m = computeContractMetrics({
      amount_eur: 5000,
      zinssatz: 2,
      laufzeit_monate: 24,
    });
    expect(m.totalDays).toBeGreaterThan(700);
    expect(m.gesamtzinsen).toBeCloseTo(200, 0);
  });

  test('progress is clamped to [0, 100]', () => {
    const m = computeContractMetrics({
      ...baseContract,
      active_from: '1900-01-01',
      active_until: '1900-06-01',
    });
    expect(m.progress).toBeLessThanOrEqual(100);
    expect(m.progress).toBeGreaterThanOrEqual(0);
    expect(m.daysRemaining).toBe(0);
  });

  test('safe defaults for empty input', () => {
    const m = computeContractMetrics({});
    expect(m.amount).toBe(0);
    expect(m.rate).toBe(0);
    expect(m.totalDays).toBe(0);
    expect(m.gesamtzinsen).toBe(0);
    expect(m.auszahlung).toBe(0);
    expect(m.progress).toBe(0);
  });

  test('exposes the new daily and net metrics with sensible defaults', () => {
    const m = computeContractMetrics(baseContract);
    expect(m.dailyInterestGross).toBeCloseTo(10000 * 0.04 / 365.25, 5);
    expect(m.dailyInterestNet).toBeLessThanOrEqual(m.dailyInterestGross);
    expect(m.netMaturityPayout).toBeGreaterThanOrEqual(m.amount);
    expect(m.netMaturityPayout).toBeLessThanOrEqual(m.auszahlung);
  });

  test('accrued interest grows as days pass', () => {
    const contract = {
      amount_eur: 10000,
      zinssatz: 3.65, // ~1 EUR gross per day
      product_type: 'tagesgeld',
      active_from: '2026-01-01',
      active_until: '2026-12-31',
    };
    const mDay10 = computeContractMetrics(contract, {
      now: new Date('2026-01-11T00:00:00Z'),
    });
    const mDay20 = computeContractMetrics(contract, {
      now: new Date('2026-01-21T00:00:00Z'),
    });
    expect(mDay20.daysPassed).toBeGreaterThan(mDay10.daysPassed);
    expect(mDay20.aufgelaufeneZinsen).toBeGreaterThan(mDay10.aufgelaufeneZinsen);
    expect(mDay20.netAccruedInterest).toBeGreaterThan(mDay10.netAccruedInterest);
  });

  test('current value includes accrued interest for flexible products', () => {
    const m = computeContractMetrics(
      {
        amount_eur: 10000,
        zinssatz: 3.65,
        product_type: 'flexgeld',
        active_from: '2026-01-01',
        active_until: '2026-12-31',
      },
      { now: new Date('2026-01-11T00:00:00Z') },
    );

    expect(m.currentValueGross).toBeCloseTo(m.amount + m.aufgelaufeneZinsen, 5);
    expect(m.currentValueGross).toBeGreaterThan(m.amount);
    expect(m.currentValueNet).toBeCloseTo(m.amount + m.netAccruedInterest, 5);
  });

  test('Flexgeld current value updates from the contract start date', () => {
    const m = computeContractMetrics(
      {
        amount_eur: 10000,
        zinssatz: 3.45,
        product_type: 'flexgeld',
        active_from: '2026-04-21',
        active_until: '2027-04-21',
      },
      { now: new Date('2026-05-11T16:00:00+02:00') },
    );

    expect(m.daysPassed).toBe(20);
    expect(m.aufgelaufeneZinsen).toBeCloseTo(18.89, 2);
    expect(m.currentValueGross).toBeCloseTo(10018.89, 2);
  });

  test('inflation-adjusted real return is null without inflation input', () => {
    const m = computeContractMetrics(baseContract);
    expect(m.realReturnPct).toBeNull();
    expect(m.realNetGainEur).toBeNull();
  });

  test('real return responds to provided inflation rate', () => {
    const m = computeContractMetrics(baseContract, { inflationRatePct: 2 });
    expect(typeof m.realReturnPct).toBe('number');
    expect(Number.isFinite(m.realReturnPct)).toBe(true);
    // Net rate ≈ ~2.5% (after taxes), inflation 2%, so real ≈ ~0.5%.
    expect(m.realReturnPct).toBeLessThan(3);
    expect(m.realReturnPct).toBeGreaterThan(-2);
  });

  test('Flexgeld lock_until in the future flags the contract as locked', () => {
    const future = new Date();
    future.setUTCFullYear(future.getUTCFullYear() + 1);
    const m = computeContractMetrics({
      amount_eur: 5000,
      zinssatz: 3,
      product_type: 'flexgeld',
      active_from: '2024-01-01',
      lock_until: future.toISOString().slice(0, 10),
    });
    expect(m.isLocked).toBe(true);
    expect(m.lockDaysRemaining).toBeGreaterThan(300);
    expect(m.withdrawableNow).toBe(0);
  });

  test('Flexgeld with a past lock_until is freely withdrawable', () => {
    const m = computeContractMetrics({
      amount_eur: 5000,
      zinssatz: 3,
      product_type: 'flexgeld',
      active_from: '2024-01-01',
      lock_until: '2024-06-01',
    });
    expect(m.isLocked).toBe(false);
    expect(m.lockDaysRemaining).toBe(0);
    expect(m.withdrawableNow).toBeGreaterThan(0);
  });

  test('maturity bucket is null when there is no end date', () => {
    const m = computeContractMetrics({
      amount_eur: 1000,
      zinssatz: 1,
      product_type: 'tagesgeld',
    });
    expect(m.maturityBucket).toBeNull();
  });

  test('maturity bucket falls into the right slot', () => {
    const today = new Date();
    const in20 = new Date(today.getTime() + 20 * 86400000);
    const m = computeContractMetrics({
      amount_eur: 1000,
      zinssatz: 1,
      product_type: 'festgeld',
      active_from: '2024-01-01',
      active_until: in20.toISOString().slice(0, 10),
    });
    expect(m.maturityBucket).toBe(30);
  });
});

describe('computeNetInterest', () => {
  test('zero gross interest produces zero tax', () => {
    const r = computeNetInterest(0, {});
    expect(r.totalTaxEur).toBe(0);
    expect(r.netInterestEur).toBe(0);
  });

  test('Abgeltungssteuer + Soli without church tax', () => {
    const gross = 1000;
    const r = computeNetInterest(gross, { allowanceEur: 0 });
    const expectedKest = gross * ABGELTUNG_TAX_RATE; // 250
    const expectedSoli = expectedKest * SOLI_RATE_OF_TAX; // 13.75
    expect(r.capitalGainsTaxEur).toBeCloseTo(expectedKest, 5);
    expect(r.soliEur).toBeCloseTo(expectedSoli, 5);
    expect(r.churchTaxEur).toBe(0);
    expect(r.netInterestEur).toBeCloseTo(gross - expectedKest - expectedSoli, 5);
  });

  test('Freistellungsauftrag reduces taxable amount', () => {
    const gross = 1000;
    const r = computeNetInterest(gross, {
      allowanceEur: 1000,
      allowanceUsedEur: 0,
    });
    expect(r.taxableEur).toBe(0);
    expect(r.totalTaxEur).toBe(0);
    expect(r.netInterestEur).toBeCloseTo(gross, 5);
    expect(r.allowanceConsumedEur).toBeCloseTo(gross, 5);
  });

  test('partial allowance is consumed correctly', () => {
    const gross = 1500;
    const r = computeNetInterest(gross, {
      allowanceEur: 1000,
      allowanceUsedEur: 200,
    });
    expect(r.allowanceConsumedEur).toBe(800);
    expect(r.taxableEur).toBe(700);
  });

  test('church tax is layered on KESt at requested rate', () => {
    const gross = 1000;
    const r = computeNetInterest(gross, {
      allowanceEur: 0,
      churchTaxEnabled: true,
      churchTaxRate: 8,
    });
    const expectedKest = gross * ABGELTUNG_TAX_RATE;
    expect(r.churchTaxEur).toBeCloseTo(expectedKest * 0.08, 5);
  });

  test('effectiveTaxRate is in [0, ~28%] with church tax', () => {
    const r = computeNetInterest(1000, {
      churchTaxEnabled: true,
      churchTaxRate: 9,
    });
    expect(r.effectiveTaxRate).toBeGreaterThan(0.25);
    expect(r.effectiveTaxRate).toBeLessThan(0.3);
  });
});

describe('computeEarlyWithdrawal', () => {
  test('none means no penalty', () => {
    const r = computeEarlyWithdrawal(
      { amount_eur: 10000, early_withdrawal_penalty_type: 'none' },
      200,
    );
    expect(r.penaltyEur).toBe(0);
    expect(r.payoutTodayGross).toBe(10200);
  });

  test('percent_interest takes a slice of the accrued interest', () => {
    const r = computeEarlyWithdrawal(
      {
        amount_eur: 10000,
        early_withdrawal_penalty_type: 'percent_interest',
        early_withdrawal_penalty_value: 50,
      },
      200,
    );
    expect(r.penaltyEur).toBeCloseTo(100, 5);
    expect(r.payoutTodayGross).toBeCloseTo(10100, 5);
  });

  test('percent_principal is based on the deposit amount', () => {
    const r = computeEarlyWithdrawal(
      {
        amount_eur: 10000,
        early_withdrawal_penalty_type: 'percent_principal',
        early_withdrawal_penalty_value: 1,
      },
      0,
    );
    expect(r.penaltyEur).toBeCloseTo(100, 5);
    expect(r.payoutTodayGross).toBeCloseTo(9900, 5);
  });

  test('forfeit_accrued zeros the accrued interest', () => {
    const r = computeEarlyWithdrawal(
      {
        amount_eur: 10000,
        early_withdrawal_penalty_type: 'forfeit_accrued',
      },
      300,
    );
    expect(r.penaltyEur).toBe(300);
    expect(r.payoutTodayGross).toBe(10000);
  });

  test('penalty cannot exceed accrued + principal', () => {
    const r = computeEarlyWithdrawal(
      {
        amount_eur: 100,
        early_withdrawal_penalty_type: 'fixed_eur',
        early_withdrawal_penalty_value: 1_000_000,
      },
      0,
    );
    expect(r.payoutTodayGross).toBeGreaterThanOrEqual(0);
  });
});

describe('aggregatePortfolio', () => {
  const c1 = {
    is_active: true,
    amount_eur: 10000,
    zinssatz: 4,
    laufzeit_monate: 12,
    active_from: '2024-01-01',
    active_until: '2024-12-31',
    product_type: 'festgeld',
  };
  const c2 = {
    is_active: true,
    amount_eur: 30000,
    zinssatz: 3,
    laufzeit_monate: 24,
    active_from: '2024-01-01',
    active_until: '2025-12-31',
    product_type: 'festgeld',
  };
  const c3 = {
    is_active: false,
    amount_eur: 999999,
    zinssatz: 9,
    product_type: 'festgeld',
  };

  test('weighted average rate uses the principal as weight', () => {
    const agg = aggregatePortfolio([c1, c2]);
    // (10000*4 + 30000*3) / 40000 = 3.25
    expect(agg.weightedAvgRate).toBeCloseTo(3.25, 5);
    expect(agg.activeCount).toBe(2);
    expect(agg.totalAmountEur).toBe(40000);
  });

  test('inactive contracts are skipped', () => {
    const agg = aggregatePortfolio([c1, c2, c3]);
    expect(agg.totalAmountEur).toBe(40000);
    expect(agg.activeCount).toBe(2);
  });

  test('aggregates current value with accrued interest separately from principal', () => {
    const agg = aggregatePortfolio(
      [
        {
          is_active: true,
          amount_eur: 10000,
          zinssatz: 3.65,
          product_type: 'flexgeld',
          active_from: '2026-01-01',
          active_until: '2026-12-31',
        },
      ],
      { now: new Date('2026-01-11T00:00:00Z') },
    );

    expect(agg.totalAmountEur).toBe(10000);
    expect(agg.accruedGrossTotal).toBeGreaterThan(0);
    expect(agg.currentValueGrossTotal).toBeCloseTo(
      agg.totalAmountEur + agg.accruedGrossTotal,
      5,
    );
  });

  test('empty list yields a zero-shaped object', () => {
    const agg = aggregatePortfolio([]);
    expect(agg.totalAmountEur).toBe(0);
    expect(agg.weightedAvgRate).toBe(0);
    expect(agg.dailyInterestGrossTotal).toBe(0);
    expect(agg.maturityBuckets).toEqual({ d30: 0, d60: 0, d90: 0, beyond: 0 });
  });

  test('dailyInterestNetTotal is at most dailyInterestGrossTotal', () => {
    const agg = aggregatePortfolio([c1, c2]);
    expect(agg.dailyInterestNetTotal).toBeLessThanOrEqual(
      agg.dailyInterestGrossTotal,
    );
  });

  test('maturity buckets capture short-term contracts', () => {
    const today = new Date();
    const in15 = new Date(today.getTime() + 15 * 86400000);
    const in75 = new Date(today.getTime() + 75 * 86400000);
    const agg = aggregatePortfolio([
      {
        is_active: true,
        amount_eur: 5000,
        zinssatz: 2,
        product_type: 'festgeld',
        active_from: '2024-01-01',
        active_until: in15.toISOString().slice(0, 10),
      },
      {
        is_active: true,
        amount_eur: 8000,
        zinssatz: 2,
        product_type: 'festgeld',
        active_from: '2024-01-01',
        active_until: in75.toISOString().slice(0, 10),
      },
    ]);
    expect(agg.maturityBuckets.d30).toBe(5000);
    expect(agg.maturityBuckets.d90).toBe(8000);
  });
});

describe('computeBankInsuranceExposure', () => {
  test('groups by bank and sums exposures', () => {
    const rows = computeBankInsuranceExposure([
      {
        is_active: true,
        amount_eur: 60000,
        bank_id: 'b1',
        banks: { id: 'b1', name: 'Bank A', deposit_protection_amount: 100000 },
      },
      {
        is_active: true,
        amount_eur: 50000,
        bank_id: 'b1',
        banks: { id: 'b1', name: 'Bank A', deposit_protection_amount: 100000 },
      },
      {
        is_active: true,
        amount_eur: 25000,
        bank_id: 'b2',
        banks: { id: 'b2', name: 'Bank B', deposit_protection_amount: 100000 },
      },
    ]);
    const a = rows.find((r) => r.bankId === 'b1');
    const b = rows.find((r) => r.bankId === 'b2');
    expect(a.exposureEur).toBe(110000);
    expect(a.isOverLimit).toBe(true);
    expect(a.overLimitEur).toBe(10000);
    expect(b.isOverLimit).toBe(false);
    expect(b.utilizationPct).toBeCloseTo(25, 5);
  });

  test('null deposit_protection_amount falls back to EU minimum', () => {
    const rows = computeBankInsuranceExposure([
      {
        is_active: true,
        amount_eur: 50000,
        bank_id: 'b3',
        banks: { id: 'b3', name: 'Bank C' },
      },
    ]);
    expect(rows[0].limitEur).toBe(DEFAULT_DEPOSIT_INSURANCE_EUR);
  });

  test('inactive contracts do not contribute', () => {
    const rows = computeBankInsuranceExposure([
      {
        is_active: false,
        amount_eur: 50000,
        bank_id: 'b4',
        banks: { id: 'b4', name: 'Bank D' },
      },
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe('buildTaxPrefs', () => {
  test('coerces missing values to safe defaults', () => {
    const p = buildTaxPrefs(null);
    expect(p).toEqual({
      allowanceEur: 0,
      allowanceUsedEur: 0,
      churchTaxEnabled: false,
      churchTaxRate: 9,
    });
  });

  test('passes through valid profile values', () => {
    const p = buildTaxPrefs({
      tax_allowance_eur: 1000,
      tax_allowance_used_eur: 200,
      church_tax_enabled: true,
      church_tax_rate: 8,
    });
    expect(p).toEqual({
      allowanceEur: 1000,
      allowanceUsedEur: 200,
      churchTaxEnabled: true,
      churchTaxRate: 8,
    });
  });
});

describe('computeBondMetrics', () => {
  test('computes Einstand, Marktwert, Rendite for a profitable bond', () => {
    const m = computeBondMetrics({
      nominal_betrag: 10000,
      kupon_rate: 5,
      kaufkurs: 100,
      aktueller_kurs: 105,
      faelligkeitsdatum: '2099-01-01',
    });
    expect(m.einstand).toBe(10000);
    expect(m.marktwert).toBe(10500);
    expect(m.kursgv).toBe(500);
    expect(m.rendite).toBeCloseTo(5, 5);
    expect(m.jahresKupon).toBe(500);
    expect(m.restTage).toBeGreaterThan(0);
  });

  test('falls back to safe zero values when no data is provided', () => {
    const m = computeBondMetrics({});
    expect(m.nominal).toBe(0);
    expect(m.einstand).toBe(0);
    expect(m.marktwert).toBe(0);
    expect(m.kursgv).toBe(0);
    expect(m.rendite).toBe(0);
    expect(m.restTage).toBe(0);
  });

  test('rendite stays 0 when einstand is 0 (no division by zero)', () => {
    const m = computeBondMetrics({ aktueller_kurs: 100 });
    expect(m.rendite).toBe(0);
    expect(Number.isFinite(m.rendite)).toBe(true);
  });

  test('currentYield uses kupon / aktueller_kurs when both are positive', () => {
    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 4,
      kaufkurs: 100,
      aktueller_kurs: 98,
      faelligkeitsdatum: '2099-01-01',
    });
    expect(m.currentYield).toBeCloseTo((4 / 98) * 100, 4);
  });

  test('currentYield is null when there is no coupon', () => {
    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 0,
      kaufkurs: 100,
      aktueller_kurs: 100,
    });
    expect(m.currentYield).toBeNull();
  });

  test('currentYield is null when there is no current price', () => {
    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 4,
      kaufkurs: 100,
      aktueller_kurs: 0,
    });
    expect(m.currentYield).toBeNull();
  });

  test('approxYtm is null without a maturity date', () => {
    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 4,
      aktueller_kurs: 98,
    });
    expect(m.approxYtm).toBeNull();
  });

  test('approxYtm is finite when maturity is in the future', () => {
    // Build a maturity ~5 years out from today so we don't depend on Date.now().
    const future = new Date();
    future.setUTCFullYear(future.getUTCFullYear() + 5);
    const iso = future.toISOString().slice(0, 10);

    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 4,
      kaufkurs: 100,
      aktueller_kurs: 98,
      faelligkeitsdatum: iso,
    });
    expect(typeof m.approxYtm).toBe('number');
    expect(Number.isFinite(m.approxYtm)).toBe(true);
    // For ~5y, P=98, C=4: YTM ≈ (4 + 0.4) / 99 * 100 ≈ 4.44%.
    expect(m.approxYtm).toBeGreaterThan(4);
    expect(m.approxYtm).toBeLessThan(5);
  });

  test('approxYtm is null once the bond has matured (restJahre <= 0)', () => {
    const m = computeBondMetrics({
      nominal_betrag: 1000,
      kupon_rate: 4,
      kaufkurs: 100,
      aktueller_kurs: 100,
      faelligkeitsdatum: '2000-01-01',
    });
    expect(m.approxYtm).toBeNull();
  });
});

describe('buildAccrualSeries', () => {
  const tagesgeld = {
    amount_eur: 10000,
    zinssatz: 3.65, // ~1 EUR brutto / day
    product_type: 'tagesgeld',
    active_from: '2026-01-01',
    active_until: '2026-12-31',
  };

  test('produces a chronologically sorted, monotonically increasing series', () => {
    const series = buildAccrualSeries(tagesgeld, {
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(series.length).toBeGreaterThan(20);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].date >= series[i - 1].date).toBe(true);
      expect(series[i].grossCum).toBeGreaterThanOrEqual(series[i - 1].grossCum);
      expect(series[i].netCum).toBeGreaterThanOrEqual(series[i - 1].netCum);
    }
    expect(series[series.length - 1].grossCum).toBeGreaterThan(20);
  });

  test('uses a stable fixed rate throughout the series', () => {
    const contract = {
      amount_eur: 36500,
      zinssatz: 4,
      product_type: 'tagesgeld',
      active_from: '2026-01-01',
      active_until: '2026-12-31',
    };
    const series = buildAccrualSeries(contract, {
      from: '2026-01-01',
      to: '2026-04-30',
    });
    const jan = series.find((p) => p.date === '2026-01-15');
    const apr = series.find((p) => p.date === '2026-04-15');
    expect(jan.rate).toBe(4);
    expect(apr.rate).toBe(4);
    expect(jan.grossDaily).toBeCloseTo(apr.grossDaily, 8);
  });

  test('respects stepDays sampling', () => {
    const sparse = buildAccrualSeries(tagesgeld, {
      from: '2026-01-01',
      to: '2026-01-31',
      stepDays: 7,
    });
    expect(sparse.length).toBeLessThanOrEqual(6);
  });

  test('does not accrue before the contract active_from date', () => {
    const series = buildAccrualSeries(
      {
        amount_eur: 10000,
        zinssatz: 3.45,
        product_type: 'flexgeld',
        active_from: '2026-04-21',
        active_until: '2027-04-21',
      },
      {
        from: '2026-01-01',
        now: new Date('2026-05-11T12:00:00Z'),
        stepDays: 7,
      },
    );

    expect(series[0].date).toBe('2026-04-21');
    expect(series[series.length - 1].date).toBe('2026-05-11');
    expect(series[series.length - 1].grossCum).toBeCloseTo(18.89, 2);
  });

  test('returns empty array when amount is zero', () => {
    const series = buildAccrualSeries(
      { ...tagesgeld, amount_eur: 0 },
      { from: '2026-01-01', to: '2026-01-31' },
    );
    expect(series).toEqual([]);
  });
});

describe('buildPortfolioAccrualSeries', () => {
  test('sums across multiple contracts on each day', () => {
    const c1 = {
      is_active: true,
      amount_eur: 10000,
      zinssatz: 3.65,
      active_from: '2026-01-01',
      active_until: '2026-12-31',
    };
    const c2 = {
      is_active: true,
      amount_eur: 20000,
      zinssatz: 3.65,
      active_from: '2026-01-01',
      active_until: '2026-12-31',
    };
    const series = buildPortfolioAccrualSeries([c1, c2], {
      from: '2026-01-01',
      to: '2026-01-10',
    });
    expect(series.length).toBeGreaterThan(0);
    // Aggregated daily ~ 1 + 2 = 3 EUR brutto.
    const last = series[series.length - 1];
    expect(last.grossDaily).toBeGreaterThan(2.5);
    expect(last.grossDaily).toBeLessThan(3.5);
  });

  test('skips inactive contracts', () => {
    const series = buildPortfolioAccrualSeries(
      [{ is_active: false, amount_eur: 10000, zinssatz: 5 }],
      { from: '2026-01-01', to: '2026-01-10' },
    );
    expect(series).toEqual([]);
  });
});

describe('buildMaturityTimeline', () => {
  test('orders contracts by remaining days and labels buckets', () => {
    const today = new Date();
    const in10 = new Date(today.getTime() + 10 * 86400000);
    const in80 = new Date(today.getTime() + 80 * 86400000);
    const in200 = new Date(today.getTime() + 200 * 86400000);
    const list = buildMaturityTimeline([
      {
        id: 'c80',
        is_active: true,
        amount_eur: 5000,
        zinssatz: 2,
        active_from: '2024-01-01',
        active_until: in80.toISOString().slice(0, 10),
        banks: { name: 'Bank B' },
      },
      {
        id: 'c10',
        is_active: true,
        amount_eur: 1000,
        zinssatz: 2,
        active_from: '2024-01-01',
        active_until: in10.toISOString().slice(0, 10),
        banks: { name: 'Bank A' },
      },
      {
        id: 'c200',
        is_active: true,
        amount_eur: 1000,
        zinssatz: 2,
        active_from: '2024-01-01',
        active_until: in200.toISOString().slice(0, 10),
        banks: { name: 'Bank C' },
      },
    ]);
    expect(list.map((r) => r.contractId)).toEqual(['c10', 'c80', 'c200']);
    expect(list[0].bucket).toBe('d30');
    expect(list[1].bucket).toBe('d90');
    expect(list[2].bucket).toBe('beyond');
  });

  test('netto is at most brutto', () => {
    const today = new Date();
    const in60 = new Date(today.getTime() + 60 * 86400000);
    const list = buildMaturityTimeline([
      {
        id: 'x',
        is_active: true,
        amount_eur: 10000,
        zinssatz: 3,
        active_from: '2024-01-01',
        active_until: in60.toISOString().slice(0, 10),
      },
    ]);
    expect(list[0].netto).toBeLessThanOrEqual(list[0].brutto);
  });
});

describe('buildLockTimeline', () => {
  test('reports lock progress and remaining days for active locks', () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 60);
    const list = buildLockTimeline([
      {
        id: 'f1',
        is_active: true,
        amount_eur: 5000,
        zinssatz: 3,
        active_from: '2024-01-01',
        lock_until: future.toISOString().slice(0, 10),
        banks: { name: 'BBVA' },
      },
    ]);
    expect(list[0].isLocked).toBe(true);
    expect(list[0].daysRemaining).toBeGreaterThan(50);
    expect(list[0].lockProgressPct).toBeGreaterThan(0);
    expect(list[0].lockProgressPct).toBeLessThan(100);
  });

  test('lockProgress is null when there is no lock window', () => {
    const list = buildLockTimeline([
      {
        id: 'noLock',
        is_active: true,
        amount_eur: 5000,
        zinssatz: 3,
      },
    ]);
    expect(list[0].lockProgressPct).toBeNull();
    expect(list[0].isLocked).toBe(false);
  });

  test('expired lock is reported as not locked', () => {
    const list = buildLockTimeline([
      {
        id: 'past',
        is_active: true,
        amount_eur: 5000,
        zinssatz: 3,
        active_from: '2024-01-01',
        lock_until: '2024-06-01',
      },
    ]);
    expect(list[0].isLocked).toBe(false);
    expect(list[0].daysRemaining).toBe(0);
  });
});

describe('product label/badge maps', () => {
  test('exposes German labels for each product type', () => {
    expect(PRODUCT_LABEL.festgeld).toBe('Festgeld');
    expect(PRODUCT_LABEL.tagesgeld).toBe('Tagesgeld');
    expect(PRODUCT_LABEL.flexgeld).toBe('Flexgeld');
  });

  test('exposes Tailwind badge classes for each product type', () => {
    expect(PRODUCT_BADGE.festgeld).toEqual(expect.any(String));
    expect(PRODUCT_BADGE.tagesgeld).toEqual(expect.any(String));
    expect(PRODUCT_BADGE.flexgeld).toEqual(expect.any(String));
  });
});

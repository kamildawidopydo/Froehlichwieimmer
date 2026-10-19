import { daysBetween } from '@/lib/dashboardFormatters';

// Reference constants used by net-yield calculations. Centralised so tests
// and UI can import them consistently. All values are German tax defaults.
export const ABGELTUNG_TAX_RATE = 0.25; // 25% Abgeltungssteuer
export const SOLI_RATE_OF_TAX = 0.055; // 5.5% Solidaritätszuschlag auf KESt
export const DEFAULT_DEPOSIT_INSURANCE_EUR = 100000; // EU statutory minimum
export const MS_PER_DAY = 86_400_000;
export const DAYS_PER_YEAR = 365.25;

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Compute the German tax burden on a slice of interest income.
 *
 * @param {number} grossInterestEur Bruttozins (EUR).
 * @param {object} prefs            Steuereinstellungen des Nutzers.
 * @param {number} [prefs.allowanceEur=0] Freistellungsauftrag (EUR).
 * @param {number} [prefs.allowanceUsedEur=0] Bereits verbrauchter Freibetrag.
 * @param {boolean} [prefs.churchTaxEnabled=false]
 * @param {number} [prefs.churchTaxRate=9] Kirchensteuersatz 0/8/9 %.
 * @param {boolean} [prefs.applyAllowance=true]
 * @returns {{ taxableEur: number, capitalGainsTaxEur: number, soliEur: number,
 *            churchTaxEur: number, totalTaxEur: number, netInterestEur: number,
 *            allowanceConsumedEur: number, effectiveTaxRate: number }}
 */
export const computeNetInterest = (grossInterestEur, prefs = {}) => {
  const gross = Math.max(0, toNumber(grossInterestEur, 0));
  const allowance = Math.max(0, toNumber(prefs.allowanceEur, 0));
  const allowanceUsed = Math.min(
    allowance,
    Math.max(0, toNumber(prefs.allowanceUsedEur, 0)),
  );
  const allowanceRemaining =
    prefs.applyAllowance === false ? 0 : Math.max(0, allowance - allowanceUsed);

  const allowanceConsumedEur = Math.min(gross, allowanceRemaining);
  const taxable = Math.max(0, gross - allowanceConsumedEur);

  const capitalGainsTaxEur = taxable * ABGELTUNG_TAX_RATE;
  const soliEur = capitalGainsTaxEur * SOLI_RATE_OF_TAX;

  let churchRate = 0;
  if (prefs.churchTaxEnabled) {
    const r = toNumber(prefs.churchTaxRate, 9);
    churchRate = r > 0 ? r / 100 : 0;
  }
  const churchTaxEur = capitalGainsTaxEur * churchRate;

  const totalTaxEur = capitalGainsTaxEur + soliEur + churchTaxEur;
  const netInterestEur = Math.max(0, gross - totalTaxEur);
  const effectiveTaxRate = gross > 0 ? totalTaxEur / gross : 0;

  return {
    taxableEur: taxable,
    capitalGainsTaxEur,
    soliEur,
    churchTaxEur,
    totalTaxEur,
    netInterestEur,
    allowanceConsumedEur,
    effectiveTaxRate,
  };
};

/**
 * Compute the early withdrawal payout for a deposit contract today.
 * Returns null payout if there is not enough information to make a decision.
 */
export const computeEarlyWithdrawal = (contract, accruedGrossEur) => {
  const amount = Math.max(0, toNumber(contract?.amount_eur, 0));
  const accrued = Math.max(0, toNumber(accruedGrossEur, 0));
  const type = contract?.early_withdrawal_penalty_type || 'none';
  const value = Math.max(0, toNumber(contract?.early_withdrawal_penalty_value, 0));

  let penaltyEur = 0;
  switch (type) {
    case 'percent_interest':
      penaltyEur = accrued * (value / 100);
      break;
    case 'percent_principal':
      penaltyEur = amount * (value / 100);
      break;
    case 'fixed_eur':
      penaltyEur = value;
      break;
    case 'forfeit_accrued':
      penaltyEur = accrued;
      break;
    case 'none':
    default:
      penaltyEur = 0;
      break;
  }
  penaltyEur = Math.min(penaltyEur, accrued + amount);
  const payoutTodayGross = Math.max(0, amount + accrued - penaltyEur);

  return {
    type,
    value,
    penaltyEur,
    payoutTodayGross,
    keptInterestEur: Math.max(0, accrued - penaltyEur),
  };
};

/**
 * Compute the daily and YTD interest, regardless of contract type.
 */
const computeAccruals = ({ amount, rate, daysPassed, today }) => {
  const dailyGross = (amount * (rate / 100)) / DAYS_PER_YEAR;
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const yearDayMs = today.getTime() - startOfYear.getTime();
  const ytdDays = Math.max(0, Math.floor(yearDayMs / MS_PER_DAY));
  const monthMs = today.getTime() - startOfMonth.getTime();
  const mtdDays = Math.max(0, Math.floor(monthMs / MS_PER_DAY));

  return {
    dailyGross,
    ytdDays,
    mtdDays,
    grossInterestYtd: dailyGross * Math.min(daysPassed, ytdDays),
    grossInterestMtd: dailyGross * Math.min(daysPassed, mtdDays),
  };
};

/**
 * Compute a comprehensive metric bundle for a deposit contract. Backwards
 * compatible: the legacy keys (amount, rate, gesamtzinsen, ...) keep their
 * original meaning.
 *
 * @param {object} c The contract row from `user_depot_contracts`.
 * @param {object} [opts]
 * @param {object} [opts.taxPrefs] User tax preferences (see computeNetInterest).
 * @param {number} [opts.inflationRatePct] Annual EU CPI in percent.
 * @param {Date}   [opts.now]       Inject the reference date for tests.
 */
export const computeContractMetrics = (c, opts = {}) => {
  const amount = Math.max(0, toNumber(c?.amount_eur, 0));
  const rate = toNumber(c?.zinssatz, 0);
  const laufzeitMonate = Math.max(0, toNumber(c?.laufzeit_monate, 0));
  const productType = c?.product_type || null;

  const today = opts.now instanceof Date ? opts.now : new Date();

  let totalDays = 0;
  if (c?.active_from && c?.active_until) {
    totalDays = Math.max(daysBetween(c.active_from, c.active_until), 0);
  } else if (laufzeitMonate) {
    totalDays = Math.round(laufzeitMonate * 30.4375);
  }

  const daysPassedRaw = c?.active_from ? daysBetween(c.active_from, today) : 0;
  const daysPassed = Math.max(
    0,
    Math.min(daysPassedRaw, totalDays || daysPassedRaw),
  );
  const daysRemaining = totalDays > 0 ? Math.max(0, totalDays - daysPassed) : 0;
  const progress = totalDays > 0 ? Math.min(100, (daysPassed / totalDays) * 100) : 0;

  const yearsTotal = laufzeitMonate
    ? laufzeitMonate / 12
    : totalDays / DAYS_PER_YEAR;

  const gesamtzinsen = amount * (rate / 100) * yearsTotal;
  const auszahlung = amount + gesamtzinsen;
  const aufgelaufeneZinsen = amount * (rate / 100) * (daysPassed / DAYS_PER_YEAR);

  const accruals = computeAccruals({ amount, rate, daysPassed, today });
  const dailyInterestGross = accruals.dailyGross;

  const taxPrefs = opts.taxPrefs || {};

  const netMaturity = computeNetInterest(gesamtzinsen, taxPrefs);
  const netAccrued = computeNetInterest(aufgelaufeneZinsen, taxPrefs);
  // For "daily" we compute the marginal tax slice on top of YTD already used,
  // but to keep things deterministic we use the marginal rate of the contract
  // as if there were no allowance left (worst case). UI can always reuse
  // computeNetInterest for a more nuanced calculation.
  const netDaily = computeNetInterest(dailyInterestGross, {
    ...taxPrefs,
    applyAllowance: false,
  });

  const dailyInterestNet = netDaily.netInterestEur;
  const grossInterestYtd = accruals.grossInterestYtd;
  const grossInterestMtd = accruals.grossInterestMtd;
  const netInterestYtd = computeNetInterest(grossInterestYtd, taxPrefs).netInterestEur;
  const netInterestMtd = computeNetInterest(grossInterestMtd, taxPrefs).netInterestEur;

  const auszahlungNetto = amount + netMaturity.netInterestEur;
  const currentValueGross = amount + aufgelaufeneZinsen;
  const currentValueNet = amount + netAccrued.netInterestEur;

  const inflationRatePct =
    opts.inflationRatePct != null && Number.isFinite(opts.inflationRatePct)
      ? Number(opts.inflationRatePct)
      : null;

  let realReturnPct = null;
  let realNetGainEur = null;
  if (inflationRatePct != null && yearsTotal > 0) {
    const nominalNet = amount > 0 ? netMaturity.netInterestEur / amount / yearsTotal : 0;
    const nominalNetPct = nominalNet * 100;
    realReturnPct =
      ((1 + nominalNetPct / 100) / (1 + inflationRatePct / 100) - 1) * 100;
    realNetGainEur =
      ((1 + nominalNetPct / 100) / (1 + inflationRatePct / 100) - 1) *
      amount *
      yearsTotal;
  }

  const earlyWithdrawal = computeEarlyWithdrawal(c, aufgelaufeneZinsen);
  const earlyWithdrawalPayoutToday = earlyWithdrawal.payoutTodayGross;
  const earlyWithdrawalPenaltyEur = earlyWithdrawal.penaltyEur;
  const earlyWithdrawalNet = computeNetInterest(
    earlyWithdrawal.keptInterestEur,
    taxPrefs,
  );
  const earlyWithdrawalPayoutTodayNet =
    amount + earlyWithdrawalNet.netInterestEur;

  // Maturity bucket (in days) for portfolio calendar.
  let maturityBucket = null;
  if (totalDays > 0) {
    if (daysRemaining <= 30) maturityBucket = 30;
    else if (daysRemaining <= 60) maturityBucket = 60;
    else if (daysRemaining <= 90) maturityBucket = 90;
  }

  // Product specific helpers --------------------------------------------------
  let lockUntil = null;
  let lockDaysRemaining = null;
  let isLocked = false;
  if (c?.lock_until) {
    const ld = new Date(c.lock_until);
    if (!Number.isNaN(ld.getTime())) {
      lockUntil = ld.toISOString().slice(0, 10);
      const diff = Math.ceil((ld.getTime() - today.getTime()) / MS_PER_DAY);
      lockDaysRemaining = Math.max(0, diff);
      isLocked = diff > 0;
    }
  }

  const withdrawableNow = (() => {
    if (productType === 'tagesgeld') return amount + aufgelaufeneZinsen;
    if (productType === 'flexgeld' && !isLocked) return amount + aufgelaufeneZinsen;
    if (productType === 'flexgeld' && isLocked) {
      // Capital is locked, only accrued interest may be flowing out periodically.
      return 0;
    }
    if (productType === 'festgeld') return earlyWithdrawalPayoutToday;
    return amount + aufgelaufeneZinsen;
  })();

  return {
    // legacy / backward compatible -------------------------------------------
    amount,
    rate,
    laufzeitMonate,
    totalDays,
    daysPassed,
    daysRemaining,
    progress,
    gesamtzinsen,
    auszahlung,
    aufgelaufeneZinsen,
    productType,

    // new metrics ------------------------------------------------------------
    auszahlungNetto,
    dailyInterestGross,
    dailyInterestNet,
    grossInterestYtd,
    grossInterestMtd,
    netInterestYtd,
    netInterestMtd,

    netMaturityPayout: amount + netMaturity.netInterestEur,
    netMaturityInterest: netMaturity.netInterestEur,
    netMaturityTax: netMaturity.totalTaxEur,
    netAccruedInterest: netAccrued.netInterestEur,
    currentValueGross,
    currentValueNet,
    effectiveTaxRate: netMaturity.effectiveTaxRate,

    realReturnPct,
    realNetGainEur,
    inflationRatePct,

    earlyWithdrawalPayoutToday,
    earlyWithdrawalPayoutTodayNet,
    earlyWithdrawalPenaltyEur,
    earlyWithdrawalType: earlyWithdrawal.type,

    maturityBucket,

    lockUntil,
    lockDaysRemaining,
    isLocked,

    withdrawableNow,
  };
};

export const computeBondMetrics = (b) => {
  const nominal = toNumber(b?.nominal_betrag, 0);
  const kupon = toNumber(b?.kupon_rate, 0);
  const kauf = toNumber(b?.kaufkurs, 0);
  const current = toNumber(b?.aktueller_kurs, 0);
  const einstand = (nominal * kauf) / 100;
  const marktwert = (nominal * current) / 100;
  const kursgv = marktwert - einstand;
  const rendite = einstand > 0 ? (kursgv / einstand) * 100 : 0;
  const jahresKupon = (nominal * kupon) / 100;

  const today = new Date();
  let restTage = 0;
  if (b?.faelligkeitsdatum) {
    restTage = Math.max(0, daysBetween(today, b.faelligkeitsdatum));
  }
  const restJahre = restTage / DAYS_PER_YEAR;

  // Aktuelle Rendite (current yield) — independent of capital gain;
  // null when we cannot compute (no price or no coupon).
  const currentYield = current > 0 && kupon > 0 ? (kupon / current) * 100 : null;

  // Approximate yield-to-maturity using the standard textbook estimator:
  //   YTM ≈ (C + (F − P) / n) / ((F + P) / 2)
  // where F = face value (100), P = current clean price (in % of face),
  // n = years to maturity. Returns null when a maturity or price is missing.
  let approxYtm = null;
  if (current > 0 && b?.faelligkeitsdatum && restJahre > 0) {
    approxYtm = ((kupon + (100 - current) / restJahre) / ((100 + current) / 2)) * 100;
  }

  return {
    nominal,
    kupon,
    einstand,
    marktwert,
    kursgv,
    rendite,
    jahresKupon,
    restTage,
    restJahre,
    currentYield,
    approxYtm,
  };
};

/**
 * Convert a profile row into the tax-pref shape consumed by computeNetInterest.
 */
export const buildTaxPrefs = (profile) => ({
  allowanceEur: Math.max(0, toNumber(profile?.tax_allowance_eur, 0)),
  allowanceUsedEur: Math.max(0, toNumber(profile?.tax_allowance_used_eur, 0)),
  churchTaxEnabled: !!profile?.church_tax_enabled,
  churchTaxRate: toNumber(profile?.church_tax_rate, 9),
});

/**
 * Aggregate portfolio-level metrics across a list of deposit contracts.
 * Used by the dashboard context so individual pages do not recompute them.
 */
export const aggregatePortfolio = (contracts, opts = {}) => {
  const taxPrefs = opts.taxPrefs || {};
  const inflationRatePct =
    isFiniteNumber(opts.inflationRatePct) ? Number(opts.inflationRatePct) : null;
  const now = opts.now instanceof Date ? opts.now : new Date();

  const list = (contracts || []).filter(Boolean);
  const active = list.filter((c) => c?.is_active);

  const empty = {
    activeCount: 0,
    totalCount: list.length,
    totalAmountEur: 0,
    weightedAvgRate: 0,
    dailyInterestGrossTotal: 0,
    dailyInterestNetTotal: 0,
    monthInterestGrossTotal: 0,
    monthInterestNetTotal: 0,
    yearInterestGrossTotal: 0,
    yearInterestNetTotal: 0,
    accruedGrossTotal: 0,
    accruedNetTotal: 0,
    currentValueGrossTotal: 0,
    currentValueNetTotal: 0,
    netMaturityInterestTotal: 0,
    netMaturityPayoutTotal: 0,
    realNetGainTotal: 0,
    maturityBuckets: { d30: 0, d60: 0, d90: 0, beyond: 0 },
    expectedNetCashIn: { d30: 0, d60: 0, d90: 0 },
  };

  if (active.length === 0) return empty;

  let totalAmountEur = 0;
  let weightedRateNumerator = 0;
  let dailyGross = 0;
  let dailyNet = 0;
  let monthGross = 0;
  let monthNet = 0;
  let yearGross = 0;
  let yearNet = 0;
  let accruedGross = 0;
  let accruedNet = 0;
  let currentValueGross = 0;
  let currentValueNet = 0;
  let netMaturityInterest = 0;
  let netMaturityPayout = 0;
  let realNetGain = 0;

  const buckets = { d30: 0, d60: 0, d90: 0, beyond: 0 };
  const cashIn = { d30: 0, d60: 0, d90: 0 };

  for (const c of active) {
    const m = computeContractMetrics(c, { taxPrefs, inflationRatePct, now });
    totalAmountEur += m.amount;
    weightedRateNumerator += m.amount * m.rate;
    dailyGross += m.dailyInterestGross;
    dailyNet += m.dailyInterestNet;
    monthGross += m.grossInterestMtd;
    monthNet += m.netInterestMtd;
    yearGross += m.grossInterestYtd;
    yearNet += m.netInterestYtd;
    accruedGross += m.aufgelaufeneZinsen;
    accruedNet += m.netAccruedInterest;
    currentValueGross += m.currentValueGross;
    currentValueNet += m.currentValueNet;
    netMaturityInterest += m.netMaturityInterest;
    netMaturityPayout += m.netMaturityPayout;
    if (Number.isFinite(m.realNetGainEur)) realNetGain += m.realNetGainEur;

    if (m.totalDays > 0) {
      const dr = m.daysRemaining;
      if (dr <= 30) {
        buckets.d30 += m.amount;
        cashIn.d30 += m.netMaturityPayout;
      } else if (dr <= 60) {
        buckets.d60 += m.amount;
        cashIn.d60 += m.netMaturityPayout;
      } else if (dr <= 90) {
        buckets.d90 += m.amount;
        cashIn.d90 += m.netMaturityPayout;
      } else {
        buckets.beyond += m.amount;
      }
    }
  }

  const weightedAvgRate = totalAmountEur > 0 ? weightedRateNumerator / totalAmountEur : 0;

  return {
    activeCount: active.length,
    totalCount: list.length,
    totalAmountEur,
    weightedAvgRate,
    dailyInterestGrossTotal: dailyGross,
    dailyInterestNetTotal: dailyNet,
    monthInterestGrossTotal: monthGross,
    monthInterestNetTotal: monthNet,
    yearInterestGrossTotal: yearGross,
    yearInterestNetTotal: yearNet,
    accruedGrossTotal: accruedGross,
    accruedNetTotal: accruedNet,
    currentValueGrossTotal: currentValueGross,
    currentValueNetTotal: currentValueNet,
    netMaturityInterestTotal: netMaturityInterest,
    netMaturityPayoutTotal: netMaturityPayout,
    realNetGainTotal: realNetGain,
    maturityBuckets: buckets,
    expectedNetCashIn: cashIn,
  };
};

/**
 * Compute per-bank deposit insurance utilisation.
 * `contracts` should already contain a joined `banks` field with at least
 * { id, name, deposit_protection_amount }.
 */
export const computeBankInsuranceExposure = (contracts) => {
  const map = new Map();
  (contracts || []).forEach((c) => {
    if (!c?.is_active) return;
    const bankId = c?.bank_id || c?.banks?.id || 'unknown';
    const bankName = c?.banks?.name || 'Unbekannt';
    const limit = Math.max(
      0,
      toNumber(
        c?.banks?.deposit_protection_amount,
        DEFAULT_DEPOSIT_INSURANCE_EUR,
      ),
    ) || DEFAULT_DEPOSIT_INSURANCE_EUR;
    const amount = Math.max(0, toNumber(c?.amount_eur, 0));
    const prev = map.get(bankId);
    if (prev) {
      prev.exposureEur += amount;
    } else {
      map.set(bankId, {
        bankId,
        bankName,
        bankLogo: c?.banks?.logo_url || null,
        country: c?.banks?.country || null,
        limitEur: limit,
        exposureEur: amount,
      });
    }
  });

  const rows = Array.from(map.values()).map((row) => {
    const utilizationPct = row.limitEur > 0 ? (row.exposureEur / row.limitEur) * 100 : 0;
    return {
      ...row,
      utilizationPct,
      overLimitEur: Math.max(0, row.exposureEur - row.limitEur),
      isOverLimit: row.exposureEur > row.limitEur,
      isNearLimit: utilizationPct >= 80 && row.exposureEur <= row.limitEur,
    };
  });
  rows.sort((a, b) => b.exposureEur - a.exposureEur);
  return rows;
};

export const PRODUCT_LABEL = {
  festgeld: 'Festgeld',
  tagesgeld: 'Tagesgeld',
  flexgeld: 'Flexgeld',
};

export const PRODUCT_BADGE = {
  festgeld: 'bg-bank-primary/10 text-bank-primary border-bank-primary/20',
  tagesgeld: 'bg-bank-accent/15 text-bank-accent border-bank-accent/30',
  flexgeld: 'bg-violet-100 text-violet-700 border-violet-200',
};

// ---------------------------------------------------------------------------
// Time-series helpers (used by dashboard charts/tables)
// ---------------------------------------------------------------------------

const toDateOnly = (input) => {
  if (!input) return null;
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : null);

const rateForDay = (contract) => {
  return toNumber(contract?.zinssatz, 0);
};

/**
 * Build a daily accrual series for one contract. Returns a chronological
 * array with cumulative gross and net interest. Net is approximated by
 * applying computeNetInterest on the cumulative gross — good enough for
 * visualisation; per-day allowance allocation is not modelled.
 *
 * @param {object} contract  user_depot_contracts row.
 * @param {object} [opts]
 * @param {Date|string} [opts.from]   Start date (defaults to active_from).
 * @param {Date|string} [opts.to]     End date inclusive (defaults to min(today, active_until)).
 * @param {object} [opts.taxPrefs]    Tax preferences for net calculation.
 * @param {number} [opts.stepDays=1]  Sample every N days (>=1).
 * @returns {Array<{ date: string, day: number, grossDaily: number, grossCum: number, netCum: number, rate: number }>}
 */
export const buildAccrualSeries = (contract, opts = {}) => {
  const amount = Math.max(0, toNumber(contract?.amount_eur, 0));
  if (!amount) return [];

  const taxPrefs = opts.taxPrefs || {};
  const step = Math.max(1, Math.round(toNumber(opts.stepDays, 1)));

  const requestedStart = toDateOnly(opts.from);
  const activeFrom = toDateOnly(contract?.active_from);
  const startCandidates = [requestedStart, activeFrom].filter(Boolean);
  if (startCandidates.length === 0) return [];
  const start = startCandidates.reduce((max, d) =>
    d.getTime() > max.getTime() ? d : max,
  );

  const today = toDateOnly(opts.now || new Date()) || new Date();
  const activeUntil = toDateOnly(contract?.active_until);
  const requestedEnd = toDateOnly(opts.to);
  const candidateEnds = [requestedEnd, activeUntil, today].filter(Boolean);
  const endCandidate = requestedEnd
    ? requestedEnd
    : candidateEnds.reduce((min, d) => (d.getTime() < min.getTime() ? d : min), today);
  const end = endCandidate.getTime() < start.getTime() ? start : endCandidate;

  const series = [];
  let grossCum = 0;
  const cursor = new Date(start.getTime());

  series.push({
    date: isoDate(cursor),
    day: 0,
    grossDaily: (amount * (rateForDay(contract, cursor) / 100)) / DAYS_PER_YEAR,
    grossCum: 0,
    netCum: 0,
    rate: rateForDay(contract, cursor),
  });

  while (cursor.getTime() < end.getTime()) {
    const rate = rateForDay(contract, cursor);
    const daily = (amount * (rate / 100)) / DAYS_PER_YEAR;
    const next = new Date(cursor.getTime());
    next.setUTCDate(next.getUTCDate() + step);
    if (next.getTime() > end.getTime()) {
      next.setTime(end.getTime());
    }

    const intervalDays = Math.max(0, Math.round((next.getTime() - cursor.getTime()) / MS_PER_DAY));
    if (intervalDays === 0) break;
    grossCum += daily * intervalDays;
    const netCum = computeNetInterest(grossCum, taxPrefs).netInterestEur;
    series.push({
      date: isoDate(next),
      day: Math.round((next.getTime() - start.getTime()) / MS_PER_DAY),
      grossDaily: daily,
      grossCum,
      netCum,
      rate,
    });
    cursor.setTime(next.getTime());
  }

  return series;
};

/**
 * Aggregate the daily accrual across a list of contracts. Each entry is the
 * sum of all contracts for that calendar day. Useful for product-page area
 * charts (Tagesgeld YTD birikim, Flexgeld YTD birikim, etc.).
 */
export const buildPortfolioAccrualSeries = (contracts, opts = {}) => {
  const list = (contracts || []).filter((c) => c?.is_active);
  if (list.length === 0) return [];

  const map = new Map();
  for (const c of list) {
    const series = buildAccrualSeries(c, opts);
    for (const point of series) {
      const prev = map.get(point.date) || {
        date: point.date,
        grossCum: 0,
        netCum: 0,
        grossDaily: 0,
      };
      prev.grossCum += point.grossCum;
      prev.netCum += point.netCum;
      prev.grossDaily += point.grossDaily;
      map.set(point.date, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
};

/**
 * Maturity timeline for a list of Festgeld contracts.
 * Returns a sorted list (closest first) with per-contract net payout.
 */
export const buildMaturityTimeline = (contracts, opts = {}) => {
  const taxPrefs = opts.taxPrefs || {};
  const now = opts.now instanceof Date ? opts.now : new Date();
  const list = (contracts || [])
    .filter((c) => c?.is_active && c.active_until)
    .map((c) => {
      const m = computeContractMetrics(c, { taxPrefs, now });
      const due = toDateOnly(c.active_until);
      const daysToMaturity = due
        ? Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY)
        : null;
      let bucket = 'beyond';
      if (daysToMaturity != null) {
        if (daysToMaturity <= 30) bucket = 'd30';
        else if (daysToMaturity <= 60) bucket = 'd60';
        else if (daysToMaturity <= 90) bucket = 'd90';
      }
      return {
        contractId: c.id,
        bankName: c.banks?.name || c.bank_name || 'Bank',
        bankLogo: c.banks?.logo_url || null,
        maturityDate: c.active_until,
        anlage: m.amount,
        brutto: m.auszahlung,
        netto: m.netMaturityPayout,
        netInterest: m.netMaturityInterest,
        taxEur: m.netMaturityTax,
        daysToMaturity: daysToMaturity ?? 0,
        bucket,
        rate: m.rate,
      };
    })
    .sort((a, b) => (a.daysToMaturity || 0) - (b.daysToMaturity || 0));

  return list;
};

/**
 * Lock timeline for a list of Flexgeld contracts. Each entry provides the
 * absolute lock window (active_from -> lock_until -> active_until) plus the
 * current progress percentage so charts can render Gantt-style bars.
 */
export const buildLockTimeline = (contracts, opts = {}) => {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const list = (contracts || [])
    .filter((c) => c?.is_active)
    .map((c) => {
      const activeFrom = toDateOnly(c.active_from);
      const lockUntil = toDateOnly(c.lock_until);
      const activeUntil = toDateOnly(c.active_until);
      const amount = Math.max(0, toNumber(c.amount_eur, 0));
      let lockProgressPct = null;
      let daysRemaining = null;
      let isLocked = false;
      if (activeFrom && lockUntil) {
        const total = Math.max(1, lockUntil.getTime() - activeFrom.getTime());
        const passed = Math.max(0, now.getTime() - activeFrom.getTime());
        lockProgressPct = Math.min(100, Math.max(0, (passed / total) * 100));
        const diffDays = Math.ceil((lockUntil.getTime() - now.getTime()) / MS_PER_DAY);
        daysRemaining = Math.max(0, diffDays);
        isLocked = diffDays > 0;
      }
      return {
        contractId: c.id,
        bankName: c.banks?.name || c.bank_name || 'Bank',
        bankLogo: c.banks?.logo_url || null,
        activeFrom: c.active_from || null,
        lockUntil: c.lock_until || null,
        activeUntil: c.active_until || null,
        amount,
        rate: toNumber(c.zinssatz, 0),
        lockProgressPct,
        daysRemaining,
        isLocked,
      };
    })
    .sort((a, b) => {
      const ad = a.daysRemaining == null ? Infinity : a.daysRemaining;
      const bd = b.daysRemaining == null ? Infinity : b.daysRemaining;
      return ad - bd;
    });

  return list;
};


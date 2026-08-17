import {
  buildIpoValuationMap,
  computeIpoValuation,
  deriveSubscriptionFromVolume,
  profitToEur,
  resolveIpoPositionSymbol,
} from '@/lib/ipoValuation';

describe('computeIpoValuation', () => {
  test('computes from listing price (100 lots × 300 → listing 350)', () => {
    const r = computeIpoValuation({
      shares: 100,
      subscriptionPrice: 300,
      listingPrice: 350,
    });
    expect(r.subscriptionPrice).toBe(300);
    expect(r.listingPrice).toBe(350);
    expect(r.costBasis).toBe(30000);
    expect(r.marketValue).toBe(35000);
    expect(r.profitAbs).toBe(5000);
    expect(r.profitPct).toBeCloseTo(16.6667, 2);
    expect(r.profitMarginPct).toBeCloseTo(16.6667, 2);
    expect(r.profitAbsEur).toBe(5000);
  });

  test('computes listing from profit percent', () => {
    const r = computeIpoValuation({
      shares: 100,
      amountEur: 30000,
      profitPct: 10,
    });
    expect(r.subscriptionPrice).toBe(300);
    expect(r.listingPrice).toBeCloseTo(330, 4);
    expect(r.profitAbs).toBeCloseTo(3000, 0);
    expect(r.profitPct).toBeCloseTo(10, 4);
  });

  test('converts EUR volume to USD per-share price using live FX', () => {
    const eurRates = { EUR: 1, USD: 1.08 };
    const sub = deriveSubscriptionFromVolume(30000, 100, 'USD', eurRates);
    expect(sub).toBeCloseTo(324, 4);

    const r = computeIpoValuation({
      shares: 100,
      amountEur: 30000,
      listingPrice: 325,
      priceCurrency: 'USD',
      eurRates,
    });
    expect(r.subscriptionPrice).toBeCloseTo(324, 4);
    expect(r.profitAbs).toBeCloseTo(100, 4);
    expect(r.profitAbsEur).toBeCloseTo(profitToEur(100, 'USD', eurRates), 2);
  });

  test('returns null when neither listing nor profit given', () => {
    expect(
      computeIpoValuation({ shares: 10, subscriptionPrice: 50 }),
    ).toBeNull();
  });

  test('returns null for invalid shares', () => {
    expect(
      computeIpoValuation({ shares: 0, listingPrice: 10, subscriptionPrice: 5 }),
    ).toBeNull();
  });
});

describe('resolveIpoPositionSymbol', () => {
  test('falls back to IPO-{ticker} when position_symbol missing', () => {
    expect(
      resolveIpoPositionSymbol({ company_name: 'OpenAI', ticker: 'OPENAI' }),
    ).toBe('IPO-OPENAI');
  });
});

describe('buildIpoValuationMap', () => {
  test('maps symbol to latest valuation by valuation_set_at', () => {
    const map = buildIpoValuationMap([
      {
        id: 'a',
        status: 'approved',
        position_symbol: 'IPO-ACME',
        listing_price_per_share: 100,
        subscription_price_per_share: 90,
        use_admin_valuation: true,
        valuation_set_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'b',
        status: 'approved',
        position_symbol: 'IPO-ACME',
        listing_price_per_share: 120,
        subscription_price_per_share: 90,
        use_admin_valuation: true,
        valuation_set_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'c',
        status: 'pending',
        position_symbol: 'IPO-X',
        listing_price_per_share: 50,
        use_admin_valuation: true,
      },
      {
        id: 'd',
        status: 'approved',
        position_symbol: 'IPO-OFF',
        listing_price_per_share: 80,
        use_admin_valuation: false,
      },
    ]);
    expect(map['IPO-ACME'].listingPrice).toBe(120);
    expect(map['IPO-X']).toBeUndefined();
    expect(map['IPO-OFF']).toBeUndefined();
  });

  test('maps by ticker fallback when position_symbol is null', () => {
    const map = buildIpoValuationMap([
      {
        id: 'x',
        status: 'approved',
        company_name: 'OpenAI',
        ticker: 'OPENAI',
        listing_price_per_share: 1050,
        subscription_price_per_share: 1000,
        use_admin_valuation: true,
        valuation_set_at: '2026-06-30T00:00:00Z',
      },
    ]);
    expect(map['IPO-OPENAI'].listingPrice).toBe(1050);
  });
});

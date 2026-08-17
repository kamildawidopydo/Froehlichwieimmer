import {
  decodeHtmlEntities,
  fixCp850Mojibake,
  normalizeIpoCatalogRow,
} from '@/lib/decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
  test('decodes amp in company names', () => {
    expect(decodeHtmlEntities('Sunshine Silver Mining &amp; Refining Company')).toBe(
      'Sunshine Silver Mining & Refining Company',
    );
  });

  test('decodes named and numeric entities', () => {
    expect(decodeHtmlEntities('Soci&eacute;t&eacute;')).toBe('Société');
    expect(decodeHtmlEntities('Mike&#8217;s')).toBe('Mike\u2019s');
  });

  test('fixCp850Mojibake repairs German IPO window text', () => {
    expect(fixCp850Mojibake('Q4 2026 ÔÇô 2027 (gesch├ñtzt, nicht best├ñtigt)')).toBe(
      'Q4 2026 – 2027 (geschätzt, nicht bestätigt)',
    );
    expect(fixCp850Mojibake('2026 (regulatorisch abh├ñngig)')).toBe(
      '2026 (regulatorisch abhängig)',
    );
  });

  test('normalizeIpoCatalogRow fixes text fields', () => {
    const row = normalizeIpoCatalogRow({
      id: '1',
      company_name: 'Foo &amp; Bar',
      expected_ipo_window: 'H2 2026 (gesch├ñtzt)',
      description: 'A &amp; B',
      price_range_low: 10,
    });
    expect(row.company_name).toBe('Foo & Bar');
    expect(row.expected_ipo_window).toBe('H2 2026 (geschätzt)');
    expect(row.description).toBe('A & B');
    expect(row.price_range_low).toBe(10);
  });
});

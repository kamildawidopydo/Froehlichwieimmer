import {
  daysBetween,
  formatDate,
  formatEUR,
  formatEURCompact,
  formatEURSigned,
  formatPctSigned,
} from '@/lib/dashboardFormatters';

const stripWs = (s) => s.replace(/\s+/g, ' ').trim();

describe('dashboardFormatters', () => {
  test('formatEUR renders de-DE currency with EUR symbol', () => {
    const out = stripWs(formatEUR(1234.5));
    expect(out).toMatch(/1\.234,50/);
    expect(out).toMatch(/€/);
  });

  test('formatEUR coerces null/undefined to 0,00 €', () => {
    expect(stripWs(formatEUR(null))).toMatch(/0,00/);
    expect(stripWs(formatEUR(undefined))).toMatch(/0,00/);
  });

  test('formatEURCompact drops the decimals', () => {
    const out = stripWs(formatEURCompact(1234.56));
    expect(out).toMatch(/1\.235/);
    expect(out).not.toMatch(/,/);
  });

  test('formatEURSigned prefixes a + on positive values', () => {
    const positive = stripWs(formatEURSigned(10));
    const negative = stripWs(formatEURSigned(-10));
    const zero = stripWs(formatEURSigned(0));
    expect(positive.startsWith('+')).toBe(true);
    expect(negative.startsWith('-')).toBe(true);
    expect(zero.startsWith('+')).toBe(true);
  });

  test('formatPctSigned formats with two decimals and explicit sign', () => {
    expect(formatPctSigned(2.5)).toBe('+2.50 %');
    expect(formatPctSigned(-1.234)).toBe('-1.23 %');
    expect(formatPctSigned(0)).toBe('+0.00 %');
    expect(formatPctSigned(null)).toBe('+0.00 %');
  });

  test('formatDate renders dd.MM.yyyy and tolerates falsy input', () => {
    expect(formatDate('2024-05-12T00:00:00Z')).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    expect(formatDate(null)).toBe('–');
    expect(formatDate(undefined)).toBe('–');
  });

  test('daysBetween computes whole-day differences', () => {
    expect(daysBetween('2024-01-01', '2024-01-11')).toBe(10);
    expect(daysBetween('2024-01-11', '2024-01-01')).toBe(-10);
    expect(daysBetween('not-a-date', '2024-01-01')).toBe(0);
  });
});

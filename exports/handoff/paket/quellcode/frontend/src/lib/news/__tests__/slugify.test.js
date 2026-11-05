import { slugify, shortHash, buildArticleSlug } from '@/lib/news/slugify';

describe('slugify', () => {
  test('lowercases and dashifies basic ASCII titles', () => {
    expect(slugify('Hallo Welt')).toBe('hallo-welt');
  });

  test('folds German umlauts and eszett', () => {
    expect(slugify('Frühling im März')).toBe('fruehling-im-maerz');
    expect(slugify('Größe und Höhe')).toBe('groesse-und-hoehe');
    expect(slugify('Straße')).toBe('strasse');
  });

  test('strips punctuation and collapses whitespace', () => {
    expect(slugify('!!!Übung, macht den Meister!!!')).toBe(
      'uebung-macht-den-meister',
    );
    expect(slugify('  Hallo   Welt  ')).toBe('hallo-welt');
  });

  test('handles empty / nullish input', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });

  test('truncates to 80 chars', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBe(80);
  });
});

describe('shortHash', () => {
  test('is deterministic for the same input', () => {
    expect(shortHash('foo')).toBe(shortHash('foo'));
  });

  test('differs across inputs', () => {
    expect(shortHash('foo')).not.toBe(shortHash('bar'));
  });

  test('returns 7 base36 chars', () => {
    expect(shortHash('hello world')).toMatch(/^[a-z0-9]{7}$/);
  });
});

describe('buildArticleSlug', () => {
  test('combines title slug and guid hash', () => {
    const out = buildArticleSlug('Hallo Welt', 'urn:euronews:1');
    expect(out).toMatch(/^hallo-welt-[a-z0-9]{7}$/);
  });

  test('falls back to "artikel" prefix when title is empty', () => {
    const out = buildArticleSlug('', 'guid-x');
    expect(out).toMatch(/^artikel-[a-z0-9]{7}$/);
  });

  test('produces stable output for the same inputs', () => {
    expect(buildArticleSlug('Hallo Welt', 'g1')).toBe(
      buildArticleSlug('Hallo Welt', 'g1'),
    );
  });
});

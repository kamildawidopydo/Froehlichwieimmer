import { dedupeArticleImages, normalizeImageUrl } from './newsImageDedup';

describe('newsImageDedup', () => {
  test('normalizeImageUrl strips query, hash, trailing slash, lowercases', () => {
    expect(normalizeImageUrl('https://example.com/IMG.JPG?w=800#x')).toBe('https://example.com/img.jpg');
    expect(normalizeImageUrl('https://example.com/foo/')).toBe('https://example.com/foo');
    expect(normalizeImageUrl(null)).toBeNull();
    expect(normalizeImageUrl('')).toBeNull();
    expect(normalizeImageUrl('  ')).toBeNull();
  });

  test('deduplicates across arrays keeping first-occurrence intact', () => {
    const hero = [{ id: 'a', image_url: 'https://cdn/x.jpg' }];
    const overview = [
      { id: 'b', image_url: 'https://cdn/x.jpg?w=100' }, // duplicate variant
      { id: 'c', image_url: 'https://cdn/y.jpg' },
    ];
    const weitere = [
      { id: 'd', image_url: 'https://cdn/Y.jpg?tracking=1' }, // dup of c
      { id: 'e', image_url: 'https://cdn/z.jpg' },
    ];
    const [h, o, w] = dedupeArticleImages([hero, overview, weitere]);
    expect(h[0].image_url).toBe('https://cdn/x.jpg'); // first, kept
    expect(o[0].image_url).toBeNull();               // dup of a
    expect(o[1].image_url).toBe('https://cdn/y.jpg'); // first for y
    expect(w[0].image_url).toBeNull();               // dup of c
    expect(w[1].image_url).toBe('https://cdn/z.jpg'); // unique
  });

  test('empty image_url stays untouched (no false dupes)', () => {
    const g = [{ id: 'a', image_url: null }, { id: 'b', image_url: '' }, { id: 'c', image_url: null }];
    const [out] = dedupeArticleImages([g]);
    expect(out.map((a) => a.image_url)).toEqual([null, '', null]);
  });

  test('does not mutate the original arrays', () => {
    const orig = [{ id: 'a', image_url: 'https://cdn/x.jpg' }, { id: 'b', image_url: 'https://cdn/x.jpg' }];
    dedupeArticleImages([orig]);
    expect(orig[1].image_url).toBe('https://cdn/x.jpg'); // untouched
  });

  test('10 articles with duplicates → 0 duplicate visible after dedup', () => {
    const articles = Array.from({ length: 10 }).map((_, i) => ({
      id: `a${i}`,
      image_url: `https://cdn/pic${i % 3}.jpg`, // heavy dupes: 10 articles, only 3 unique urls
    }));
    const [out] = dedupeArticleImages([articles]);
    const usedUrls = out.map((a) => a.image_url).filter((u) => !!u);
    expect(new Set(usedUrls).size).toBe(usedUrls.length); // no dup
    expect(usedUrls.length).toBe(3);
  });
});

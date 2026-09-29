import { dedupeArticleImages, normalizeImageUrl } from './newsImageDedup';

describe('newsImageDedup', () => {
  test('normalizeImageUrl strips query, hash, trailing slash, lowercases', () => {
    expect(normalizeImageUrl('https://example.com/IMG.JPG?w=800#x')).toBe('https://example.com/img.jpg');
    expect(normalizeImageUrl('https://example.com/foo/')).toBe('https://example.com/foo');
    expect(normalizeImageUrl(null)).toBeNull();
    expect(normalizeImageUrl('')).toBeNull();
    expect(normalizeImageUrl('  ')).toBeNull();
  });

  test('unsplash photo-id is stable across size + host variants', () => {
    const a = 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1200&fit=crop';
    const b = 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=400&q=80';
    const c = 'https://cdn.other.com/proxy?url=' + encodeURIComponent(a);
    expect(normalizeImageUrl(a)).toBe(normalizeImageUrl(b));
    expect(normalizeImageUrl(a)).toBe('unsplash:1494412651409');
    expect(normalizeImageUrl(c)).toBe('unsplash:1494412651409');
  });

  test('deduplicates across arrays keeping first-occurrence intact', () => {
    const hero = [{ id: 'a', image_url: 'https://cdn/x.jpg' }];
    const overview = [
      { id: 'b', image_url: 'https://cdn/x.jpg?w=100' },
      { id: 'c', image_url: 'https://cdn/y.jpg' },
    ];
    const weitere = [
      { id: 'd', image_url: 'https://cdn/Y.jpg?tracking=1' },
      { id: 'e', image_url: 'https://cdn/z.jpg' },
    ];
    const [h, o, w] = dedupeArticleImages([hero, overview, weitere]);
    expect(h[0].image_url).toBe('https://cdn/x.jpg');
    expect(o[0].image_url).toBeNull();
    expect(o[1].image_url).toBe('https://cdn/y.jpg');
    expect(w[0].image_url).toBeNull();
    expect(w[1].image_url).toBe('https://cdn/z.jpg');
  });

  test('unsplash cross-section dedup (Hero + Grid same photo)', () => {
    const hero = [{ id: 'hero-1', image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1600' }];
    const grid = [{ id: 'grid-1', image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400' }];
    const [h, g] = dedupeArticleImages([hero, grid]);
    expect(h[0].image_url).toContain('1587293852726');
    expect(g[0].image_url).toBeNull();
  });

  test('empty image_url stays untouched (no false dupes)', () => {
    const g = [{ id: 'a', image_url: null }, { id: 'b', image_url: '' }, { id: 'c', image_url: null }];
    const [out] = dedupeArticleImages([g]);
    expect(out.map((a) => a.image_url)).toEqual([null, '', null]);
  });

  test('does not mutate the original arrays', () => {
    const orig = [{ id: 'a', image_url: 'https://cdn/x.jpg' }, { id: 'b', image_url: 'https://cdn/x.jpg' }];
    dedupeArticleImages([orig]);
    expect(orig[1].image_url).toBe('https://cdn/x.jpg');
  });

  test('10 articles with duplicates → 0 duplicate visible after dedup', () => {
    const articles = Array.from({ length: 10 }).map((_, i) => ({
      id: `a${i}`,
      image_url: `https://images.unsplash.com/photo-${1000000000000 + (i % 3)}?w=1200`,
    }));
    const [out] = dedupeArticleImages([articles]);
    const usedKeys = out.map((a) => normalizeImageUrl(a.image_url)).filter((u) => !!u);
    expect(new Set(usedKeys).size).toBe(usedKeys.length);
    expect(usedKeys.length).toBe(3);
  });
});

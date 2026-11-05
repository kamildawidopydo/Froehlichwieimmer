// Session 82.85 — newsService test suite rewrite for FastAPI/Mongo cutover.
// All Supabase mocks removed; global `fetch` is stubbed instead.

const ARTICLE = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'hallo-welt-aaaaaaa',
  guid: null,
  title: 'Hallo Welt',
  summary: 'Kurzfassung',
  excerpt: 'Kurzfassung',
  content: 'Langer Text',
  image_url: null,
  category: 'welt',
  source_url: 'https://de.euronews.com/foo',
  published_at: new Date().toISOString(), // fresh-guarded
  language: 'de',
  view_count: 0,
  views: 0,
};

const VIDEO = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'energiekrise-eu-klimakommissar-aaaaaaa',
  guid: 'https://de.euronews.com/video/2026/05/07/energiekrise',
  title: 'Energiekrise: EU-Klimakommissar fordert radikaleren Kurs',
  summary: 'Kurzvideo',
  thumbnail_url: 'https://cdn.example/video.jpg',
  embed_url: 'https://de.euronews.com/embed/abc123',
  source_url: 'https://de.euronews.com/video/2026/05/07/energiekrise',
  duration_seconds: 605,
  show_label: 'The Europe Conversation',
  published_at: '2026-05-07T16:05:00.000Z',
  language: 'de',
  view_count: 12,
};

const {
  listArticles,
  getArticleBySlug,
  incrementArticleView,
  listVideos,
  getVideoBySlug,
  incrementVideoView,
  listRelatedArticles,
  listSearchSuggestions,
  listPublicFeed,
} = require('@/services/newsService');

const mockFetchResponse = (body, { status = 200 } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('listArticles', () => {
  test('calls /api/content/news/list with tab=recent and pagination', async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ items: [ARTICLE], count: 1 }),
    );
    const result = await listArticles({ limit: 10, offset: 20 });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/list');
    expect(url).toContain('tab=recent');
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
    expect(url).not.toContain('category=');
    expect(result.count).toBe(1);
  });

  test('filters by category when not "all"', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [], count: 0 }));
    await listArticles({ category: 'welt' });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('category=welt');
  });

  test('omits category filter when "all"', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [], count: 0 }));
    await listArticles({ category: 'all' });
    const url = global.fetch.mock.calls[0][0];
    expect(url).not.toContain('category=');
  });

  test('propagates search term as query param', async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ items: [ARTICLE], count: 1 }),
    );
    const result = await listArticles({ search: '  Inflation  ' });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('search=Inflation');
    // search results are NOT freshness-filtered client-side
    expect(result.data).toHaveLength(1);
  });

  test('sends tab=popular for popular list', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [], count: 0 }));
    await listArticles({ tab: 'popular' });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('tab=popular');
  });

  test('throws when server returns a non-2xx', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({}, { status: 500 }));
    await expect(listArticles({})).rejects.toThrow(/news_api_500/);
  });
});

describe('getArticleBySlug', () => {
  test('hits /api/content/news/:slug and returns row', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse(ARTICLE));
    const out = await getArticleBySlug('hallo-welt-aaaaaaa');
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/hallo-welt-aaaaaaa');
    expect(out).toEqual(ARTICLE);
  });

  test('returns null on 404', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({}, { status: 404 }));
    const out = await getArticleBySlug('missing');
    expect(out).toBeNull();
  });
});

describe('incrementArticleView', () => {
  test('POSTs to /api/content/news/:slug/view', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ ok: true }));
    await incrementArticleView('foo-bar');
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/content/news/foo-bar/view');
    expect(init.method).toBe('POST');
  });

  test('swallows fetch errors silently', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    await expect(incrementArticleView('foo')).resolves.toBeUndefined();
  });
});

describe('listVideos / getVideoBySlug / incrementVideoView', () => {
  test('listVideos hits /api/content/news/videos', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [VIDEO], count: 1 }));
    const result = await listVideos({ limit: 5, offset: 10 });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/videos');
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');
    expect(result.data).toEqual([VIDEO]);
  });

  test('getVideoBySlug returns null on 404', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({}, { status: 404 }));
    const out = await getVideoBySlug(VIDEO.slug);
    expect(out).toBeNull();
  });

  test('incrementVideoView POSTs to /video/:slug/view', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ ok: true }));
    await incrementVideoView('video-slug');
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/content/news/video/video-slug/view');
    expect(init.method).toBe('POST');
  });
});

describe('listRelatedArticles / listSearchSuggestions / listPublicFeed', () => {
  test('listRelatedArticles skips call when no category', async () => {
    const result = await listRelatedArticles({});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
  });

  test('listRelatedArticles hits /related with excludeSlug', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [ARTICLE] }));
    await listRelatedArticles({ category: 'welt', excludeSlug: 'other', limit: 3 });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/related');
    expect(url).toContain('category=welt');
    expect(url).toContain('exclude_slug=other');
    expect(url).toContain('limit=3');
  });

  test('listSearchSuggestions requires min-2 chars', async () => {
    const result = await listSearchSuggestions({ query: 'a' });
    expect(global.fetch || jest.fn()).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
  });

  test('listSearchSuggestions hits /search-suggestions', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ items: [{ slug: 'x', title: 'X' }] }));
    const result = await listSearchSuggestions({ query: 'Infl', category: 'welt', limit: 5 });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/search-suggestions');
    expect(url).toContain('q=Infl');
    expect(url).toContain('category=welt');
    expect(url).toContain('limit=5');
    expect(result.data).toHaveLength(1);
  });

  test('listPublicFeed hits /feed', async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ items: [ARTICLE], count: 1, cached: false }),
    );
    const result = await listPublicFeed({ tab: 'popular', limit: 12 });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/content/news/feed');
    expect(url).toContain('tab=popular');
    expect(result.cached).toBe(false);
    expect(result.count).toBe(1);
  });
});

// Verifies that newsService composes the Supabase query builder correctly.
// We mock `@/lib/supabase` with a chainable thenable so each public method
// can assert on filter/order/range arguments and resolve to a canned payload.

const ARTICLE = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'hallo-welt-aaaaaaa',
  guid: 'urn:euronews:1',
  title: 'Hallo Welt',
  summary: 'Kurzfassung',
  content: 'Langer Text',
  image_url: null,
  category: 'world',
  source_url: 'https://de.euronews.com/foo',
  published_at: '2026-05-07T10:00:00.000Z',
  language: 'de',
  view_count: 0,
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

const makeBuilder = ({ list, single } = {}) => {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    textSearch: jest.fn(() => b),
    order: jest.fn(() => b),
    range: jest.fn(() => b),
    abortSignal: jest.fn(() => b),
    not: jest.fn(() => b),
    maybeSingle: jest.fn(() => Promise.resolve(single ?? { data: null, error: null })),
    then: (resolve) => resolve(list ?? { data: [], count: 0, error: null }),
  };
  return b;
};

const mockFrom = jest.fn();
const mockRpc = jest.fn(() => Promise.resolve({ data: null, error: null }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}));

const {
  listArticles,
  getArticleBySlug,
  incrementArticleView,
  listVideos,
  getVideoBySlug,
  incrementVideoView,
} = require('@/services/newsService');

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockRpc.mockReturnValue(Promise.resolve({ data: null, error: null }));
});

describe('listArticles', () => {
  test('orders by published_at desc by default and applies pagination', async () => {
    const builder = makeBuilder({
      list: { data: [ARTICLE], count: 1, error: null },
    });
    mockFrom.mockReturnValue(builder);

    const result = await listArticles({ limit: 10, offset: 20 });

    expect(mockFrom).toHaveBeenCalledWith('news_articles');
    expect(builder.order).toHaveBeenCalledWith('published_at', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(20, 29);
    expect(builder.eq).not.toHaveBeenCalled();
    expect(builder.textSearch).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [ARTICLE], count: 1 });
  });

  test('filters by category when provided', async () => {
    const builder = makeBuilder({ list: { data: [], count: 0, error: null } });
    mockFrom.mockReturnValue(builder);

    await listArticles({ category: 'world' });

    expect(builder.eq).toHaveBeenCalledWith('category', 'world');
  });

  test("does not filter when category is 'all'", async () => {
    const builder = makeBuilder({ list: { data: [], count: 0, error: null } });
    mockFrom.mockReturnValue(builder);

    await listArticles({ category: 'all' });

    expect(builder.eq).not.toHaveBeenCalled();
  });

  test('uses fuzzy search RPC when search is non-empty', async () => {
    mockRpc.mockReturnValueOnce(
      Promise.resolve({
        data: { data: [ARTICLE], count: 1 },
        error: null,
      }),
    );

    const result = await listArticles({ search: '  Inflation  ' });

    expect(mockRpc).toHaveBeenCalledWith('news_fuzzy_search', {
      p_source: 'articles',
      p_query: 'Inflation',
      p_category: 'all',
      p_tab: 'recent',
      p_limit: 20,
      p_offset: 0,
    });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [ARTICLE], count: 1 });
  });

  test('orders by view_count when tab=popular', async () => {
    const builder = makeBuilder({ list: { data: [], count: 0, error: null } });
    mockFrom.mockReturnValue(builder);

    await listArticles({ tab: 'popular' });

    expect(builder.order).toHaveBeenNthCalledWith(1, 'view_count', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'published_at', { ascending: false });
  });

  test('throws when supabase returns an error', async () => {
    const builder = makeBuilder({
      list: { data: null, count: null, error: new Error('boom') },
    });
    mockFrom.mockReturnValue(builder);

    await expect(listArticles({})).rejects.toThrow('boom');
  });
});

describe('getArticleBySlug', () => {
  test('selects and filters by slug, returns the single row', async () => {
    const builder = makeBuilder({ single: { data: ARTICLE, error: null } });
    mockFrom.mockReturnValue(builder);

    const out = await getArticleBySlug('hallo-welt-aaaaaaa');

    expect(builder.eq).toHaveBeenCalledWith('slug', 'hallo-welt-aaaaaaa');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(out).toEqual(ARTICLE);
  });

  test('returns null when no row matches', async () => {
    const builder = makeBuilder({ single: { data: null, error: null } });
    mockFrom.mockReturnValue(builder);

    const out = await getArticleBySlug('missing');
    expect(out).toBeNull();
  });
});

describe('incrementArticleView', () => {
  test('invokes news_increment_view RPC with the slug', async () => {
    await incrementArticleView('foo-bar');
    expect(mockRpc).toHaveBeenCalledWith('news_increment_view', { p_slug: 'foo-bar' });
  });

  test('swallows RPC errors silently', async () => {
    mockRpc.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'denied' } }),
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(incrementArticleView('foo')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('listVideos', () => {
  test('queries news_videos and paginates by published_at desc', async () => {
    const builder = makeBuilder({
      list: { data: [VIDEO], count: 1, error: null },
    });
    mockFrom.mockReturnValue(builder);

    const result = await listVideos({ limit: 5, offset: 10 });

    expect(mockFrom).toHaveBeenCalledWith('news_videos');
    expect(builder.range).toHaveBeenCalledWith(10, 14);
    expect(builder.order).toHaveBeenCalledWith('published_at', { ascending: false });
    expect(result).toEqual({ data: [VIDEO], count: 1 });
  });

  test('uses fuzzy search RPC for videos', async () => {
    mockRpc.mockReturnValueOnce(
      Promise.resolve({
        data: { data: [VIDEO], count: 1 },
        error: null,
      }),
    );

    const result = await listVideos({ search: '  Klima  ' });

    expect(mockRpc).toHaveBeenCalledWith('news_fuzzy_search', {
      p_source: 'videos',
      p_query: 'Klima',
      p_category: 'all',
      p_tab: 'recent',
      p_limit: 20,
      p_offset: 0,
    });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [VIDEO], count: 1 });
  });

  test('orders by view_count when videos tab is popular', async () => {
    const builder = makeBuilder({ list: { data: [], count: 0, error: null } });
    mockFrom.mockReturnValue(builder);

    await listVideos({ tab: 'popular' });

    expect(builder.order).toHaveBeenNthCalledWith(1, 'view_count', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'published_at', { ascending: false });
  });
});

describe('getVideoBySlug', () => {
  test('selects and filters by video slug', async () => {
    const builder = makeBuilder({ single: { data: VIDEO, error: null } });
    mockFrom.mockReturnValue(builder);

    const out = await getVideoBySlug(VIDEO.slug);

    expect(builder.eq).toHaveBeenCalledWith('slug', VIDEO.slug);
    expect(out).toEqual(VIDEO);
  });
});

describe('incrementVideoView', () => {
  test('invokes news_increment_video_view RPC with the slug', async () => {
    await incrementVideoView('video-slug');
    expect(mockRpc).toHaveBeenCalledWith('news_increment_video_view', {
      p_slug: 'video-slug',
    });
  });
});

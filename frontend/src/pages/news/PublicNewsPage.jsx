import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import { useNewsList } from '@/hooks/useNewsList';
import { useNewsCategorySections } from '@/hooks/useNewsCategorySections';
import { useNewsSearchHistory } from '@/hooks/useNewsSearchHistory';
import { useNewsSearchSuggestions } from '@/hooks/useNewsSearchSuggestions';
import { groupVideosByShowLabel } from '@/lib/news/formatNews';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import NewsHeroFeatured from '@/components/news/NewsHeroFeatured';
import PublicNewsCard from '@/components/news/PublicNewsCard';
import PublicVideoGroups from '@/components/news/PublicVideoGroups';
import PublicNewsTabs from '@/components/news/PublicNewsTabs';
import PublicNewsCategoryNav from '@/components/news/PublicNewsCategoryNav';
import NewsCategorySections from '@/components/news/NewsCategorySections';
import PublicNewsSearchBar from '@/components/news/PublicNewsSearchBar';
import PublicNewsListSkeleton from '@/components/news/PublicNewsListSkeleton';
import PublicNewsEmptyState from '@/components/news/PublicNewsEmptyState';
import PublicNewsErrorState from '@/components/news/PublicNewsErrorState';

const PublicNewsPage = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('recent');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const isVideoTab = tab === 'videos';
  const { recent, remember } = useNewsSearchHistory();

  const {
    items,
    count,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    debouncedSearch,
  } = useNewsList({
    source: isVideoTab ? 'videos' : 'articles',
    tab: isVideoTab ? 'recent' : tab,
    category: isVideoTab ? 'all' : category,
    search,
    publicFeed: true,
    enabled: !(!isVideoTab && category === 'all' && tab === 'recent' && !search),
  });

  const { suggestions, loading: suggestionsLoading } = useNewsSearchSuggestions({
    query: search,
    category: isVideoTab ? 'all' : category,
    enabled: !isVideoTab,
  });

  const showSectionLayout =
    !isVideoTab && category === 'all' && tab === 'recent' && !search;

  const highlightQuery = debouncedSearch.trim();

  const { sections, loading: sectionsLoading } = useNewsCategorySections({
    enabled: showSectionLayout,
    limit: 4,
  });

  const sentinelRef = useRef(null);
  useEffect(() => {
    if (showSectionLayout) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) loadMore();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, showSectionLayout]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length >= 2) remember(trimmed);
  }, [search, remember]);

  useEffect(() => {
    const fromUrl = searchParams.get('category');
    if (fromUrl) {
      setCategory(fromUrl);
      setTab('recent');
    }
  }, [searchParams]);

  const featuredArticle = useMemo(() => {
    if (!showSectionLayout) return null;
    return sections.news?.[0] ?? sections.business?.[0] ?? null;
  }, [showSectionLayout, sections]);

  const gridItems = useMemo(() => {
    if (showSectionLayout) return [];
    return items;
  }, [items, showSectionLayout]);

  const videoGroups = useMemo(
    () => (isVideoTab ? groupVideosByShowLabel(items) : []),
    [isVideoTab, items],
  );

  const handleTabChange = (next) => {
    setTab(next);
    if (next === 'videos') {
      setCategory('all');
      setSearch('');
    }
  };

  const handleCategoryChange = (slug) => {
    setCategory(slug);
    setTab('recent');
    setSearch('');
  };

  const mainLoading = showSectionLayout ? sectionsLoading : loading;
  const mainEmpty = showSectionLayout
    ? !sectionsLoading && Object.values(sections).every((arr) => !arr?.length)
    : !loading && items.length === 0;

  return (
    <PublicNewsLayout>
      <PageMeta
        title="News"
        description="Aktuelle Meldungen und Marktübersicht."
        path="/news"
        noIndex
      />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <PublicNewsSearchBar
            value={search}
            onChange={setSearch}
            recentSearches={recent}
            onSelectRecent={setSearch}
            onRemember={remember}
            onCategoryPick={handleCategoryChange}
            showSuggestions
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            onSelectSuggestion={setSearch}
          />
        </div>
        <PublicNewsTabs value={tab} onChange={handleTabChange} />
      </div>

      <div className="mb-6">
        <PublicNewsCategoryNav
          category={category}
          view={isVideoTab ? 'videos' : 'articles'}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {error ? (
        <PublicNewsErrorState error={error} onRetry={refresh} />
      ) : mainLoading ? (
        <PublicNewsListSkeleton count={6} />
      ) : mainEmpty ? (
        <PublicNewsEmptyState
          title={
            isVideoTab
              ? 'Aktuell keine Videos gefunden.'
              : 'Aktuell keine Meldungen gefunden.'
          }
          description={
            search
              ? 'Versuchen Sie einen anderen Suchbegriff oder wählen Sie eine Kategorie.'
              : undefined
          }
        />
      ) : (
        <div>
          {showSectionLayout ? (
            <>
              {featuredArticle && (
                <NewsHeroFeatured article={featuredArticle} />
              )}
              <NewsCategorySections
                sections={sections}
                loading={sectionsLoading}
                onSelectCategory={handleCategoryChange}
                excludeArticleId={featuredArticle?.id}
              />
            </>
          ) : (
            <>
              {isVideoTab ? (
                <PublicVideoGroups groups={videoGroups} highlightQuery={highlightQuery} />
              ) : (
                gridItems.length > 0 && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                    {gridItems.map((item) => (
                      <PublicNewsCard
                        key={item.id}
                        article={item}
                        highlightQuery={highlightQuery}
                      />
                    ))}
                  </div>
                )
              )}

              {(hasMore || loadingMore) && (
                <div
                  ref={sentinelRef}
                  className="mt-8 flex h-12 items-center justify-center text-xs text-bank-text-muted"
                >
                  {loadingMore ? 'Weitere Meldungen werden geladen…' : ''}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PublicNewsLayout>
  );
};

export default PublicNewsPage;

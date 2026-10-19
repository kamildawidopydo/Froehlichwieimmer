import React, { useEffect, useRef, useState } from 'react';
import { Newspaper } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
} from '@/components/dashboard/PageHeader';
import PageMeta from '@/components/PageMeta';
import { useNewsList } from '@/hooks/useNewsList';
import NewsCard from '@/components/dashboard/news/NewsCard';
import VideoCard from '@/components/dashboard/news/VideoCard';
import NewsTabs from '@/components/dashboard/news/NewsTabs';
import NewsCategoryChips from '@/components/dashboard/news/NewsCategoryChips';
import NewsSearchBar from '@/components/dashboard/news/NewsSearchBar';
import NewsListSkeleton from '@/components/dashboard/news/NewsListSkeleton';
import NewsEmptyState from '@/components/dashboard/news/NewsEmptyState';
import NewsErrorState from '@/components/dashboard/news/NewsErrorState';

const NewsPage = () => {
  const [tab, setTab] = useState('recent');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const isVideoTab = tab === 'videos';

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useNewsList({
    source: isVideoTab ? 'videos' : 'articles',
    tab: isVideoTab ? 'recent' : tab,
    category: isVideoTab ? 'all' : category,
    search,
  });

  const sentinelRef = useRef(null);
  useEffect(() => {
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
  }, [loadMore]);

  return (
    <PageContainer>
      <PageMeta
        title="Nachrichten"
        description="Aktuelle Meldungen aus Deutschland und der Welt – kuratiert von Euronews."
        path="/dashboard/news"
        noIndex
      />
      <PageHeader
        eyebrow="Aktivität"
        title="Nachrichten"
        icon={Newspaper}
        description="Aktuelle Meldungen aus Deutschland und der Welt – kuratiert von Euronews."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <NewsSearchBar value={search} onChange={setSearch} />
        <NewsTabs value={tab} onChange={setTab} />
      </div>

      {!isVideoTab && (
        <div className="mb-6">
          <NewsCategoryChips value={category} onChange={setCategory} />
        </div>
      )}

      {error ? (
        <NewsErrorState error={error} onRetry={refresh} />
      ) : loading ? (
        <NewsListSkeleton count={6} />
      ) : items.length === 0 ? (
        <NewsEmptyState
          title={
            isVideoTab
              ? 'Aktuell keine Videos gefunden.'
              : 'Aktuell keine Meldungen gefunden.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              isVideoTab ? (
                <VideoCard key={item.id} video={item} />
              ) : (
                <NewsCard key={item.id} article={item} />
              )
            ))}
          </div>

          {(hasMore || loadingMore) && (
            <div
              ref={sentinelRef}
              className="mt-6 flex h-12 items-center justify-center text-xs text-bank-text-muted"
            >
              {loadingMore ? 'Weitere Meldungen werden geladen...' : ''}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default NewsPage;

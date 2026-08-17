import React from 'react';
import { NEWS_SECTION_CATEGORIES, categoryLabel } from '@/lib/news/euronewsFeeds';
import PublicNewsCard from '@/components/news/PublicNewsCard';
import PublicNewsListSkeleton from '@/components/news/PublicNewsListSkeleton';
import { NewsCategorySectionHeader } from '@/components/news/PublicNewsCategoryNav';

const NewsCategorySections = ({ sections, loading, onSelectCategory, excludeArticleId }) => {
  if (loading) {
    return (
      <div className="space-y-10">
        {NEWS_SECTION_CATEGORIES.slice(0, 3).map((slug) => (
          <div key={slug}>
            <NewsCategorySectionHeader title={categoryLabel(slug)} />
            <PublicNewsListSkeleton count={3} />
          </div>
        ))}
      </div>
    );
  }

  const visible = NEWS_SECTION_CATEGORIES.filter(
    (slug) => (sections[slug] ?? []).length > 0,
  ).map((slug) => ({ slug, label: categoryLabel(slug) }));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-12">
      {visible.map((cat) => {
        let items = sections[cat.slug] ?? [];
        if (excludeArticleId) {
          items = items.filter((a) => a.id !== excludeArticleId);
        }
        if (items.length === 0) return null;
        return (
          <section key={cat.slug}>
            <NewsCategorySectionHeader
              title={categoryLabel(cat.slug)}
              onShowAll={() => onSelectCategory?.(cat.slug)}
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((article) => (
                <PublicNewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default NewsCategorySections;

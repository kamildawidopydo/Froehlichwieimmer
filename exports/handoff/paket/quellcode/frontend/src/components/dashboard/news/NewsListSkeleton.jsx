import React from 'react';

const NewsCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-bank-border/80 bg-white shadow-sm">
    <div className="aspect-[16/9] w-full animate-pulse bg-bank-surface/80" />
    <div className="space-y-3 p-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-bank-surface/80" />
      <div className="h-3 w-full animate-pulse rounded bg-bank-surface/60" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-bank-surface/60" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-bank-surface/60" />
    </div>
  </div>
);

const NewsListSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <NewsCardSkeleton key={i} />
    ))}
  </div>
);

export default NewsListSkeleton;

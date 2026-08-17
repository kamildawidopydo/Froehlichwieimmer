import React from 'react';

const CardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-bank-border/60 bg-bank-surface shadow-sm dark:bg-bank-ink/20">
    <div className="aspect-[16/9] w-full animate-pulse bg-bank-bg/70" />
    <div className="space-y-3 p-5">
      <div className="h-5 w-4/5 animate-pulse rounded bg-bank-bg/80" />
      <div className="h-3 w-full animate-pulse rounded bg-bank-bg/60" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-bank-bg/60" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-bank-bg/50" />
    </div>
  </div>
);

const PublicNewsListSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default PublicNewsListSkeleton;

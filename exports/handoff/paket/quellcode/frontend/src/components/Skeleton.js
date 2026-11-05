import React from 'react';

export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-bank-border/40 via-bank-border/60 to-bank-border/40 bg-[length:200%_100%] rounded-md ${className}`}
    style={{ animation: 'shimmer 1.6s ease-in-out infinite' }}
    {...props}
  />
);

export const KPICardSkeleton = () => (
  <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-7 w-36 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr className="border-b border-bank-border/60">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const CardListSkeleton = ({ count = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-bank-border rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full mt-3" />
      </div>
    ))}
  </div>
);

const ShimmerKeyframes = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}</style>
);

export const SkeletonStyles = ShimmerKeyframes;

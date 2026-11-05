import React from 'react';
import { cn } from '@/lib/utils';
import MarktuebersichtSidebar from '@/components/news/MarktuebersichtSidebar';

const PublicNewsLayout = ({ children, className, showSidebar = true }) => (
  <div className={cn('min-h-screen bg-bank-bg', className)}>
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
      <div
        className={cn(
          showSidebar && 'lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_340px]',
        )}
      >
        <div className="min-w-0">{children}</div>
        {showSidebar && (
          <div className="mt-10 min-w-0 lg:mt-0">
            <MarktuebersichtSidebar />
          </div>
        )}
      </div>
    </div>
  </div>
);

export default PublicNewsLayout;

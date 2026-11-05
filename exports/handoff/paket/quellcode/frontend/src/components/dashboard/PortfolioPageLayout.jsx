import React from 'react';
import { cn } from '@/lib/utils';

/** Portfolio pages: single-column main content (account summary lives on Übersicht hero only). */
const PortfolioPageLayout = ({ children, className }) => (
  <div className={cn('min-w-0 w-full max-w-full overflow-x-clip', className)}>{children}</div>
);

export default PortfolioPageLayout;

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import DashboardMobileNav from './DashboardMobileNav';
import MarketTicker from './MarketTicker';
import DashboardPageTransition from './motion/DashboardPageTransition';

const DashboardShell = ({ items, brand, profilePath, banner, className, showMarketTicker = false, showMobileNav = true }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={cn('flex min-h-screen w-full max-w-full overflow-x-clip bg-bank-bg', className)}>
      <DashboardSidebar items={items} brand={brand} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(280px,88vw)] p-0 bg-white dark:bg-bank-surface">
          <DashboardSidebar
            items={items}
            brand={brand}
            mobile
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          profilePath={profilePath}
          onOpenMobileNav={() => setMobileOpen(true)}
          showMenuButton={!showMobileNav}
        />
        {banner}
        {showMarketTicker && (
          <div className="border-b border-bank-border bg-white dark:bg-bank-surface">
            <div className="px-4 sm:px-6">
              <MarketTicker className="mb-0 border-0 shadow-none" compact />
            </div>
          </div>
        )}
        <main
          className={cn(
            'dashboard-main dashboard-page min-w-0 flex-1 w-full max-w-full',
            showMobileNav && 'pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0',
          )}
        >
          <DashboardPageTransition>
            <Outlet />
          </DashboardPageTransition>
        </main>
        {showMobileNav && <DashboardMobileNav onOpenMenu={() => setMobileOpen(true)} />}
      </div>
    </div>
  );
};

export default DashboardShell;

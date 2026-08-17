import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';
import PortfolioTabs from '@/components/dashboard/PortfolioTabs';
import QuickActionBar from '@/components/dashboard/portfolio/QuickActionBar';
import GesamtuebersichtSection from '@/components/dashboard/GesamtuebersichtSection';
import { cn } from '@/lib/utils';
import { DashboardShowcaseProviders } from '@/components/editorial/showcase/DashboardShowcaseProviders';
import {
  createUserDashboardNavItems,
  SHOWCASE_NAV_BADGES,
} from '@/components/dashboard/userDashboardNav';

/** 16:12 canvas — matches TabletMockup aspect ratio for gap-free scaling. */
const CANVAS_W = 1280;
const CANVAS_H = 960;

function useFitScale(width, height) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ scale: 0.45, width: width * 0.45, height: height * 0.45 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      const scale = Math.min(box.width / width, box.height / height);
      setFit({
        scale,
        width: width * scale,
        height: height * scale,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [width, height]);

  return { ref, ...fit };
}

const ShowcaseBrand = {
  title: 'Kapitalmitte',
  subtitle: 'Mein Vermögen',
  shortLabel: 'BR',
};

const showcaseNavItems = createUserDashboardNavItems(SHOWCASE_NAV_BADGES);

const TICKER_ROWS = [
  { label: 'DAX', price: 18432.5, changePct: 0.42 },
  { label: 'S&P 500', price: 5842.1, changePct: 0.18 },
  { label: 'EUR/USD', price: 1.0842, changePct: -0.05 },
];

const formatIndexValue = (v) =>
  Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPct = (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}%`;

const ShowcaseTicker = () => (
  <div className="shrink-0 border-b border-bank-border bg-white dark:bg-bank-surface">
    <div className="overflow-hidden px-4 py-1 sm:px-6">
      <div className="flex min-w-max divide-x divide-bank-border/60">
        {TICKER_ROWS.map((idx) => {
          const up = idx.changePct >= 0;
          return (
            <div key={idx.label} className="flex min-w-[10.5rem] flex-1 items-center justify-between gap-3 px-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">
                  {idx.label}
                </p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-bank-text">
                  {formatIndexValue(idx.price)}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold tabular-nums',
                  up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                )}
              >
                {up ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
                {formatPct(idx.changePct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

function ShowcaseDashboardFrame() {
  const navItems = useMemo(() => showcaseNavItems, []);

  return (
    <div className="dashboard-theme flex h-full w-full flex-col overflow-hidden bg-bank-bg text-left">
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar
          items={navItems}
          brand={ShowcaseBrand}
          previewActivePath="/dashboard/vermoegen"
          showcase
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar profilePath="/dashboard/profil" showMenuButton={false} showcase />

          <ShowcaseTicker />

          <main className="min-h-0 flex-1 overflow-hidden bg-bank-bg">
            <div className="h-full px-5 py-3">
              <div className="min-w-0 overflow-hidden">
                <PortfolioTabs active="dashboard" onChange={() => {}} compact />
                <div className="[&>div]:mb-3">
                  <QuickActionBar />
                </div>
                <GesamtuebersichtSection loading={false} showcase />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Login tablet preview — real dashboard components, scaled to the tablet frame.
 */
const DashboardShowcase = () => {
  const { ref, scale, width: clipW, height: clipH } = useFitScale(CANVAS_W, CANVAS_H);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-bank-bg">
      {/* Clip wrapper sized to the visual bounds — prevents phantom scrollbars from the pre-scale layout box. */}
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: clipW, height: clipH }}
      >
        <div
          className="pointer-events-none select-none"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          aria-hidden
        >
          <DashboardShowcaseProviders>
            <ShowcaseDashboardFrame />
          </DashboardShowcaseProviders>
        </div>
      </div>
    </div>
  );
};

export default DashboardShowcase;

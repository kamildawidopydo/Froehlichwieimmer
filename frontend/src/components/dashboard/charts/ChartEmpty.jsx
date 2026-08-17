import React from 'react';
import Lottie from 'lottie-react';
import { useReducedMotion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import emptyChartAnimation from '@/assets/lottie/empty-chart.json';

const ChartEmpty = ({
  height = 240,
  hint = 'Keine Daten verfügbar.',
  sub,
  className,
  icon: Icon = BarChart3,
  lottie = false,
}) => {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-bank-border/80 bg-bank-bg/40 px-4 text-center',
        className,
      )}
      style={height != null ? { height, minHeight: height } : undefined}
    >
      {lottie && !reduced ? (
        <Lottie
          animationData={emptyChartAnimation}
          loop
          className="mb-1 h-[72px] w-[72px] opacity-80"
          aria-hidden
        />
      ) : (
        <Icon size={22} strokeWidth={LUCIDE_STROKE} className="mb-2 text-bank-primary/35" aria-hidden />
      )}
      <p className="text-[13px] text-bank-text-muted">{hint}</p>
      {sub ? <p className="mt-1 text-[11px] text-bank-text-muted/75">{sub}</p> : null}
    </div>
  );
};

export default ChartEmpty;

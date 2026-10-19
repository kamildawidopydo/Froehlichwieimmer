import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardMotion } from './dashboardMotion';

/** Animated white card shell — charts, sections, widgets. */
const DashboardPanel = ({ children, className, index = 0 }) => {
  const { panel } = useDashboardMotion();

  return (
    <motion.div
      {...panel}
      transition={panel.transition ? { ...panel.transition, delay: index * 0.06 } : undefined}
      className={cn(
        'rounded-xl border border-bank-border bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-editorial-sm',
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export default DashboardPanel;

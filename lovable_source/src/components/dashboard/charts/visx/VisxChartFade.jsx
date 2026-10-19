import React from 'react';
import { motion } from 'framer-motion';
import { DASHBOARD_EASE, useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';

/** Crossfade Visx chart layers when data key changes (range/mode/filter). */
const VisxChartFade = ({ chartKey, children }) => {
  const { reduced } = useDashboardMotion();

  if (reduced) {
    return <g>{children}</g>;
  }

  return (
    <motion.g
      key={chartKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, ease: DASHBOARD_EASE }}
    >
      {children}
    </motion.g>
  );
};

export default VisxChartFade;

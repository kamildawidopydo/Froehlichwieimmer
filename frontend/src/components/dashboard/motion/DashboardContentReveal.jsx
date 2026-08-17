import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardMotion } from './dashboardMotion';

/** Skeleton → content crossfade for dashboard loading states. */
const DashboardContentReveal = ({ loading, skeleton, children, className }) => {
  const { panel } = useDashboardMotion();

  if (loading) return skeleton;

  return (
    <motion.div
      {...panel}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

export default DashboardContentReveal;

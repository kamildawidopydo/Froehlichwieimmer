import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DASHBOARD_EASE, dashboardTransition } from './dashboardMotion';

/** Fade/slide when tab or segmented control changes. */
const DashboardTabPanel = ({ tabKey, children, className }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={dashboardTransition(0.22)}
      className={cn(className)}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default DashboardTabPanel;

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useDashboardMotion } from './dashboardMotion';

/** Route-level fade for dashboard pages. */
const DashboardPageTransition = ({ children }) => {
  const location = useLocation();
  const { page } = useDashboardMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={page.initial}
        animate={page.animate}
        exit={page.exit}
        transition={page.transition}
        className="min-h-full min-w-0 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardPageTransition;

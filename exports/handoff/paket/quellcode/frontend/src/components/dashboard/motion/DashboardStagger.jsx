import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardMotion } from './dashboardMotion';

export const DashboardStagger = ({ children, className, delayChildren = 0.04 }) => {
  const { reduced, container, stagger } = useDashboardMotion();

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate="visible"
      variants={
        reduced
          ? container
          : {
              hidden: {},
              visible: {
                transition: { staggerChildren: stagger, delayChildren },
              },
            }
      }
    >
      {children}
    </motion.div>
  );
};

export const DashboardStaggerItem = ({ children, className }) => {
  const { item } = useDashboardMotion();

  return (
    <motion.div className={cn(className)} variants={item}>
      {children}
    </motion.div>
  );
};

export default DashboardStagger;

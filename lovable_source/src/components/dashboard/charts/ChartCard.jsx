import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';

const ChartCard = ({ icon: Icon, title, children, className, bodyClassName, index = 0 }) => {
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
      <h3 className="chart-title relative z-10 mb-4 inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
        {Icon && <Icon size={16} strokeWidth={1.6} className="text-bank-primary" />}
        {title}
      </h3>
      <div className={cn('relative z-0 min-h-[200px] pt-0.5', bodyClassName)}>{children}</div>
    </motion.div>
  );
};

export default ChartCard;

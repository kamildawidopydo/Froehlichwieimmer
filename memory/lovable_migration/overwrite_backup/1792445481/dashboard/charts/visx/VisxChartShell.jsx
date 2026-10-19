import React from 'react';
import { ParentSize } from '@visx/responsive';
import { cn } from '@/lib/utils';

const VisxChartShell = ({
  height,
  className,
  children,
  onMouseMove,
  onMouseLeave,
  role = 'img',
  ariaLabel,
}) => (
  <div
    className={cn('relative w-full', className)}
    style={{ height }}
    onMouseMove={onMouseMove}
    onMouseLeave={onMouseLeave}
    role={role}
    aria-label={ariaLabel}
  >
    <ParentSize debounceTime={10}>
      {({ width, height: h }) =>
        width > 0 && h > 0 ? children({ width, height: h }) : null
      }
    </ParentSize>
  </div>
);

export default VisxChartShell;

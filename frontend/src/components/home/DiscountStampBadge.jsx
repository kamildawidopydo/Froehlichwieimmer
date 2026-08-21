import { cn } from '@/lib/utils';

const STAMP_PATH =
  'M50 2 L58 8 L68 4 L72 14 L82 16 L80 26 L88 34 L82 44 L88 54 L80 62 L82 72 L72 74 L68 84 L58 80 L50 88 L42 80 L32 84 L28 74 L18 72 L20 62 L12 54 L18 44 L12 34 L20 26 L18 16 L28 14 L32 4 L42 8 Z';

/**
 * Scalloped discount stamp badge — shared by Aktien & Anleihen promos.
 * @param {{ className?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; topLabel?: string; rate: string; bottomLabel?: string }} props
 */
const DiscountStampBadge = ({
  className,
  size = 'md',
  topLabel = 'BIS ZU',
  rate,
  bottomLabel = 'RABATT',
}) => {
  const dims = size === 'xs' ? 52 : size === 'sm' ? 64 : size === 'lg' ? 108 : 88;
  const rateFontSize = rate.length > 5 ? 11 : rate.length > 4 ? 13 : 18;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: dims, height: dims }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_4px_12px_rgb(76_124_186/0.35)]">
        <path d={STAMP_PATH} fill="#3A6499" />
        <circle cx="50" cy="50" r="32" fill="#4C7CBA" />
        <text
          x="50"
          y="36"
          textAnchor="middle"
          fill="white"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.08em"
        >
          {topLabel}
        </text>
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fill="white"
          fontSize={rateFontSize}
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
        >
          {rate}
        </text>
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fill="white"
          fontSize="6.5"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.05em"
        >
          {bottomLabel}
        </text>
      </svg>
    </div>
  );
};

export default DiscountStampBadge;

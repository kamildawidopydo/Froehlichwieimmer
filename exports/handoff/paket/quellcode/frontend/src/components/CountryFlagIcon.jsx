import { cn } from '@/lib/utils';
import { getCountryIso, getCountryLabelDe } from '@/lib/countryFlags';

/** flagcdn.com only serves fixed sizes (e.g. 16x12, w20, w40) — not arbitrary widths like w16. */
const SIZE_MAP = {
  xs: { path: '16x12', path2x: '32x24', w: 16, h: 12, className: 'h-3 w-4' },
  sm: { path: 'w20', path2x: 'w40', w: 20, h: 15, className: 'h-3.5 w-5' },
  md: { path: 'w40', path2x: 'w80', w: 40, h: 30, className: 'h-4 w-6' },
  lg: { path: 'w80', path2x: 'w160', w: 80, h: 60, className: 'h-5 w-7' },
};

/**
 * Zuverlässige Länderflagge (PNG) — unabhängig von Emoji-Rendering (z. B. „LT“ unter Windows).
 */
export default function CountryFlagIcon({
  country,
  size = 'sm',
  showLabel = false,
  labelUppercase = false,
  className,
  labelClassName,
}) {
  const iso = getCountryIso(country);
  const dim = SIZE_MAP[size] || SIZE_MAP.sm;
  const label = getCountryLabelDe(country, { uppercase: labelUppercase });

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <img
        src={`https://flagcdn.com/${dim.path}/${iso}.png`}
        srcSet={`https://flagcdn.com/${dim.path2x}/${iso}.png 2x`}
        alt=""
        width={dim.w}
        height={dim.h}
        className={cn(
          'shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10',
          dim.className,
        )}
        loading="lazy"
        decoding="async"
      />
      {showLabel && label ? (
        <span className={labelClassName}>{label}</span>
      ) : null}
    </span>
  );
}

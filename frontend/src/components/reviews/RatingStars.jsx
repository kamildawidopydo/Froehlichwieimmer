import React from 'react';
import { Star } from 'lucide-react';

/**
 * Read-only star display. `value` 0-5, decimals rounded to nearest half.
 */
export const StarsDisplay = ({ value = 0, size = 16, className = '' }) => {
  const rounded = Math.round(Math.max(0, Math.min(5, Number(value) || 0)) * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rounded} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.floor(rounded);
        const half = !filled && i - 0.5 === rounded;
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              width={size}
              height={size}
              className="text-bank-gold"
              strokeWidth={1.4}
              fill={filled ? 'currentColor' : 'none'}
            />
            {half && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: size / 2 }}>
                <Star width={size} height={size} className="text-bank-gold" strokeWidth={1.4} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};

/**
 * Interactive 1-5 star picker used in the submit form.
 */
export const StarsPicker = ({ value = 0, onChange, size = 32, testIdPrefix = 'star-input' }) => {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Sternebewertung">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= (hover || value);
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === value}
            aria-label={`${i} Sterne`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(i)}
            className="p-1 transition-transform hover:scale-110 focus:scale-110 focus:outline-none"
            data-testid={`${testIdPrefix}-${i}`}
          >
            <Star
              width={size}
              height={size}
              className={active ? 'text-bank-gold' : 'text-neutral-300'}
              strokeWidth={1.2}
              fill={active ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarsDisplay;

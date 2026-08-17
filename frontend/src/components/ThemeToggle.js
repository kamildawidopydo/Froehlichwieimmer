import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

/**
 * Editorial theme toggle — Sun / Moon swap.
 *
 * Variants:
 *   tone="dark"   → for dark navigation surfaces (white-ish glyph + accent blue on hover)
 *   tone="light"  → for light surfaces (ink-text glyph + accent blue on hover)
 * Sizes:
 *   compact       → 36×36 (mobile drawer / dense bars)
 *   default       → 40×40 (standard nav)
 */
const ThemeToggle = ({ compact = false, tone = 'dark', className }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? Sun : Moon;

  const base = compact ? 'h-9 w-9' : 'h-10 w-10';
  const palette =
    tone === 'light'
      ? 'border border-bank-border text-bank-text/75 hover:border-bank-accent-strong/45 hover:text-bank-accent-strong'
      : 'border border-white/22 text-white/80 hover:border-bank-accent/55 hover:text-bank-accent';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
      title={isDark ? 'Hell' : 'Dunkel'}
      data-theme={resolvedTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-bg',
        base,
        palette,
        className
      )}
    >
      <Icon size={compact ? 16 : 17} strokeWidth={1.5} />
    </button>
  );
};

export default ThemeToggle;

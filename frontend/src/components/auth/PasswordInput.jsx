import React, { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const copyPassword = async (value) => {
  const text = String(value || '');
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Passwort kopiert.');
  } catch {
    toast.error('Konnte nicht kopiert werden.');
  }
};

const PasswordInput = React.forwardRef(
  (
    {
      className,
      value,
      leftIcon,
      showCopy = true,
      showToggle = true,
      copyLabel = 'Passwort kopieren',
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);
    const hasValue = Boolean(String(value || '').length);
    const actionCount = (showCopy ? 1 : 0) + (showToggle ? 1 : 0);
    const actionPadding = actionCount === 2 ? 'pr-[4.5rem]' : actionCount === 1 ? 'pr-10' : '';

    return (
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-bank-gold">
            {leftIcon}
          </span>
        ) : null}
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          value={value}
          className={cn(leftIcon && 'pl-9', actionPadding, className)}
          {...props}
        />
        {(showCopy || showToggle) && (
          <div className="absolute right-1 top-1/2 z-[1] flex -translate-y-1/2 items-center gap-0.5">
            {showCopy ? (
              <button
                type="button"
                onClick={() => copyPassword(value)}
                disabled={!hasValue}
                aria-label={copyLabel}
                title={copyLabel}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-sm text-bank-text-muted transition-colors',
                  'hover:bg-bank-bg hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                  'disabled:pointer-events-none disabled:opacity-35',
                )}
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
            {showToggle ? (
              <button
                type="button"
                onClick={() => setVisible((prev) => !prev)}
                aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                title={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-sm text-bank-text-muted transition-colors',
                  'hover:bg-bank-bg hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                )}
              >
                {visible ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;

import React from 'react';
import BonusIcon from '@/components/BonusIcon';

const BonusBadge = ({ 
  amount, 
  size = 'md',
  variant = 'sticker',
  className = '' 
}) => {
  if (!amount || amount <= 0) return null;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 12,
      text: 'text-[10px]',
      amount: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 14,
      text: 'text-xs',
      amount: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 16,
      text: 'text-sm',
      amount: 'text-base',
    },
  };

  const s = sizeClasses[size];

  if (variant === 'sticker') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 rounded-full border border-bank-border bg-bank-ink text-white shadow-bank-card ${s.container} transition-transform hover:scale-[1.02] ${className}`}
        data-testid="bonus-badge"
      >
        <BonusIcon size={s.icon} className="flex-shrink-0" />
        <span className={`font-semibold ${s.amount} whitespace-nowrap tracking-tight`}>
          Bis zu €{amount}
        </span>
      </div>
    );
  }

  if (variant === 'ribbon') {
    return (
      <div 
        className={`absolute -top-1 -right-1 z-10 rounded-bl-lg rounded-tr-lg border border-bank-border bg-bank-ink px-3 py-1 text-white shadow-bank-card ${className}`}
        data-testid="bonus-badge-ribbon"
      >
        <div className="flex items-center gap-1">
          <BonusIcon size={s.icon} />
          <span className={`font-semibold ${s.text} whitespace-nowrap`}>
            +€{amount}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full border border-bank-border bg-bank-bg px-2 py-0.5 ${s.text} font-semibold text-bank-primary ${className}`}
        data-testid="bonus-badge-inline"
      >
        <BonusIcon size={10} />
        +€{amount}
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div 
        className={`flex items-center justify-center gap-2 border-b border-bank-border bg-bank-ink py-2 px-4 text-white ${className}`}
        data-testid="bonus-badge-banner"
      >
        <BonusIcon size={s.icon} />
        <span className={`font-semibold ${s.amount} uppercase tracking-wide`}>
          Bonus bis zu €{amount}
        </span>
      </div>
    );
  }

  return null;
};

export default BonusBadge;

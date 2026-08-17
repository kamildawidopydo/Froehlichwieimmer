import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

const DepositProtectionBadge = ({ 
  protection, 
  size = 'md', 
  variant = 'default',
  className = '' 
}) => {
  const extractAmount = (protectionString) => {
    if (!protectionString) return '€100.000';
    const match = protectionString.match(/€[\d,\.]+|SEK[\s\d,\.]+/);
    return match ? match[0] : '€100.000';
  };

  const amount = extractAmount(protection);
  const isEU = protection && !protection.includes('SEK');

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      shield: 14,
      text: 'text-[10px]',
      amount: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      shield: 16,
      text: 'text-xs',
      amount: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2',
      shield: 20,
      text: 'text-sm',
      amount: 'text-base',
    },
  };

  const variantClasses = {
    default: {
      bg: 'bg-gradient-to-r from-bank-bg to-bank-accent/10',
      border: 'border-bank-border',
      shield: 'text-bank-accent',
      text: 'text-bank-text-muted',
      check: 'text-bank-success',
    },
    compact: {
      bg: 'bg-bank-accent/10',
      border: 'border-bank-border',
      shield: 'text-bank-accent',
      text: 'text-bank-text-muted',
      check: 'text-bank-success',
    },
    highlight: {
      bg: 'bg-gradient-to-r from-bank-success/10 to-bank-success/5',
      border: 'border-bank-success/35',
      shield: 'text-bank-success',
      text: 'text-bank-success',
      check: 'text-bank-success',
    },
  };

  const s = sizeClasses[size];
  const v = variantClasses[variant];

  return (
    <div 
      className={`inline-flex items-center gap-2 ${v.bg} border ${v.border} rounded-lg ${s.container} ${className}`}
      data-testid="deposit-protection-badge"
    >
      <div className={`flex-shrink-0 ${v.shield}`}>
        <Shield size={s.shield} className="fill-current opacity-20" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <CheckCircle size={12} className={v.check} />
          <span className={`font-semibold ${s.text} ${v.text}`}>
            {isEU ? 'EU-Einlagensicherung' : 'Einlagensicherung'}
          </span>
        </div>
        <span className={`font-bold ${s.amount} ${v.text}`}>
          bis {amount}
        </span>
      </div>
    </div>
  );
};

export default DepositProtectionBadge;

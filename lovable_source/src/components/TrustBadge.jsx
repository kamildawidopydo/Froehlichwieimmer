import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

const TrustBadge = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center bg-bank-accent/10 border border-bank-border rounded-md px-3 py-1.5 ${className}`} data-testid="trust-badge">
      <Shield size={14} className="text-bank-accent mr-1.5" />
      <div className="flex flex-col">
        <div className="flex items-center">
          <CheckCircle2 size={12} className="text-bank-success mr-1" />
          <span className="text-xs font-semibold text-bank-text">EU-Einlagensicherung</span>
        </div>
        <span className="text-[10px] text-bank-text-muted">bis €100.000</span>
      </div>
    </div>
  );
};

export default TrustBadge;

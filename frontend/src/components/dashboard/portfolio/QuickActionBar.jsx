import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Banknote } from 'lucide-react';
import PayoutRequestDialog from '@/components/dashboard/portfolio/PayoutRequestDialog';

const QuickActionBar = () => {
  const { t } = useTranslation();
  const [payoutOpen, setPayoutOpen] = useState(false);
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link
        to="/dashboard/handeln"
        className="inline-flex items-center gap-1.5 rounded-full border border-bank-primary/30 bg-bank-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-bank-primary-hover"
      >
        <TrendingUp size={14} strokeWidth={1.6} />
        {t('shell.user.market', { defaultValue: 'Handeln' })}
      </Link>
      <button
        type="button"
        onClick={() => setPayoutOpen(true)}
        data-testid="quick-action-payout"
        className="inline-flex items-center gap-1.5 rounded-full border border-bank-border bg-white px-4 py-2 text-[13px] font-medium text-bank-text shadow-sm transition-colors hover:bg-bank-bg"
      >
        <Banknote size={14} strokeWidth={1.6} />
        Auszahlung beantragen
      </button>
      {payoutOpen && <PayoutRequestDialog onClose={() => setPayoutOpen(false)} />}
    </div>
  );
};

export default QuickActionBar;

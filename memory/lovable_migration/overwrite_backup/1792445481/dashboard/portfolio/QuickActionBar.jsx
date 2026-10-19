import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';

const QuickActionBar = () => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex">
      <Link
        to="/dashboard/handeln"
        className="inline-flex items-center gap-1.5 rounded-full border border-bank-primary/30 bg-bank-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-bank-primary-hover"
      >
        <TrendingUp size={14} strokeWidth={1.6} />
        {t('shell.user.market', { defaultValue: 'Handeln' })}
      </Link>
    </div>
  );
};

export default QuickActionBar;

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const VERMOEGEN_HUB_PATH = '/dashboard/vermoegen';

const VermoegenBreadcrumb = ({ current }) => {
  const { t } = useTranslation();
  const hubLabel = t('shell.user.wealthHub', { defaultValue: 'Mein Vermögen' });

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px]">
      <Link to={VERMOEGEN_HUB_PATH} className="font-medium text-bank-primary hover:underline">
        {hubLabel}
      </Link>
      <ChevronRight size={14} className="shrink-0 text-bank-text-muted" aria-hidden />
      <span className="text-bank-text-muted">{current}</span>
    </nav>
  );
};

export default VermoegenBreadcrumb;

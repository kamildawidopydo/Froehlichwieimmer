import React from 'react';
import { useParams } from 'react-router-dom';
import { useDashboardData } from '@/context/DashboardDataContext';
import StockDetail from '@/pages/StockDetail';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';

const DashboardStockDetailPage = () => {
  const { symbol } = useParams();
  const { gesamtvermoegen, stockMetrics } = useDashboardData();
  const decoded = decodeURIComponent(symbol || '');
  const positionMetric = (stockMetrics || []).find((m) => m.symbol === decoded);

  return (
    <PortfolioPageLayout>
      <StockDetail
        embedded
        portfolioTotal={gesamtvermoegen}
        positionMetric={positionMetric}
      />
    </PortfolioPageLayout>
  );
};

export default DashboardStockDetailPage;

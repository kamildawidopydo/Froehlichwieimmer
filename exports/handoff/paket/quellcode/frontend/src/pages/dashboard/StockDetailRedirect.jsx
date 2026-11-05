import { Navigate, useParams } from 'react-router-dom';

const StockDetailRedirect = () => {
  const { symbol } = useParams();
  return <Navigate to={`/dashboard/aktien/${encodeURIComponent(symbol || '')}`} replace />;
};

export default StockDetailRedirect;

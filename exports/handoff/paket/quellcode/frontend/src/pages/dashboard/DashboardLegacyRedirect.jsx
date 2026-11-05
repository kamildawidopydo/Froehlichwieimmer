import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Maps legacy ?tab=… deep links to the new dashboard route tree.
const TAB_MAP = {
  overview: '/dashboard/uebersicht',
  portfolio: '/dashboard/vermoegen',
  aktien: '/dashboard/aktien',
  depot: '/dashboard/vermoegen',
  watchlist: '/dashboard/aktien?tab=watchlist',
  orders: '/dashboard/auftraege',
  market: '/dashboard/handeln',
  favorites: '/dashboard/favoriten',
  history: '/dashboard/uebersicht',
  profile: '/dashboard/profil',
};

const DashboardLegacyRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  const target = (tab && TAB_MAP[tab]) || '/dashboard/uebersicht';
  return <Navigate to={target} replace />;
};

export default DashboardLegacyRedirect;

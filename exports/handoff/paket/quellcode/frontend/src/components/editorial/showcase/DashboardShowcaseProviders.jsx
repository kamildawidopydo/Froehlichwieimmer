import React, { useMemo } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { DashboardDataContext } from '@/context/DashboardDataContext';
import { buildDashboardShowcaseValue } from './dashboardShowcaseMock';

const SHOWCASE_USER = {
  id: 'showcase-user',
  first_name: 'Max',
  last_name: 'K.',
  email: 'max.k@example.com',
  avatar_url: null,
  role: 'user',
};

export const ShowcaseAuthProvider = ({ children }) => {
  const value = useMemo(
    () => ({
      user: SHOWCASE_USER,
      loading: false,
      login: async () => {},
      logout: async () => {},
      verifyEmailOtp: async () => {},
      sendEmailOtpForCurrentSession: async () => {},
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const DashboardShowcaseMockProvider = ({ children }) => {
  const value = useMemo(() => buildDashboardShowcaseValue(), []);
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
};

export const DashboardShowcaseProviders = ({ children }) => (
  <ShowcaseAuthProvider>
    <DashboardShowcaseMockProvider>{children}</DashboardShowcaseMockProvider>
  </ShowcaseAuthProvider>
);

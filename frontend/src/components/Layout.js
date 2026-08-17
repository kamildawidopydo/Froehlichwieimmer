import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const Layout = () => {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ paddingBottom: 'var(--live-ticker-h, 0px)' }}
    >
      <Navigation />
      <main className="flex-1 overflow-x-clip">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

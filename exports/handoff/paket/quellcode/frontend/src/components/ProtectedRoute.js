import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAllowedAppRole, isAdminRole } from '@/lib/role';

const ProtectedRoute = ({ children, requireAdmin = false, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bank-primary"></div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Hard contract: role must be exactly `user` or `admin`. Any other value
  // (legacy `anonymous`, NULL, ...) is treated as untrusted and bounced.
  if (!isAllowedAppRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = isAdminRole(user.role);

  if (user.must_change_password && !pathname.startsWith('/reset-password')) {
    return <Navigate to="/reset-password?mode=force" replace />;
  }

  if (user.role === 'recruiting' && !pathname.startsWith('/reset-password')) {
    return <Navigate to="/recruiting" replace />;
  }

  if (!isAdmin && !user.onboarding_completed) {
    if (!pathname.startsWith('/onboarding')) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (!isAdmin && user.onboarding_completed && pathname.startsWith('/onboarding')) {
    return <Navigate to="/dashboard/uebersicht" replace />;
  }

  const needsAdmin = requireAdmin || adminOnly;
  if (needsAdmin && !isAdmin) {
    return <Navigate to="/dashboard/uebersicht" replace />;
  }

  return children;
};

export default ProtectedRoute;

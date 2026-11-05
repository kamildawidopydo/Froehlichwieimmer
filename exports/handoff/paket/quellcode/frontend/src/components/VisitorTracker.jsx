import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initVisitorTracker, refreshVisitorConsent } from '@/lib/visitorTracker';

/**
 * Mounts sitewide visitor analytics (respects cookie statistics consent).
 * Skips /admin and /formular routes.
 */
const VisitorTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    initVisitorTracker(pathname);
  }, [pathname]);

  useEffect(() => {
    const onConsent = () => refreshVisitorConsent(pathname);
    window.addEventListener('storage', onConsent);
    window.addEventListener('cookie-consent-updated', onConsent);
    return () => {
      window.removeEventListener('storage', onConsent);
      window.removeEventListener('cookie-consent-updated', onConsent);
    };
  }, [pathname]);

  return null;
};

export default VisitorTracker;

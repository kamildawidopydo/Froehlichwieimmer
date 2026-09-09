import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';

/**
 * Session 82.98 — Ersetzt 9 Supabase-Realtime-Channels durch focus-aware
 * Polling gegen `GET /api/admin/notifications/counts`. Bei Count-Anstieg
 * (Δ > 0) und nicht-aktiver Route wird ein Toast mit „Öffnen"-Action gezeigt.
 * Keine synthetischen Events — Δ = 0 → kein Toast.
 *
 * Regeln:
 *  – nur wenn document.visibilityState === 'visible'
 *  – Sofort-Refresh bei visibilitychange + focus
 *  – Erster Poll setzt Baseline (keine Toasts beim Mount)
 *  – Keine WebSockets, kein SSE
 */

const API = getApiBase();
const POLL_INTERVAL_MS = 30_000;

const NOTIFICATION_MAP = [
  {
    key: 'pending_support',
    title: 'Neue Support-Nachricht',
    path: '/admin/support',
  },
  {
    key: 'pending_orders',
    title: 'Neuer Aktien-Auftrag',
    path: '/admin/stock-orders',
  },
  {
    key: 'pending_bond_requests',
    title: 'Neue Anleihen-Anfrage',
    path: '/admin/bond-requests',
  },
  {
    key: 'pending_ipo_requests',
    title: 'Neue IPO-Investitionsanfrage',
    path: '/admin/ipo-requests',
  },
  {
    key: 'pending_offer_interests',
    title: 'Neue/r Interessent/in',
    path: '/admin/offer-interests',
  },
  {
    key: 'pending_credit_leads',
    title: 'Neue Kreditanfrage',
    path: '/admin/credit-leads',
  },
  {
    key: 'pending_product_inquiry',
    title: 'Neue Produktanfrage',
    path: '/admin/product-inquiry-leads',
  },
  {
    key: 'pending_social_preview',
    title: 'Neue Social-Nachricht',
    path: '/admin/social-preview-messages',
  },
  {
    key: 'pending_applications',
    title: 'Neuer Festgeldantrag',
    path: '/admin/applications',
  },
  {
    key: 'pending_contract_submissions',
    title: 'Neue Vertrags-Einreichung',
    path: '/admin/contract-submissions',
  },
  {
    key: 'pending_offer_reviews',
    title: 'Neue Kundenbewertung',
    path: '/admin/offer-reviews',
  },
  {
    key: 'pending_document_uploads',
    title: 'Neuer Dokument-Upload',
    path: '/admin/document-uploads',
  },
  {
    key: 'pending_insufficient_buying_power',
    title: 'Kaufkraft-Warnung',
    path: '/admin/insufficient-buying-power',
  },
];

const AdminGlobalNotifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const baselineRef = useRef(null); // { [key]: count | null }
  const inFlightRef = useRef(false);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const poll = async () => {
      if (cancelled || inFlightRef.current) return;
      if (document.visibilityState !== 'visible') return;
      inFlightRef.current = true;
      try {
        const { data } = await axios.get(
          `${API}/api/admin/notifications/counts`,
          { withCredentials: true },
        );
        if (cancelled) return;
        const counts = data?.counts || {};
        // Erster Poll: nur Baseline setzen, keine Toasts.
        if (baselineRef.current == null) {
          baselineRef.current = { ...counts };
          return;
        }
        for (const item of NOTIFICATION_MAP) {
          const before = baselineRef.current[item.key];
          const after = counts[item.key];
          if (after == null || before == null) continue;   // faithful null
          if (typeof after !== 'number' || typeof before !== 'number') continue;
          const delta = after - before;
          if (delta <= 0) continue;
          if (locationRef.current?.startsWith(item.path)) continue;
          toast.info(item.title, {
            description: delta === 1 ? `1 neuer Eintrag` : `${delta} neue Einträge`,
            action: { label: 'Öffnen', onClick: () => navigate(item.path) },
          });
        }
        baselineRef.current = { ...counts };
      } catch {
        // still im Netzwerk-/Auth-Fehler; Baseline unverändert lassen.
      } finally {
        inFlightRef.current = false;
      }
    };

    // Initial + Intervall + Focus/Visibility-Handler
    poll();
    timer = window.setInterval(poll, POLL_INTERVAL_MS);
    const onFocus = () => poll();
    const onVis = () => { if (document.visibilityState === 'visible') poll(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [navigate]);

  return null;
};

export default AdminGlobalNotifications;

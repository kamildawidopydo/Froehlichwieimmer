import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutGrid,
  Users,
  ClipboardList,
  Activity,
  Send,
  CreditCard,
  Wallet,
  Briefcase,
  BarChart3,
  Building2,
  Tag,
  FileText,
  FileCheck,
  MessageCircle,
  Inbox,
  Ticket,
  ListChecks,
  Star,
  FileSignature,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import DashboardShell from './DashboardShell';
import AdminGlobalNotifications from '@/components/AdminGlobalNotifications';
import { useTranslation } from 'react-i18next';

// Session 82.98 — Supabase-Realtime-Badges entfernt. Focus-aware Polling
// (30 s, pausiert bei document.hidden === true) gegen den aggregierten
// Endpoint `/api/admin/notifications/counts`. Null-Werte → Badge ausblenden.

const API = getApiBase();
const POLL_INTERVAL_MS = 30_000;

const AdminDashboardLayout = () => {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({});
  const inFlightRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (inFlightRef.current) return;
    if (document.visibilityState !== 'visible') return;
    inFlightRef.current = true;
    try {
      const { data } = await axios.get(
        `${API}/api/admin/notifications/counts`,
        { withCredentials: true },
      );
      setCounts(data?.counts || {});
    } catch {
      // Best-effort — Badges unverändert lassen.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCounts();
    const timer = window.setInterval(() => { if (!cancelled) fetchCounts(); }, POLL_INTERVAL_MS);
    const onFocus = () => fetchCounts();
    const onVis = () => { if (document.visibilityState === 'visible') fetchCounts(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('admin-counts-refresh', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('admin-counts-refresh', onFocus);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchCounts]);

  // Badge helper: null → undefined (kein Badge). Zero-Werte werden ebenfalls
  // ausgeblendet (Badge-Component versteckt bei falsy).
  const b = (key) => (typeof counts[key] === 'number' && counts[key] > 0 ? counts[key] : undefined);

  const items = [
    {
      label: 'Plattform',
      items: [
        { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
        { to: '/admin/users', label: 'Kunden', icon: Users, badge: b('pending_users') },
        { to: '/admin/depot-contracts', label: 'Depots', icon: Briefcase },
        { to: '/admin/offers', label: 'Produkte', icon: Tag },
        { to: '/admin/stock-orders', label: 'Kauf- und Verkaufsaufträge', icon: ClipboardList, badge: b('pending_orders') },
        { to: '/admin/document-uploads', label: 'KYC-Prüfung', icon: FileCheck, badge: b('pending_document_uploads') },
        { to: '/admin/stocks', label: 'Preisverwaltung', icon: BarChart3 },
        { to: '/admin/stock-coupons', label: 'Rabattcodes', icon: Ticket },
        { to: '/admin/activity', label: 'Audit-Log', icon: ListChecks },
        { to: '/recruiting', label: 'Recruiting & Karriere', icon: Users },
        { to: '/admin/formular-access', label: 'Einstellungen', icon: FileSignature },
      ],
    },
    {
      label: t('shell.admin.operations', { defaultValue: 'Betrieb & Kunden' }),
      items: [
        { to: '/admin/insufficient-buying-power', label: t('shell.admin.insufficientBuyingPower', { defaultValue: 'Kaufkraft-Warnungen' }), icon: AlertTriangle, badge: b('pending_insufficient_buying_power') },
        { to: '/admin/applications', label: t('shell.admin.applications', { defaultValue: 'Anträge' }), icon: FileText, badge: b('pending_applications') },
        { to: '/admin/contract-submissions', label: t('shell.admin.contractSubmissions', { defaultValue: 'Vertrags-Einreichungen' }), icon: FileCheck, badge: b('pending_contract_submissions') },
        { to: '/admin/offer-interests', label: t('shell.admin.interests', { defaultValue: 'Interessenten' }), icon: Send, badge: b('pending_offer_interests') },
        { to: '/admin/offer-reviews', label: t('shell.admin.offerReviews', { defaultValue: 'Kundenbewertungen' }), icon: Star, badge: b('pending_offer_reviews') },
        { to: '/admin/credit-leads', label: t('shell.admin.creditLeads', { defaultValue: 'Kredit-Anfragen' }), icon: Inbox, badge: b('pending_credit_leads') },
        { to: '/admin/product-inquiry-leads', label: t('shell.admin.productInquiryLeads', { defaultValue: 'Produkt-Anfragen (Start)' }), icon: ListChecks, badge: b('pending_product_inquiry') },
        { to: '/admin/assistant-handoffs', label: t('shell.admin.assistantHandoffs', { defaultValue: 'Assistent-Anfragen' }), icon: MessageCircle },
        { to: '/admin/social-preview-messages', label: t('shell.admin.socialPreviewMessages', { defaultValue: 'Social-Nachrichten' }), icon: MessageCircle, badge: b('pending_social_preview') },
        { to: '/admin/customer-confirmations', label: t('shell.admin.customerConfirmations', { defaultValue: 'Bestandskunden-Bestätigung' }), icon: FileText },
      ],
    },
    {
      label: t('shell.admin.assets', { defaultValue: 'Vermögen & Depot' }),
      items: [
        { to: '/admin/cash-balances', label: t('shell.admin.cashBalances', { defaultValue: 'Kontoguthaben' }), icon: CreditCard },
        { to: '/admin/payout-requests', label: 'Auszahlungsanträge', icon: Wallet, badge: b('pending_payout_requests') },
        { to: '/admin/depot-contracts', label: t('shell.admin.depotContracts', { defaultValue: 'Depotverträge' }), icon: Wallet },
        { to: '/admin/depot-statement-analysis', label: t('shell.admin.depotStatementAnalysis', { defaultValue: 'Depotauszug-Analyse' }), icon: FileText },
        { to: '/admin/bond-positions', label: t('shell.admin.bondPositions', { defaultValue: 'Kunden-Anleihen' }), icon: PRODUCT_ICONS.anleihen },
        { to: '/admin/bond-catalog', label: t('shell.admin.bondCatalog', { defaultValue: 'Anleihen-Katalog' }), icon: PRODUCT_ICONS.anleihen },
        { to: '/admin/bond-requests', label: t('shell.admin.bondRequests', { defaultValue: 'Anleihen-Anfragen' }), icon: Send, badge: (b('pending_bond_requests') || 0) + (b('bond_offer_responses') || 0) || undefined },
        { to: '/admin/support', label: t('shell.admin.supportInbox', { defaultValue: 'Support-Postfach' }), icon: MessageCircle, badge: b('pending_support') },
        { to: '/admin/user-positions', label: t('shell.admin.userPositions', { defaultValue: 'Kunden-Positionen' }), icon: Briefcase },
        { to: '/admin/stocks', label: t('shell.admin.stocks', { defaultValue: 'Aktien & Kurse' }), icon: PRODUCT_ICONS.aktien },
        { to: '/admin/ipo-catalog', label: t('shell.admin.ipoCatalog', { defaultValue: 'IPO-Katalog' }), icon: PRODUCT_ICONS.ipo },
        { to: '/admin/ipo-requests', label: t('shell.admin.ipoRequests', { defaultValue: 'IPO-Anfragen' }), icon: Send, badge: b('pending_ipo_requests') },
        { to: '/admin/markt-daten', label: t('shell.admin.marketData', { defaultValue: 'Markt-Daten' }), icon: Activity },
        { to: '/admin/analytics', label: t('shell.admin.analytics', { defaultValue: 'Analytics' }), icon: BarChart3 },
        { to: '/admin/live-visitors', label: t('shell.admin.liveVisitors', { defaultValue: 'Besucher Live' }), icon: Radio },
      ],
    },
    {
      label: t('shell.admin.products', { defaultValue: 'Produkte & Inhalte' }),
      items: [
        { to: '/admin/banks', label: t('shell.admin.banks', { defaultValue: 'Banken' }), icon: Building2 },
        { to: '/admin/offers', label: t('shell.admin.offers', { defaultValue: 'Angebote' }), icon: Tag },
        { to: '/admin/credit-offers', label: t('shell.admin.creditOffers', { defaultValue: 'Kredit-Angebote' }), icon: Tag },
        { to: '/admin/credit-bank-details', label: t('shell.admin.creditBankDetails', { defaultValue: 'Kredit-Bankdetails' }), icon: FileText },
        { to: '/admin/einordnung', label: 'Unsere Einordnung', icon: FileText },
        { to: '/admin/stock-research', label: 'Aktienanalysen', icon: BarChart3 },
      ],
    },
  ];

  return (
    <>
      <AdminGlobalNotifications />
      <DashboardShell
        items={items}
        profilePath="/admin"
        showMobileNav={false}
        showMarketTicker={false}
        brand={{ title: 'Fröhlich', subtitle: t('shell.admin.brandSubtitle', { defaultValue: 'Admin Konsole' }), shortLabel: 'BR' }}
      />
    </>
  );
};

export default AdminDashboardLayout;

import React, { useEffect, useState } from 'react';
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
  Upload,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { supabase } from '@/lib/supabase';
import DashboardShell from './DashboardShell';
import AdminGlobalNotifications from '@/components/AdminGlobalNotifications';
import { useTranslation } from 'react-i18next';

const AdminDashboardLayout = () => {
  const { t } = useTranslation();
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingBondRequestCount, setPendingBondRequestCount] = useState(0);
  const [pendingIpoRequestCount, setPendingIpoRequestCount] = useState(0);
  const [pendingSupportCount, setPendingSupportCount] = useState(0);
  const [pendingCreditLeadCount, setPendingCreditLeadCount] = useState(0);
  const [pendingProductInquiryCount, setPendingProductInquiryCount] = useState(0);
  const [pendingSocialPreviewMessageCount, setPendingSocialPreviewMessageCount] = useState(0);
  const [pendingApplicationCount, setPendingApplicationCount] = useState(0);
  const [pendingInterestCount, setPendingInterestCount] = useState(0);
  const [pendingOfferReviewCount, setPendingOfferReviewCount] = useState(0);
  const [failedApplicationEmailCount, setFailedApplicationEmailCount] = useState(0);
  const [failedContractAdminEmailCount, setFailedContractAdminEmailCount] = useState(0);
  const [pendingContractSubmissionCount, setPendingContractSubmissionCount] = useState(0);
  const [pendingDocumentUploadCount, setPendingDocumentUploadCount] = useState(0);
  const [pendingInsufficientBuyingPowerCount, setPendingInsufficientBuyingPowerCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const [users, orders] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('user_stock_orders')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);
        setPendingUserCount(users.count || 0);
        setPendingOrderCount(orders.count || 0);
      } catch (e) {
        // best-effort badge data; ignore
      }
      try {
        const { count } = await supabase
          .from('bond_purchase_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingBondRequestCount(count || 0);
      } catch {
        // table may not exist yet
      }
      try {
        const { count } = await supabase
          .from('ipo_subscription_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingIpoRequestCount(count || 0);
      } catch {
        setPendingIpoRequestCount(0);
      }
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('unread_for_admin');
        if (error) throw error;
        const total = (data || []).reduce(
          (sum, row) => sum + Number(row.unread_for_admin || 0),
          0,
        );
        setPendingSupportCount(total);
      } catch {
        setPendingSupportCount(0);
      }
      try {
        const { count } = await supabase
          .from('credit_leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingCreditLeadCount(count || 0);
      } catch {
        setPendingCreditLeadCount(0);
      }
      try {
        const { count } = await supabase
          .from('product_inquiry_leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingProductInquiryCount(count || 0);
      } catch {
        setPendingProductInquiryCount(0);
      }
      try {
        const { count } = await supabase
          .from('social_preview_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingSocialPreviewMessageCount(count || 0);
      } catch {
        setPendingSocialPreviewMessageCount(0);
      }
      try {
        const { count } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Neu');
        setPendingApplicationCount(count || 0);
      } catch {
        setPendingApplicationCount(0);
      }
      try {
        const { count } = await supabase
          .from('offer_interests')
          .select('id', { count: 'exact', head: true });
        setPendingInterestCount(count || 0);
      } catch {
        setPendingInterestCount(0);
      }
      try {
        const { count } = await supabase
          .from('offer_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .is('deleted_at', null);
        setPendingOfferReviewCount(count || 0);
      } catch {
        setPendingOfferReviewCount(0);
      }
      try {
        const { count } = await supabase
          .from('application_email_outbox')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed');
        setFailedApplicationEmailCount(count || 0);
      } catch {
        setFailedApplicationEmailCount(0);
      }
      try {
        const { count } = await supabase
          .from('contract_form_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('admin_email_sent', false);
        setFailedContractAdminEmailCount(count || 0);
      } catch {
        setFailedContractAdminEmailCount(0);
      }
      try {
        const { count } = await supabase
          .from('contract_form_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingContractSubmissionCount(count || 0);
      } catch {
        setPendingContractSubmissionCount(0);
      }
      try {
        const { count } = await supabase
          .from('document_upload_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingDocumentUploadCount(count || 0);
      } catch {
        setPendingDocumentUploadCount(0);
      }
      try {
        const { count } = await supabase
          .from('insufficient_buying_power_events')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');
        setPendingInsufficientBuyingPowerCount(count || 0);
      } catch {
        setPendingInsufficientBuyingPowerCount(0);
      }
    };
    fetchPending();

    const ch = supabase
      .channel('admin_layout_badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_stock_orders' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bond_purchase_requests' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ipo_subscription_requests' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_leads' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_inquiry_leads' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_preview_messages' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offer_interests' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offer_reviews' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'application_email_outbox' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_form_submissions' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_upload_submissions' },
        fetchPending,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insufficient_buying_power_events' },
        fetchPending,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const items = [
    {
      label: t('shell.admin.overview', { defaultValue: 'Übersicht' }),
      items: [
        { to: '/admin', label: t('shell.admin.dashboard', { defaultValue: 'Dashboard' }), icon: LayoutGrid, end: true },
        { to: '/admin/live-visitors', label: t('shell.admin.liveVisitors', { defaultValue: 'Besucher Live' }), icon: Radio },
      ],
    },
    {
      label: t('shell.admin.operations', { defaultValue: 'Betrieb & Kunden' }),
      items: [
        {
          to: '/admin/users',
          label: t('shell.admin.users', { defaultValue: 'Benutzer' }),
          icon: Users,
          badge: pendingUserCount,
        },
        {
          to: '/admin/stock-orders',
          label: t('shell.admin.stockOrders', { defaultValue: 'Aktien-Aufträge' }),
          icon: ClipboardList,
          badge: pendingOrderCount,
        },
        {
          to: '/admin/insufficient-buying-power',
          label: t('shell.admin.insufficientBuyingPower', { defaultValue: 'Kaufkraft-Warnungen' }),
          icon: AlertTriangle,
          badge: pendingInsufficientBuyingPowerCount,
        },
        {
          to: '/admin/stock-coupons',
          label: t('shell.admin.stockCoupons', { defaultValue: 'Aktien-Gutscheine' }),
          icon: Ticket,
        },
        {
          to: '/admin/applications',
          label: t('shell.admin.applications', { defaultValue: 'Anträge' }),
          icon: FileText,
          badge: pendingApplicationCount,
          badgeSecondary: failedApplicationEmailCount,
        },
        {
          to: '/admin/contract-submissions',
          label: t('shell.admin.contractSubmissions', { defaultValue: 'Vertrags-Einreichungen' }),
          icon: FileCheck,
          badge: pendingContractSubmissionCount,
          badgeSecondary: failedContractAdminEmailCount,
        },
        {
          to: '/admin/offer-interests',
          label: t('shell.admin.interests', { defaultValue: 'Interessenten' }),
          icon: Send,
          badge: pendingInterestCount,
        },
        {
          to: '/admin/offer-reviews',
          label: t('shell.admin.offerReviews', { defaultValue: 'Kundenbewertungen' }),
          icon: Star,
          badge: pendingOfferReviewCount,
        },
        {
          to: '/admin/credit-leads',
          label: t('shell.admin.creditLeads', { defaultValue: 'Kredit-Anfragen' }),
          icon: Inbox,
          badge: pendingCreditLeadCount,
        },
        {
          to: '/admin/product-inquiry-leads',
          label: t('shell.admin.productInquiryLeads', { defaultValue: 'Produkt-Anfragen (Start)' }),
          icon: ListChecks,
          badge: pendingProductInquiryCount,
        },
        {
          to: '/admin/social-preview-messages',
          label: t('shell.admin.socialPreviewMessages', { defaultValue: 'Social-Nachrichten' }),
          icon: MessageCircle,
          badge: pendingSocialPreviewMessageCount,
        },
        { to: '/admin/activity', label: t('shell.admin.activity', { defaultValue: 'Aktivität' }), icon: Activity },
        {
          to: '/admin/formular-access',
          label: t('shell.admin.formularAccess', { defaultValue: 'Formular-Zugang' }),
          icon: FileSignature,
        },
        {
          to: '/admin/document-uploads',
          label: t('shell.admin.documentUploads', { defaultValue: 'Dokument-Upload' }),
          icon: Upload,
          badge: pendingDocumentUploadCount,
        },
      ],
    },
    {
      label: t('shell.admin.assets', { defaultValue: 'Vermögen & Depot' }),
      items: [
        { to: '/admin/cash-balances', label: t('shell.admin.cashBalances', { defaultValue: 'Kontoguthaben' }), icon: CreditCard },
        { to: '/admin/depot-contracts', label: t('shell.admin.depotContracts', { defaultValue: 'Depotverträge' }), icon: Wallet },
        { to: '/admin/bond-positions', label: t('shell.admin.bondPositions', { defaultValue: 'Kunden-Anleihen' }), icon: PRODUCT_ICONS.anleihen },
        {
          to: '/admin/bond-catalog',
          label: t('shell.admin.bondCatalog', { defaultValue: 'Anleihen-Katalog' }),
          icon: PRODUCT_ICONS.anleihen,
        },
        {
          to: '/admin/bond-requests',
          label: t('shell.admin.bondRequests', { defaultValue: 'Anleihen-Anfragen' }),
          icon: Send,
          badge: pendingBondRequestCount,
        },
        {
          to: '/admin/support',
          label: t('shell.admin.supportInbox', { defaultValue: 'Support-Postfach' }),
          icon: MessageCircle,
          badge: pendingSupportCount,
        },
        { to: '/admin/user-positions', label: t('shell.admin.userPositions', { defaultValue: 'Kunden-Positionen' }), icon: Briefcase },
        { to: '/admin/stocks', label: t('shell.admin.stocks', { defaultValue: 'Aktien & Kurse' }), icon: PRODUCT_ICONS.aktien },
        {
          to: '/admin/ipo-catalog',
          label: t('shell.admin.ipoCatalog', { defaultValue: 'IPO-Katalog' }),
          icon: PRODUCT_ICONS.ipo,
        },
        {
          to: '/admin/ipo-requests',
          label: t('shell.admin.ipoRequests', { defaultValue: 'IPO-Anfragen' }),
          icon: Send,
          badge: pendingIpoRequestCount,
        },
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

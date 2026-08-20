import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

/**
 * Mounts Realtime subscriptions for the admin layout (support inbox, leads,
 * applications, contract submissions, offer reviews, …).
 */
const AdminGlobalNotifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    let supportChannel = null;
    let creditChannel = null;
    let productInquiryChannel = null;
    let socialPreviewMessageChannel = null;
    let applicationChannel = null;
    let contractSubmissionChannel = null;
    let offerReviewChannel = null;
    let ipoRequestChannel = null;
    let insufficientBuyingPowerChannel = null;

    const notifyPendingOfferReview = (row, isResubmit) => {
      if (!row || row.status !== 'pending' || row.deleted_at) return;
      if (locationRef.current?.startsWith('/admin/offer-reviews')) return;

      const preview =
        typeof row.body === 'string' && row.body.length > 72
          ? row.body.slice(0, 69) + '…'
          : row.body;
      const author = (row.author_display_name || '').trim() || 'Unbekannt';

      toast.info(isResubmit ? 'Bewertung erneut eingereicht' : 'Neue Kundenbewertung', {
        description: `${author} · ${preview || '—'}`,
        action: {
          label: 'Öffnen',
          onClick: () => navigate('/admin/offer-reviews'),
        },
      });
    };

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess?.session?.user?.id;
        if (!userId) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (profile?.role !== 'admin') return;

        supportChannel = supabase
          .channel('admin_support_inbox_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'support_messages' },
            (payload) => {
              const msg = payload?.new;
              if (!msg || msg.sender_role !== 'user') return;
              if (locationRef.current?.startsWith('/admin/support')) return;

              const preview =
                typeof msg.body === 'string' && msg.body.length > 80
                  ? msg.body.slice(0, 77) + '…'
                  : msg.body;

              toast.info('Neue Support-Nachricht', {
                description: preview,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/support'),
                },
              });
            },
          )
          .subscribe();

        creditChannel = supabase
          .channel('admin_credit_leads_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'credit_leads' },
            (payload) => {
              const lead = payload?.new;
              if (!lead) return;
              if (locationRef.current?.startsWith('/admin/credit-leads')) return;

              const contact = lead.email || lead.phone || 'Unbekannter Kontakt';
              toast.info('Neue Kreditanfrage', {
                description: contact,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/credit-leads'),
                },
              });
            },
          )
          .subscribe();

        productInquiryChannel = supabase
          .channel('admin_product_inquiry_leads_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'product_inquiry_leads' },
            (payload) => {
              const lead = payload?.new;
              if (!lead) return;
              if (locationRef.current?.startsWith('/admin/product-inquiry-leads')) return;

              const contact = lead.email || lead.phone || 'Unbekannter Kontakt';
              toast.info('Neue Startseiten-Produktanfrage', {
                description: `${lead.product || '—'} · ${contact}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/product-inquiry-leads'),
                },
              });
            },
          )
          .subscribe();

        socialPreviewMessageChannel = supabase
          .channel('admin_social_preview_messages_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'social_preview_messages' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              if (locationRef.current?.startsWith('/admin/social-preview-messages')) return;

              const preview =
                typeof row.message_body === 'string' && row.message_body.length > 60
                  ? row.message_body.slice(0, 57) + '…'
                  : row.message_body;

              toast.info('Neue Social-Nachricht (Fröhlich Vermögensberatung GmbH)', {
                description: `${row.name} · ${preview}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/social-preview-messages'),
                },
              });
            },
          )
          .subscribe();

        applicationChannel = supabase
          .channel('admin_applications_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'applications' },
            (payload) => {
              const app = payload?.new;
              if (!app) return;
              if (locationRef.current?.startsWith('/admin/applications')) return;

              const personal = app.personal_data || {};
              const investment = app.investment_data || {};
              const fullName = [personal.first_name, personal.last_name]
                .filter(Boolean)
                .join(' ')
                .trim();
              const label = fullName || personal.email || 'Unbekannter Antragsteller';
              const bank = investment.bank_name || 'Unbekannte Bank';

              toast.info('Neuer Festgeldantrag', {
                description: `${label} · ${bank}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/applications'),
                },
              });
            },
          )
          .subscribe();

        contractSubmissionChannel = supabase
          .channel('admin_contract_submissions_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'contract_form_submissions' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              if (locationRef.current?.startsWith('/admin/contract-submissions')) return;

              const productLabels = {
                bbva_flexgeld: 'BBVA Flexgeld',
                bbva_festgeld: 'BBVA Festgeld',
                postbank_flexgeld: 'Postbank Flexgeld',
                postbank_festgeld: 'Postbank Festgeld',
                ing_flexgeld: 'ING Flexgeld',
                ing_festgeld: 'ING Festgeld',
                bunq_flexgeld: 'bunq NL Flexgeld',
                bunq_festgeld: 'bunq NL Festgeld',
                bunq_de_flexgeld: 'bunq DE Flexgeld',
                bunq_de_festgeld: 'bunq DE Festgeld',
                knab_flexgeld: 'Knab Flexgeld',
                knab_festgeld: 'Knab Festgeld',
              };
              const product = productLabels[row.product_key] || row.bank_name || 'Vertrag';
              const customer = row.customer_name || row.customer_email || 'Unbekannter Kunde';

              toast.info('Neue Vertrags-Einreichung', {
                description: `${product} · ${customer}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/contract-submissions'),
                },
              });
            },
          )
          .subscribe();

        offerReviewChannel = supabase
          .channel('admin_offer_reviews_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'offer_reviews' },
            (payload) => {
              notifyPendingOfferReview(payload?.new, false);
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'offer_reviews' },
            (payload) => {
              const row = payload?.new;
              const prev = payload?.old;
              if (!row || row.status !== 'pending' || row.deleted_at) return;
              if (prev?.status === 'pending') return;
              notifyPendingOfferReview(row, true);
            },
          )
          .subscribe();

        ipoRequestChannel = supabase
          .channel('admin_ipo_requests_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'ipo_subscription_requests' },
            (payload) => {
              const row = payload?.new;
              if (!row || row.status !== 'pending') return;
              if (locationRef.current?.startsWith('/admin/ipo-requests')) return;

              const company = row.company_name || row.ticker || 'IPO';
              const amount =
                row.amount_eur != null
                  ? ` · ${Number(row.amount_eur).toLocaleString('de-DE')} EUR`
                  : '';

              toast.info('Neue IPO-Investitionsanfrage', {
                description: `${company}${amount}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/ipo-requests'),
                },
              });
            },
          )
          .subscribe();

        insufficientBuyingPowerChannel = supabase
          .channel('admin_insufficient_buying_power_toast')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'insufficient_buying_power_events' },
            async (payload) => {
              const row = payload?.new;
              if (!row) return;
              if (locationRef.current?.startsWith('/admin/insufficient-buying-power')) return;

              let customerLabel = row.symbol || 'Aktie';
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, email')
                  .eq('id', row.user_id)
                  .maybeSingle();
                if (profile) {
                  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
                  customerLabel = name || profile.email || customerLabel;
                }
              } catch {
                // best-effort label
              }

              const required =
                row.required_amount != null
                  ? Number(row.required_amount).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: row.currency || 'USD',
                    })
                  : '';

              toast.warning('Kaufkraft-Warnung', {
                description: `${customerLabel} · ${row.symbol}${required ? ` · benötigt ${required}` : ''}`,
                action: {
                  label: 'Öffnen',
                  onClick: () => navigate('/admin/insufficient-buying-power'),
                },
              });
            },
          )
          .subscribe();
      } catch {
        // table/publication missing or auth race; silently ignore
      }
    })();

    return () => {
      cancelled = true;
      if (supportChannel) supabase.removeChannel(supportChannel);
      if (creditChannel) supabase.removeChannel(creditChannel);
      if (productInquiryChannel) supabase.removeChannel(productInquiryChannel);
      if (socialPreviewMessageChannel) supabase.removeChannel(socialPreviewMessageChannel);
      if (applicationChannel) supabase.removeChannel(applicationChannel);
      if (contractSubmissionChannel) supabase.removeChannel(contractSubmissionChannel);
      if (offerReviewChannel) supabase.removeChannel(offerReviewChannel);
      if (ipoRequestChannel) supabase.removeChannel(ipoRequestChannel);
      if (insufficientBuyingPowerChannel) supabase.removeChannel(insufficientBuyingPowerChannel);
    };
  }, [navigate]);

  return null;
};

export default AdminGlobalNotifications;

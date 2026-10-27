import React, { useState, useEffect } from 'react';
import BankLogoSquare from '@/components/bank/BankLogo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  ChevronRight,
  X,
  Save,
  RefreshCw,
  Building2,
  Users,
  Send,
  Wallet,
  Activity,
  CreditCard,
  FileBarChart2,
  LineChart,
  ClipboardList,
  Briefcase,
  BarChart3,
  Ticket,
  ListChecks,
  LayoutDashboard,
  ShieldAlert,
  Upload,
  Database,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NewsFreshnessTile from '@/components/admin/NewsFreshnessTile';
import NewsOpsTile from '@/components/admin/NewsOpsTile';

const EMPTY_FORM = {
  bank_id: '',
  interest_rate: '',
  deposit_term: '',
  min_deposit: '',
  deposit_protection: '',
  description: '',
  bank_link: '',
  is_active: true,
};

const AdminDashboard = () => {
  const [offers, setOffers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerForm, setOfferForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    refreshDashboardData();
    // Session 82.98 · Realtime-Channel entfernt. Polling erfolgt über
    // AdminGlobalNotifications → GET /api/admin/notifications/counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDashboardData = async () => {
    setRefreshing(true);
    await Promise.all([fetchBanks(), fetchOffers(), fetchPendingCount(), fetchPendingOrderCount()]);
    setLastUpdated(new Date());
    setRefreshing(false);
  };

  const fetchPendingOrderCount = async () => {
    // Session 82.103c · FastAPI /api/admin/dashboard/summary liefert `orders.pending`.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/dashboard/summary`, { withCredentials: true });
      setPendingOrderCount(Number(data?.orders?.pending || 0));
    } catch {
      setPendingOrderCount(0);
    }
  };

  const fetchBanks = async () => {
    // Session 82.103c · FastAPI /api/admin/banks/list statt Supabase.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/banks/list`, { withCredentials: true });
      setBanks(data?.items || []);
    } catch {
      setBanks([]);
    }
  };

  const fetchOffers = async () => {
    // Session 82.103c · FastAPI /api/admin/offers/list statt Supabase.
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(`${_api}/api/admin/offers/list?limit=500`, { withCredentials: true });
      setOffers(data?.items || []);
    } catch {
      toast.error('Fehler beim Laden der Angebote');
    }
  };

  const fetchPendingCount = async () => {
    // Session 82.103c · Legacy Pending-Users-Count neutralisiert (kein FastAPI-Endpoint mit `status=pending`).
    setPendingUserCount(0);
  };

  const openAddModal = () => {
    setEditingOffer(null);
    setOfferForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setOfferForm({
      bank_id: offer.bank_id || '',
      interest_rate: String(offer.interest_rate ?? ''),
      deposit_term: String(offer.deposit_term ?? ''),
      min_deposit: String(offer.min_deposit ?? ''),
      deposit_protection: offer.deposit_protection || '',
      description: offer.description || '',
      bank_link: offer.bank_link || '',
      is_active: offer.is_active ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOffer(null);
    setOfferForm(EMPTY_FORM);
  };

  const field = (key) => (e) =>
    setOfferForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      bank_id: offerForm.bank_id,
      interest_rate: parseFloat(offerForm.interest_rate),
      deposit_term: parseInt(offerForm.deposit_term),
      min_deposit: parseFloat(offerForm.min_deposit),
      deposit_protection: offerForm.deposit_protection,
      description: offerForm.description,
      bank_link: offerForm.bank_link || null,
      is_active: offerForm.is_active,
    };

    let error = null;
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      if (editingOffer) {
        await _axios.put(`${_api}/api/admin/offers/${editingOffer.id}`, payload, { withCredentials: true });
        toast.success('Angebot aktualisiert');
      } else {
        await _axios.post(`${_api}/api/admin/offers`, payload, { withCredentials: true });
        toast.success('Angebot erstellt');
      }
    } catch (err) {
      const d = err?.response?.data?.detail;
      error = { message: Array.isArray(d) ? d.map((x) => x.msg).join(', ') : d || err.message };
    }

    if (error) {
      toast.error('Fehler: ' + error.message);
    } else {
      await fetchOffers();
      closeModal();
    }
    setSaving(false);
  };

  const deleteOffer = async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Angebot löschen möchten?')) return;
    let error = null;
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.delete(`${_api}/api/admin/offers/${id}`, { withCredentials: true });
    } catch (err) {
      error = { message: err?.response?.data?.detail || err.message };
    }
    if (error) {
      toast.error('Fehler beim Löschen: ' + error.message);
    } else {
      toast.success('Angebot gelöscht');
      fetchOffers();
    }
  };

  const isFormValid =
    offerForm.bank_id &&
    offerForm.interest_rate &&
    offerForm.deposit_term &&
    offerForm.min_deposit &&
    offerForm.deposit_protection &&
    offerForm.description;

  const adminSections = [
    {
      kicker: 'I',
      title: 'Betrieb & Kunden',
      description: 'Freigaben, Aufträge und Nachverfolgung.',
      items: [
        { to: '/admin/users', title: 'Benutzer', desc: pendingUserCount > 0 ? `${pendingUserCount} ausstehend` : 'Benutzer verwalten', icon: Users, badge: pendingUserCount },
        { to: '/admin/stock-orders', title: 'Aktien-Aufträge', desc: pendingOrderCount > 0 ? `${pendingOrderCount} ausstehend` : 'Prüfen & ausführen', icon: ClipboardList, badge: pendingOrderCount },
        { to: '/admin/stock-coupons', title: 'Aktien-Gutscheine', desc: 'Rabattcodes für Kaufaufträge', icon: Ticket },
        { to: '/admin/formular-access', title: 'Formular-Zugang', desc: 'Zugangscodes für /formular', icon: FileText },
        { to: '/admin/activity', title: 'Aktivitäten', desc: 'Live-Feed', icon: Activity },
        { to: '/admin/live-visitors', title: 'Besucher Live', desc: 'Echtzeit & Klick-Analyse', icon: Activity },
        { to: '/admin/offer-interests', title: 'Interessenten', desc: 'Info-Anfragen', icon: Send },
        { to: '/admin/product-inquiry-leads', title: 'Produkt-Anfragen (Start)', desc: 'Landing-Fragebogen', icon: ListChecks },
      ],
    },
    {
      kicker: 'II',
      title: 'Vermögen & Depot',
      description: 'Salden, Verträge und Marktdaten.',
      items: [
        { to: '/admin/cash-balances', title: 'Kontoguthaben', desc: 'Kundengelder', icon: CreditCard },
        { to: '/admin/depot-contracts', title: 'Depotverträge', desc: 'Fest-/Tages-/Flexgeld', icon: Wallet },
        { to: '/admin/bond-positions', title: 'Kunden-Anleihen', desc: 'Bond-Positionen', icon: FileBarChart2 },
        { to: '/admin/bond-catalog', title: 'Anleihen-Katalog', desc: 'Kaufbares Anleihen-Universum', icon: FileBarChart2 },
        { to: '/admin/bond-requests', title: 'Anleihen-Anfragen', desc: 'Kaufanfragen prüfen', icon: Send },
        { to: '/admin/user-positions', title: 'Kunden-Positionen', desc: 'Aktien manuell zuweisen', icon: Briefcase },
        { to: '/admin/stocks', title: 'Aktien', desc: 'Universum & Kurse', icon: LineChart },
        { to: '/admin/analytics', title: 'Analytics', desc: 'AUM, Trends, Top Positionen', icon: BarChart3 },
      ],
    },
    {
      kicker: 'III',
      title: 'Produkte & Inhalte',
      description: 'Banken, Sparprodukte und Anträge.',
      items: [
        { to: '/admin/banks', title: 'Banken', desc: `${banks.length} aktiv`, icon: Building2 },
        { to: '/admin/offers', title: 'Angebote', desc: `${offers.length} insgesamt`, icon: Plus },
        { to: '/admin/applications', title: 'Anträge', desc: 'Festgeldanträge', icon: FileText },
      ],
    },
    {
      kicker: 'IV',
      title: 'Sparvergleich · Daten-Ops',
      description: 'Import, Review-Queue, Audit-Log und Demo→Real-Ersetzung.',
      items: [
        { to: '/admin/savings/dashboard', title: 'Daten-Dashboard', desc: 'KPIs · Freshness · Demo-Mode', icon: LayoutDashboard },
        { to: '/admin/savings/reviews', title: 'Review-Queue', desc: 'Offene Vorschläge freigeben', icon: ShieldAlert },
        { to: '/admin/savings/import', title: 'Daten-Import', desc: 'JSON/CSV · Dry-Run · Apply', icon: Upload },
        { to: '/admin/savings/sources', title: 'Datenquellen', desc: 'Trust-Level & Monitoring', icon: Database },
        { to: '/admin/savings/audit', title: 'Audit-Log', desc: 'Jede Admin-Aktion', icon: Activity },
        { to: '/admin/savings/demo-replace', title: 'Demo → Real', desc: 'Demo-Daten sicher ersetzen', icon: ArrowRightLeft },
      ],
    },
  ];

  const kpis = [
    { label: 'Ausstehende Benutzer', value: pendingUserCount, icon: Users, tone: 'warn' },
    { label: 'Ausstehende Orders', value: pendingOrderCount, icon: ClipboardList, tone: 'warn' },
    { label: 'Aktive Banken', value: banks.length, icon: Building2, tone: 'neutral' },
    { label: 'Angebote gesamt', value: offers.length, icon: BarChart3, tone: 'success' },
  ];

  return (
    <div className="bg-bank-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* HERO — bank-ink editorial */}
        <section className="relative mb-8 overflow-hidden border border-bank-gold/45 bg-bank-ink p-7 text-white shadow-editorial-md sm:p-9">
          <div aria-hidden className="absolute inset-0 mesh-navy opacity-90" />
          <div aria-hidden className="absolute inset-0 topo-pattern opacity-[0.05]" />
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-gold/35 to-transparent" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
                <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                Fröhlich Vermögensberatung · Admin Console
              </p>
              <h1
                className="mt-3 font-display text-[2rem] font-light leading-[1.05] text-white sm:text-[2.6rem]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                Admin-Bereich
              </h1>
              <span aria-hidden className="mt-3 block h-px w-16 bg-bank-gold/65" />
              <p className="mt-4 max-w-xl text-[13.5px] leading-[1.7] text-white/75">
                Zentraler Zugriff auf Benutzer, Orders, Portfolios und Angebote — strukturiert nach
                Arbeitsbereichen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline-accent"
                size="default"
                onClick={refreshDashboardData}
                disabled={refreshing}
              >
                <RefreshCw size={13} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
                Aktualisieren
              </Button>
              <Button variant="primary" size="default" onClick={openAddModal} data-testid="add-offer-btn">
                <Plus size={13} strokeWidth={1.5} />
                Angebot hinzufügen
              </Button>
            </div>
          </div>
          <p className="relative mt-6 font-mono text-[10.5px] uppercase tracking-[0.22em] tabular-nums text-bank-gold/80">
            Letztes Update ·{' '}
            <span className="text-white/85">
              {lastUpdated
                ? lastUpdated.toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '–'}
            </span>
          </p>
        </section>

        {/* News pipeline freshness (Session 77.5) */}
        <NewsFreshnessTile />

        {/* News Operations: Retention + Incident/Escalation (Session 79.3) */}
        <NewsOpsTile />

        {/* KPI strip */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((card) => {
            const Icon = card.icon;
            const toneTextCls =
              card.tone === 'warn'
                ? 'text-amber-700'
                : card.tone === 'success'
                  ? 'text-emerald-700'
                  : 'text-bank-text';
            return (
              <div
                key={card.label}
                className="relative overflow-hidden border border-bank-border bg-white p-5 transition-shadow duration-300 hover:shadow-editorial-sm"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        'mt-3 rate-figure text-[2.1rem] leading-[1] tabular-nums',
                        toneTextCls,
                      )}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-bank-gold/45 bg-bank-bg/45 text-bank-gold">
                    <Icon size={17} strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links by section */}
        <div className="mb-12 space-y-10">
          {adminSections.map((section) => (
            <div key={section.title}>
              <div className="mb-5">
                <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                  Sektion · {section.kicker}
                </p>
                <h2
                  className="mt-2 font-display text-[1.45rem] font-light leading-tight tracking-tight text-bank-text"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                >
                  {section.title}
                </h2>
                <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
                <p className="mt-3 text-[13px] text-bank-text-muted">{section.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasBadge = (item.badge ?? 0) > 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                    >
                      {hasBadge && (
                        <span className="absolute -right-2 -top-2 z-10 inline-flex h-6 min-w-[26px] items-center justify-center border border-bank-gold/55 bg-bank-ink px-1.5 font-mono text-[10.5px] font-medium tabular-nums text-bank-gold shadow-editorial-sm">
                          {item.badge}
                        </span>
                      )}
                      <div className="relative h-full overflow-hidden border border-bank-border bg-white p-5 transition-all duration-300 group-hover:border-bank-gold/55 group-hover:shadow-editorial-sm">
                        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-bank-border bg-bank-bg/60 text-bank-gold transition-colors group-hover:border-bank-gold/55">
                              <Icon size={18} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <h3
                                className="truncate font-display text-[1.05rem] font-light leading-tight text-bank-text"
                                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                              >
                                {item.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            size={16}
                            strokeWidth={1.5}
                            className="shrink-0 text-bank-text-muted/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-bank-gold"
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Offers Table */}
        <div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                Sparprodukte
              </p>
              <h2
                className="mt-2 font-display text-[1.6rem] font-light leading-tight tracking-tight text-bank-text"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                Angebote verwalten
              </h2>
              <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
              <p className="mt-3 text-[13px] text-bank-text-muted">
                Sparprodukte für den öffentlichen Vergleich
              </p>
            </div>
            <Button
              variant="primary"
              size="default"
              onClick={openAddModal}
              data-testid="add-offer-btn"
            >
              <Plus size={14} strokeWidth={1.5} />
              Angebot hinzufügen
            </Button>
          </div>

          <div className="relative overflow-hidden border border-bank-border bg-white shadow-editorial-sm">
            <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-bank-border bg-bank-bg/45">
                  <tr>
                    {[
                      { label: 'Bank', align: 'left' },
                      { label: 'Land', align: 'left' },
                      { label: 'Zinssatz', align: 'right' },
                      { label: 'Laufzeit', align: 'right' },
                      { label: 'Mindesteinlage', align: 'right' },
                      { label: 'Status', align: 'left' },
                      { label: 'Aktionen', align: 'right' },
                    ].map((h, idx) => (
                      <th
                        key={idx}
                        className={cn(
                          'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted',
                          h.align === 'right' ? 'text-right' : 'text-left',
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted"
                      >
                        Keine Angebote vorhanden
                      </td>
                    </tr>
                  ) : (
                    offers.map((offer) => {
                      const bankMeta = offer.banks || {};
                      const bankName = bankMeta.name || offer.bank_slug || '–';
                      const country = bankMeta.country || offer.country || '–';
                      const rate = offer.interest_rate ?? offer.rate ?? 0;
                      const term = offer.deposit_term ?? offer.duration_months ?? offer.term_months ?? '–';
                      const minDeposit = offer.min_deposit ?? offer.min_amount ?? 0;
                      return (
                      <tr
                        key={offer.id}
                        className="border-b border-bank-border last:border-b-0 transition-colors hover:bg-bank-bg/45"
                        data-testid={`offer-row-${offer.id}`}
                      >
                        <td className="px-4 py-3 text-[13.5px] font-medium text-bank-text">
                          <div className="flex items-center gap-2">
                            <BankLogoSquare bank={{ ...bankMeta, name: bankName }} size={28} />
                            <span>{bankName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {country}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="rate-figure text-[14px] tabular-nums text-bank-gold">
                            {Number(rate).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                          {term === '–' ? '–' : `${term} M`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                          €{Number(minDeposit).toLocaleString('de-DE')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                              offer.is_active
                                ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                                : 'border-bank-border bg-bank-bg/45 text-bank-text-muted',
                            )}
                          >
                            {offer.is_active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(offer)}
                              className="inline-flex h-8 w-8 items-center justify-center border border-bank-border text-bank-text-muted transition-colors hover:border-bank-gold/55 hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                              title="Bearbeiten"
                              aria-label="Angebot bearbeiten"
                              data-testid={`edit-offer-${offer.id}`}
                            >
                              <Edit size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => deleteOffer(offer.id)}
                              className="inline-flex h-8 w-8 items-center justify-center border border-bank-border text-bank-text-muted transition-colors hover:border-rose-300/55 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                              title="Löschen"
                              aria-label="Angebot löschen"
                              data-testid={`delete-offer-${offer.id}`}
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL — editorial */}
      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgb(11 21 32 / 0.62)' }}
          onClick={closeModal}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col border border-bank-border bg-white shadow-editorial-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-bank-border px-6 py-5">
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                  Sparangebot · Stammdaten
                </p>
                <h2
                  className="mt-2 font-display text-[1.4rem] font-light leading-tight text-bank-text"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                >
                  {editingOffer ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
                </h2>
                <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
              </div>
              <button
                onClick={closeModal}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-bank-border text-bank-text-muted transition-colors hover:border-bank-gold/55 hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                aria-label="Schließen"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            <form
              id="offer-form"
              onSubmit={handleSubmit}
              className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
            >
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Bank <span className="text-bank-error">*</span>
                </label>
                <select
                  value={offerForm.bank_id}
                  onChange={field('bank_id')}
                  required
                  className="h-10 w-full border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                  data-testid="offer-bank-id"
                >
                  <option value="">Bank auswählen…</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Zinssatz (%) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={offerForm.interest_rate}
                    onChange={field('interest_rate')}
                    placeholder="z.B. 3.50"
                    required
                    data-testid="offer-interest-rate"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Laufzeit (Monate) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={offerForm.deposit_term}
                    onChange={field('deposit_term')}
                    placeholder="z.B. 12"
                    required
                    data-testid="offer-deposit-term"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Mindesteinlage (€) <span className="text-bank-error">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={offerForm.min_deposit}
                    onChange={field('min_deposit')}
                    placeholder="z.B. 1000"
                    required
                    data-testid="offer-min-deposit"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Bank-Link
                  </label>
                  <Input
                    type="url"
                    value={offerForm.bank_link}
                    onChange={field('bank_link')}
                    placeholder="https://…"
                    data-testid="offer-bank-link"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Einlagensicherung <span className="text-bank-error">*</span>
                </label>
                <Input
                  value={offerForm.deposit_protection}
                  onChange={field('deposit_protection')}
                  placeholder="z.B. €100.000 (EU-Einlagensicherung)"
                  required
                  data-testid="offer-deposit-protection"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Beschreibung <span className="text-bank-error">*</span>
                </label>
                <textarea
                  value={offerForm.description}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Kurze Beschreibung des Angebots…"
                  rows={3}
                  required
                  className="w-full border border-bank-border bg-white px-3 py-2 text-sm placeholder:text-bank-text-muted/70 focus-visible:border-bank-gold/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                  data-testid="offer-description"
                />
              </div>

              <div className="flex items-center justify-between gap-3 border border-bank-border bg-bank-bg/45 p-3">
                <div>
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text">
                    Angebot aktiv
                  </p>
                  <p className="mt-1 text-[12px] text-bank-text-muted">
                    Inaktive Angebote werden Nutzern nicht angezeigt
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={offerForm.is_active}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="peer sr-only"
                    data-testid="offer-is-active"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-bank-border/45 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-bank-ink peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-bank-accent/35" />
                </label>
              </div>
            </form>

            <div className="flex shrink-0 justify-end gap-3 border-t border-bank-border px-6 py-4">
              <Button type="button" variant="outline-ink" onClick={closeModal}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                form="offer-form"
                disabled={saving || !isFormValid}
                variant="primary"
                data-testid="offer-submit-btn"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} strokeWidth={1.5} className="animate-spin" />
                    Speichern…
                  </>
                ) : (
                  <>
                    <Save size={13} strokeWidth={1.5} />
                    {editingOffer ? 'Änderungen speichern' : 'Angebot erstellen'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

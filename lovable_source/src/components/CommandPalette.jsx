import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { fetchFeaturedStocks } from '@/services/marketService';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Home,
  LineChart,
  Calculator,
  Briefcase,
  LayoutDashboard,
  Clock,
  Star,
  User as UserIcon,
  Shield,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search as SearchIcon,
  Activity,
  MessageCircle,
  Newspaper,
  PieChart,
  BookOpen,
  Scale,
  Phone,
  Users,
  FileSignature,
  LogIn,
  UserPlus,
  Banknote,
  GitCompareArrows,
  Landmark,
  Route,
  ShieldCheck,
  Wallet,
  ListChecks,
  FileText,
  Bell,
  History,
  Receipt,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { SAVINGS_PRODUCT_GUIDES, SAVINGS_PRODUCT_SLUGS } from '@/data/savingsProductGuides';
import useRecentPages from '@/hooks/useRecentPages';

const CommandPalette = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const { recent } = useRecentPages();

  const NAV_ITEMS_PRODUCTS = [
    { label: t('nav.home', { defaultValue: 'Startseite' }), path: '/', icon: Home, keywords: 'home startseite start übersicht' },
    { label: t('comparison.title', { defaultValue: 'Angebote vergleichen' }), path: '/comparison', icon: GitCompareArrows, keywords: 'vergleich compare sparvergleich festgeld tagesgeld flexgeld' },
    { label: t('nav.partnerBanks', { defaultValue: 'Partnerbanken' }), path: '/partner-banks', icon: Landmark, keywords: 'banks partner partnerbanken banken' },
    { label: 'Kredit anfragen', path: '/kredit', icon: Banknote, keywords: 'kredit kreditanfrage darlehen loan finanzierung' },
    { label: 'Handeln', path: '/dashboard/handeln', icon: LineChart, keywords: 'handeln trade aktien anleihen wertpapiere börse markt' },
    { label: 'Spezial-AIF', path: '/spezial-aif', icon: PieChart, keywords: 'spezial aif fonds kagb investment fondsprofil strategie' },
  ];

  const NAV_ITEMS_INFO = [
    { label: 'Fonds-Grundlagen', path: '/fonds-grundlagen', icon: BookOpen, keywords: 'wissen fonds grundlagen wie funktioniert fonds erklärung etf' },
    { label: 'Dokumente', path: '/dokumente', icon: FileText, keywords: 'dokumente dokument pdf download kundendokumente freistellungsauftrag risiken informationsbogen' },
    { label: 'So funktioniert es', path: '/how-it-works', icon: Route, keywords: 'so funktioniert ablauf how it works schritte vier schritten anleitung' },
    { label: t('calculator.title', { defaultValue: 'Zinsrechner' }), path: '/calculator', icon: Calculator, keywords: 'rechner calc zinsrechner zinsen kalkulieren' },
    { label: t('nav.security', { defaultValue: 'Sicherheit' }), path: '/security', icon: Shield, keywords: 'security sicherheit einlagensicherung eu' },
    { label: 'Compliance', path: '/compliance', icon: ShieldCheck, keywords: 'compliance regulierung aufsicht bafin' },
    { label: 'Sparen erklärt', path: '/savings-education', icon: Wallet, keywords: 'sparen steuern bildung education savings sparen erklärt' },
    { label: t('nav.faq', { defaultValue: 'FAQ' }), path: '/faq', icon: HelpCircle, keywords: 'faq fragen häufige antworten hilfe' },
  ];

  const NAV_ITEMS_COMPANY = [
    { label: 'News', path: '/news', icon: Newspaper, keywords: 'news nachrichten euronews artikel meldungen videos' },
    { label: 'Über uns', path: '/about', icon: Users, keywords: 'über uns about company unternehmen wer wir sind team' },
    { label: 'Kontakt', path: '/contact', icon: Phone, keywords: 'kontakt contact beratung support telefon email mail' },
  ];

  const LEGAL_ITEMS = [
    { label: 'Impressum', path: '/legal/impressum', icon: Scale, keywords: 'impressum imprint legal entity hrb amtsgericht angaben' },
    { label: 'Datenschutz', path: '/legal/privacy', icon: Scale, keywords: 'datenschutz privacy dsgvo gdpr datenschutzerklärung' },
    { label: 'AGB', path: '/legal/terms', icon: Scale, keywords: 'agb terms nutzungsbedingungen geschäftsbedingungen allgemeine' },
    { label: 'Haftungsausschluss', path: '/legal/disclaimer', icon: Scale, keywords: 'haftungsausschluss disclaimer haftung gewährleistung' },
    { label: 'Widerruf', path: '/legal/revocation', icon: Scale, keywords: 'widerruf revocation widerrufsbelehrung widerrufsrecht' },
  ];

  const ACCOUNT_ITEMS_GUEST = [
    { label: 'Formular', path: '/formular', icon: FileSignature, keywords: 'formular form antrag application' },
    { label: 'Anmelden', path: '/login', icon: LogIn, keywords: 'login anmelden sign in einloggen' },
    { label: 'Konto eröffnen', path: '/register', icon: UserPlus, keywords: 'register registrieren konto eröffnen sign up account' },
  ];

  const NAV_ITEMS_SAVINGS = SAVINGS_PRODUCT_SLUGS.map((slug) => ({
    label: SAVINGS_PRODUCT_GUIDES[slug].title,
    path: `/produkte/${slug}`,
    icon: PRODUCT_ICONS[slug],
    keywords: `${slug} sparen produkt leitfaden ${SAVINGS_PRODUCT_GUIDES[slug].title.toLowerCase()}`,
  }));

  const NAV_ITEMS_USER = [
    { label: t('shell.user.overview', { defaultValue: 'Dashboard' }), path: '/dashboard/uebersicht', icon: LayoutDashboard, keywords: 'dashboard uebersicht' },
    { label: t('shell.user.wealthHub', { defaultValue: 'Mein Vermögen' }), path: '/dashboard/vermoegen', icon: Briefcase, keywords: 'vermoegen depot portfolio festgeld tagesgeld anleihen aktien' },
    { label: t('shell.user.fixedDeposit', { defaultValue: 'Festgeld' }), path: '/dashboard/festgeld', icon: PRODUCT_ICONS.festgeld, keywords: 'festgeld vertrag' },
    { label: t('shell.user.dailyDeposit', { defaultValue: 'Tagesgeld' }), path: '/dashboard/tagesgeld', icon: PRODUCT_ICONS.tagesgeld, keywords: 'tagesgeld' },
    { label: t('shell.user.flexDeposit', { defaultValue: 'Flexgeld' }), path: '/dashboard/flexgeld', icon: PRODUCT_ICONS.flexgeld, keywords: 'flexgeld bbva' },
    { label: t('shell.user.bonds', { defaultValue: 'Anleihen' }), path: '/dashboard/anleihen', icon: PRODUCT_ICONS.anleihen, keywords: 'anleihen bonds' },
    { label: t('shell.user.bondPurchase', { defaultValue: 'Anleihe kaufen' }), path: '/dashboard/anleihen/kaufen', icon: PRODUCT_ICONS.anleihen, keywords: 'anleihe kaufen bond' },
    { label: t('shell.user.stocks', { defaultValue: 'Aktien-Depot' }), path: '/dashboard/aktien', icon: PRODUCT_ICONS.aktien, keywords: 'aktien depot watchlist' },
    { label: t('shell.user.ipo', { defaultValue: 'IPO' }), path: '/dashboard/ipo', icon: PRODUCT_ICONS.ipo, keywords: 'ipo börsengang zeichnung' },
    { label: t('shell.user.orders', { defaultValue: 'Aufträge' }), path: '/dashboard/auftraege', icon: Clock, keywords: 'auftraege orders' },
    { label: t('shell.user.alerts', { defaultValue: 'Kursalarme' }), path: '/dashboard/alarme', icon: Bell, keywords: 'kursalarm alarm price alert preis' },
    { label: t('shell.user.news', { defaultValue: 'Nachrichten' }), path: '/dashboard/news', icon: Newspaper, keywords: 'nachrichten news euronews artikel meldungen' },
    { label: t('shell.user.market', { defaultValue: 'Handeln' }), path: '/dashboard/handeln', icon: LineChart, keywords: 'trade handeln aktien markt' },
    { label: t('shell.user.statement', { defaultValue: 'Depotauszug / PDF' }), path: '/dashboard/kontoauszug', icon: Receipt, keywords: 'pdf statement auszug depot export kontoauszug' },
    { label: t('shell.user.documents', { defaultValue: 'Dokumente' }), path: '/dashboard/dokumente', icon: FileText, keywords: 'dokumente pdf freistellungsauftrag risiken' },
    { label: t('shell.user.profile', { defaultValue: 'Profil' }), path: '/dashboard/profil', icon: UserIcon, keywords: 'profil account konto' },
    { label: t('shell.user.support', { defaultValue: 'Support / Hilfe' }), path: '/dashboard/support', icon: MessageCircle, keywords: 'support help hilfe chat ticket kontakt' },
  ];

  const NAV_ITEMS_ADMIN = [
    { label: `Admin — ${t('shell.admin.users', { defaultValue: 'Benutzer' })}`, path: '/admin/users', icon: UserIcon, keywords: 'admin users' },
    { label: `Admin — ${t('shell.admin.stockOrders', { defaultValue: 'Aktien-Aufträge' })}`, path: '/admin/auftraege', icon: Clock, keywords: 'admin orders' },
    { label: `Admin — ${t('shell.admin.userPositions', { defaultValue: 'Kunden-Positionen' })}`, path: '/admin/user-positions', icon: Briefcase, keywords: 'admin positions' },
    { label: `Admin — ${t('shell.admin.depotContracts', { defaultValue: 'Depot-Verträge' })}`, path: '/admin/depot-contracts', icon: Briefcase, keywords: 'admin contracts' },
    { label: `Admin — ${t('shell.admin.bondPositions', { defaultValue: 'Kunden-Anleihen' })}`, path: '/admin/bond-positions', icon: PRODUCT_ICONS.anleihen, keywords: 'admin bonds positions' },
    { label: `Admin — ${t('shell.admin.bondCatalog', { defaultValue: 'Anleihen-Katalog' })}`, path: '/admin/bond-catalog', icon: PRODUCT_ICONS.anleihen, keywords: 'admin bond catalog katalog' },
    { label: `Admin — ${t('shell.admin.bondRequests', { defaultValue: 'Anleihen-Anfragen' })}`, path: '/admin/bond-requests', icon: PRODUCT_ICONS.anleihen, keywords: 'admin bond requests anfragen' },
    { label: 'Admin — IPO-Katalog', path: '/admin/ipo-catalog', icon: PRODUCT_ICONS.ipo, keywords: 'admin ipo catalog katalog' },
    { label: 'Admin — IPO-Anfragen', path: '/admin/ipo-requests', icon: PRODUCT_ICONS.ipo, keywords: 'admin ipo requests zeichnung' },
    { label: `Admin — ${t('shell.admin.stocks', { defaultValue: 'Aktien' })}`, path: '/admin/stocks', icon: PRODUCT_ICONS.aktien, keywords: 'admin stocks' },
    { label: `Admin — ${t('shell.admin.marketData', { defaultValue: 'Markt-Daten' })}`, path: '/admin/markt-daten', icon: Activity, keywords: 'admin market data prices cache refresh stock pipeline' },
    { label: `Admin — ${t('shell.admin.supportInbox', { defaultValue: 'Support-Postfach' })}`, path: '/admin/support', icon: MessageCircle, keywords: 'admin support tickets postfach kunden chat' },
    { label: 'Admin — Kredit-Anfragen', path: '/admin/credit-leads', icon: MessageCircle, keywords: 'admin kredit leads anfragen' },
    { label: 'Admin — Produkt-Anfragen (Start)', path: '/admin/product-inquiry-leads', icon: ListChecks, keywords: 'admin landing produkt fragebogen aktien anleihen spargeld leads' },
    { label: 'Admin — Kredit-Angebote', path: '/admin/credit-offers', icon: MessageCircle, keywords: 'admin kredit angebote' },
    { label: 'Admin — Kredit-Bankdetails', path: '/admin/credit-bank-details', icon: MessageCircle, keywords: 'admin kredit bankdetails produktinformationen annahmerichtlinien' },
    {
      label: `Admin — ${t('shell.admin.offerReviews', { defaultValue: 'Kundenbewertungen' })}`,
      path: '/admin/offer-reviews',
      icon: Star,
      keywords: 'admin bewertungen reviews kunden sterne moderation freigabe ablehnung',
    },
    { label: `Admin — ${t('shell.admin.activity', { defaultValue: 'Aktivität' })}`, path: '/admin/activity', icon: Clock, keywords: 'admin activity' },
    { label: 'Admin — Besucher Live', path: '/admin/live-visitors', icon: Activity, keywords: 'admin live visitors analytics tracking rage click' },
  ];

  useEffect(() => {
    if (!open) return;
    // Session 82.40 · Mongo-native via marketService (Alpha-Vantage-backed
    // FastAPI endpoint). Non-CRITICAL: Fetch-Fehler bleiben lokal, kein
    // globales Dashboard-Banner. Kein direkter Supabase-Read mehr.
    let cancelled = false;
    fetchFeaturedStocks(60, 'EUR')
      .then((rows) => {
        if (cancelled) return;
        const normalized = (rows || []).map((r) => ({
          symbol: r.symbol,
          name: r.name,
          sector: null,
          price: r.price != null
            ? { price: r.price, change_pct: r.changePct, currency: r.currency }
            : null,
        }));
        setStocks(normalized);
      })
      .catch((err) => {
        // Silently degrade — CommandPalette bleibt nutzbar für Navigation.
        console.error('palette stocks fetch', err);
        if (!cancelled) setStocks([]);
      });
    return () => { cancelled = true; };
  }, [open]);

  const go = (path) => {
    onOpenChange(false);
    navigate(path);
  };

  const navGroups = [
    { heading: t('commandPalette.productsHeading', { defaultValue: 'Produkte' }), items: NAV_ITEMS_PRODUCTS },
    { heading: 'Sparen', items: NAV_ITEMS_SAVINGS },
    { heading: t('commandPalette.infoHeading', { defaultValue: 'Information' }), items: NAV_ITEMS_INFO },
    { heading: t('commandPalette.companyHeading', { defaultValue: 'Unternehmen' }), items: NAV_ITEMS_COMPANY },
    { heading: t('commandPalette.legalHeading', { defaultValue: 'Rechtliches' }), items: LEGAL_ITEMS },
    ...(user
      ? [{ heading: t('commandPalette.dashboardHeading', { defaultValue: 'Dashboard' }), items: NAV_ITEMS_USER }]
      : [{ heading: t('commandPalette.accountHeading', { defaultValue: 'Konto' }), items: ACCOUNT_ITEMS_GUEST }]),
    ...(user?.role === 'admin'
      ? [{ heading: t('commandPalette.adminHeading', { defaultValue: 'Admin' }), items: NAV_ITEMS_ADMIN }]
      : []),
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('commandPalette.placeholder', { defaultValue: 'Aktien, Verträge, Seiten suchen...' })} />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <SearchIcon size={22} className="mx-auto mb-2 text-bank-text-muted/50" />
            <p className="text-sm text-bank-text-muted">{t('commandPalette.empty', { defaultValue: 'Keine Ergebnisse gefunden' })}</p>
          </div>
        </CommandEmpty>

        {user && recent.length > 0 && (
          <CommandGroup heading={t('commandPalette.recentHeading', { defaultValue: 'Zuletzt besucht' })}>
            {recent.map((r) => (
              <CommandItem key={r.path} value={`recent ${r.label} ${r.path}`} onSelect={() => go(r.path)} className="gap-3">
                <History className="text-bank-text-muted" />
                <span>{r.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {stocks.length > 0 && (
          <CommandGroup heading={t('commandPalette.stocksHeading', { defaultValue: 'Aktien' })}>
            {stocks.map((s) => {
              const price = s.price;
              const up = price && Number(price.change_pct ?? 0) >= 0;
              const Arrow = up ? ArrowUpRight : ArrowDownRight;
              return (
                <CommandItem
                  key={s.symbol}
                  value={`${s.symbol} ${s.name} ${s.sector || ''}`}
                  onSelect={() => go(`/aktien/${encodeURIComponent(s.symbol)}`)}
                  className="gap-3"
                >
                  <LineChart className="text-bank-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bank-text">{s.symbol} <span className="font-normal text-bank-text-muted">· {s.name}</span></p>
                    {s.sector && <p className="text-[11px] text-bank-text-muted/80">{s.sector}</p>}
                  </div>
                  {price?.price != null && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium tabular-nums">{Number(price.price).toLocaleString('de-DE', { style: 'currency', currency: price.currency || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {price.change_pct != null && (
                        <p className={`text-[11px] font-medium tabular-nums inline-flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <Arrow size={10} />
                          {Number(price.change_pct ?? 0) >= 0 ? '+' : ''}{Number(price.change_pct ?? 0).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Section entfernt in Session 82.40 · Supabase user_depot_contracts read weg */}

        {navGroups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((n) => {
              const Icon = n.icon;
              return (
                <CommandItem
                  key={n.path}
                  value={`${n.label} ${n.keywords || ''}`}
                  onSelect={() => go(n.path)}
                  className="gap-3"
                >
                  <Icon className="text-bank-text-muted" />
                  <span className="text-sm">{n.label}</span>
                  <CommandShortcut className="text-[10px]">{n.path}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        {user && (
          <CommandGroup heading="Favoriten">
            <CommandItem value="favoriten" onSelect={() => go('/dashboard/favoriten')} className="gap-3">
              <Star className="text-bank-text-muted" />
              <span className="text-sm">Zu meinen Favoriten</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

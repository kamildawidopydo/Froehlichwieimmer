import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import CookieConsent from '@/components/CookieConsent';
import VisitorWelcomeGate from '@/components/VisitorWelcomeGate';
import VisitorTracker from '@/components/VisitorTracker';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/Layout';
import FloatingAssistant from '@/components/assistant/FloatingAssistant';
import { AuthProvider } from '@/context/AuthContext';
import { SocialPreviewProvider } from '@/context/SocialPreviewContext';
import { DisplayCurrencyProvider } from '@/context/DisplayCurrencyContext';
import SocialPreviewModal from '@/components/social/SocialPreviewModal';
import { ThemeProvider } from '@/context/ThemeContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import FormularProtectedRoute from '@/components/FormularProtectedRoute';
import useProtectSiteImages from '@/hooks/useProtectSiteImages';
import '@/App.css';

const Home = lazy(() => import('@/pages/Home'));
const PublicStockDetail = lazy(() => import('@/pages/PublicStockDetail'));
const SavingsComparison = lazy(() => import('@/pages/SavingsComparison'));
const CalculatorPage = lazy(() => import('@/pages/Calculator'));
const HowItWorks = lazy(() => import('@/pages/HowItWorks'));
const Security = lazy(() => import('@/pages/Security'));
const SicherheitRegulierung = lazy(() => import('@/pages/SicherheitRegulierung'));
const Compliance = lazy(() => import('@/pages/Compliance'));
const SpezialAif = lazy(() => import('@/pages/SpezialAif'));
const FondsGrundlagen = lazy(() => import('@/pages/FondsGrundlagen'));
const PartnerBanks = lazy(() => import('@/pages/PartnerBanks'));
const SavingsEducation = lazy(() => import('@/pages/SavingsEducation'));
const SavingsProductGuidePage = lazy(() => import('@/pages/products/SavingsProductGuidePage'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Dokumente = lazy(() => import('@/pages/Dokumente'));
const DokumentePreview = lazy(() => import('@/pages/DokumentePreview'));
const About = lazy(() => import('@/pages/About'));
const Philosophie = lazy(() => import('@/pages/Philosophie'));
const Leistungen = lazy(() => import('@/pages/Leistungen'));
const GroessereVermoegen = lazy(() => import('@/pages/GroessereVermoegen'));
const Wissen = lazy(() => import('@/pages/Wissen'));
const SicherInvestierenHub = lazy(() => import('@/pages/wissen/SicherInvestierenHub'));
const WissenArtikel = lazy(() => import('@/pages/WissenArtikel'));
const FinanzwissenArtikel = lazy(() => import('@/pages/FinanzwissenArtikel'));
const NewsletterPage = lazy(() => import('@/pages/NewsletterPage'));
const Contact = lazy(() => import('@/pages/Contact'));
const InvestmentTopicPage = lazy(() => import('@/pages/InvestmentTopicPage'));
// Session 80.35 — dedizierte Themen-Landingpages für die 2 neuen Registry-Slugs.
const ZinsenSparenPage = lazy(() => import('@/pages/themen/ZinsenSparenPage'));
const RuhestandVorsorgePage = lazy(() => import('@/pages/themen/RuhestandVorsorgePage'));
const HandelnHub = lazy(() => import('@/pages/HandelnHub'));
const InvestmentTopicsOverviewPage = lazy(() => import('@/pages/InvestmentTopicsOverviewPage'));
const AdminInvestmentTopics = lazy(() => import('@/pages/admin/AdminInvestmentTopics'));
const AdminInvestmentTopicEdit = lazy(() => import('@/pages/admin/AdminInvestmentTopicEdit'));
const AdminNewsArticles = lazy(() => import('@/pages/admin/AdminNewsArticles'));
const AdminSocialContent = lazy(() => import('@/pages/admin/AdminSocialContent'));
const AdminStockResearch = lazy(() => import('@/pages/admin/AdminStockResearch'));
const CreditLeadPage = lazy(() => import('@/pages/CreditLeadPage'));
const Bewertungen = lazy(() => import('@/pages/Bewertungen'));
const Kundenstimmen = lazy(() => import('@/pages/Kundenstimmen'));
const StrategieOverview = lazy(() => import('@/pages/strategie/StrategieOverview'));
const StrategieCategory = lazy(() => import('@/pages/strategie/StrategieCategory'));
const StrategieDetail = lazy(() => import('@/pages/strategie/StrategieDetail'));
const PublicNewsPage = lazy(() => import('@/pages/NewsMarkte'));
const PublicNewsPageLegacy = lazy(() => import('@/pages/news/PublicNewsPage'));
const NewsCategoryDetail = lazy(() => import('@/pages/NewsCategoryDetail'));
const PublicNewsDetailPage = lazy(() => import('@/pages/news/PublicNewsDetailPage'));
const PublicNewsVideoPage = lazy(() => import('@/pages/news/PublicNewsVideoPage'));
const WaehrungsrechnerPage = lazy(() => import('@/pages/news/WaehrungsrechnerPage'));
const RohstoffchartsPage = lazy(() => import('@/pages/news/RohstoffchartsPage'));
const MarketInstrumentSnapshotPage = lazy(() => import('@/pages/news/MarketInstrumentSnapshotPage'));
const WatchlistPage = lazy(() => import('@/pages/news/WatchlistPage'));
const MeineAlarmePage = lazy(() => import('@/pages/MeineAlarmePage'));
const NachrichtenPage = lazy(() => import('@/pages/news/NachrichtenPage'));
const EuronewsArticlePage = lazy(() => import('@/pages/news/EuronewsArticlePage'));
const NachrichtenDetailPage = lazy(() => import('@/pages/news/NachrichtenDetailPage'));
const LegacyNewsDetailRedirect = lazy(() => import('@/pages/news/LegacyNewsDetailRedirect'));
const EinordnungPage = lazy(() => import('@/pages/news/EinordnungPage'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const OnboardingWizard = lazy(() => import('@/pages/OnboardingWizard'));

const UserDashboardLayout = lazy(
  () => import('@/components/dashboard/UserDashboardLayout'),
);
const AdminDashboardLayout = lazy(
  () => import('@/components/dashboard/AdminDashboardLayout'),
);

const UebersichtPage = lazy(() => import('@/pages/dashboard/UebersichtPage'));
const DepotPage = lazy(() => import('@/pages/dashboard/DepotPage'));
const FestgeldPage = lazy(() => import('@/pages/dashboard/FestgeldPage'));
const TagesgeldPage = lazy(() => import('@/pages/dashboard/TagesgeldPage'));
const FlexgeldPage = lazy(() => import('@/pages/dashboard/FlexgeldPage'));
const AnleihenPage = lazy(() => import('@/pages/dashboard/AnleihenPage'));
const AnleihenKaufenPage = lazy(() => import('@/pages/dashboard/AnleihenKaufenPage'));
const AktienPage = lazy(() => import('@/pages/dashboard/AktienPage'));
const DividendenkalenderPage = lazy(() => import('@/pages/aktien/DividendenkalenderPage'));
const MeinDepotPage = lazy(() => import('@/pages/MeinDepotPage'));
const IpoPage = lazy(() => import('@/pages/dashboard/IpoPage'));
const DashboardHandelnPage = lazy(() => import('@/pages/dashboard/DashboardHandelnPage'));
const DashboardStockDetailPage = lazy(() => import('@/pages/dashboard/DashboardStockDetailPage'));
const StockDetailRedirect = lazy(() => import('@/pages/dashboard/StockDetailRedirect'));
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage'));
const FavoritesPage = lazy(() => import('@/pages/dashboard/FavoritesPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const SupportPage = lazy(() => import('@/pages/dashboard/SupportPage'));
const NewsPage = lazy(() => import('@/pages/dashboard/NewsPage'));
const NewsDetailPage = lazy(() => import('@/pages/dashboard/NewsDetailPage'));
const NewsVideoPage = lazy(() => import('@/pages/dashboard/NewsVideoPage'));
const AlarmePage = lazy(() => import('@/pages/dashboard/AlarmePage'));
const KontoauszugPage = lazy(() => import('@/pages/dashboard/KontoauszugPage'));
const DokumentePage = lazy(() => import('@/pages/dashboard/DokumentePage'));
const DashboardLegacyRedirect = lazy(
  () => import('@/pages/dashboard/DashboardLegacyRedirect'),
);

const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminEditorial = lazy(() => import('@/pages/AdminEditorial'));
const AdminEinordnung = lazy(() => import('@/pages/AdminEinordnung'));
const AdminReviews = lazy(() => import('@/pages/AdminReviews'));
const AdminBanks = lazy(() => import('@/pages/AdminBanks'));
const AdminOffers = lazy(() => import('@/pages/AdminOffers'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const AdminUserDetail = lazy(() => import('@/pages/AdminUserDetail'));
const AdminApplications = lazy(() => import('@/pages/AdminApplications'));
const AdminOfferInterests = lazy(() => import('@/pages/AdminOfferInterests'));
const AdminDepotContracts = lazy(() => import('@/pages/AdminDepotContracts'));
const AdminActivity = lazy(() => import('@/pages/AdminActivity'));
const AdminCashBalances = lazy(() => import('@/pages/AdminCashBalances'));
const AdminBondPositions = lazy(() => import('@/pages/AdminBondPositions'));
const AdminStocks = lazy(() => import('@/pages/AdminStocks'));
const AdminStockOrders = lazy(() => import('@/pages/AdminStockOrders'));
const AdminStockCoupons = lazy(() => import('@/pages/AdminStockCoupons'));
const AdminFormularAccess = lazy(() => import('@/pages/AdminFormularAccess'));
const AdminDocumentUploads = lazy(() => import('@/pages/AdminDocumentUploads'));
const DokumentHochladen = lazy(() => import('@/pages/DokumentHochladen'));
const AdminUserPositions = lazy(() => import('@/pages/AdminUserPositions'));
const AdminAnalytics = lazy(() => import('@/pages/AdminAnalytics'));
const AdminLiveVisitors = lazy(() => import('@/pages/AdminLiveVisitors'));
const AdminBondCatalog = lazy(() => import('@/pages/AdminBondCatalog'));
const AdminBondRequests = lazy(() => import('@/pages/AdminBondRequests'));
const AdminIpoCatalog = lazy(() => import('@/pages/AdminIpoCatalog'));
const AdminIpoRequests = lazy(() => import('@/pages/AdminIpoRequests'));
const AdminMarketData = lazy(() => import('@/pages/AdminMarketData'));
const AdminSupport = lazy(() => import('@/pages/AdminSupport'));
const AdminCreditLeads = lazy(() => import('@/pages/AdminCreditLeads'));
const AdminInsufficientBuyingPower = lazy(() => import('@/pages/AdminInsufficientBuyingPower'));
const AdminProductInquiryLeads = lazy(() => import('@/pages/AdminProductInquiryLeads'));
const AdminAssistantHandoffs = lazy(() => import('@/pages/AdminAssistantHandoffs'));
const AdminSocialPreviewMessages = lazy(() => import('@/pages/AdminSocialPreviewMessages'));
const AdminContractSubmissions = lazy(() => import('@/pages/AdminContractSubmissions'));
const AdminOfferReviews = lazy(() => import('@/pages/AdminOfferReviews'));
const AdminCreditOffers = lazy(() => import('@/pages/AdminCreditOffers'));
const AdminCreditBankDetails = lazy(() => import('@/pages/AdminCreditBankDetails'));

const StockDetail = lazy(() => import('@/pages/StockDetail'));
const ApplicationForm = lazy(() => import('@/pages/ApplicationForm'));
const LogoPreview = lazy(() => import('@/pages/LogoPreview'));
const BBVAContractForm = lazy(() => import('@/pages/BBVAContractForm'));
const Legal = lazy(() => import('@/pages/Legal'));
const PasswordPage = lazy(() => import('@/pages/PasswordPage'));
const BankSelectionPage = lazy(() => import('@/pages/BankSelectionPage'));
const BBVAFlexgeldDocs = lazy(() => import('@/pages/bbva/BBVAFlexgeldDocs'));
const BBVAFlexgeldBedingungen = lazy(() => import('@/pages/bbva/BBVAFlexgeldBedingungen'));
const BBVAFlexgeldProduktinfo = lazy(() => import('@/pages/bbva/BBVAFlexgeldProduktinfo'));
const BBVAFestgeldDocs = lazy(() => import('@/pages/bbva/BBVAFestgeldDocs'));
const BBVAFestgeldVertrag = lazy(() => import('@/pages/bbva/BBVAFestgeldVertrag'));
const BBVAFestgeldBedingungen = lazy(() => import('@/pages/bbva/BBVAFestgeldBedingungen'));
const BBVAFestgeldProduktinfo = lazy(() => import('@/pages/bbva/BBVAFestgeldProduktinfo'));
const PostbankContractForm = lazy(() => import('@/pages/PostbankContractForm'));
const PostbankFlexgeldDocs = lazy(() => import('@/pages/postbank/PostbankFlexgeldDocs'));
const PostbankFlexgeldBedingungen = lazy(() => import('@/pages/postbank/PostbankFlexgeldBedingungen'));
const PostbankFlexgeldProduktinfo = lazy(() => import('@/pages/postbank/PostbankFlexgeldProduktinfo'));
const PostbankFestgeldDocs = lazy(() => import('@/pages/postbank/PostbankFestgeldDocs'));
const PostbankFestgeldVertrag = lazy(() => import('@/pages/postbank/PostbankFestgeldVertrag'));
const PostbankFestgeldBedingungen = lazy(() => import('@/pages/postbank/PostbankFestgeldBedingungen'));
const PostbankFestgeldProduktinfo = lazy(() => import('@/pages/postbank/PostbankFestgeldProduktinfo'));
const IngContractForm = lazy(() => import('@/pages/IngContractForm'));
const IngFlexgeldDocs = lazy(() => import('@/pages/ing/IngFlexgeldDocs'));
const IngFlexgeldBedingungen = lazy(() => import('@/pages/ing/IngFlexgeldBedingungen'));
const IngFlexgeldProduktinfo = lazy(() => import('@/pages/ing/IngFlexgeldProduktinfo'));
const IngFestgeldDocs = lazy(() => import('@/pages/ing/IngFestgeldDocs'));
const IngFestgeldVertrag = lazy(() => import('@/pages/ing/IngFestgeldVertrag'));
const IngFestgeldBedingungen = lazy(() => import('@/pages/ing/IngFestgeldBedingungen'));
const IngFestgeldProduktinfo = lazy(() => import('@/pages/ing/IngFestgeldProduktinfo'));
const BunqContractForm = lazy(() => import('@/pages/BunqContractForm'));
const BunqFlexgeldDocs = lazy(() => import('@/pages/bunq/BunqFlexgeldDocs'));
const BunqFlexgeldBedingungen = lazy(() => import('@/pages/bunq/BunqFlexgeldBedingungen'));
const BunqFlexgeldProduktinfo = lazy(() => import('@/pages/bunq/BunqFlexgeldProduktinfo'));
const BunqFestgeldDocs = lazy(() => import('@/pages/bunq/BunqFestgeldDocs'));
const BunqFestgeldVertrag = lazy(() => import('@/pages/bunq/BunqFestgeldVertrag'));
const BunqFestgeldBedingungen = lazy(() => import('@/pages/bunq/BunqFestgeldBedingungen'));
const BunqFestgeldProduktinfo = lazy(() => import('@/pages/bunq/BunqFestgeldProduktinfo'));
const BunqDeContractForm = lazy(() => import('@/pages/BunqDeContractForm'));
const BunqDeFlexgeldDocs = lazy(() => import('@/pages/bunq-de/BunqDeFlexgeldDocs'));
const BunqDeFlexgeldBedingungen = lazy(() => import('@/pages/bunq-de/BunqDeFlexgeldBedingungen'));
const BunqDeFlexgeldProduktinfo = lazy(() => import('@/pages/bunq-de/BunqDeFlexgeldProduktinfo'));
const BunqDeFestgeldDocs = lazy(() => import('@/pages/bunq-de/BunqDeFestgeldDocs'));
const BunqDeFestgeldVertrag = lazy(() => import('@/pages/bunq-de/BunqDeFestgeldVertrag'));
const BunqDeFestgeldBedingungen = lazy(() => import('@/pages/bunq-de/BunqDeFestgeldBedingungen'));
const BunqDeFestgeldProduktinfo = lazy(() => import('@/pages/bunq-de/BunqDeFestgeldProduktinfo'));
const KnabFlexgeldDocs = lazy(() => import('@/pages/knab/KnabFlexgeldDocs'));
const KnabFlexgeldVertrag = lazy(() => import('@/pages/knab/KnabFlexgeldVertrag'));
const KnabFlexgeldBedingungen = lazy(() => import('@/pages/knab/KnabFlexgeldBedingungen'));
const KnabFlexgeldProduktinfo = lazy(() => import('@/pages/knab/KnabFlexgeldProduktinfo'));
const KnabFestgeldDocs = lazy(() => import('@/pages/knab/KnabFestgeldDocs'));
const KnabFestgeldVertrag = lazy(() => import('@/pages/knab/KnabFestgeldVertrag'));
const KnabFestgeldBedingungen = lazy(() => import('@/pages/knab/KnabFestgeldBedingungen'));
const KnabFestgeldProduktinfo = lazy(() => import('@/pages/knab/KnabFestgeldProduktinfo'));

function App() {
  useProtectSiteImages();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      toast.error(
        'Supabase ist im Build nicht konfiguriert. In Vercel REACT_APP_SUPABASE_URL und REACT_APP_SUPABASE_ANON_KEY setzen und neu deployen.',
        { duration: 12000 },
      );
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <DisplayCurrencyProvider>
        <SocialPreviewProvider>
        <BrowserRouter>
          <ScrollToTop />
          <MotionConfig reducedMotion="user">
          <div className="App overflow-x-clip">
            <Suspense
              fallback={
                <div className="min-h-[40vh] flex items-center justify-center text-bank-text-muted">
                  Wird geladen...
                </div>
              }
            >
              <Routes>
                <Route path="/dokumente/vorschau/:docId" element={<DokumentePreview />} />
                {/* Marketing layout (top nav + footer) */}
                <Route element={<Layout />}>
                  {/* Public */}
                  <Route path="/" element={<Home />} />
                  <Route path="/comparison" element={<SavingsComparison />} />
                  <Route path="/produkte/:slug" element={<SavingsProductGuidePage />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/sicherheit-regulierung" element={<SicherheitRegulierung />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/spezial-aif" element={<SpezialAif />} />
                  <Route path="/fonds-grundlagen" element={<FondsGrundlagen />} />
                  <Route path="/partner-banks" element={<PartnerBanks />} />
                  <Route path="/savings-education" element={<SavingsEducation />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/dokumente" element={<Dokumente />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/philosophie" element={<Philosophie />} />
                  <Route path="/leistungen" element={<Leistungen />} />
                  <Route path="/groessere-vermoegen" element={<GroessereVermoegen />} />
                  <Route path="/wissen" element={<Wissen />} />
                  <Route path="/wissen/sicher-investieren" element={<SicherInvestierenHub />} />
                  <Route path="/wissen/:slug" element={<WissenArtikel />} />
                  <Route path="/strategie" element={<StrategieOverview />} />
                  <Route path="/strategie/:category" element={<StrategieCategory />} />
                  <Route path="/strategie/:category/:topic" element={<StrategieDetail />} />
                  <Route path="/finanzwissen/:slug" element={<FinanzwissenArtikel />} />
                  <Route path="/bausteine" element={<Navigate to="/leistungen#bausteine" replace />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/themen" element={<InvestmentTopicsOverviewPage />} />
                  {/* Session 80.35 — explizite Routen vor der Catch-all `:slug`. */}
                  <Route path="/themen/zinsen-sparen" element={<ZinsenSparenPage />} />
                  <Route path="/themen/ruhestand-vorsorge" element={<RuhestandVorsorgePage />} />
                  <Route path="/themen/:slug" element={<InvestmentTopicPage />} />
                  <Route path="/kredit" element={<CreditLeadPage />} />
                  <Route path="/news" element={<PublicNewsPage />} />
                  <Route path="/news/watchlist" element={<WatchlistPage />} />
                  <Route path="/meine-alarme" element={<MeineAlarmePage />} />
                  <Route path="/news/nachrichten" element={<NachrichtenPage />} />
                  {/* Session 82.46 — Legacy-Detailrouten → Redirect auf kanonische /news/:slug */}
                  <Route path="/news/nachrichten/:slug" element={<LegacyNewsDetailRedirect />} />
                  <Route path="/nachrichten" element={<NachrichtenPage />} />
                  <Route path="/nachrichten/:slug" element={<LegacyNewsDetailRedirect />} />
                  <Route path="/newsletter" element={<NewsletterPage />} />
                  <Route path="/news/euronews/:slug" element={<NachrichtenDetailPage />} />
                  <Route path="/news/einordnung/:slug" element={<EinordnungPage />} />
                  <Route path="/bewertungen" element={<Bewertungen />} />
                  <Route path="/kundenstimmen" element={<Kundenstimmen />} />
                  <Route path="/news/archiv" element={<PublicNewsPageLegacy />} />
                  <Route path="/news/kategorie/:category" element={<NewsCategoryDetail />} />
                  <Route path="/news/aktien" element={<NewsCategoryDetail categorySlug="aktien" />} />
                  <Route path="/news/fonds-etfs" element={<NewsCategoryDetail categorySlug="fonds-etfs" />} />
                  <Route path="/news/rohstoffe" element={<NewsCategoryDetail categorySlug="rohstoffe" />} />
                  <Route path="/news/seltene-erden" element={<NewsCategoryDetail categorySlug="seltene-erden" />} />
                  <Route path="/news/anleihen" element={<NewsCategoryDetail categorySlug="anleihen" />} />
                  <Route path="/news/zinsen" element={<NewsCategoryDetail categorySlug="zinsen" />} />
                  <Route path="/news/waehrungen" element={<NewsCategoryDetail categorySlug="waehrungen" />} />
                  <Route path="/news/investmenttrends" element={<NewsCategoryDetail categorySlug="investmenttrends" />} />
                  <Route path="/news/unternehmen" element={<NewsCategoryDetail categorySlug="unternehmen" />} />
                  <Route path="/news/waehrungsrechner" element={<WaehrungsrechnerPage />} />
                  <Route path="/news/rohstoffcharts" element={<RohstoffchartsPage />} />
                  <Route path="/news/markt/:type/:slug" element={<MarketInstrumentSnapshotPage />} />
                  <Route path="/news/v/:slug" element={<PublicNewsVideoPage />} />
                  <Route path="/news/:slug" element={<PublicNewsDetailPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/apply" element={<ApplicationForm />} />
                  <Route
                    path="/contract/bbva"
                    element={<Navigate to="/banks/bbva/flexgeld/vertrag" replace />}
                  />
                  <Route path="/legal/:page" element={<Legal />} />
                  <Route path="/formular" element={<PasswordPage />} />
                  <Route path="/dokument-upload" element={<DokumentHochladen />} />
                  <Route path="/logo-preview" element={<LogoPreview />} />

                  {/* Formular-protected bank routes */}
                  <Route
                    path="/banks"
                    element={
                      <FormularProtectedRoute>
                        <BankSelectionPage />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BBVAContractForm />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bbva/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BBVAFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <PostbankContractForm />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/postbank/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <PostbankFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <IngFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <IngContractForm />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <IngFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <IngFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <IngFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <IngFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <IngFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/ing/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <IngFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq"
                    element={<Navigate to="/banks/bunq/flexgeld" replace />}
                  />
                  <Route
                    path="/banks/bunq/vertrag"
                    element={<Navigate to="/banks/bunq/flexgeld/vertrag" replace />}
                  />
                  <Route
                    path="/banks/bunq/produktinfo"
                    element={<Navigate to="/banks/bunq/flexgeld/produktinfo" replace />}
                  />
                  <Route
                    path="/banks/bunq/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <BunqFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BunqContractForm />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BunqFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BunqFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <BunqFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BunqFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BunqFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BunqFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de"
                    element={<Navigate to="/banks/bunq-de/flexgeld" replace />}
                  />
                  <Route
                    path="/banks/bunq-de/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeContractForm />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/bunq-de/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <BunqDeFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route path="/banks/knab" element={<Navigate to="/banks/knab/flexgeld" replace />} />
                  <Route path="/banks/knab/vertrag" element={<Navigate to="/banks/knab/flexgeld/vertrag" replace />} />
                  <Route path="/banks/knab/produktinfo" element={<Navigate to="/banks/knab/flexgeld/produktinfo" replace />} />
                  <Route
                    path="/banks/knab/flexgeld"
                    element={
                      <FormularProtectedRoute>
                        <KnabFlexgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/flexgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <KnabFlexgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/flexgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <KnabFlexgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/flexgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <KnabFlexgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/festgeld"
                    element={
                      <FormularProtectedRoute>
                        <KnabFestgeldDocs />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/festgeld/vertrag"
                    element={
                      <FormularProtectedRoute>
                        <KnabFestgeldVertrag />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/festgeld/bedingungen"
                    element={
                      <FormularProtectedRoute>
                        <KnabFestgeldBedingungen />
                      </FormularProtectedRoute>
                    }
                  />
                  <Route
                    path="/banks/knab/festgeld/produktinfo"
                    element={
                      <FormularProtectedRoute>
                        <KnabFestgeldProduktinfo />
                      </FormularProtectedRoute>
                    }
                  />

                  {/* Standalone authenticated pages still using marketing layout */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingWizard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/statement"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard/kontoauszug" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/handeln" element={<HandelnHub />} />
                  <Route
                    path="/mein-depot"
                    element={
                      <ProtectedRoute>
                        <MeinDepotPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/aktien/dividendenkalender" element={<DividendenkalenderPage />} />
                  <Route
                    path="/aktien/:symbol"
                    element={<PublicStockDetail />}
                  />
                </Route>

                {/* Dashboard shell (authenticated) — sidebar + topbar, no marketing chrome */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardLegacyRedirect />} />
                  <Route path="uebersicht" element={<UebersichtPage />} />
                  <Route path="vermoegen" element={<DepotPage />} />
                  <Route path="depot" element={<Navigate to="/dashboard/vermoegen" replace />} />
                  <Route path="festgeld" element={<FestgeldPage />} />
                  <Route path="tagesgeld" element={<TagesgeldPage />} />
                  <Route path="flexgeld" element={<FlexgeldPage />} />
                  <Route path="anleihen" element={<AnleihenPage />} />
                  <Route path="anleihen/kaufen" element={<AnleihenKaufenPage />} />
                  <Route path="aktien" element={<AktienPage />} />
                  <Route path="ipo" element={<IpoPage />} />
                  <Route path="handeln" element={<DashboardHandelnPage />} />
                  <Route path="aktien/:symbol" element={<DashboardStockDetailPage />} />
                  <Route path="auftraege" element={<OrdersPage />} />
                  <Route path="alarme" element={<AlarmePage />} />
                  <Route path="favoriten" element={<FavoritesPage />} />
                  <Route path="news" element={<NewsPage />} />
                  <Route path="news/v/:slug" element={<NewsVideoPage />} />
                  <Route path="news/:slug" element={<NewsDetailPage />} />
                  <Route path="profil" element={<ProfilePage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="kontoauszug" element={<KontoauszugPage />} />
                  <Route path="dokumente" element={<DokumentePage />} />
                  {/* Compatibility aliases (englisch) */}
                  <Route path="overview" element={<Navigate to="/dashboard/uebersicht" replace />} />
                  <Route path="orders" element={<Navigate to="/dashboard/auftraege" replace />} />
                  <Route path="favorites" element={<Navigate to="/dashboard/favoriten" replace />} />
                  <Route path="history" element={<Navigate to="/dashboard/uebersicht" replace />} />
                  <Route path="profile" element={<Navigate to="/dashboard/profil" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard/uebersicht" replace />} />
                </Route>

                {/* Admin shell (authenticated + admin) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:userId" element={<AdminUserDetail />} />
                  <Route path="banks" element={<AdminBanks />} />
                  <Route path="offers" element={<AdminOffers />} />
                  <Route path="applications" element={<AdminApplications />} />
                  <Route path="offer-interests" element={<AdminOfferInterests />} />
                  <Route path="depot-contracts" element={<AdminDepotContracts />} />
                  <Route path="activity" element={<AdminActivity />} />
                  <Route path="cash-balances" element={<AdminCashBalances />} />
                  <Route path="bond-positions" element={<AdminBondPositions />} />
                  <Route path="bond-catalog" element={<AdminBondCatalog />} />
                  <Route path="bond-requests" element={<AdminBondRequests />} />
                  <Route path="ipo-catalog" element={<AdminIpoCatalog />} />
                  <Route path="ipo-requests" element={<AdminIpoRequests />} />
                  <Route path="stocks" element={<AdminStocks />} />
                  <Route path="stock-orders" element={<AdminStockOrders />} />
                  <Route path="insufficient-buying-power" element={<AdminInsufficientBuyingPower />} />
                  <Route path="stock-coupons" element={<AdminStockCoupons />} />
                  <Route path="formular-access" element={<AdminFormularAccess />} />
                  <Route path="document-uploads" element={<AdminDocumentUploads />} />
                  <Route path="user-positions" element={<AdminUserPositions />} />
                  <Route path="markt-daten" element={<AdminMarketData />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="credit-leads" element={<AdminCreditLeads />} />
                  <Route path="product-inquiry-leads" element={<AdminProductInquiryLeads />} />
                  <Route path="assistant-handoffs" element={<AdminAssistantHandoffs />} />
                  <Route path="social-preview-messages" element={<AdminSocialPreviewMessages />} />
                  <Route path="contract-submissions" element={<AdminContractSubmissions />} />
                  <Route path="offer-reviews" element={<AdminOfferReviews />} />
                  <Route path="credit-offers" element={<AdminCreditOffers />} />
                  <Route path="credit-bank-details" element={<AdminCreditBankDetails />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="live-visitors" element={<AdminLiveVisitors />} />
                  <Route path="editorial" element={<AdminEditorial />} />
                  <Route path="einordnung" element={<AdminEinordnung />} />
                  <Route path="reviews" element={<AdminReviews /> } />
                  <Route path="investment-topics" element={<AdminInvestmentTopics />} />
                  <Route path="investment-topics/:slug" element={<AdminInvestmentTopicEdit />} />
                  <Route path="news-articles" element={<AdminNewsArticles />} />
                  <Route path="social-content" element={<AdminSocialContent />} />
                  <Route path="stock-research" element={<AdminStockResearch />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Toaster richColors position="top-right" />
            <VisitorTracker />
            <VisitorWelcomeGate />
            <CookieConsent />
            <FloatingAssistant />
            <SocialPreviewModal />
          </div>
          </MotionConfig>
        </BrowserRouter>
        </SocialPreviewProvider>
        </DisplayCurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

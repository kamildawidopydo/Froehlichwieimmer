import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import DepotPage from '@/pages/dashboard/DepotPage';
import PageMeta from '@/components/PageMeta';

/**
 * Session 81.04 — /mein-depot — Public-Layout-Wrapper um bestehende DepotPage.
 *
 * "Weg A" (User-Freigabe): Bestehende Depot-UI aus /dashboard/vermoegen unter
 * öffentlicher Kunden-Route erreichbar machen. KEINE Datenlogik-Duplikation,
 * KEINE zweite DepotPage. `DashboardDataProvider` liefert die identischen
 * Supabase-Daten (user_stock_positions, user_bond_positions, user_depot_contracts,
 * user_cash_settlements, user_portfolio_snapshots) mit bestehender RLS-Isolation.
 *
 * Auth-Gate: über <ProtectedRoute> im App.js-Routing (Redirect zu
 * /login?next=/mein-depot bereits von ProtectedRoute unterstützt, Login.js Z.30).
 *
 * Legacy /dashboard/vermoegen bleibt unverändert erreichbar.
 */
const MeinDepotPage = () => (
  <DashboardDataProvider>
    <main
      className="min-h-screen bg-bank-bg pb-16"
      data-testid="mein-depot-page"
    >
      <PageMeta
        title="Mein Depot"
        description="Ihre Depotübersicht auf kapital-direkt24.de — Positionen, Depotstruktur, Ausschüttungen."
        path="/mein-depot"
        noIndex
      />

      {/* Zarter Wrapper mit Editorial-Anmutung, kein Sidebar-Shell */}
      <div className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        <Link
          to="/"
          data-testid="mein-depot-back"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted transition-colors hover:text-bank-text focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bank-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Zurück zur Übersicht
        </Link>
      </div>

      {/* Bestehende DepotPage-Komponente unverändert einsetzen.
          Renders eigene PageContainer + PageHeader + VermoegenSubNav + Sektionen. */}
      <DepotPage />
    </main>
  </DashboardDataProvider>
);

export default MeinDepotPage;

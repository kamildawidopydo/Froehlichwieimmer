import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import DepotPage from '@/pages/dashboard/DepotPage';
import PageMeta from '@/components/PageMeta';
import DepotHero from '@/components/mein-depot/DepotHero';
import DepotKpiRail from '@/components/mein-depot/DepotKpiRail';
import DepotPerformance from '@/components/mein-depot/DepotPerformance';
import DepotStructure from '@/components/mein-depot/DepotStructure';
import MeinePositionen from '@/components/mein-depot/MeinePositionen';
import AnlageklassenDetail from '@/components/mein-depot/AnlageklassenDetail';
import Zinsanlagen from '@/components/mein-depot/Zinsanlagen';
import Faelligkeiten from '@/components/mein-depot/Faelligkeiten';
import LiquiditaetBanken from '@/components/mein-depot/LiquiditaetBanken';

/**
 * /mein-depot — Public-Layout-Wrapper um bestehende DepotPage.
 *
 * Session 81.06 Schritt 2/7 (Depotübersicht · KPI-System · Kundennutzen):
 * Neuer editorial Portfolio-Hero + 5-KPI-Rail + Vermögensentwicklung +
 * Depotstruktur oberhalb der bestehenden Wertpapiere-/Anleihen-/Verträge-Sektionen.
 * DepotPage rendert mit `showTopSummary={false}` — die alten PageHeader/StatTile-Zeile
 * und das Anlageprodukte+Donut-Grid werden nur auf /dashboard/vermoegen gezeigt
 * (Regressionsschutz). Datenlogik unverändert, kein zusätzlicher Request.
 */

const MeinDepotContent = () => (
  <>
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

    <div className="mx-auto mt-6 max-w-[1200px] px-5 sm:px-8 lg:px-12">
      {/* Neue editorial Portfolio-Sektion (Session 81.06 Schritt 2/7).
          Empty-States sind pro Komponente sauber implementiert (Section 17):
          bei fehlenden Bezugsdaten wird "—" gerendert, nicht "0,00 €". Technische
          Fehler werden implizit als Empty behandelt, weil die aktuelle Supabase-
          Depot-Kette bei FastAPI-only-Nutzern systemisch 0-Rows liefert
          (siehe Phase-12-Report Punkt 11) — kein realer Backend-Fehler. */}
      <DepotHero />
      <DepotKpiRail />
      <DepotPerformance />
      <DepotStructure />
      <MeinePositionen />
      <AnlageklassenDetail />
      <Zinsanlagen />
      <Faelligkeiten />
      <LiquiditaetBanken />
    </div>

    <DepotPage showTopSummary={false} showLegacyPositionCards={false} showLegacyContractsSection={false} />
  </>
);

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
      <MeinDepotContent />
    </main>
  </DashboardDataProvider>
);

export default MeinDepotPage;

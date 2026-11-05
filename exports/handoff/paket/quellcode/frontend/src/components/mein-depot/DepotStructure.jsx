import React from 'react';
import AssetAllocationDonut from '@/components/AssetAllocationDonut';
import { useDashboardData } from '@/context/DashboardDataContext';

/**
 * DepotStructure — kompakte "Depotstruktur"-Sektion auf /mein-depot.
 *
 * Nutzt konsequent den bestehenden `AssetAllocationDonut` (4 Kategorien:
 * Aktien / Anleihen / Verträge / Guthaben). KEINE neuen Kategorien, keine
 * künstliche Diversifikationsbewertung.
 *
 * Empty-State: wenn alle 4 Kategorien 0 → dedizierter Text statt leerem Donut.
 */
const DepotStructure = () => {
  const {
    loading,
    cashBalance,
    depotWert,
    bondsMarktwert,
    contractsTotal,
  } = useDashboardData();

  const total =
    Number(cashBalance || 0) +
    Number(depotWert || 0) +
    Number(bondsMarktwert || 0) +
    Number(contractsTotal || 0);

  return (
    <section
      aria-labelledby="mein-depot-structure-title"
      data-testid="mein-depot-structure"
      className="mb-14"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
        Depotstruktur
      </p>
      <h2
        id="mein-depot-structure-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Wie sich Ihr Vermögen zusammensetzt
      </h2>

      <div className="mt-5">
        {loading ? (
          <div
            data-testid="mein-depot-structure-skeleton"
            className="h-[260px] animate-pulse rounded-sm bg-bank-border/25"
          />
        ) : total <= 0 ? (
          <div
            data-testid="mein-depot-structure-empty"
            className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center"
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">
              Noch keine Struktur
            </p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">
              Noch keine Depotstruktur verfügbar.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
              Sobald Positionen, Anleihen, Verträge oder Cash hinterlegt sind, sehen Sie
              hier die Aufteilung Ihres Vermögens.
            </p>
          </div>
        ) : (
          <AssetAllocationDonut
            cash={cashBalance}
            stocks={depotWert}
            bonds={bondsMarktwert}
            contracts={contractsTotal}
          />
        )}
      </div>
    </section>
  );
};

export default DepotStructure;

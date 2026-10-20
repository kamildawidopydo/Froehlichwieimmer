import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BankLogo from '@/components/BankLogo';
import DepositProtectionBadge from '@/components/DepositProtectionBadge';
import { useDashboardData } from '@/context/DashboardDataContext';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useDashboardData();

  return (
    <PageContainer>
      <PortfolioPageLayout>
        <PageHeader
          eyebrow="Aktivität"
          title="Favoriten"
          icon={Heart}
          description="Sparangebote, die Sie zur späteren Ansicht gespeichert haben."
          actions={
            <Button variant="outline" size="default" onClick={() => window.open('/comparison', '_blank', 'noopener')}>
              <Sparkles size={14} strokeWidth={1.5} /> Mehr Angebote entdecken
            </Button>
          }
        />

        {favorites.length === 0 ? (
          <div className="rounded-xl border border-bank-border bg-white py-12 text-center shadow-sm">
            <Heart size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-text-muted/50" />
            <h3 className="text-[1.25rem] font-semibold text-bank-text">Noch keine Favoriten gespeichert</h3>
            <p className="mt-2 text-[13px] text-bank-text-muted">Durchsuchen Sie Angebote und speichern Sie Ihre Favoriten.</p>
            <Button variant="primary" size="default" className="mt-4" onClick={() => window.open('/comparison', '_blank', 'noopener')}>
              <Sparkles size={14} strokeWidth={1.5} /> Angebote durchsuchen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-bank-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-bank-text">{offer.bank_name}</p>
                      <p className="mt-0.5 text-[11px] text-bank-text-muted">{offer.country}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFavorite(offer.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-bank-border text-bank-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Aus Favoriten entfernen"
                    aria-label="Aus Favoriten entfernen"
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <p className="text-[2rem] font-semibold leading-none tabular-nums text-bank-primary">{offer.interest_rate}%</p>
                  <span className="text-[11px] uppercase tracking-[0.04em] text-bank-text-muted">p.a.</span>
                </div>

                <div className="mt-4">
                  <DepositProtectionBadge offer={offer} />
                </div>

                <Button variant="primary" size="default" className="mt-5 w-full" onClick={() => navigate('/apply', { state: { offer } })}>
                  Bewerben
                </Button>
              </div>
            ))}
          </div>
        )}
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default FavoritesPage;

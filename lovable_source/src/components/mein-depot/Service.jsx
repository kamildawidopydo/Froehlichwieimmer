import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Mail, Phone, ChevronRight } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { cn } from '@/lib/utils';

/**
 * Service — Kontakt-/Support-Sektion auf /mein-depot (Schritt 6/7).
 *
 * Nur bestehende funktionierende Routen:
 *   - /dashboard/support   (bestehende Support-Ticket-Seite)
 *   - /contact             (öffentliches Kontaktformular)
 *
 * `supportUnread` wird — sofern > 0 — als Zähler auf der Support-Karte
 * gerendert (Section 12). Zahl stammt aus `support_tickets` und wird bereits
 * von DashboardDataContext geladen — 0 zusätzliche Requests.
 *
 * KEINE Aussagen über einen zugewiesenen persönlichen Berater — es existiert
 * keine solche Zuordnung im aktuellen Datenmodell.
 */

const ServiceCard = ({ icon: Icon, kicker, title, body, cta, to, badge, testId }) => (
  <Link
    to={to}
    data-testid={testId}
    className="group block h-full rounded-sm border border-bank-border bg-white p-5 transition-colors hover:bg-bank-bg/40 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-bank-border bg-bank-bg text-bank-text-muted">
        <Icon size={16} strokeWidth={1.5} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
          {kicker}
          {badge != null && badge > 0 && (
            <span
              data-testid={`${testId}-badge`}
              className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-bank-primary px-1.5 py-0.5 text-[10px] font-bold text-white"
            >
              {badge}
            </span>
          )}
        </p>
        <p className="mt-1.5 text-[14px] font-medium text-bank-text">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-bank-text-muted">{body}</p>
        <p className="mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-primary transition-transform group-hover:translate-x-0.5">
          {cta} <ChevronRight size={12} strokeWidth={1.6} aria-hidden />
        </p>
      </div>
    </div>
  </Link>
);

const Service = () => {
  const { supportUnread } = useDashboardData();
  const unread = Number(supportUnread || 0);

  return (
    <section aria-labelledby="mein-depot-service-title" data-testid="mein-depot-service" className="mb-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Service</p>
      <h2
        id="mein-depot-service-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Support und persönliche Beratung
      </h2>

      <div className={cn('mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3')}>
        <ServiceCard
          icon={LifeBuoy}
          kicker="Support"
          title={unread > 0 ? `${unread} ${unread === 1 ? 'neue Antwort' : 'neue Antworten'}` : 'Support-Anfrage'}
          body="Stellen Sie eine Frage zu Ihrem Depot, Vertrag oder einer Transaktion."
          cta={unread > 0 ? 'Antworten ansehen' : 'Zum Support'}
          to="/dashboard/support"
          badge={unread}
          testId="mds-support"
        />
        <ServiceCard
          icon={Mail}
          kicker="Kontakt"
          title="Persönliche Beratung"
          body="Sprechen Sie mit unserem Team über Ihre Anlagestrategie."
          cta="Kontakt aufnehmen"
          to="/contact"
          testId="mds-contact"
        />
        <ServiceCard
          icon={Phone}
          kicker="Rückruf"
          title="Telefonische Beratung"
          body="Bevorzugen Sie ein Telefonat? Unsere Berater rufen Sie zurück."
          cta="Rückruf anfordern"
          to="/contact#rueckruf"
          testId="mds-callback"
        />
      </div>
    </section>
  );
};

export default Service;

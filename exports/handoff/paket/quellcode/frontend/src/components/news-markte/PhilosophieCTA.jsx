import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Eyebrow from '@/components/editorial/Eyebrow';

const PhilosophieCTA = () => (
  <section
    className="relative overflow-hidden border-t border-bank-border bg-bank-ink py-20 sm:py-24"
    data-testid="philosophie-cta"
  >
    <div aria-hidden className="absolute inset-0 -z-10 topo-pattern opacity-20 mix-blend-screen" />
    <div className="mx-auto max-w-4xl px-6 sm:px-10">
      <Eyebrow tone="light">Unsere Verantwortung</Eyebrow>
      <h2 className="mt-6 font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-[42px]">
        Märkte verändern sich täglich.<br className="hidden sm:block" /> Unsere Verantwortung bleibt.
      </h2>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-white/75 sm:text-[16px]">
        <p>
          Nachrichten und Marktbewegungen sind wichtig. Eine langfristige Vermögensstrategie sollte jedoch nicht von
          jeder einzelnen Schlagzeile abhängig gemacht werden.
        </p>
        <p>
          Wir beobachten die Entwicklungen, prüfen Chancen und Risiken und begleiten unsere Anleger langfristig.
        </p>
        <p>
          Dabei betrachten wir nicht ausschließlich die mögliche Rendite. Sicherheit, Liquidität, Anlagehorizont und
          die persönliche Situation unserer Anleger gehören für uns genauso zu einer verantwortungsvollen Entscheidung.
        </p>
      </div>
      <p className="mt-10 font-serif text-lg italic text-bank-accent">
        Informiert bleiben. Bewusst entscheiden. Persönlich begleitet.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="rounded-none bg-bank-accent text-white hover:bg-bank-accent-strong"
          data-testid="cta-contact"
        >
          <Link to="/contact">
            Persönlichen Ansprechpartner kontaktieren
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="rounded-none border-white/30 bg-transparent text-white hover:border-white hover:bg-white/5"
          data-testid="cta-platform"
        >
          <Link to="/dashboard">
            Investmentplattform öffnen
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default PhilosophieCTA;

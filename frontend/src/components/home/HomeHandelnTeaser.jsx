import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

/**
 * HomeHandelnTeaser
 *
 * Kurzer redaktioneller Einstieg zum Wissenshub `/handeln` auf der Startseite.
 * Ziel: Einsteiger verstehen worum es geht, bevor sie tiefer klicken.
 *
 * Bewusste Beschränkungen:
 *   - ~110 Wörter Body-Copy (nicht den Wissenshub duplizieren)
 *   - reiner Text-Teaser + ein CTA — keine zweite Nav, kein Card-Grid
 *   - editorial Style konsistent mit HomeSavingsFaqSection / HomeTestimonials
 */
const HomeHandelnTeaser = () => {
  const prefersReduced = useReducedMotion();
  const reveal = {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: prefersReduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <section
      className="border-t border-bank-border bg-white"
      data-testid="home-handeln-teaser"
      aria-labelledby="home-handeln-teaser-heading"
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:px-12">
        <motion.div {...reveal} className="max-w-2xl">
          <Eyebrow>Wissenshub</Eyebrow>
          <h2
            id="home-handeln-teaser-heading"
            className="mt-4 font-serif text-3xl leading-tight text-bank-text sm:text-[38px]"
          >
            Investment &amp; Börse verstehen
          </h2>
          <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
            <p>
              Wer sein Geld anlegen möchte, begegnet schnell Begriffen wie Aktien,
              Anleihen, Fonds oder Börse. Doch wie funktioniert der Handel eigentlich —
              und worauf sollten Anleger achten, bevor sie ihre erste Order aufgeben?
            </p>
            <p>
              In unserem Wissensbereich erklären wir verständlich, wie Wertpapiere an
              der Börse gehandelt werden, welche Anlageklassen für welche Ziele passen
              und welche Chancen und Risiken damit typischerweise verbunden sind.
            </p>
            <p>
              Ergänzt wird das Ganze durch ein kompaktes Börsen-ABC mit über 50
              Begriffen — als Nachschlagewerk, wenn Ihnen im Alltag ein Fachbegriff
              begegnet.
            </p>
          </div>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ ...reveal.transition, delay: prefersReduced ? 0 : 0.1 }}
          className="lg:pb-2"
        >
          <Link
            to="/handeln"
            data-testid="home-handeln-teaser-cta"
            className="group inline-flex items-center gap-2 border border-bank-primary px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-bank-primary transition-colors hover:bg-bank-primary hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
          >
            Weiterlesen
            <ArrowUpRight
              size={13}
              strokeWidth={1.7}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeHandelnTeaser;

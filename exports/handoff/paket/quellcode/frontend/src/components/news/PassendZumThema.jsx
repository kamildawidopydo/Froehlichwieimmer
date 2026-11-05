import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getMoneyImpact } from '@/lib/news/moneyImpact';

/**
 * Session 80.31 Phase C — „Passend zum Thema"-Mini-Sektion.
 *
 * Zeigt einen dezenten Text-Link zu den Sparangeboten, wenn ein Artikel
 * eindeutig ein Zins-/Spar-Thema betrifft. Betont bewusst „einordnen"
 * (Bildung), nicht „vergleichen" (Sales).
 *
 * Match-Regel — Trigger nur bei klarem Zins/Spar-Bezug:
 *   * Titel oder Summary erwähnt Tages-/Festgeld/Sparzinsen/Einlagenzins ODER
 *   * EZB + Zinssignal + Sparbezug im Text ODER
 *   * MoneyImpact-Profil-ID ist `ezb-zinsen`
 * Nicht anzeigen bei:
 *   * allgemeinen Aktien-News, Unternehmens-News, Politik
 *   * Rente/Vorsorge, Immobilien ohne Sparbezug
 *   * Inflation ohne konkreten Zins-/Sparbezug
 *   * schwachem Match
 *
 * Duplikat-Schutz: Wenn `WasBedeutetDasBlock` bereits eine `/sparangebote`-
 * CTA rendert (nur beim `ezb-zinsen`-Profil), unterdrücken wir die Sektion
 * hier — max. **eine** konkrete Sparangebote-Handlung pro News-Detailseite.
 */

const STRONG_KEYWORDS = [
  /\btagesgeld\b/i,
  /\bfestgeld\b/i,
  /\bsparzins/i,
  /\beinlagenzins/i,
  /\bsparangebote?\b/i,
  /\bsparerpauschbetrag\b/i,
];

// EZB-Zins nur, wenn im Text zusätzlich ein Spar-Signal steht.
const EZB_ZINS_RE = /\b(?:ezb|leitzins|einlagensatz|zinssenkung|zinserh[oö]hung)\b/i;
const SAVER_SIGNAL_RE = /\b(?:sparer|einlage|sparbuch|tagesgeld|festgeld|sparzins)\b/i;

// Negative Guards — selbst bei EZB-Nennung nicht triggern, wenn:
const NEGATIVE_KEYWORDS = [
  /\baktienmarkt\b/i,
  /\bkursziel\b/i,
  /\brentenreform\b/i,
  /\bimmobilienpreis/i,
];

const hasStrong = (text) => STRONG_KEYWORDS.some((rx) => rx.test(text));
const hasEzbSaver = (text) => EZB_ZINS_RE.test(text) && SAVER_SIGNAL_RE.test(text);
const hasNegative = (text) => NEGATIVE_KEYWORDS.some((rx) => rx.test(text));

const shouldRender = (article) => {
  if (!article) return false;
  // Session 80.32 — Topic-first: strukturierter Slug ist die stärkste Quelle.
  // Fällt der Slug leer aus, greift das keyword-basierte Safety-Fallback.
  if (article.investment_topic_slug === 'zinsen-sparen') return true;
  const text = `${article.title || ''} ${article.summary || ''} ${article.excerpt || ''}`;
  if (hasNegative(text)) return false;
  if (hasStrong(text)) return true;
  if (hasEzbSaver(text)) return true;
  return false;
};

const PassendZumThema = ({ article }) => {
  // Duplikat-Schutz: der Money-Impact-Block zeigt bereits einen
  // Sparangebote-CTA, wenn er auf das ezb-zinsen-Profil matcht.
  const impact = getMoneyImpact(article);
  const alreadyHasSparangebotCta = impact?.id === 'ezb-zinsen';
  if (alreadyHasSparangebotCta) return null;

  if (!shouldRender(article)) return null;

  return (
    <aside
      data-testid="passend-zum-thema"
      className="mt-10 border-t border-bank-border pt-6"
      aria-labelledby="passend-zum-thema-title"
    >
      <p
        id="passend-zum-thema-title"
        className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-petrol-strong"
      >
        Passend zum Thema
      </p>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-bank-text-muted">
        Wie sich aktuelle Zinsen bei Tages- und Festgeld einordnen — mit einem
        neutralen Überblick über verfügbare Sparangebote.
      </p>
      <Link
        to="/sparangebote"
        data-testid="passend-zum-thema-cta"
        className="mt-3 inline-flex items-center gap-1.5 border-b border-bank-petrol-strong pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-petrol-strong hover:opacity-80"
      >
        Aktuelle Sparangebote vergleichen
        <ArrowRight size={13} strokeWidth={1.7} />
      </Link>
    </aside>
  );
};

export default PassendZumThema;

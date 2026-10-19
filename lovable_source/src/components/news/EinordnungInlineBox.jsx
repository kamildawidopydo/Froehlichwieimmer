import { getApiBase } from '@/lib/apiBase';
/**
 * Session 80.29 Phase 2 — Inline „Fröhlich Einordnung" auf News-Detail.
 * Session 80.30 — strengeres Relevanz-Gating: reine Kategorie-Matches werden
 * NICHT mehr akzeptiert, damit keine generischen Einordnungen unter beliebigen
 * Nachrichten erscheinen. Erlaubt sind nur harte Bezüge (Slug-Backlink oder
 * gemeinsames investment_topic_slug).
 *
 * Datenquelle: /api/einordnung (bereits produktiver Endpoint aus 80.x).
 * Matching-Priorität:
 *   1. related_news_slug === Artikel-Slug          (starker Bezug)
 *   2. gemeinsames investment_topic_slug           (thematischer Bezug)
 *   3. sonst: nichts rendern.                      (kein generisches Fallback)
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { isPublicEinordnung } from '@/services/einordnungApi';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api` });

// simpler Modul-Cache: pro Session 1× einordnung-Liste laden
let cachePromise = null;
const loadEinordnungen = () => {
  if (!cachePromise) {
    cachePromise = api.get('/einordnung', { params: { limit: 50 } })
      .then((r) => (r.data?.items || []))
      .catch(() => []);
  }
  return cachePromise;
};

const EinordnungInlineBox = ({ article }) => {
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (!article) return;
    let alive = true;
    loadEinordnungen().then((posts) => {
      if (!alive || !posts.length) return;
      // Session 80.69 — zentraler Public-Filter (statt lokalem status-Guard).
      // Verhindert, dass Demo-/Test-Einordnungen als redaktionelle Fröhlich-
      // Einordnung unter einer öffentlichen News-Detailseite erscheinen.
      const published = posts.filter(isPublicEinordnung);
      // 1. exakter Backlink über related_news_slug (stärkster Bezug)
      let m = published.find((p) => p.related_news_slug && p.related_news_slug === article.slug);
      // 2. gemeinsames investment_topic_slug (thematischer Bezug)
      if (!m && article.investment_topic_slug) {
        m = published.find((p) => p.investment_topic_slug === article.investment_topic_slug
          || p.related_news_slug === article.investment_topic_slug);
      }
      // Kein Kategorie-Fallback mehr (80.30) — lieber nichts anzeigen als
      // einen zufällig passenden „Anleger sollten langfristig denken"-Text.
      setMatch(m || null);
    });
    return () => { alive = false; };
  }, [article]);

  if (!match) return null;

  return (
    <aside
      data-testid="einordnung-inline-box"
      className="card-accent-top card-accent-top-petrol mt-6 border border-bank-border bg-white p-6"
      aria-labelledby="einordnung-inline-title"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p
          id="einordnung-inline-title"
          className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-petrol-strong"
        >
          Fröhlich Einordnung
        </p>
        {match.reading_minutes ? (
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            {match.reading_minutes} Min. Lesezeit
          </p>
        ) : null}
      </div>
      <h3 className="mt-3 font-serif text-[20px] leading-snug text-bank-text">
        {match.title}
      </h3>
      {match.teaser && (
        <p className="mt-3 text-[14px] leading-relaxed text-bank-text">
          {match.teaser}
        </p>
      )}
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-bank-text-muted">
        Redaktionelle Perspektive der Fröhlich Vermögensberatung.
      </p>
      <Link
        to={`/einordnung/${match.slug}`}
        data-testid="einordnung-inline-cta"
        className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-medium text-bank-petrol-strong hover:text-bank-petrol-ink"
      >
        Vollständige Einordnung lesen
        <ArrowRight size={14} strokeWidth={1.8} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </aside>
  );
};

export default EinordnungInlineBox;

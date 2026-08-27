/**
 * Session 80.29 Phase 2 — Inline „Fröhlich Einordnung" auf News-Detail.
 *
 * Datenquelle: /api/einordnung (bereits produktiver Endpoint aus 80.x).
 * Matching-Priorität:
 *   1. investment_topic_slug (falls Artikel + Einordnung beide gesetzt)
 *   2. related_news_slug === Artikel-Slug
 *   3. category-Match
 *   4. sonst: nichts rendern.
 * Kein zufälliges Fallback, kein "irgend eine Einordnung" — lieber weglassen.
 *
 * Rendert: kompakte Box mit Petrol-Signatur, klar als redaktionelle
 * Fröhlich-Perspektive gekennzeichnet, visuell vom externen Nachrichtentext
 * getrennt. Kein neuer globaler Style.
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const BASE = process.env.REACT_APP_BACKEND_URL;
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
      // 1. exakter Backlink über related_news_slug
      let m = posts.find((p) => p.related_news_slug && p.related_news_slug === article.slug);
      // 2. investment_topic_slug beidseitig
      if (!m && article.investment_topic_slug) {
        m = posts.find((p) => p.related_news_slug === article.investment_topic_slug
          || p.category === article.investment_topic_slug);
      }
      // 3. Kategorien-Match
      if (!m && article.category) {
        m = posts.find((p) => p.category && p.category.toLowerCase() === article.category.toLowerCase());
      }
      // Nur veröffentlichte, nicht-demo Einordnungen anzeigen
      if (m && (m.status && m.status !== 'published')) m = null;
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
        Redaktionelle Perspektive der Fröhlich Vermögensberatung — keine Anlageempfehlung.
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

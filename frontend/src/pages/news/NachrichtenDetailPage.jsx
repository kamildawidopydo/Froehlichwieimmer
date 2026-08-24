import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, PlayCircle } from 'lucide-react';
import axios from 'axios';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import NachrichtenRelated from '@/components/news/NachrichtenRelated';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import TopicCrossLinkBox from '@/components/investment/TopicCrossLinkBox';
import KnowledgeCrossLinkBox from '@/components/knowledge/KnowledgeCrossLinkBox';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa', welt: 'Welt',
  wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur', sport: 'Sport', videos: 'Videos',
};

const renderBody = (body) => {
  if (!body) return null;
  const blocks = body.split(/\n{2,}/);
  const out = [];
  blocks.forEach((block, idx) => {
    const t = block.trim();
    if (!t) return;
    if (t.startsWith('## ')) {
      out.push(<h2 key={idx} className="mt-10 font-serif text-[26px] leading-tight text-bank-text">{t.replace(/^##\s+/, '')}</h2>);
      return;
    }
    if (t.startsWith('### ')) {
      out.push(<h3 key={idx} className="mt-8 font-serif text-xl text-bank-text">{t.replace(/^###\s+/, '')}</h3>);
      return;
    }
    // Bullet-Block: aufeinanderfolgende Zeilen, die mit `- ` beginnen
    const lines = t.split('\n').map((l) => l.trim());
    if (lines.every((l) => l.startsWith('- '))) {
      out.push(
        <ul key={idx} className="mt-4 space-y-2 pl-5">
          {lines.map((l, i) => (
            <li key={i} className="list-disc text-[15.5px] leading-relaxed text-bank-text marker:text-bank-gold">
              {l.replace(/^-\s+/, '')}
            </li>
          ))}
        </ul>,
      );
      return;
    }
    out.push(<p key={idx} className="mt-4 text-[15.5px] leading-relaxed text-bank-text">{t}</p>);
  });
  return out;
};

/**
 * Interne Detailseite für jede Nachricht.
 *
 * Rendert entweder den lizenzierten Volltext (license_allows_fulltext=true)
 * oder eine eigene redaktionelle Zusammenfassung (article_content) — niemals
 * einen nicht lizenzierten Fremdtext. Die externe Quelle erscheint nur dezent
 * am Ende, nie als primäres Klickziel.
 */
const NachrichtenDetailPage = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    api.get(`/news/nachrichten/${encodeURIComponent(slug)}`)
      .then(({ data }) => { if (alive) { setItem(data); setState('ready'); } })
      .catch((err) => { if (alive) setState(err?.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { alive = false; };
  }, [slug]);

  const publishedFmt = item?.published_at
    ? new Date(item.published_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const hasLicensedFulltext = !!item?.license_allows_fulltext && !!item?.full_text;
  const heroImage = item?.hero_image_url || item?.image_url;
  // Wenn ein Bild final scheitert (alle 3 Fallback-Stufen), lassen wir den
  // ganzen Bild-Container komplett entfallen — der Artikeltext rückt automatisch nach.
  const [heroHidden, setHeroHidden] = useState(false);
  useEffect(() => { setHeroHidden(false); }, [item?.slug]);

  return (
    <div className="bg-white" data-testid="news-detail-page">
      <PageMeta
        title={item?.title || 'Nachricht'}
        description={item?.summary || item?.subtitle || ''}
        path={`/news/nachrichten/${slug}`}
        noIndex={!!item?.is_demo}
      />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-4xl px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
          <Link
            to="/news/nachrichten"
            data-testid="news-detail-back"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary"
          >
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu Nachrichten
          </Link>

          {state === 'loading' && <div className="mt-8 h-8 w-2/3 animate-pulse bg-neutral-100" />}
          {state === 'notfound' && (
            <p className="mt-8 text-[14px] text-bank-text-muted" data-testid="news-detail-not-found">Meldung nicht gefunden.</p>
          )}
          {state === 'error' && (
            <p className="mt-8 text-[14px] text-rose-700">Meldung konnte nicht geladen werden.</p>
          )}

          {item && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <Eyebrow>{CAT_LABEL[item.category] || item.category}</Eyebrow>
              </div>
              <h1 className="mt-3 font-serif text-3xl leading-tight text-bank-text sm:text-[42px]">{item.title}</h1>
              {item.subtitle && (
                <p className="mt-4 font-serif text-[19px] italic leading-snug text-bank-text-muted">{item.subtitle}</p>
              )}
              <p className="mt-5 text-[15.5px] leading-relaxed text-bank-text-muted">{item.summary}</p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                {publishedFmt}
                <span> · Redaktion: <span className="text-bank-text">Fröhlich Vermögensberatung</span></span>
              </p>
            </>
          )}
        </div>
      </section>

      {item && (
        <article className="mx-auto max-w-4xl px-6 pb-20 pt-10 sm:px-10">
          {heroImage && !heroHidden && (
            <>
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100" data-testid="news-detail-hero-image">
                <SafeNewsImage
                  src={heroImage}
                  category={item.category}
                  alt={item.title || ''}
                  loading="eager"
                  className="h-full w-full object-cover"
                  onFinalError={() => setHeroHidden(true)}
                  testId="news-detail-hero-img"
                />
                {item.content_type === 'video' && !item.video_embed_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-center text-white">
                    <div>
                      <PlayCircle className="mx-auto h-16 w-16" strokeWidth={1.2} />
                      <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em]">Video-Embed nach Lizenzfreigabe</p>
                    </div>
                  </div>
                )}
              </div>
              {(item.image_attribution || item.image_author) && (
                <p className="mt-2 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted" data-testid="news-detail-image-attribution">
                  {item.image_author_url ? (
                    <>Foto: <a href={item.image_author_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-bank-primary">{item.image_author || 'Unsplash Fotograf'}</a></>
                  ) : (
                    <>{item.image_attribution || `Foto: ${item.image_author || 'Unsplash'}`}</>
                  )}
                  {item.image_source_url ? (
                    <> · auf <a href={item.image_source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-bank-primary">{item.image_source || 'Unsplash'}</a></>
                  ) : (
                    <> · {item.image_source || 'Unsplash'}</>
                  )}
                </p>
              )}
            </>
          )}

          {item.video_embed_url && (
            <div className="mt-6 aspect-video w-full overflow-hidden border border-bank-border bg-black" data-testid="news-detail-video">
              <iframe title={item.title} src={item.video_embed_url} allow="fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" />
            </div>
          )}

          {/* Bevorzugt: lizenzierter Volltext. Fallback: eigene redaktionelle Zusammenfassung. */}
          {hasLicensedFulltext ? (
            <div className="mt-6" data-testid="news-detail-fulltext">
              {renderBody(item.full_text)}
            </div>
          ) : (
            <div className="mt-6" data-testid="news-detail-summary">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Eigene Zusammenfassung</p>
              <p className="mt-3 text-[15.5px] leading-relaxed text-bank-text">
                {item.article_content ||
                  'Der Volltext dieser Meldung ist nicht Teil unserer Lizenz. Wir zeigen daher keinen fremden Text an. Sobald eine redaktionelle Einordnung veröffentlicht wird, erscheint sie an dieser Stelle.'}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-bank-text-muted">
                Titel, Untertitel und Kurzfassung stammen vom externen Anbieter. Der vollständige Originaltext liegt ausschließlich beim jeweiligen Nachrichtenanbieter.
              </p>
            </div>
          )}

          {/* Verwendete Faktenquellen — dezent am Ende, klickbar */}
          {(item.sources && item.sources.length > 0) && (
            <div className="mt-12 border-t border-bank-border pt-6" data-testid="news-detail-sources">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Quellen</p>
              <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">
                Dieser Artikel wurde von der Redaktion der Fröhlich Vermögensberatung eigenständig
                verfasst. Grundlage sind die folgenden offiziellen Faktenquellen:
              </p>
              <ul className="mt-3 space-y-1.5">
                {item.sources.map((s, idx) => (
                  <li key={idx} className="text-[13px] text-bank-text">
                    <span className="font-medium">{s.name || 'Quelle'}</span>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        data-testid={`news-detail-source-link-${idx}`}
                        className="ml-2 inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.14em] text-bank-primary hover:underline"
                      >
                        Original ansehen <ArrowUpRight size={11} strokeWidth={1.8} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 border-t border-bank-border pt-6 text-[13px] leading-relaxed text-bank-text-muted">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">Hinweis</p>
            <p className="mt-2">
              Diese Meldung wird zu Ihrer Information dargestellt und ist keine redaktionelle Einschätzung
              der Fröhlich Vermögensberatung GmbH. Sie stellt keine Anlageempfehlung dar. Unsere eigene
              Einordnung finden Sie in der Rubrik „Fröhlich Vermögensberatung — Unsere Einordnung".
            </p>
          </div>

          {item.investment_topic_slug && <TopicCrossLinkBox topicSlug={item.investment_topic_slug} />}
          {(item.category === 'fonds-etfs' || item.category === 'fonds' || item.category === 'etf') && (
            <KnowledgeCrossLinkBox
              testId="fonds-grundlagen-crosslink"
              eyebrow={item.investment_topic_slug ? 'Wissen kompakt' : 'Neu bei Fonds & ETFs?'}
              title={item.investment_topic_slug
                ? 'Fonds-Grundlagen kurz erklärt'
                : 'Fonds-Grundlagen verständlich erklärt'}
              description="Wie funktionieren Fonds, welche Kosten können entstehen und worin unterscheiden sich Fonds, ETFs und Einzelanlagen?"
              href="/fonds-grundlagen"
              cta="Fonds-Grundlagen ansehen"
            />
          )}

          <NachrichtenRelated slug={slug} />
        </article>
      )}
    </div>
  );
};

export default NachrichtenDetailPage;

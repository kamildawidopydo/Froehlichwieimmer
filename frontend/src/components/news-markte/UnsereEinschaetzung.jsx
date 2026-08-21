import React from 'react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatRelative } from '@/services/newsMarkteApi';

const Post = ({ post }) => (
  <article className="flex flex-col gap-4 border-t border-bank-border pt-8" data-testid="editorial-post">
    <p className="flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">
      <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-accent-strong" />
      Fröhlich Vermögensberatung – Unsere Einschätzung
    </p>
    <h3 className="font-serif text-2xl leading-tight text-bank-text sm:text-[26px]">{post.title}</h3>
    {post.dek && <p className="max-w-3xl text-[15px] leading-relaxed text-bank-text-muted">{post.dek}</p>}
    <div className="prose prose-neutral max-w-3xl text-[14.5px] leading-[1.75] text-bank-text prose-p:my-3 prose-headings:font-serif">
      {post.body.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
    <div className="mt-2 flex items-center gap-3 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
      <span>{post.author}</span>
      <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-border" />
      <span className="font-mono">{formatRelative(post.published_at)}</span>
    </div>
  </article>
);

const EMPTY_PLACEHOLDER = {
  id: 'placeholder',
  title: 'Was bedeutet die aktuelle Zinsentwicklung für Anleger?',
  dek: 'Eine kurze Einordnung aus der Beratungspraxis der Fröhlich Vermögensberatung.',
  body:
    'Die EZB hat den Leitzins stabil gelassen. Für Sparer bedeutet das: aktuell attraktive Tages- und Festgeldkonditionen bleiben erhalten — allerdings nicht unbegrenzt.\n\nWir empfehlen, jetzt vorhandene Liquidität strukturiert aufzuteilen: kurze Laufzeiten für Reserven, mittlere Laufzeiten für planbaren Bedarf, längere Laufzeiten nur mit einem klaren Zinsausblick.\n\nEine langfristige Vermögensstrategie sollte nie von einer einzelnen Zinsentscheidung abhängen. Sie sollte zu Ihrem Anlagehorizont, Ihrer Liquidität und Ihrer persönlichen Situation passen.',
  author: 'Fröhlich Vermögensberatung',
  published_at: new Date().toISOString(),
};

const UnsereEinschaetzung = ({ posts = [], loading }) => {
  const list = posts.length > 0 ? posts : [EMPTY_PLACEHOLDER];
  return (
    <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="unsere-einschaetzung">
      <div className="flex flex-col gap-3">
        <Eyebrow>Redaktion</Eyebrow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Unsere Einschätzung</h2>
          <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
            Redaktionelle Einordnungen aus der Beratungspraxis. Keine Anlageempfehlung.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 space-y-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 border-t border-bank-border pt-8">
              <div className="h-3 w-40 animate-pulse bg-neutral-100" />
              <div className="h-6 w-3/4 animate-pulse bg-neutral-100" />
              <div className="h-3 w-full animate-pulse bg-neutral-100" />
              <div className="h-3 w-5/6 animate-pulse bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {list.map((p) => (
            <Post key={p.id} post={p} />
          ))}
        </div>
      )}
    </section>
  );
};

export default UnsereEinschaetzung;

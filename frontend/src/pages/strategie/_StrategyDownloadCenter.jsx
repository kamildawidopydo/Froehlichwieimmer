import { getApiBase } from '@/lib/apiBase';
import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { listPremiumTopics } from '@/data/strategyNewsMap';
import { findPremium } from '@/data/strategiePremiumContent';
import { computeReadingMinutes } from './_StrategyKnowledgeCenter';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';

const API = getApiBase() ? `${getApiBase()}/api` : '/api';

const FEATURED_SLUGS = ['vermoegensaufbau', 'inflationsschutz', 'private-rentenvorsorge', 'value-investing'];

const ReportCard = ({ topic, onDownload, state }) => {
  const premium = findPremium(topic.slug);
  const minutes = useMemo(() => computeReadingMinutes(premium), [premium]);
  const shortIntro = (topic.intro || '').split('.').slice(0, 1).join('.') + '.';
  const isLoading = state?.slug === topic.slug && state?.state === 'loading';
  const isError = state?.slug === topic.slug && state?.state === 'error';
  return (
    <div
      className="flex flex-col rounded-xl border border-bank-border bg-white p-5 sm:p-6"
      data-testid={`strategie-report-card-${topic.slug}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/[0.05] text-bank-primary">
          <FileText className="h-4 w-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{topic.categoryTitle}</p>
          <p className="mt-1 font-serif text-[16px] leading-snug text-bank-text">{topic.title}</p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-bank-text-muted">{shortIntro}</p>
      <p className="mt-3 text-[11.5px] text-bank-text-muted">Lesedauer ca. {minutes} Min.</p>
      <button
        type="button"
        onClick={() => onDownload(topic)}
        disabled={isLoading}
        data-testid={`strategie-report-download-card-${topic.slug}`}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-bank-primary/60 px-4 py-2 text-[12.5px] font-medium text-bank-primary transition-colors hover:bg-bank-primary hover:text-white disabled:opacity-70"
      >
        <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        {isLoading ? 'Merkblatt wird erstellt …' : 'Merkblatt herunterladen'}
      </button>
      {isError ? (
        <p role="alert" className="mt-2 text-[11.5px] text-red-600">
          Das Merkblatt konnte gerade nicht erstellt werden. Bitte versuchen Sie es erneut.
        </p>
      ) : null}
    </div>
  );
};

const StrategyDownloadCenter = () => {
  const [expanded, setExpanded] = useState(false);
  const [downloadState, setDownloadState] = useState({ slug: null, state: 'idle' });
  const allTopics = useMemo(() => listPremiumTopics(), []);
  const featured = useMemo(
    () => FEATURED_SLUGS.map((s) => allTopics.find((t) => t.slug === s)).filter(Boolean),
    [allTopics],
  );
  const rest = useMemo(() => allTopics.filter((t) => !FEATURED_SLUGS.includes(t.slug)), [allTopics]);

  const handleDownload = async (topic) => {
    setDownloadState({ slug: topic.slug, state: 'loading' });
    trackInvestmentEvent('strategy_report_download_started', {
      topic_slug: topic.slug,
      source: 'download_center',
    });
    try {
      const premium = findPremium(topic.slug);
      const res = await fetch(`${API}/reports/strategy-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_slug: topic.categorySlug,
          category_title: topic.categoryTitle,
          topic_slug: topic.slug,
          topic_title: topic.title,
          intro: topic.intro,
          summary: premium?.summary || '',
          key_takeaways: premium?.keyTakeaways || [],
          quick_facts: premium?.quickFacts || [],
          how_it_works: premium?.howItWorks || [],
          aspects: (premium?.aspects || []).map((a) => ({ title: a.title, body: a.body })),
          advantages: premium?.advantages || [],
          considerations: premium?.considerations || [],
          self_check_options: (premium?.selfCheck?.options || []).map((o) => o.label),
          related: (premium?.related || []).map((r) => r.label),
          conversation_questions: premium?.conversationQuestions || [],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `froehlich-${topic.slug}-kompakt.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadState({ slug: null, state: 'idle' });
      trackInvestmentEvent('strategy_report_download_success', {
        topic_slug: topic.slug,
        source: 'download_center',
      });
    } catch {
      setDownloadState({ slug: topic.slug, state: 'error' });
      trackInvestmentEvent('strategy_report_download_failed', {
        topic_slug: topic.slug,
        source: 'download_center',
      });
    }
  };

  return (
    <section
      className="mt-20"
      data-testid="strategie-download-center"
      aria-label="Strategie-Merkblätter"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Merkblätter</p>
          <h2 className="mt-2 font-serif text-3xl leading-snug text-bank-text">Strategie-Merkblätter</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-bank-text-muted">
            Kompakte PDF-Übersichten zu unseren Strategie-Themen — mit Grundlagen, Risiken und Fragen fürs Gespräch.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4" data-testid="strategie-download-featured">
        {featured.map((t) => (
          <ReportCard key={t.slug} topic={t} onDownload={handleDownload} state={downloadState} />
        ))}
      </div>

      <div className="mt-6">
        {!expanded ? (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              trackInvestmentEvent('strategy_download_center_opened', { source: 'expand_all' });
            }}
            data-testid="strategie-download-expand"
            className="inline-flex items-center gap-2 rounded-full border border-bank-primary/60 px-5 py-2 text-[13px] font-medium text-bank-primary transition-colors hover:bg-bank-primary hover:text-white"
          >
            Alle Merkblätter anzeigen
          </button>
        ) : (
          <div
            className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
            data-testid="strategie-download-all"
          >
            {rest.map((t) => (
              <ReportCard key={t.slug} topic={t} onDownload={handleDownload} state={downloadState} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default StrategyDownloadCenter;

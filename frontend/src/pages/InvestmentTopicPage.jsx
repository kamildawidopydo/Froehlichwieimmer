import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { submitInvestmentLead, fetchActiveInvestmentTopics } from '@/services/investmentTopics';
import { trackInvestmentEvent, InvestmentEvents } from '@/lib/investmentAnalytics';
import InvestmentBreadcrumbs from '@/components/investment/InvestmentBreadcrumbs';
import TopicWissenBlock from '@/components/investment/TopicWissenBlock';
import RelatedKnowledge from '@/components/knowledge/RelatedKnowledge';
import { getRelatedKnowledge } from '@/data/knowledgeGraph';

// ---------------------------------------------------------------------------
// Statische Inhaltsvorlagen — pro Themen-Slug. Backend liefert nur Metadaten
// für den Teaser; die Themenseiten-Copy bleibt hier redaktionell versioniert.
// Später können weitere Slugs (anleihen, dividenden, altersvorsorge, …) einfach
// als weiterer Key ergänzt werden — Layout bleibt identisch.
// ---------------------------------------------------------------------------
const TOPIC_CONTENT = {
  aktien: {
    seo: {
      title: 'Aktien & Kapitalmärkte | Fröhlich Vermögensberatung',
      description:
        'Aktien verstehen, Chancen und Risiken einordnen und gemeinsam mit Ihrem persönlichen Berater die passende Anlagestrategie besprechen.',
    },
    eyebrow: 'Aktien & Kapitalmärkte',
    h1: 'Aktien als Baustein Ihrer Vermögensstrategie',
    intro: [
      'Aktien ermöglichen Anlegern, sich an Unternehmen und deren wirtschaftlicher Entwicklung zu beteiligen. Gleichzeitig gehören Kursschwankungen und Verlustrisiken zur Kapitalanlage dazu.',
      'Wir helfen Ihnen dabei, Chancen und Risiken einzuordnen und zu beurteilen, welche Rolle Aktien im Rahmen Ihrer persönlichen Vermögensstrategie spielen können.',
    ],
    hero_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=75',
    hero_image_alt: 'Ruhige Architektur eines Bankengebäudes – editorial',
    why: {
      headline: 'Warum Aktien für Anleger interessant sein können',
      intro:
        'Unternehmensbeteiligungen können unterschiedliche Funktionen innerhalb einer langfristig ausgerichteten Vermögensstrategie übernehmen.',
      cards: [
        {
          title: 'An wirtschaftlicher Entwicklung teilhaben',
          body: 'Mit einer Aktie erwerben Anleger eine Beteiligung an einem Unternehmen und können grundsätzlich an dessen wirtschaftlicher Entwicklung partizipieren.',
        },
        {
          title: 'Vermögen langfristig strukturieren',
          body: 'Aktien können – abhängig von Anlageziel, Risikobereitschaft und Anlagehorizont – ein Bestandteil einer breit aufgestellten Vermögensstruktur sein.',
        },
        {
          title: 'Chancen und Risiken bewusst abwägen',
          body: 'Höhere Renditechancen gehen grundsätzlich mit Risiken einher. Deshalb betrachten wir Aktien nicht isoliert, sondern im Zusammenhang mit Ihrer gesamten finanziellen Situation.',
        },
      ],
    },
    risks: {
      headline: 'Chancen gehören immer gemeinsam mit Risiken betrachtet',
      body: [
        'Aktienkurse können teilweise erheblich schwanken. Unternehmensentwicklungen, Konjunktur, Zinsen, politische Ereignisse und die allgemeine Stimmung an den Kapitalmärkten können den Wert einer Anlage beeinflussen.',
        'Auch ein vollständiger Verlust des eingesetzten Kapitals kann bei einzelnen Investments nicht ausgeschlossen werden.',
        'Deshalb sollte eine Anlageentscheidung nicht allein aufgrund kurzfristiger Kursentwicklungen oder einzelner Nachrichten getroffen werden.',
      ],
      note: 'Welche Anlageform zu Ihnen passt, hängt unter anderem von Ihren persönlichen Zielen, Ihrer finanziellen Situation, Ihrem Anlagehorizont und Ihrer Risikobereitschaft ab.',
    },
    einordnung: {
      eyebrow: 'Persönliche Beratung',
      headline: 'Nicht die nächste Aktie steht im Mittelpunkt. Sondern Ihre Strategie.',
      body: [
        'Unsere Berater betrachten Investmententscheidungen im Zusammenhang mit Ihrer gesamten Vermögenssituation.',
        'Bei speziellen Fragestellungen rund um Aktien und Kapitalmärkte können unsere Berater zusätzlich auf die Expertise unserer spezialisierten Ansprechpartner zurückgreifen.',
        'So verbinden wir persönliche Beratung mit spezialisiertem Fachwissen.',
      ],
      steps: [
        { n: '01', title: 'Situation verstehen', body: 'Wir betrachten Ihre Ziele, Ihre bestehende Vermögensstruktur und Ihren Anlagehorizont.' },
        { n: '02', title: 'Möglichkeiten einordnen', body: 'Gemeinsam besprechen wir, welche Anlageformen grundsätzlich zu Ihrer Situation passen können.' },
        { n: '03', title: 'Persönlich entscheiden', body: 'Sie erhalten eine nachvollziehbare Grundlage für Ihre weiteren Entscheidungen.' },
      ],
    },
    conversion: {
      headline: 'Sie möchten über das Thema Aktien sprechen?',
      body: [
        'Wenn Sie bereits von uns betreut werden, können Sie Ihren persönlichen Berater jederzeit auf das Thema Aktien und Kapitalmärkte ansprechen.',
        'Bei Bedarf beziehen wir unsere spezialisierten Ansprechpartner in das Gespräch mit ein.',
      ],
      existing_headline: 'Bereits Kunde bei uns?',
      existing_body: [
        'Sprechen Sie Ihren zuständigen Berater einfach auf das Thema Aktien & Kapitalmärkte an.',
        'Ihr Berater kann Ihre bestehende Situation berücksichtigen und bei Bedarf einen spezialisierten Ansprechpartner hinzuziehen.',
      ],
    },
    form_topic_label: 'Aktien & Kapitalmärkte',
    compliance_label: 'Information der Fröhlich Vermögensberatung',
  },
  anleihen: {
    seo: {
      title: 'Anleihen & Zinsen | Fröhlich Vermögensberatung',
      description:
        'Anleihen verstehen, Zinsentwicklungen einordnen und gemeinsam mit Ihrem Berater prüfen, welche Rolle festverzinsliche Anlagen in Ihrer Vermögensstrategie spielen können.',
    },
    breadcrumb_label: 'Anleihen',
    eyebrow: 'Anleihen & Zinsen',
    h1: 'Anleihen als Baustein einer Vermögensstrategie',
    intro: [
      'Anleihen gehören zu den klassischen Instrumenten der Kapitalanlage. Anleger stellen Staaten, Unternehmen oder anderen Emittenten Kapital zur Verfügung und erhalten dafür grundsätzlich vereinbarte Zinszahlungen.',
      'Welche Chancen und Risiken damit verbunden sind, hängt unter anderem von Laufzeit, Bonität, Zinsniveau und Ausgestaltung der jeweiligen Anleihe ab.',
    ],
    hero_image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1400&q=75',
    hero_image_alt: 'Klassisches Bankengebäude bei Dämmerung – editorial',
    why: {
      headline: 'Warum Anleihen interessant sein können',
      intro:
        'Festverzinsliche Anlagen können unterschiedliche Funktionen innerhalb einer breit aufgestellten Vermögensstruktur übernehmen.',
      cards: [
        {
          title: 'Planbare Zahlungsströme',
          body: 'Viele Anleihen sehen regelmäßige Zinszahlungen sowie eine Rückzahlung zum Laufzeitende vor. Ob diese Zahlungen tatsächlich erfolgen, hängt jedoch von der Zahlungsfähigkeit des Emittenten ab.',
        },
        {
          title: 'Unterschiedliche Laufzeiten und Risiken',
          body: 'Anleihen gibt es mit unterschiedlichen Laufzeiten, Zinssätzen, Währungen und Bonitäten. Dadurch können sie verschiedene Funktionen innerhalb einer Vermögensstruktur übernehmen.',
        },
        {
          title: 'Ergänzung zu anderen Anlageklassen',
          body: 'Je nach Marktumfeld, persönlichem Anlageziel und Risikoprofil können Anleihen eine Ergänzung zu anderen Anlageklassen darstellen.',
        },
      ],
    },
    risks: {
      headline: 'Auch Anleihen sind nicht risikofrei',
      body: [
        'Der Wert einer Anleihe kann während der Laufzeit schwanken. Insbesondere Veränderungen des allgemeinen Zinsniveaus können sich auf den Marktpreis bestehender Anleihen auswirken.',
        'Darüber hinaus besteht das Risiko, dass ein Emittent Zins- oder Rückzahlungen nicht vollständig leisten kann.',
        'Bei Anleihen in Fremdwährungen können zusätzlich Wechselkursrisiken entstehen. Je nach Produkt können weitere Risiken bestehen.',
      ],
      note: 'Die Auswahl geeigneter Anlagen sollte immer im Zusammenhang mit Ihrer gesamten finanziellen Situation, Ihren Zielen, Ihrem Anlagehorizont und Ihrer Risikobereitschaft betrachtet werden.',
    },
    einordnung: {
      eyebrow: 'Persönliche Beratung',
      headline: 'Entscheidend ist nicht nur der Zins',
      body: [
        'Eine hohe Verzinsung allein sagt wenig darüber aus, ob eine Anleihe zu Ihrer persönlichen Vermögensstrategie passt.',
        'Unsere Berater betrachten deshalb unter anderem Laufzeit, Bonität, Risiken und die Einbindung in Ihre bestehende Vermögensstruktur.',
        'Bei speziellen Fragestellungen können unsere Berater zusätzlich auf spezialisierte Ansprechpartner zurückgreifen.',
      ],
      steps: [
        { n: '01', title: 'Ausgangssituation betrachten', body: 'Wir berücksichtigen Ihre Ziele, Ihre bestehende Vermögensstruktur und Ihren Anlagehorizont.' },
        { n: '02', title: 'Chancen und Risiken einordnen', body: 'Wir besprechen, welche Eigenschaften und Risiken verschiedener Anlageformen relevant sein können.' },
        { n: '03', title: 'Strategie abstimmen', body: 'Gemeinsam betrachten wir, welche Rolle festverzinsliche Anlagen grundsätzlich in Ihrer Vermögensstrategie spielen können.' },
      ],
    },
    conversion: {
      headline: 'Sie möchten über Anleihen und Zinsen sprechen?',
      body: [
        'Wenn Sie bereits von uns betreut werden, sprechen Sie Ihren persönlichen Berater jederzeit auf das Thema Anleihen und Zinsanlagen an.',
        'Bei Bedarf können spezialisierte Ansprechpartner in das Gespräch einbezogen werden.',
      ],
      existing_headline: 'Bereits Kunde bei uns?',
      existing_body: [
        'Sprechen Sie Ihren zuständigen Berater einfach auf das Thema Anleihen & Zinsanlagen an.',
        'Ihr Berater kann Ihre bestehende Situation berücksichtigen und bei Bedarf einen spezialisierten Ansprechpartner hinzuziehen.',
      ],
    },
    form_topic_label: 'Anleihen & Zinsen',
    compliance_label: 'Information der Fröhlich Vermögensberatung',
    hero_learn_more_label: 'Mehr über Anleihen erfahren',
  },
  dividenden: {
    seo: {
      title: 'Dividenden & Ausschüttungen | Fröhlich Vermögensberatung',
      description:
        'Dividenden verstehen, Ausschüttungsqualität einordnen und gemeinsam mit Ihrem Berater prüfen, welche Rolle dividendenstarke Unternehmen in Ihrer Vermögensstrategie spielen können.',
    },
    breadcrumb_label: 'Dividenden',
    eyebrow: 'Dividenden & Ausschüttungen',
    h1: 'Dividenden strategisch einordnen',
    intro: [
      'Dividenden sind Ausschüttungen, mit denen Unternehmen ihre Aktionäre am Gewinn beteiligen können. Für viele Anleger sind sie ein Baustein einer langfristigen Aktienstrategie.',
      'Ob und in welcher Höhe eine Dividende gezahlt wird, ist jedoch nicht garantiert. Eine hohe Ausschüttungsrendite allein sagt zudem wenig über die Qualität eines Unternehmens aus.',
    ],
    hero_image: 'https://images.unsplash.com/photo-1554224154-26032cdc0b4c?w=1400&q=75',
    hero_image_alt: 'Zurückhaltendes Bürogebäude in Dämmerung – editorial',
    why: {
      headline: 'Warum sich Anleger mit Dividenden beschäftigen',
      intro:
        'Regelmäßige Ausschüttungen können unterschiedliche Funktionen innerhalb einer breit aufgestellten Vermögensstruktur übernehmen.',
      cards: [
        {
          title: 'Beteiligung am Unternehmenserfolg',
          body: 'Über eine Dividende können Aktionäre am wirtschaftlichen Erfolg eines Unternehmens teilhaben – sofern das Unternehmen ausschüttet und die Hauptversammlung eine Dividende beschließt.',
        },
        {
          title: 'Ergänzung im Aktienbaustein',
          body: 'Dividendenstarke Unternehmen können, je nach Anlageziel und Risikoprofil, ein möglicher Bestandteil einer langfristigen Aktienstrategie sein.',
        },
        {
          title: 'Qualität statt reiner Renditejagd',
          body: 'Nachhaltig ausschüttende Unternehmen zeichnen sich häufig durch stabile Cashflows und disziplinierte Kapitalallokation aus. Eine hohe Dividendenrendite allein ist kein Qualitätsmerkmal.',
        },
      ],
    },
    risks: {
      headline: 'Hohe Ausschüttungsrenditen sind nicht automatisch attraktiv',
      body: [
        'Dividenden können jederzeit gekürzt, ausgesetzt oder gestrichen werden – insbesondere in wirtschaftlich schwierigen Phasen oder bei operativen Belastungen des Unternehmens.',
        'Kursverluste können höher ausfallen als vereinnahmte Ausschüttungen. Eine „Dividende" ersetzt daher keine Betrachtung der Gesamtperformance und der Bilanzqualität.',
        'Sehr hohe Dividendenrenditen sind oft die Folge eines gefallenen Kurses und können auf grundlegende Probleme des Unternehmens hindeuten. Eine hohe Ausschüttungsquote kann zulasten notwendiger Reinvestitionen gehen.',
        'Eine Konzentration auf einzelne Branchen oder Regionen mit hoher Ausschüttungskultur kann die Diversifikation eines Portfolios einschränken.',
      ],
      note: 'Steuerliche Aspekte von Dividenden hängen von Ihrer individuellen Situation ab und werden nicht über diese Seite behandelt. Individuelle Steuer- und Anlageberatung erfolgt ausschließlich im persönlichen Gespräch.',
    },
    einordnung: {
      eyebrow: 'Persönliche Beratung',
      headline: 'Nicht die Höhe der Rendite entscheidet, sondern ihre Substanz',
      body: [
        'Eine dividendenorientierte Strategie ist mehr als das reine Auswählen der Titel mit den höchsten Ausschüttungsrenditen.',
        'Unsere Berater betrachten unter anderem Ausschüttungsquote, Free Cashflow, Dividendenhistorie, Bilanzqualität und die Einbindung in Ihre bestehende Vermögensstruktur.',
        'Bei speziellen Fragestellungen können unsere Berater zusätzlich auf spezialisierte Ansprechpartner zurückgreifen.',
      ],
      steps: [
        { n: '01', title: 'Ausgangssituation betrachten', body: 'Wir berücksichtigen Ihre Ziele, Ihre bestehende Vermögensstruktur, Ihren Anlagehorizont und Ihre Risikotragfähigkeit.' },
        { n: '02', title: 'Ausschüttungsqualität einordnen', body: 'Gemeinsam betrachten wir Kennzahlen wie Ausschüttungsquote, Cashflow-Deckung und historische Verlässlichkeit – nicht die Rendite allein.' },
        { n: '03', title: 'Rolle im Portfolio klären', body: 'Wir klären, welche Rolle dividendenstarke Unternehmen in Ihrer individuellen Strategie spielen können – oder eben nicht.' },
      ],
    },
    conversion: {
      headline: 'Sie möchten über Dividendenstrategien sprechen?',
      body: [
        'Wenn Sie bereits von uns betreut werden, sprechen Sie Ihren persönlichen Berater jederzeit auf das Thema Dividenden und Ausschüttungen an.',
        'Bei Bedarf können spezialisierte Ansprechpartner in das Gespräch einbezogen werden.',
      ],
      existing_headline: 'Bereits Kunde bei uns?',
      existing_body: [
        'Sprechen Sie Ihren zuständigen Berater einfach auf das Thema Dividenden & Ausschüttungen an.',
        'Ihr Berater kann Ihre bestehende Situation berücksichtigen und bei Bedarf einen spezialisierten Ansprechpartner hinzuziehen.',
      ],
    },
    form_topic_label: 'Dividenden & Ausschüttungen',
    compliance_label: 'Information der Fröhlich Vermögensberatung',
    hero_learn_more_label: 'Mehr über Dividenden erfahren',
  },
};

// Fallback-Label für den Breadcrumb — wird verwendet, wenn im Content-Objekt
// selbst noch kein `breadcrumb_label` gepflegt ist (z. B. beim Aktien-Slug).
const _defaultBreadcrumbLabel = (slug) =>
  (slug && slug.charAt(0).toUpperCase() + slug.slice(1)) || 'Thema';

const Chapter = ({ n, title, body }) => (
  <article className="border-t border-bank-border pt-8">
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">{n}</p>
    <h3 className="mt-3 font-serif text-[22px] leading-tight text-bank-text">{title}</h3>
    <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">{body}</p>
  </article>
);

const InvestmentTopicPage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const topic = TOPIC_CONTENT[slug];
  const [showExistingBox, setShowExistingBox] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [relatedNewsSlugs, setRelatedNewsSlugs] = useState([]);
  const formRef = useRef(null);
  const learnMoreRef = useRef(null);
  const formStartedRef = useRef(false);

  useEffect(() => {
    if (!topic) return;
    trackInvestmentEvent(InvestmentEvents.TOPIC_PAGE_VIEW, {
      topic: topic.form_topic_label, topic_slug: slug, route: location.pathname,
    });
  }, [slug, topic, location.pathname]);

  // Weitere Investmentthemen laden — dieselbe /active-API wie Übersicht + Teaser.
  useEffect(() => {
    let alive = true;
    fetchActiveInvestmentTopics()
      .then((items) => {
        if (!alive) return;
        const current = (items || []).find((t) => t.slug === slug);
        setRelatedNewsSlugs(current?.related_news_slugs || []);
      })
      .catch(() => { if (alive) setRelatedNewsSlugs([]); });
    return () => { alive = false; };
  }, [slug]);

  const scrollToForm = () => {
    trackInvestmentEvent(InvestmentEvents.TOPIC_CTA_CLICK, {
      topic: topic?.form_topic_label, topic_slug: slug, placement: 'hero_primary',
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        try { formRef.current.querySelector('input')?.focus(); } catch {}
      }, 500);
    }
  };

  const scrollToLearnMore = () => {
    trackInvestmentEvent(InvestmentEvents.TOPIC_CTA_CLICK, {
      topic: topic?.form_topic_label, topic_slug: slug, placement: 'hero_secondary',
    });
    if (learnMoreRef.current) {
      learnMoreRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExistingCustomer = () => {
    setShowExistingBox(true);
    trackInvestmentEvent(InvestmentEvents.EXISTING_CUSTOMER_CLICK, {
      topic: topic?.form_topic_label, topic_slug: slug,
    });
  };

  const handleFormFocus = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackInvestmentEvent(InvestmentEvents.APPOINTMENT_START, {
      topic: topic?.form_topic_label, topic_slug: slug,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consent) {
      toast.error('Bitte bestätigen Sie den Datenschutzhinweis.');
      return;
    }
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Vorname, Nachname und E-Mail sind erforderlich.');
      return;
    }
    setSubmitting(true);
    try {
      await submitInvestmentLead({
        topic_slug: slug,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        consent: true,
        referrer_path: location.pathname,
      });
      trackInvestmentEvent(InvestmentEvents.APPOINTMENT_SUBMIT, {
        topic: topic?.form_topic_label, topic_slug: slug,
      });
      setSubmitted(true);
      setForm({ first_name: '', last_name: '', email: '', phone: '', consent: false });
      toast.success('Vielen Dank — wir melden uns in Kürze.');
    } catch (err) {
      toast.error('Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const seo = useMemo(() => topic?.seo || {}, [topic]);

  if (!topic) {
    return (
      <div className="min-h-screen bg-white">
        <PageMeta title="Thema nicht gefunden" description="" path={location.pathname} noIndex />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Themen-Funnel</p>
          <h1 className="mt-4 font-serif text-3xl text-bank-text">Dieses Thema ist noch nicht verfügbar.</h1>
          <p className="mt-4 text-[15px] text-bank-text-muted">
            Sprechen Sie uns gerne direkt an — wir freuen uns über Ihr Interesse.
          </p>
          <Link to="/contact" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'mt-8 inline-flex')}>
            Zum Kontakt <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white" data-testid="investment-topic-page">
      <PageMeta title={seo.title} description={seo.description} path={location.pathname} />

      {/* HERO */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:px-10 sm:pt-20">
          <InvestmentBreadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Themen', to: '/themen' },
              { label: topic.breadcrumb_label || _defaultBreadcrumbLabel(slug) },
            ]}
          />
          <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div>
            <Eyebrow>{topic.eyebrow}</Eyebrow>
            <h1 className="mt-4 font-serif text-3xl leading-tight text-bank-text sm:text-[42px]">
              {topic.h1}
            </h1>
            <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-bank-text-muted">
              {topic.intro.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToForm}
                data-testid="topic-hero-cta-primary"
                className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}
              >
                Gespräch anfragen
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={scrollToLearnMore}
                data-testid="topic-hero-cta-secondary"
                className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}
              >
                {topic.hero_learn_more_label || 'Mehr über Aktien erfahren'}
                <ArrowDown className="ml-2 h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 lg:aspect-[5/4]">
            <img
              src={topic.hero_image}
              alt={topic.hero_image_alt}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section ref={learnMoreRef} className="border-b border-bank-border bg-bank-bg" data-testid="topic-why-section">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <Eyebrow>Warum Aktien?</Eyebrow>
          <h2 className="mt-3 max-w-3xl font-serif text-[30px] leading-tight text-bank-text sm:text-[36px]">
            {topic.why.headline}
          </h2>
          <p className="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-bank-text-muted">
            {topic.why.intro}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topic.why.cards.map((c, i) => (
              <div key={i} className="border border-bank-border bg-white p-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-serif text-[19px] leading-snug text-bank-text">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISKS */}
      <section className="border-b border-bank-border" data-testid="topic-risks-section">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <Eyebrow>Risiken bewusst machen</Eyebrow>
              <h2 className="mt-3 font-serif text-[28px] leading-tight text-bank-text sm:text-[34px]">
                {topic.risks.headline}
              </h2>
            </div>
            <div className="space-y-5 border-l-2 border-bank-gold/60 pl-6 text-[15.5px] leading-relaxed text-bank-text sm:pl-8">
              {topic.risks.body.map((p, i) => <p key={i}>{p}</p>)}
              <p className="mt-6 border-t border-bank-border pt-5 text-[14px] text-bank-text-muted">
                <span className="font-medium text-bank-text">Hinweis:</span> {topic.risks.note}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EINORDNUNG */}
      <section className="border-b border-bank-border bg-bank-bg">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <Eyebrow>{topic.einordnung.eyebrow}</Eyebrow>
          <h2 className="mt-3 max-w-3xl font-serif text-[30px] leading-tight text-bank-text sm:text-[36px]">
            {topic.einordnung.headline}
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
            {topic.einordnung.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {topic.einordnung.steps.map((s) => (
              <Chapter key={s.n} n={s.n} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </section>

      {/* CONVERSION */}
      <TopicWissenBlock topicSlug={slug} relatedSlugs={relatedNewsSlugs} maxDisplay={3} />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <h2 className="max-w-3xl font-serif text-[30px] leading-tight text-bank-text sm:text-[36px]">
            {topic.conversion.headline}
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
            {topic.conversion.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToForm}
              data-testid="topic-conversion-cta-primary"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}
            >
              Termin mit einem Berater anfragen
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={handleExistingCustomer}
              data-testid="topic-conversion-cta-existing"
              className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}
            >
              Ich bin bereits Kunde
            </button>
          </div>

          {showExistingBox && (
            <div
              data-testid="topic-existing-customer-box"
              className="mt-8 max-w-3xl border border-bank-border bg-bank-bg p-6 sm:p-8"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                Für bestehende Kunden
              </p>
              <h3 className="mt-3 font-serif text-[22px] leading-tight text-bank-text">
                {topic.conversion.existing_headline}
              </h3>
              <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-bank-text-muted">
                {topic.conversion.existing_body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <Link
                to="/contact"
                data-testid="topic-existing-customer-cta"
                className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'mt-5 inline-flex')}
              >
                Kontaktdaten meines Beraters anzeigen
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FORMULAR */}
      <section ref={formRef} className="bg-white" data-testid="topic-form-section">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <Eyebrow>Anfrage</Eyebrow>
          <h2 className="mt-3 font-serif text-[28px] leading-tight text-bank-text sm:text-[34px]">
            Gespräch zum Thema {topic.form_topic_label} anfragen
          </h2>

          {submitted ? (
            <div className="mt-10 border border-bank-border bg-bank-bg p-8" data-testid="topic-form-success">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                Anfrage empfangen
              </p>
              <h3 className="mt-3 font-serif text-[22px] leading-tight text-bank-text">
                Vielen Dank für Ihr Vertrauen.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-bank-text-muted">
                Ein Berater der Fröhlich Vermögensberatung meldet sich in Kürze bei Ihnen persönlich.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} onFocus={handleFormFocus} className="mt-10 space-y-6" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Vorname *</span>
                  <Input
                    required
                    data-testid="topic-form-first-name"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="mt-2"
                    autoComplete="given-name"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Nachname *</span>
                  <Input
                    required
                    data-testid="topic-form-last-name"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="mt-2"
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">E-Mail *</span>
                <Input
                  required
                  type="email"
                  data-testid="topic-form-email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Telefon (optional)</span>
                <Input
                  type="tel"
                  data-testid="topic-form-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-2"
                  autoComplete="tel"
                />
              </label>
              <div className="border border-bank-border bg-bank-bg px-4 py-3 text-[13px] text-bank-text-muted">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Thema:&nbsp;</span>
                <span className="text-bank-text">{topic.form_topic_label}</span>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-bank-text">
                <input
                  type="checkbox"
                  required
                  data-testid="topic-form-consent"
                  checked={form.consent}
                  onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border border-bank-border accent-bank-primary"
                />
                <span>
                  Ich stimme der Verarbeitung meiner Angaben zur Beantwortung meiner Anfrage gemäß der{' '}
                  <Link to="/legal/privacy" className="underline hover:text-bank-primary">Datenschutzerklärung</Link> zu. *
                </span>
              </label>
              <div className="flex flex-col gap-3 border-t border-bank-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  data-testid="topic-form-submit"
                  className="inline-flex"
                >
                  {submitting ? 'Wird gesendet …' : 'Gespräch anfragen'}
                  {!submitting && <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} />}
                </Button>
                <p className="text-[12.5px] leading-relaxed text-bank-text-muted sm:max-w-sm sm:text-right">
                  Unverbindliche Gesprächsanfrage. Eine Anlageentscheidung erfolgt nicht über dieses Formular.
                </p>
              </div>
            </form>
          )}

          <p className="mt-10 border-t border-bank-border pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-text-muted/80">
            {topic.compliance_label}
          </p>
        </div>
      </section>

      {/* RELATED KNOWLEDGE — kuratiert, konsistent, max 3 Ziele.
          Ersetzt die frühere dynamische "Weitere Investmentthemen"-Section
          durch ein einheitliches Wissens-Netzwerk (Hub + verwandtes Thema). */}
      <RelatedKnowledge
        items={getRelatedKnowledge(`themen/${slug}`)}
        tone="muted"
        testId={`topic-${slug}-related`}
      />
    </div>
  );
};

export default InvestmentTopicPage;

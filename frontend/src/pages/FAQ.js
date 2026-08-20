import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import BonusIcon from '@/components/BonusIcon';
import {
  Search,
  HelpCircle,
  UserPlus,
  Percent,
  Shield,
  Receipt,
  Headphones,
  Mail,
  MessageCircle,
  ArrowUpRight,
  X,
} from 'lucide-react';

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const reduce = useReducedMotion();

  const faqCategories = [
    {
      id: 'general',
      name: 'Allgemeine Fragen',
      icon: HelpCircle,
      questions: [
        {
          question: 'Was ist Fröhlich Vermögensberatung?',
          answer:
            'Als Vermittlungsplattform und Kapitalverwaltungsgesellschaft stehen wir seit vielen Jahren erfolgreich für nachhaltigen Vermögensaufbau, professionelle Risikosteuerung sowie transparente und sichere Abläufe.',
        },
        {
          question: 'Ist die Nutzung von Fröhlich Vermögensberatung kostenlos?',
          answer:
            'Ja, Fröhlich Vermögensberatung ist für alle Nutzer komplett kostenlos. Es gibt keine versteckten Gebühren oder Kosten. Wir finanzieren uns durch Partnerschaften mit Banken, was jedoch keinen Einfluss auf unsere Vergleiche oder Empfehlungen hat.',
        },
        {
          question: 'Wie funktioniert die Plattform?',
          answer:
            'Die Nutzung ist einfach: 1) Erstellen Sie ein kostenloses Konto, 2) Vergleichen Sie Sparangebote von über 50 europäischen Banken, 3) Filtern Sie nach Zinssatz, Laufzeit und Mindestanlage, 4) Wenn Sie ein passendes Angebot gefunden haben, senden Sie Ihre Anfrage direkt an die Bank. Die Kontoeröffnung erfolgt dann bei der jeweiligen Partnerbank.',
        },
        {
          question: 'Verwaltet Fröhlich Vermögensberatung mein Geld?',
          answer:
            'Nein, absolut nicht. Fröhlich Vermögensberatung ist ausschließlich eine Vergleichs- und Vermittlungsplattform. Wir halten, verwalten oder haben keinen direkten Zugang zu Kundengeldern im Zusammenhang mit Flexgeld-, Tagesgeld- oder Festgeldkonten. Diese Konten werden ausschließlich direkt bei unseren regulierten Partnerbanken eröffnet und geführt. Das Geld unserer Kunden verbleibt jederzeit bei dem jeweils gewählten Finanzinstitut.\n\nEine Ausnahme besteht lediglich dann, wenn Kunden aktiv in Aktien, Anleihen oder unseren Fonds investieren. In diesen Fällen erfolgen die Investments über die entsprechenden Anlage- und Depotstrukturen.',
        },
        {
          question: 'In welchen Ländern ist Fröhlich Vermögensberatung verfügbar?',
          answer:
            'Fröhlich Vermögensberatung richtet sich primär an Nutzer in Deutschland. Die auf unserer Plattform gelisteten Banken stammen aus verschiedenen EU-Ländern wie Deutschland, Frankreich, Italien, Spanien, Portugal, den Niederlanden und weiteren. Die Wohnsitzanforderungen variieren je nach Bank.',
        },
      ],
    },
    {
      id: 'account',
      name: 'Kontoeröffnung',
      icon: UserPlus,
      questions: [
        {
          question: 'Wie eröffne ich ein Sparkonto über Fröhlich Vermögensberatung?',
          answer:
            'Nachdem Sie ein passendes Angebot gefunden haben, klicken Sie auf "Interesse senden" oder "Details ansehen". Sie können dann Ihre Kontaktdaten hinterlassen, und die Bank wird sich mit Ihnen in Verbindung setzen. Die eigentliche Kontoeröffnung erfolgt direkt bei der Partnerbank mit deren eigenen Verifizierungsverfahren.',
        },
        {
          question: 'Welche Dokumente brauche ich zur Kontoeröffnung?',
          answer:
            'Typische Anforderungen umfassen: einen gültigen Personalausweis oder Reisepass, einen Adressnachweis (z.B. Meldebescheinigung oder Kontoauszug), Ihre Steuer-Identifikationsnummer und manchmal Einkommensnachweise. Jede Bank hat eigene spezifische Anforderungen, die während des Antragsprozesses erklärt werden.',
        },
        {
          question: 'Wie lange dauert die Kontoeröffnung?',
          answer:
            'Die Dauer variiert je nach Bank. In der Regel dauert die Online-Verifizierung zwischen wenigen Minuten und einigen Tagen. Nach erfolgreicher Verifizierung ist Ihr Konto sofort aktiv. Bei manchen Banken kann der Prozess durch Video-Ident beschleunigt werden.',
        },
        {
          question: 'Kann ich Konten bei mehreren Banken haben?',
          answer:
            'Ja, absolut. Sie können Sparkonten bei mehreren Banken parallel führen. Das kann sogar vorteilhaft sein: Die EU-Einlagensicherung gilt pro Bank und Kunde bis 100.000 €. Wenn Sie höhere Beträge anlegen möchten, erhöht die Verteilung auf mehrere Banken Ihren Schutz.',
        },
        {
          question: 'Muss ich in Deutschland wohnen?',
          answer:
            'Für die Nutzung von Fröhlich Vermögensberatung müssen Sie nicht zwingend in Deutschland wohnen. Allerdings haben viele Partnerbanken spezifische Wohnsitzanforderungen. Manche akzeptieren Kunden aus dem gesamten EU-Raum, andere sind auf bestimmte Länder beschränkt. Prüfen Sie die jeweiligen Anforderungen im Angebotsdetail.',
        },
      ],
    },
    {
      id: 'rates',
      name: 'Zinsen & Angebote',
      icon: Percent,
      questions: [
        {
          question: 'Wie funktionieren die Zinssätze?',
          answer:
            'Die angezeigten Zinssätze sind nominale Jahreszinsen (p.a. = per annum). Bei Festgeld erhalten Sie den festen Zinssatz für die gesamte Laufzeit. Bei Tagesgeld kann sich der Zinssatz ändern. Die Zinsen werden je nach Produkt monatlich, quartalsweise, jährlich oder am Ende der Laufzeit ausgezahlt.',
        },
        {
          question: 'Was ist der Unterschied zwischen Festgeld und Tagesgeld?',
          answer:
            'Festgeld: Ihr Geld wird für eine feste Laufzeit (z.B. 12 Monate) angelegt. Dafür erhalten Sie in der Regel höhere Zinsen, können aber nicht vorzeitig auf das Geld zugreifen. Tagesgeld: Sie können jederzeit über Ihr Geld verfügen, erhalten aber meist niedrigere und variable Zinsen.',
        },
        {
          question: 'Warum variieren die Zinssätze zwischen Banken?',
          answer:
            'Die Zinssätze hängen von verschiedenen Faktoren ab: der Geldpolitik der Europäischen Zentralbank, der Geschäftsstrategie der Bank, dem Wettbewerb im jeweiligen Markt und der wirtschaftlichen Lage des Landes. Manche Banken bieten höhere Zinsen, um neue Kunden zu gewinnen.',
        },
        {
          question: 'Wie oft werden die Zinssätze aktualisiert?',
          answer:
            'Wir aktualisieren unsere Plattform regelmäßig, um aktuelle Informationen bereitzustellen. Da sich Zinssätze ändern können, empfehlen wir, den aktuellen Zinssatz immer auf der offiziellen Website der Bank zu überprüfen, bevor Sie ein Konto eröffnen.',
        },
        {
          question: 'Kann ich mein Festgeld vorzeitig kündigen?',
          answer:
            'Das hängt von der jeweiligen Bank und dem Produkt ab. Bei den meisten Festgeldanlagen ist eine vorzeitige Kündigung nicht vorgesehen oder mit Zinsverlusten verbunden. Manche Banken erlauben Kündigungen gegen eine Gebühr. Prüfen Sie die Bedingungen vor der Anlage sorgfältig.',
        },
      ],
    },
    {
      id: 'security',
      name: 'Sicherheit',
      icon: Shield,
      questions: [
        {
          question: 'Sind meine Einlagen bei den Partnerbanken sicher?',
          answer:
            'Ja. Alle Partnerbanken auf unserer Plattform sind durch die gesetzliche EU-Einlagensicherung geschützt. Das bedeutet: Ihre Einlagen sind bis zu 100.000 € pro Kunde und pro Bank gesichert – selbst im unwahrscheinlichen Fall einer Bankeninsolvenz. Diese Garantie ist EU-weit gesetzlich vorgeschrieben.',
        },
        {
          question: 'Was ist die EU-Einlagensicherung?',
          answer:
            'Die EU-Einlagensicherung ist ein gesetzlicher Schutz für Sparer in allen EU-Ländern. Sie garantiert, dass Ihre Einlagen bis zu 100.000 € pro Person und Bank geschützt sind. Im Falle einer Bankinsolvenz erhalten Sie Ihr Geld innerhalb von 7 Arbeitstagen vom nationalen Einlagensicherungsfonds zurück.',
        },
        {
          question: 'Kann ich den Banken auf der Plattform vertrauen?',
          answer:
            'Alle unsere Partnerbanken sind etablierte, lizenzierte und regulierte Finanzinstitute in der EU. Sie werden von ihren nationalen Aufsichtsbehörden (z.B. BaFin in Deutschland) überwacht und müssen strenge EU-Bankenvorschriften erfüllen. Wir prüfen alle Partnerbanken vor der Aufnahme auf unsere Plattform.',
        },
        {
          question: 'Wie schützt Fröhlich Vermögensberatung meine persönlichen Daten?',
          answer:
            'Wir nehmen Datenschutz sehr ernst und erfüllen die DSGVO sowie alle europäischen Datenschutzvorschriften. Wir verwenden 256-Bit-SSL-Verschlüsselung für alle Datenübertragungen. Ihre Daten werden niemals ohne Ihre ausdrückliche Zustimmung an Dritte weitergegeben oder verkauft.',
        },
      ],
    },
    {
      id: 'taxes',
      name: 'Steuern',
      icon: Receipt,
      questions: [
        {
          question: 'Muss ich Zinserträge versteuern?',
          answer:
            'Ja, Zinserträge unterliegen in Deutschland der Abgeltungssteuer. Der Steuersatz beträgt 25 % plus Solidaritätszuschlag (5,5 % auf die Steuer) und ggf. Kirchensteuer. Insgesamt werden etwa 26,375 % – 27,99 % Ihrer Zinserträge an das Finanzamt abgeführt.',
        },
        {
          question: 'Was ist der Sparerpauschbetrag?',
          answer:
            'Der Sparerpauschbetrag ist ein steuerlicher Freibetrag für Kapitalerträge. Er beträgt 1.000 € pro Person und Jahr (2.000 € bei gemeinsam veranlagten Ehepaaren). Zinserträge bis zu diesem Betrag sind steuerfrei. Um den Freibetrag zu nutzen, müssen Sie Ihrer Bank einen Freistellungsauftrag erteilen.',
        },
        {
          question: 'Wie funktioniert die Besteuerung bei ausländischen Banken?',
          answer:
            'Bei Zinserträgen von ausländischen Banken innerhalb der EU erfolgt die Besteuerung in der Regel über Ihre deutsche Steuererklärung. Die Bank führt keine deutsche Abgeltungssteuer ab, aber Sie müssen die Erträge in Anlage KAP angeben. Doppelbesteuerungsabkommen verhindern, dass Sie in beiden Ländern Steuern zahlen.',
        },
        {
          question: 'Muss ich die Zinsen in meiner Steuererklärung angeben?',
          answer:
            'Bei deutschen Banken mit Freistellungsauftrag bis zum Freibetrag: nein. Bei Zinsen über dem Freibetrag oder bei ausländischen Banken: ja, in der Anlage KAP. Die Zinserträge ausländischer Banken müssen immer in der Steuererklärung angegeben werden, auch wenn die Steuer bereits im Ausland einbehalten wurde.',
        },
      ],
    },
    {
      id: 'bonus',
      name: 'Bonus',
      icon: BonusIcon,
      questions: [
        {
          question: 'Was ist der Neukundenbonus?',
          answer:
            'Viele unserer Partnerbanken bieten Neukunden einen einmaligen Bonus zwischen 100 € und 300 €. Dieser wird zusätzlich zu den regulären Zinsen gutgeschrieben und ist eine Willkommensprämie für die erste Kontoeröffnung über unsere Plattform.',
        },
        {
          question: 'Wie erhalte ich den Bonus?',
          answer:
            'Um den Bonus zu erhalten, müssen Sie in der Regel: 1) Ein neues Konto über Fröhlich Vermögensberatung bei einer teilnehmenden Bank eröffnen, 2) Einen Mindestbetrag einzahlen (variiert je nach Bank), 3) Das Geld für eine bestimmte Mindestzeit anlegen. Der Bonus wird dann automatisch auf Ihr Konto gutgeschrieben.',
        },
        {
          question: 'Wovon hängt die Bonushöhe ab?',
          answer:
            'Die Bonushöhe variiert je nach Bank und hängt oft von Ihrem Anlagebetrag ab. Beispiel: 100 € Bonus ab 10.000 € Einlage, 200 € Bonus ab 25.000 € Einlage, 300 € Bonus ab 50.000 € Einlage. Die genauen Bedingungen finden Sie im jeweiligen Angebot.',
        },
        {
          question: 'Ist der Bonus steuerpflichtig?',
          answer:
            'Ja, der Neukundenbonus gilt steuerlich als Kapitalertrag und unterliegt der Abgeltungssteuer. Er wird wie reguläre Zinserträge behandelt und kann durch den Sparerpauschbetrag abgedeckt werden, sofern dieser noch nicht ausgeschöpft ist.',
        },
      ],
    },
    {
      id: 'support',
      name: 'Unterstützung',
      icon: Headphones,
      questions: [
        {
          question: 'Wie erreiche ich den Fröhlich Vermögensberatung-Support?',
          answer:
            'Sie können uns auf verschiedenen Wegen erreichen: Per E-Mail an kontakt@froehlich-vermoegensberatung.de (Antwort innerhalb von 24 Stunden), über unser Kontaktformular auf der Website, oder telefonisch während unserer Geschäftszeiten (Mo-Fr 9-18 Uhr). Wir helfen Ihnen gerne bei allen Fragen zur Plattform.',
        },
        {
          question: 'Was mache ich bei Problemen mit meinem Bankkonto?',
          answer:
            'Bei Fragen oder Problemen mit Ihrem Sparkonto wenden Sie sich bitte direkt an die jeweilige Bank. Da Fröhlich Vermögensberatung nur eine Vergleichsplattform ist, haben wir keinen Zugriff auf Ihre Bankkonten. Jede Partnerbank hat einen eigenen Kundenservice, der Ihnen weiterhelfen kann.',
        },
        {
          question: 'Bietet Fröhlich Vermögensberatung eine persönliche Beratung an?',
          answer:
            'Fröhlich Vermögensberatung bietet keine persönliche Finanz- oder Anlageberatung an. Wir stellen Informationen und Vergleichstools zur Verfügung, um Ihnen bei der eigenen Entscheidungsfindung zu helfen. Für eine individuelle Beratung empfehlen wir, einen unabhängigen Finanzberater zu konsultieren.',
        },
      ],
    },
  ];

  const allQuestions = useMemo(() => {
    return faqCategories.flatMap((category) =>
      category.questions.map((q) => ({
        ...q,
        categoryId: category.id,
        categoryName: category.name,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredQuestions = useMemo(() => {
    let questions = activeCategory === 'all' ? allQuestions : allQuestions.filter((q) => q.categoryId === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      questions = questions.filter(
        (q) => q.question.toLowerCase().includes(query) || q.answer.toLowerCase().includes(query)
      );
    }
    return questions;
  }, [activeCategory, searchQuery, allQuestions]);

  const groupedQuestions = useMemo(() => {
    if (activeCategory !== 'all') {
      return [
        {
          category: faqCategories.find((c) => c.id === activeCategory),
          questions: filteredQuestions,
        },
      ];
    }
    const groups = [];
    faqCategories.forEach((category) => {
      const categoryQuestions = filteredQuestions.filter((q) => q.categoryId === category.id);
      if (categoryQuestions.length > 0) groups.push({ category, questions: categoryQuestions });
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredQuestions, activeCategory]);

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="FAQ"
        description="Antworten zu Festgeld, Tagesgeld, Flexgeld, Einlagensicherung, Registrierung und Nutzung Ihres Fröhlich Vermögensberatung-Dashboards."
        path="/faq"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:px-12 lg:py-24">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <Eyebrow>Hilfe · Lexikon</Eyebrow>
            <h1
              className="mt-5 font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] text-bank-text sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Häufige
              <span className="block italic text-bank-text-muted">Fragen.</span>
            </h1>
            <div className="mt-7 h-px w-24 bg-bank-gold/55" aria-hidden />
            <p className="mt-7 max-w-xl text-[1.02rem] leading-[1.8] text-bank-text-muted">
              Antworten zu Plattform, Konto, Zinsen, Sicherheit und Bonus — durchsuchbar nach Stichwort.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-10 lg:col-span-5 lg:mt-0"
          >
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
              Suche
            </p>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bank-gold"
                strokeWidth={1.5}
              />
              <input
                type="text"
                placeholder="Frage suchen…"
                aria-label="Frage suchen"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full border border-bank-border bg-white pl-12 pr-12 font-sans text-[15px] text-bank-text placeholder:text-bank-text-muted/55 focus:border-bank-gold/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                data-testid="faq-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70 hover:text-bank-text"
                  aria-label="Suche zurücksetzen"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES + ACCORDION */}
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:flex lg:gap-12 lg:px-12 lg:py-20">
        <aside className="mb-10 shrink-0 lg:mb-0 lg:w-60 lg:pt-2">
          <p className="mb-5 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
            Kategorien
          </p>
          <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`relative whitespace-nowrap border-l-2 px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-300 lg:py-3 ${
                activeCategory === 'all'
                  ? 'border-bank-gold bg-bank-bg text-bank-text'
                  : 'border-transparent text-bank-text-muted hover:border-bank-gold/35 hover:text-bank-text'
              }`}
              data-testid="faq-category-all"
            >
              <span className="mr-3 text-bank-gold">00</span>Alle
            </button>
            {faqCategories.map((category, idx) => {
              const Icon = category.icon;
              const num = String(idx + 1).padStart(2, '0');
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative flex items-center gap-3 whitespace-nowrap border-l-2 px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-300 lg:py-3 ${
                    active
                      ? 'border-bank-gold bg-bank-bg text-bank-text'
                      : 'border-transparent text-bank-text-muted hover:border-bank-gold/35 hover:text-bank-text'
                  }`}
                  data-testid={`faq-category-${category.id}`}
                >
                  <span className={active ? 'text-bank-gold' : 'text-bank-text-muted/70'}>{num}</span>
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="font-sans text-[12px] tracking-normal">{category.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {searchQuery && (
            <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">
              <span className="text-bank-gold">{filteredQuestions.length}</span> Ergebnis
              {filteredQuestions.length !== 1 ? 'se' : ''}
              {searchQuery && ` für „${searchQuery}“`}
            </p>
          )}

          {filteredQuestions.length === 0 && (
            <div className="relative border border-bank-border bg-white px-8 py-20 text-center">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/55 to-transparent" />
              <HelpCircle className="mx-auto mb-5 h-12 w-12 text-bank-text-muted/25" strokeWidth={1} />
              <h3
                className="font-display text-2xl font-light italic text-bank-text"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                Keine Ergebnisse
              </h3>
              <p className="mt-3 text-sm text-bank-text-muted">Suchbegriff oder Kategorie anpassen.</p>
              <Button
                variant="outline-ink"
                className="mt-8"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Zurücksetzen
              </Button>
            </div>
          )}

          <div className="space-y-16">
            {groupedQuestions.map(({ category, questions }, gIdx) => (
              <section key={category.id}>
                <header className="mb-8 flex items-end justify-between gap-6 border-b border-bank-border pb-5">
                  <div className="flex items-center gap-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">
                      {String(gIdx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h2
                        className="font-display text-[1.6rem] font-light leading-tight text-bank-text sm:text-[1.85rem]"
                        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                      >
                        {category.name}
                      </h2>
                    </div>
                  </div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                    {questions.length} Einträge
                  </p>
                </header>

                <Accordion type="single" collapsible className="space-y-3">
                  {questions.map((faq, index) => (
                    <AccordionItem
                      key={`${category.id}-${index}`}
                      value={`${category.id}-${index}`}
                      className="group relative border border-bank-border bg-white px-0 transition-shadow duration-300 data-[state=open]:shadow-editorial-sm"
                      data-testid={`faq-item-${category.id}-${index}`}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/0 via-bank-gold/45 to-transparent opacity-0 transition-opacity duration-300 group-data-[state=open]:opacity-100" />
                      <AccordionTrigger className="px-5 py-5 text-left font-display text-[1.05rem] font-light leading-snug text-bank-text hover:no-underline hover:text-bank-primary sm:text-[1.15rem]">
                        <span className="mr-4 font-mono text-[11px] tracking-[0.18em] text-bank-gold">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="whitespace-pre-line border-t border-bank-border px-5 pb-6 pt-5 font-sans text-[14.5px] leading-[1.8] text-bank-text-muted">
                        <span className="mr-4 inline-block align-text-top font-mono text-[10.5px] tracking-[0.18em] text-bank-gold">
                          ¶
                        </span>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* CONTACT BAND */}
      <section className="relative overflow-hidden border-t border-bank-border bg-bank-ink py-20 text-white lg:py-24">
        <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <MessageCircle className="mx-auto mb-6 h-9 w-9 text-bank-gold" strokeWidth={1.25} />
            <Eyebrow tone="gold" className="justify-center">
              Frage nicht dabei?
            </Eyebrow>
            <h2
              className="mt-5 font-display text-[2rem] font-light leading-tight sm:text-[2.4rem]"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              <em className="italic text-bank-gold-soft">Schreiben Sie uns</em> — wir antworten meist binnen 24 h.
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="relative border border-white/12 bg-white/[0.04] p-8 text-center">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/55 to-transparent" />
              <Mail className="mx-auto mb-5 h-7 w-7 text-bank-gold" strokeWidth={1.25} />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">E-Mail</p>
              <a
                href="mailto:kontakt@froehlich-vermoegensberatung.de"
                className="mt-3 block font-display text-[1.05rem] italic text-white underline-offset-4 hover:underline"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                kontakt@froehlich-vermoegensberatung.de
              </a>
            </div>
            <div className="relative border border-white/12 bg-white/[0.04] p-8 text-center">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/55 to-transparent" />
              <Headphones className="mx-auto mb-5 h-7 w-7 text-bank-gold" strokeWidth={1.25} />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">Formular</p>
              <Link to="/contact" className="mt-4 inline-block">
                <Button size="lg" variant="outline-accent">
                  Kontakt <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </div>
          <p className="mt-12 text-center font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/45">
            Mo–Fr · 09:00 – 18:00 Uhr
          </p>
        </div>
      </section>
    </div>
  );
};

export default FAQ;

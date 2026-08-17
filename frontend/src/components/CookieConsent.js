import React, { useState, useEffect, useCallback } from 'react';
import { X, Cookie, Shield, BarChart3, Megaphone, Settings, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  COOKIE_CONSENT_KEY,
  OPEN_COOKIE_SETTINGS_EVENT,
  hasVisitorProfile,
  saveCookieConsent,
} from '@/lib/visitorGate';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('consent');
  const [preferences, setPreferences] = useState({
    necessary: true,
    preferences: false,
    statistics: false,
    marketing: false,
  });

  const openPanel = useCallback(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.preferences) {
          setPreferences({
            necessary: true,
            preferences: Boolean(parsed.preferences.preferences),
            statistics: Boolean(parsed.preferences.statistics),
            marketing: Boolean(parsed.preferences.marketing),
          });
        }
      }
    } catch {
      /* ignore */
    }
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const onOpen = () => openPanel();
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
  }, [openPanel]);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    // First visit is handled by VisitorWelcomeGate; only auto-prompt if profile
    // exists but cookie consent is missing (e.g. reopened settings cleared).
    if (!savedConsent && hasVisitorProfile()) {
      const timer = setTimeout(() => setIsVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const persist = (prefs) => {
    saveCookieConsent(prefs);
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    persist(allAccepted);
  };

  const handleReject = () => {
    const onlyNecessary = {
      necessary: true,
      preferences: false,
      statistics: false,
      marketing: false,
    };
    setPreferences(onlyNecessary);
    persist(onlyNecessary);
  };

  const handleAllowSelection = () => {
    persist(preferences);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return;
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const content = {
    title: 'Diese Website verwendet Cookies',
    description: 'Wir verwenden Cookies, um unsere Website sicher und benutzerfreundlich zu betreiben. Einige Cookies sind notwendig, um die Grundfunktionen der Website zu gewährleisten, während andere uns helfen, die Website zu verbessern und Ihnen relevante Inhalte anzuzeigen.',
    tabs: {
      consent: 'Zustimmung',
      details: 'Details',
      about: 'Über Cookies',
    },
    categories: {
      necessary: {
        title: 'Notwendig',
        description: 'Diese Cookies sind für das Funktionieren der Website unerlässlich und können nicht deaktiviert werden. Sie werden nur als Reaktion auf von Ihnen vorgenommene Aktionen gesetzt.',
        always: 'Immer aktiv',
      },
      preferences: {
        title: 'Präferenzen',
        description: 'Diese Cookies ermöglichen es der Website, sich an Ihre Einstellungen zu erinnern (z.B. Sprache, Region) und erweiterte, personalisierte Funktionen bereitzustellen.',
      },
      statistics: {
        title: 'Statistik',
        description: 'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren, indem sie Informationen anonym sammeln und melden.',
      },
      marketing: {
        title: 'Marketing',
        description: 'Diese Cookies werden verwendet, um Besuchern relevante Werbung und Marketing-Kampagnen anzuzeigen. Sie verfolgen Besucher über Websites hinweg.',
      },
    },
    about: {
      title: 'Was sind Cookies?',
      text1: 'Cookies sind kleine Textdateien, die von Websites auf Ihrem Gerät gespeichert werden. Sie werden häufig verwendet, um Websites funktionsfähig zu machen oder effizienter zu arbeiten, sowie um Informationen an die Eigentümer der Website zu übermitteln.',
      title2: 'Wie verwenden wir Cookies?',
      text2: 'Wir verwenden Cookies, um Ihre Erfahrung auf unserer Website zu verbessern. Dies umfasst die Speicherung Ihrer Präferenzen, die Analyse des Nutzerverhaltens und die Bereitstellung personalisierter Inhalte.',
      title3: 'Ihre Rechte',
      text3: 'Sie haben das Recht, Ihre Cookie-Einstellungen jederzeit zu ändern. Sie können auch alle nicht-notwendigen Cookies ablehnen, ohne dass dies die Grundfunktionen der Website beeinträchtigt.',
    },
    buttons: {
      reject: 'Ablehnen',
      allowSelection: 'Auswahl erlauben',
      acceptAll: 'Alle akzeptieren',
    },
  };

  if (!isVisible) return null;

  const categoryIcons = {
    necessary: <Shield size={20} className="text-bank-success" />,
    preferences: <Settings size={20} className="text-bank-accent" />,
    statistics: <BarChart3 size={20} className="text-bank-secondary" />,
    marketing: <Megaphone size={20} className="text-bank-text-muted" />,
  };

  return (
    <>
      <div className="fixed inset-0 z-[10001] bg-black/50" />

      <div
        className="fixed bottom-0 left-0 right-0 z-[10002] w-full md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2"
        data-testid="cookie-consent-banner"
      >
        <div className="overflow-hidden rounded-t-2xl border border-bank-border bg-white shadow-2xl md:rounded-2xl">
          <div className="bg-gradient-to-r from-bank-primary to-bank-primary-hover px-6 py-4 dark:from-bank-ink dark:to-bank-ink-hover">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <Cookie size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">{content.title}</h2>
              </div>
              {hasVisitorProfile() && (
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label="Schließen"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex border-b border-bank-border">
            {['consent', 'details', 'about'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-bank-accent bg-bank-accent/10 text-bank-accent'
                    : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text'
                }`}
                data-testid={`cookie-tab-${tab}`}
              >
                {content.tabs[tab]}
              </button>
            ))}
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-6">
            {activeTab === 'consent' && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-bank-text-muted">{content.description}</p>

                <div className="mt-4 space-y-3">
                  {Object.entries(preferences).map(([key, value]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        value ? 'border-bank-success/25 bg-bank-success/10' : 'border-bank-border bg-bank-bg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {categoryIcons[key]}
                        <span className="font-medium text-bank-text">
                          {content.categories[key].title}
                        </span>
                      </div>
                      {key === 'necessary' ? (
                        <span className="rounded-full bg-bank-success/15 px-3 py-1 text-xs font-semibold text-bank-success">
                          {content.categories.necessary.always}
                        </span>
                      ) : (
                        <Switch
                          checked={value}
                          onCheckedChange={() => togglePreference(key)}
                          data-testid={`cookie-toggle-${key}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                {Object.entries(content.categories).map(([key, category]) => (
                  <div key={key} className="overflow-hidden rounded-xl border border-bank-border">
                    <div
                      className={`flex items-center justify-between p-4 ${
                        preferences[key] ? 'bg-bank-success/10' : 'bg-bank-bg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {categoryIcons[key]}
                        <span className="font-semibold text-bank-text">{category.title}</span>
                      </div>
                      {key === 'necessary' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={18} className="text-bank-success" />
                          <span className="text-xs font-semibold text-bank-success">
                            {content.categories.necessary.always}
                          </span>
                        </div>
                      ) : (
                        <Switch
                          checked={preferences[key]}
                          onCheckedChange={() => togglePreference(key)}
                        />
                      )}
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-sm text-bank-text-muted">{category.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Info size={18} className="text-bank-accent" />
                    <h3 className="font-semibold text-bank-text">{content.about.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-bank-text-muted">{content.about.text1}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Cookie size={18} className="text-bank-accent" />
                    <h3 className="font-semibold text-bank-text">{content.about.title2}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-bank-text-muted">{content.about.text2}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Shield size={18} className="text-bank-accent" />
                    <h3 className="font-semibold text-bank-text">{content.about.title3}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-bank-text-muted">{content.about.text3}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-bank-border bg-bank-bg p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 border-bank-border text-bank-text-muted hover:bg-bank-border/15"
                onClick={handleReject}
                data-testid="cookie-reject-btn"
              >
                {content.buttons.reject}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-bank-border text-bank-text-muted hover:bg-bank-accent/10"
                onClick={handleAllowSelection}
                data-testid="cookie-allow-selection-btn"
              >
                {content.buttons.allowSelection}
              </Button>
              <Button
                className="flex-1 bg-bank-ink text-white hover:bg-bank-ink-hover"
                onClick={handleAcceptAll}
                data-testid="cookie-accept-all-btn"
              >
                {content.buttons.acceptAll}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookieConsent;

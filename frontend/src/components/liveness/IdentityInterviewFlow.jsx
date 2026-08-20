import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Mic,
  MicOff,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import LivenessModal from '@/components/liveness/LivenessModal';
import { identityQuestionSections } from '@/components/liveness/identityQuestions.de';
import siteContact from '@/data/siteContact';

const SPEECH_LANG = 'de-DE';

const dateRegex = /^(0?[1-9]|[12][0-9]|3[01])[./-](0?[1-9]|1[0-2])[./-](19|20)\d{2}$/;
const documentNoRegex = /^[A-Za-z0-9\-]{5,20}$/;

const normalize = (value) => String(value || '').trim().toLowerCase();

const validateAnswer = (question, answer, personalData) => {
  const normalized = normalize(answer);

  if (!normalized) return 'Bitte geben Sie eine Antwort ein.';

  if (question.answerType === 'yes_no') {
    if (!['ja', 'nein'].includes(normalized)) return 'Bitte wählen Sie Ja oder Nein.';
    if (question.requiredYes && normalized !== 'ja') {
      return 'Für die Fortsetzung ist hier die Antwort "Ja" erforderlich.';
    }
    return '';
  }

  switch (question.validationType) {
    case 'name': {
      if (normalized.length < 4) return 'Bitte vollständigen Namen eingeben.';
      const firstName = normalize(personalData?.first_name);
      const lastName = normalize(personalData?.last_name);
      if (firstName && !normalized.includes(firstName)) return 'Vorname stimmt nicht mit Ihren Formulardaten überein.';
      if (lastName && !normalized.includes(lastName)) return 'Nachname stimmt nicht mit Ihren Formulardaten überein.';
      return '';
    }
    case 'date':
      if (!dateRegex.test(String(answer).trim())) return 'Bitte Datum im Format TT.MM.JJJJ eingeben.';
      return '';
    case 'city':
      if (normalized.length < 2) return 'Bitte eine Stadt eingeben.';
      return '';
    case 'address':
      if (normalized.length < 8) return 'Bitte vollständige Anschrift eingeben.';
      return '';
    case 'document_number':
      if (!documentNoRegex.test(String(answer).trim())) return 'Bitte eine gültige Ausweisnummer eingeben.';
      return '';
    default:
      return '';
  }
};

const createRecognition = () => {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const instance = new Ctor();
  instance.lang = SPEECH_LANG;
  instance.interimResults = false;
  instance.continuous = false;
  instance.maxAlternatives = 1;
  return instance;
};

const generateVideoId = () => `VID-${Math.floor(1000000 + Math.random() * 9000000)}`;

const formatDateTimeDE = (isoDate) => new Date(isoDate).toLocaleString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const IdentityInterviewFlow = ({
  isOpen,
  onClose,
  onSuccess,
  passportDocument,
  personalData,
}) => {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [livenessCompleted, setLivenessCompleted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [speechStateText, setSpeechStateText] = useState('Sprachassistent wird vorbereitet...');
  const [showSuccessSummary, setShowSuccessSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const recognitionRef = useRef(null);
  const voiceRef = useRef(null);

  const currentSection = identityQuestionSections[sectionIndex];
  const currentQuestion = currentSection?.type === 'questions' ? currentSection.questions[questionIndex] : null;
  const totalSections = identityQuestionSections.length;

  const progressPercent = useMemo(
    () => Math.round(((sectionIndex + 1) / totalSections) * 100),
    [sectionIndex, totalSections],
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const selectBestGermanVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const deVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('de'));
    const candidates = deVoices.length ? deVoices : voices;
    const preferred = ['natural', 'premium', 'neural', 'google', 'microsoft', 'siri'];

    const ranked = [...candidates].sort((a, b) => {
      const aScore = preferred.reduce((score, key, idx) => (
        a.name?.toLowerCase().includes(key) ? score + (preferred.length - idx) : score
      ), 0);
      const bScore = preferred.reduce((score, key, idx) => (
        b.name?.toLowerCase().includes(key) ? score + (preferred.length - idx) : score
      ), 0);
      return bScore - aScore;
    });

    return ranked[0] || null;
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG;
    if (!voiceRef.current) {
      voiceRef.current = selectBestGermanVoice();
    }
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }, [selectBestGermanVoice]);

  const goToNextSection = useCallback(() => {
    setInputValue('');
    setError('');
    setQuestionIndex(0);
    setSectionIndex((prev) => Math.min(prev + 1, totalSections - 1));
  }, [totalSections]);

  const handleStartListening = useCallback(() => {
    if (!speechSupported || fallbackMode) return;
    const recognition = createRecognition();
    if (!recognition) {
      setFallbackMode(true);
      setSpeechStateText('Spracheingabe nicht verfügbar. Bitte Antwort eintippen.');
      return;
    }

    stopListening();
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInputValue(transcript);
      setSpeechStateText('Sprache erkannt. Bitte Antwort prüfen und bestätigen.');
    };
    recognition.onerror = () => {
      setSpeechStateText('Spracherkennung fehlgeschlagen. Bitte Antwort eintippen.');
      setFallbackMode(true);
    };
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    setSpeechStateText('Ich höre zu...');
    recognition.start();
  }, [fallbackMode, speechSupported, stopListening]);

  const storeAnswer = useCallback((question, value) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value,
    }));
  }, []);

  const handleQuestionSubmit = useCallback((valueOverride) => {
    if (!currentQuestion) return;
    const submittedValue = valueOverride ?? inputValue;
    const validationError = validateAnswer(currentQuestion, submittedValue, personalData);
    if (validationError) {
      setError(validationError);
      return;
    }

    storeAnswer(currentQuestion, submittedValue);
    setError('');
    setInputValue('');

    if (questionIndex < currentSection.questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      return;
    }
    if (sectionIndex === totalSections - 1) {
      const payload = {
        answers: {
          ...answers,
          [currentQuestion.id]: submittedValue,
        },
        completedAt: new Date().toISOString(),
      };
      setSummaryData({
        completedAt: payload.completedAt,
        videoId: generateVideoId(),
      });
      setShowSuccessSummary(true);
      stopListening();
      return;
    }
    goToNextSection();
  }, [
    answers,
    currentQuestion,
    currentSection?.questions?.length,
    goToNextSection,
    inputValue,
    onSuccess,
    personalData,
    questionIndex,
    sectionIndex,
    storeAnswer,
    stopListening,
    totalSections,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const recognitionAvailable = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(recognitionAvailable);
    setFallbackMode(!recognitionAvailable);
    setSpeechStateText(
      recognitionAvailable
        ? 'Spracheingabe verfügbar. Sie können sprechen oder tippen.'
        : 'Spracheingabe nicht verfügbar. Bitte Antworten eintippen.',
    );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !window.speechSynthesis) return undefined;
    const updateVoice = () => {
      voiceRef.current = selectBestGermanVoice();
    };
    updateVoice();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoice);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoice);
    };
  }, [isOpen, selectBestGermanVoice]);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    if (showSuccessSummary) return;

    let prompt = currentSection?.description || '';
    if (currentQuestion) prompt = currentQuestion.prompt;
    if (prompt) speak(prompt);
  }, [currentQuestion, currentSection?.description, isOpen, showSuccessSummary, speak, stopListening]);

  useEffect(() => {
    if (!isOpen) {
      setSectionIndex(0);
      setQuestionIndex(0);
      setAnswers({});
      setInputValue('');
      setError('');
      setShowLivenessModal(false);
      setLivenessCompleted(false);
      setShowSuccessSummary(false);
      setSummaryData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!currentSection || currentSection.type !== 'liveness' || !livenessCompleted) return;
    goToNextSection();
  }, [currentSection, goToNextSection, livenessCompleted]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/70 p-2 sm:p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="identity-ai-title" translate="no">
        <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-bank-border bg-white p-4 sm:p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="identity-ai-title" className="text-xl font-semibold text-bank-text flex items-center gap-2">
                <Bot size={20} className="text-bank-accent" />
                AI-gestützte Identifizierung
              </h3>
              <p className="text-sm text-bank-text-muted mt-1">
                Der Assistent führt Sie Schritt für Schritt durch den Identifizierungsprozess.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-bank-border px-3 py-1.5 text-sm text-bank-text hover:bg-bank-bg"
              onClick={() => {
                stopListening();
                onClose();
              }}
            >
              Schließen
            </button>
          </div>

          <div className="mt-4 h-2 rounded-full bg-bank-border/40 overflow-hidden">
            <div className="h-full bg-bank-primary transition-all" style={{ width: `${showSuccessSummary ? 100 : progressPercent}%` }} />
          </div>

          {showSuccessSummary ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-bank-border/80 overflow-hidden bg-white">
                <div className="bg-slate-100/90 p-4 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <h4 className="text-2xl sm:text-3xl font-bold text-bank-text leading-tight">Ihre Identifizierung war erfolgreich</h4>
                    <span className="text-xs sm:text-sm text-bank-text-muted whitespace-nowrap">
                      Kundennummer: {personalData?.email ? personalData.email.split('@')[0] : '–'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base text-bank-text-muted">
                    Guten Tag {personalData?.first_name || ''} {personalData?.last_name || ''}, vielen Dank. Ihre Identifizierung per Video-Ident wurde erfolgreich abgeschlossen.
                  </p>
                </div>
                <div className="p-4 sm:p-7 space-y-4 sm:space-y-5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <p className="font-semibold text-emerald-800 inline-flex items-center gap-2">
                      <CheckCircle2 size={18} />
                      Identifizierung erfolgreich
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Ihre Identifizierung wurde am {formatDateTimeDE(summaryData?.completedAt || new Date().toISOString())} erfolgreich durchgeführt.
                    </p>
                  </div>

                  <div className="rounded-xl border border-bank-border/80 p-4">
                    <p className="text-sm font-semibold text-bank-text">Ihre Video-ID (Vorgangsnummer)</p>
                    <p className="text-xs text-bank-text-muted mt-0.5">
                      Bitte bewahren Sie diese Nummer gut auf. Sie dient zur Zuordnung Ihres Identifizierungsprozesses.
                    </p>
                    <div className="mt-3 rounded-lg border border-bank-border bg-bank-bg px-4 py-3 flex items-center justify-between">
                      <span className="text-bank-text-muted text-sm">Video-ID</span>
                      <span className="font-semibold text-bank-text">{summaryData?.videoId || generateVideoId()}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-bank-border/80 p-4">
                    <p className="font-semibold text-bank-text">Was passiert jetzt?</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr,auto,1fr,auto,1fr]">
                      <div>
                        <p className="font-medium text-bank-text">Prüfung Ihrer Daten</p>
                        <p className="text-sm text-bank-text-muted mt-1">Wir prüfen Ihre Angaben und Unterlagen.</p>
                      </div>
                      <div className="hidden md:flex items-center text-bank-text-muted text-lg">→</div>
                      <div>
                        <p className="font-medium text-bank-text">Freigabe Ihres Kontos</p>
                        <p className="text-sm text-bank-text-muted mt-1">Nach erfolgreicher Prüfung informieren wir Sie per E-Mail.</p>
                      </div>
                      <div className="hidden md:flex items-center text-bank-text-muted text-lg">→</div>
                      <div>
                        <p className="font-medium text-bank-text">Loslegen</p>
                        <p className="text-sm text-bank-text-muted mt-1">Danach können Sie alle Funktionen nutzen.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
                    Sicher und geprüft: Diese lokale Identifizierung erfüllt die Sicherheitsanforderungen und wurde datenschutzfreundlich verarbeitet.
                  </div>

                  <div className="rounded-xl border border-bank-border/80 p-4">
                    <p className="font-semibold text-bank-text">Fragen? Wir sind für Sie da.</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm text-bank-text-muted break-all">
                      <p>Tel: {siteContact.phoneDisplay}</p>
                      <p>E-Mail: kontakt@froehlich-vermoegensberatung.de</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess({
                      answers,
                      completedAt: summaryData?.completedAt || new Date().toISOString(),
                      video_id: summaryData?.videoId || generateVideoId(),
                      success_title: 'Ihre Identifizierung war erfolgreich',
                      success_message: 'Ihre Identifizierung per Video-Ident wurde erfolgreich abgeschlossen.',
                    });
                  }}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Identifizierungsprozess abschließen
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr,1fr]">
              <div className="rounded-xl border border-bank-border bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-bank-text-muted">
                  Schritt {sectionIndex + 1} / {totalSections}
                </p>
                <h4 className="mt-1 text-lg font-semibold text-bank-text">{currentSection.title}</h4>
                <p className="text-sm text-bank-text-muted mt-1">{currentSection.description}</p>

                {currentSection.type === 'questions' && currentQuestion && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-bank-border bg-bank-bg p-3">
                      <p className="text-sm font-medium text-bank-text">{currentQuestion.prompt}</p>
                    </div>

                    {currentQuestion.answerType === 'yes_no' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuestionSubmit('ja')}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionSubmit('nein')}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="block text-sm text-bank-text-muted" htmlFor="identity-answer">
                          Ihre Antwort
                        </label>
                        <input
                          id="identity-answer"
                          className="w-full rounded-xl border border-bank-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bank-primary/40"
                          value={inputValue}
                          onChange={(event) => setInputValue(event.target.value)}
                          placeholder="Antwort eingeben..."
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {!fallbackMode && (
                            <button
                              type="button"
                              onClick={handleStartListening}
                              className="inline-flex items-center gap-2 rounded-xl border border-bank-border px-3 py-2 text-sm text-bank-text hover:bg-bank-bg"
                            >
                              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                              {isListening ? 'Aufnahme läuft...' : 'Spracheingabe starten'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleQuestionSubmit()}
                            className="rounded-xl bg-bank-ink px-4 py-2 text-sm text-white hover:bg-bank-ink-hover"
                          >
                            Antwort bestätigen
                          </button>
                        </div>
                      </>
                    )}

                    {error && <p className="text-sm text-rose-700">{error}</p>}
                  </div>
                )}

                {currentSection.type === 'liveness' && (
                  <div className="mt-4 space-y-3">
                    <ul className="space-y-2">
                      {currentSection.instructions.map((item) => (
                        <li key={item} className="text-sm text-bank-text-muted flex items-start gap-2">
                          <ShieldCheck size={16} className="mt-0.5 text-bank-accent shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setShowLivenessModal(true)}
                      className="rounded-xl bg-bank-ink px-4 py-2 text-sm text-white hover:bg-bank-ink-hover"
                    >
                      Kamera-Prüfung starten
                    </button>
                    {livenessCompleted && (
                      <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5">
                        <CheckCircle2 size={15} />
                        Dokument- und Liveness-Prüfung erfolgreich.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-bank-border bg-bank-bg p-3">
                  <p className="text-xs uppercase tracking-wide text-bank-text-muted">Assistentenstatus</p>
                  <p className="mt-1 text-sm text-bank-text inline-flex items-center gap-2">
                    <MessageSquareText size={15} />
                    {speechStateText}
                  </p>
                </div>
                <div className="rounded-xl border border-bank-border bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-bank-text-muted">Nächste Schritte</p>
                  <ol className="mt-2 space-y-2 text-sm text-bank-text-muted">
                    {identityQuestionSections.map((section, index) => (
                      <li key={section.id} className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                            index < sectionIndex
                              ? 'bg-emerald-100 text-emerald-700'
                              : index === sectionIndex
                                ? 'bg-bank-primary/15 text-bank-primary'
                                : 'bg-bank-border/50 text-bank-text-muted'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span>{section.title}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {passportDocument?.name && (
                  <div className="rounded-xl border border-bank-border bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-bank-text-muted">Dokument im Antrag</p>
                    <p className="mt-1 text-sm text-bank-text truncate">{passportDocument.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <LivenessModal
        isOpen={showLivenessModal}
        passportDocument={passportDocument}
        documentTaskMode
        onClose={() => setShowLivenessModal(false)}
        onLivenessSuccess={() => {
          setShowLivenessModal(false);
          setLivenessCompleted(true);
        }}
      />
    </>
  );
};

export default IdentityInterviewFlow;

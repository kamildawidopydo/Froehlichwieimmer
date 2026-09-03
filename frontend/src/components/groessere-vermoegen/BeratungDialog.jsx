import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

/**
 * Session 80.90 · Phase 4 — Beratungs-Dialog (4-Step-Wizard).
 * Consent-getrennt: Datenschutz != Report-Freigabe. Default Report-Share = false.
 * Finanzdaten werden NUR bei ausdrücklicher Zustimmung übermittelt.
 */

const API = process.env.REACT_APP_BACKEND_URL;

const TOPIC_OPTIONS = [
  { key: 'vermoegen_strukturieren', label: 'Vermögen strukturieren' },
  { key: 'liquiditaet',              label: 'Liquidität planen' },
  { key: 'zins_laufzeit',            label: 'Zins- und Laufzeiten' },
  { key: 'wertpapiere',              label: 'Wertpapierstruktur' },
  { key: 'diversifikation',          label: 'Diversifikation' },
  { key: 'portfolio_check',          label: 'Bestehendes Portfolio überprüfen' },
  { key: 'einlagensicherung',        label: 'Einlagensicherung' },
  { key: 'allgemein',                label: 'Allgemeines Vermögensgespräch' },
  { key: 'sonstiges',                label: 'Sonstiges' },
];

const CONTACT_PREF = [
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'E-Mail' },
  { value: 'video', label: 'Videogespräch' },
];
const REACH = [
  { value: 'morning',   label: 'Vormittags' },
  { value: 'afternoon', label: 'Nachmittags' },
  { value: 'evening',   label: 'Abends' },
];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

export default function BeratungDialog({ open, onClose, snapshot, relevantTopics = [], mode = 'full' }) {
  // mode: 'full' (mit Report-Share) | 'contact-only' (ohne Snapshot-Anzeige/Freigabe)
  const { user } = useAuth?.() || { user: null };
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', phone: '', contact_preference: 'email', reachability: '', message: '' });
  const [shareReport, setShareReport] = useState(false); // DEFAULT: NEIN
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const dialogRef = useRef(null);
  const firstBtnRef = useRef(null);

  // Prefill aus bestehender Auth (nur wenn Felder leer)
  useEffect(() => {
    if (open && user) {
      setForm((f) => ({
        ...f,
        firstname: f.firstname || user.firstname || user.first_name || (user.name || '').split(' ')[0] || '',
        lastname:  f.lastname  || user.lastname  || user.last_name  || (user.name || '').split(' ').slice(1).join(' ') || '',
        email:     f.email     || user.email     || '',
      }));
    }
  }, [open, user]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setStep(0); setResult(null); setErrors({}); setShareReport(false); setPrivacy(false);
    }
  }, [open]);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => firstBtnRef.current?.focus(), 100);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length-1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  const totalSteps = mode === 'contact-only' ? 3 : 4;
  const stepTitles = mode === 'contact-only'
    ? ['Ihr Anliegen', 'Kontakt', 'Prüfen & absenden']
    : ['Ihr Anliegen', 'Kontakt', 'Report-Freigabe', 'Prüfen & absenden'];

  const toggleTopic = (k) => setTopics((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const validateStep = () => {
    const e = {};
    if (step === 0 && topics.length === 0) e.topics = 'Bitte mindestens ein Thema wählen.';
    if (step === 1) {
      if (!form.firstname.trim()) e.firstname = 'Bitte Vorname angeben.';
      if (!form.lastname.trim()) e.lastname = 'Bitte Nachname angeben.';
      if (!isEmail(form.email)) e.email = 'Bitte eine gültige E-Mail-Adresse angeben.';
    }
    if (step === totalSteps - 1 && !privacy) e.privacy = 'Bitte Datenschutz-Zustimmung erteilen.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, totalSteps - 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (!validateStep() || submitting) return;
    setSubmitting(true); setErrors({});
    try {
      const payload = {
        topics,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        contact_preference: form.contact_preference,
        reachability: form.reachability || null,
        message: form.message.trim() || null,
        privacy_accepted: true,
        report_shared: mode === 'full' && shareReport,
        report_snapshot: mode === 'full' && shareReport && snapshot ? snapshot : null,
      };
      const { data } = await axios.post(`${API}/api/wealth-consultation`, payload, { withCredentials: true });
      setResult(data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      setErrors({ submit: status === 429 ? 'Zu viele Anfragen — bitte in einigen Minuten erneut versuchen.' : status === 400 ? (detail || 'Bitte Angaben prüfen.') : 'Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen.' });
    } finally {
      setSubmitting(false);
    }
  };

  const snapshotSummary = useMemo(() => {
    if (!snapshot) return [];
    const items = [];
    if (snapshot.phase1?.betrag) items.push(['Anlagevermögen', `${snapshot.phase1.betrag.toLocaleString('de-DE')} €`]);
    if (snapshot.phase1?.horizont) items.push(['Anlagehorizont', snapshot.phase1.horizont]);
    if (snapshot.phase1?.liquiditaet) items.push(['Liquiditätsbedarf', snapshot.phase1.liquiditaet]);
    if (snapshot.phase1?.risiko) items.push(['Risikoneigung', snapshot.phase1.risiko]);
    if (snapshot.phase1?.ziele?.length) items.push(['Ausgewählte Ziele', snapshot.phase1.ziele.join(' · ')]);
    if (snapshot.struct?.total > 0) items.push(['Vermögensstruktur', 'Liquidität · Verzinsliche · Wertpapiere · Sonstiges']);
    if (snapshot.ladder) items.push(['Laufzeitenstruktur', `${snapshot.ladder.length} Laufzeiten`]);
    if (snapshot.phase2?.institute > 0) items.push(['Anzahl Institute', String(snapshot.phase2.institute)]);
    if (snapshot.scenario) items.push(['Betrachtete Strukturvariante', snapshot.scenario.name]);
    if (snapshot.clusterHints?.length) items.push(['Strukturhinweise', `${snapshot.clusterHints.length} Beobachtungen`]);
    return items;
  }, [snapshot]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gv-berat-title" data-testid="gv-berat-dialog" className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 backdrop-blur-sm" ref={dialogRef}>
      <div className="mx-auto my-0 min-h-screen w-full max-w-[820px] bg-bank-bg sm:my-8 sm:min-h-0 sm:rounded-lg">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-bank-border bg-bank-ink px-5 py-3 text-white sm:px-8">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Vermögensgespräch</p>
            <p className="mt-0.5 text-[13px] text-white/90">Schritt {step + 1} von {totalSteps} · {stepTitles[step]}</p>
          </div>
          <button ref={firstBtnRef} type="button" onClick={onClose} aria-label="Dialog schließen" data-testid="gv-berat-close" className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/60">
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        {result ? (
          <div className="px-6 py-14 sm:px-12 sm:py-20" data-testid="gv-berat-success">
            <div className="mx-auto max-w-lg">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-bank-primary/10"><Check className="h-6 w-6 text-bank-primary" strokeWidth={2} aria-hidden /></div>
              <h2 id="gv-berat-title" className="mt-6 font-display text-[2rem] font-light leading-tight tracking-[-0.02em] text-bank-text">Vielen Dank für Ihre Anfrage.</h2>
              <p className="mt-4 text-[14.5px] leading-[1.8] text-bank-text-muted">Wir haben Ihre Anfrage erhalten und melden uns über den von Ihnen gewünschten Kontaktweg.</p>
              <dl className="mt-8 space-y-3 border-t border-bank-border pt-6 text-[13.5px]">
                <div className="flex justify-between"><dt className="text-bank-text-muted">Anfrage-ID</dt><dd className="font-mono text-[12px] text-bank-text" data-testid="gv-berat-success-id">{result.request_id}</dd></div>
                <div className="flex justify-between"><dt className="text-bank-text-muted">Kontaktart</dt><dd className="font-medium text-bank-text">{CONTACT_PREF.find((c) => c.value === form.contact_preference)?.label}</dd></div>
                <div className="flex justify-between"><dt className="text-bank-text-muted">Gesprächsthemen</dt><dd className="max-w-[60%] text-right font-medium text-bank-text">{topics.map((k) => TOPIC_OPTIONS.find((t) => t.key === k)?.label).filter(Boolean).join(' · ')}</dd></div>
                <div className="flex items-start justify-between gap-4 pt-2">
                  <dt className="text-bank-text-muted">Vermögensreport</dt>
                  <dd className="max-w-[60%] text-right text-[13px] font-medium text-bank-text" data-testid="gv-berat-success-report-status">
                    {result.report_shared ? 'Für das Gespräch freigegeben' : 'Es wurden keine Angaben aus Ihrem Vermögensreport übermittelt.'}
                  </dd>
                </div>
              </dl>
              <div className="mt-10"><Button type="button" variant="primary" onClick={onClose} data-testid="gv-berat-success-close">Schließen</Button></div>
            </div>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="px-6 py-8 sm:px-12 sm:py-12">
              {/* Step 0 — Anliegen */}
              {step === 0 && (
                <section aria-labelledby="gv-berat-title">
                  <h2 id="gv-berat-title" className="font-display text-[1.65rem] font-light leading-tight tracking-[-0.015em] text-bank-text">Worüber möchten Sie sprechen?</h2>
                  <p className="mt-2 text-[13.5px] text-bank-text-soft">Mehrfachauswahl möglich.</p>
                  {relevantTopics.length > 0 && mode === 'full' && (
                    <div className="mt-6 border-l-2 border-bank-gold bg-bank-surface-elev/30 p-4">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold"><Sparkles className="mr-1 inline h-3 w-3" strokeWidth={1.8} aria-hidden /> Aus Ihrem Vermögensreport relevant</p>
                      <p className="mt-2 text-[12.5px] text-bank-text-muted">Diese Themen erscheinen aufgrund Ihres Reports besonders relevant — die Auswahl treffen Sie selbst.</p>
                      <p className="mt-2 text-[13px] text-bank-text">{relevantTopics.map((k) => TOPIC_OPTIONS.find((t) => t.key === k)?.label).filter(Boolean).join(' · ')}</p>
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Gesprächsthemen">
                    {TOPIC_OPTIONS.map((t) => {
                      const active = topics.includes(t.key);
                      return (
                        <button key={t.key} type="button" aria-pressed={active} onClick={() => toggleTopic(t.key)} data-testid={`gv-berat-topic-${t.key}`} className={['inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2', active ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50'].join(' ')}>{active && <Check size={14} strokeWidth={2} aria-hidden />}{t.label}</button>
                      );
                    })}
                  </div>
                  {errors.topics && <p role="alert" className="mt-3 text-[13px] text-bank-error">{errors.topics}</p>}
                </section>
              )}

              {/* Step 1 — Kontakt */}
              {step === 1 && (
                <section aria-labelledby="gv-berat-title">
                  <h2 id="gv-berat-title" className="font-display text-[1.65rem] font-light leading-tight tracking-[-0.015em] text-bank-text">Ihre Kontaktdaten</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {[
                      ['firstname', 'Vorname', 'text', true],
                      ['lastname', 'Nachname', 'text', true],
                      ['email', 'E-Mail', 'email', true],
                      ['phone', 'Telefon (optional)', 'tel', false],
                    ].map(([k, label, type, required]) => (
                      <label key={k} className="block text-[12.5px] text-bank-text-muted">
                        {label}{required && <span aria-hidden className="text-bank-error"> *</span>}
                        <input type={type} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} data-testid={`gv-berat-${k}`} aria-invalid={!!errors[k]} required={required} className="mt-1 min-h-[48px] w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14.5px] text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20" />
                        {errors[k] && <span role="alert" className="mt-1 block text-[12px] text-bank-error">{errors[k]}</span>}
                      </label>
                    ))}
                  </div>
                  <fieldset className="mt-8">
                    <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Bevorzugte Kontaktart</legend>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
                      {CONTACT_PREF.map((c) => (
                        <button type="button" key={c.value} role="radio" aria-checked={form.contact_preference === c.value} onClick={() => setForm((f) => ({ ...f, contact_preference: c.value }))} data-testid={`gv-berat-pref-${c.value}`} className={['inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium', form.contact_preference === c.value ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text'].join(' ')}>{c.label}</button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="mt-6">
                    <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Wann erreichen wir Sie am besten? <span className="normal-case tracking-normal text-bank-text-soft">(optional)</span></legend>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
                      {REACH.map((r) => (
                        <button type="button" key={r.value} role="radio" aria-checked={form.reachability === r.value} onClick={() => setForm((f) => ({ ...f, reachability: f.reachability === r.value ? '' : r.value }))} data-testid={`gv-berat-reach-${r.value}`} className={['inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium', form.reachability === r.value ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text'].join(' ')}>{r.label}</button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="mt-6 block text-[12.5px] text-bank-text-muted">
                    Nachricht (optional)
                    <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={2000} rows={4} data-testid="gv-berat-message" className="mt-1 w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20" />
                  </label>
                </section>
              )}

              {/* Step 2 — Report-Freigabe (nur mode=full) */}
              {step === 2 && mode === 'full' && (
                <section aria-labelledby="gv-berat-title">
                  <h2 id="gv-berat-title" className="font-display text-[1.65rem] font-light leading-tight tracking-[-0.015em] text-bank-text">Möchten Sie Ihren Vermögensreport für das Gespräch freigeben?</h2>
                  <p className="mt-3 text-[13.5px] leading-[1.8] text-bank-text-muted">Ihre Entscheidung ist unabhängig von der Datenschutz-Zustimmung. Ohne Freigabe werden <strong>keine</strong> Finanzdaten übermittelt.</p>
                  <div role="radiogroup" className="mt-6 space-y-3">
                    {[
                      { v: false, title: 'Nein — nur Kontaktdaten und Anliegen übermitteln.', desc: 'Der Standard. Es werden keinerlei Angaben aus Ihrem Vermögensreport gesendet oder gespeichert.' },
                      { v: true,  title: 'Ja — meinen aktuellen Vermögensreport zusammen mit meiner Anfrage übermitteln.', desc: 'Nur die unten aufgelisteten Angaben werden gemeinsam mit Ihrer Anfrage sicher übermittelt.' },
                    ].map((o) => {
                      const active = shareReport === o.v;
                      return (
                        <button key={String(o.v)} type="button" role="radio" aria-checked={active} onClick={() => setShareReport(o.v)} data-testid={`gv-berat-share-${o.v}`} className={['w-full rounded-lg border p-4 text-left transition-colors', active ? 'border-bank-primary bg-bank-primary-soft' : 'border-bank-border bg-white hover:border-bank-primary/50'].join(' ')}>
                          <p className="font-medium text-bank-text">{o.title}</p>
                          <p className="mt-1 text-[12.5px] leading-[1.7] text-bank-text-muted">{o.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                  {shareReport && (
                    <div className="mt-6 border-l-2 border-bank-gold bg-bank-surface-elev/30 p-4" data-testid="gv-berat-share-preview">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold"><ShieldCheck className="mr-1 inline h-3 w-3" strokeWidth={1.8} aria-hidden />Folgende Angaben werden übermittelt</p>
                      <dl className="mt-3 space-y-2 text-[13px]">
                        {snapshotSummary.map(([k, v]) => (<div key={k} className="flex justify-between gap-3"><dt className="text-bank-text-muted">{k}</dt><dd className="text-right font-medium text-bank-text">{v}</dd></div>))}
                        {snapshotSummary.length === 0 && <p className="text-bank-text-soft">Kein Report-Snapshot vorhanden.</p>}
                      </dl>
                    </div>
                  )}
                </section>
              )}

              {/* Last step — Prüfen & absenden */}
              {step === totalSteps - 1 && (
                <section aria-labelledby="gv-berat-title">
                  <h2 id="gv-berat-title" className="font-display text-[1.65rem] font-light leading-tight tracking-[-0.015em] text-bank-text">Prüfen & absenden</h2>
                  <dl className="mt-6 space-y-3 border-t border-bank-border pt-6 text-[13.5px]">
                    <div className="flex justify-between gap-3"><dt className="text-bank-text-muted">Kontakt</dt><dd className="text-right font-medium text-bank-text">{form.firstname} {form.lastname} · {form.email}{form.phone && ` · ${form.phone}`}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-bank-text-muted">Bevorzugt</dt><dd className="text-right font-medium text-bank-text">{CONTACT_PREF.find((c) => c.value === form.contact_preference)?.label}{form.reachability && ` · ${REACH.find((r) => r.value === form.reachability)?.label}`}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-bank-text-muted">Themen</dt><dd className="max-w-[65%] text-right font-medium text-bank-text">{topics.map((k) => TOPIC_OPTIONS.find((t) => t.key === k)?.label).filter(Boolean).join(' · ')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-bank-text-muted">Report freigeben</dt><dd className="text-right font-medium text-bank-text" data-testid="gv-berat-review-share">{mode === 'full' && shareReport ? 'Ja — Angaben werden übermittelt' : 'Nein — keine Finanzdaten'}</dd></div>
                  </dl>
                  <label className="mt-8 flex items-start gap-3">
                    <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} data-testid="gv-berat-privacy" aria-invalid={!!errors.privacy} className="mt-1 h-5 w-5 rounded border-bank-border text-bank-primary focus:ring-bank-primary/40" />
                    <span className="text-[13px] leading-[1.7] text-bank-text-muted">Ich habe die <a href="/datenschutz" target="_blank" rel="noreferrer" className="font-semibold text-bank-primary hover:text-bank-primary/80">Datenschutzhinweise</a> gelesen und stimme der Verarbeitung meiner Angaben zur Bearbeitung meiner Anfrage zu.</span>
                  </label>
                  {errors.privacy && <p role="alert" className="mt-2 text-[13px] text-bank-error">{errors.privacy}</p>}
                  {errors.submit && <p role="alert" className="mt-4 text-[13px] text-bank-error">{errors.submit}</p>}
                </section>
              )}
            </div>

            {/* Footer navigation */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-bank-border bg-white px-6 py-4 sm:px-12">
              {step > 0 ? (
                <button type="button" onClick={back} data-testid="gv-berat-back" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-bank-border bg-white px-4 py-2 text-[13.5px] font-medium text-bank-text hover:border-bank-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"><ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Zurück</button>
              ) : <span />}
              {step < totalSteps - 1 ? (
                <Button type="button" variant="primary" onClick={next} data-testid="gv-berat-next">Weiter <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.8} aria-hidden /></Button>
              ) : (
                <Button type="button" variant="primary" onClick={submit} disabled={submitting} data-testid="gv-berat-submit">{submitting ? 'Wird gesendet …' : 'Anfrage absenden'}<ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.8} aria-hidden /></Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

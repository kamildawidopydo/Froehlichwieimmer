import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileUp, Loader2, Lock, X } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { careersApi, errMsg } from '@/lib/careersApi';
import { EXPERIENCE_OPTIONS } from '@/lib/careersContent';

const inputCls = 'w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-[15px] outline-none transition-shadow focus:border-[#36A852] focus:ring-2 focus:ring-[#36A852]/25 disabled:bg-black/[0.03]';
const MAX = 10 * 1024 * 1024;

const F = ({ label, required, children, hint, error, testid }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-[#1E222C]">{label}{required && <span className="text-[#36A852]"> *</span>}</span>
    {children}
    {error ? <span className="mt-1.5 block text-xs font-medium text-rose-600" role="alert" data-testid={testid ? `${testid}-error` : undefined}>{error}</span>
      : hint && <span className="mt-1 block text-xs text-[#686A64]">{hint}</span>}
  </label>
);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[0-9+()/\- ]{5,40}$/;

const validate = (form) => {
  const e = {};
  if (!form.first_name.trim()) e.first_name = 'Bitte geben Sie Ihren Vornamen ein.';
  if (!form.last_name.trim()) e.last_name = 'Bitte geben Sie Ihren Nachnamen ein.';
  if (!form.email.trim()) e.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
  else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein (z. B. name@beispiel.de).';
  if (!form.phone.trim()) e.phone = 'Bitte geben Sie Ihre Telefonnummer ein.';
  else if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Bitte nur Ziffern, Leerzeichen und + ( ) / - verwenden.';
  if (!form.job) e.job = 'Bitte wählen Sie die gewünschte Position.';
  else if (form.job === 'initiativ' && form.position.trim().length < 2) e.position = 'Bitte geben Sie an, für welche Position Sie sich bewerben.';
  return e;
};

const FilePick = ({ label, accept, multiple, files, setFiles, testid, disabled, types }) => {
  const ref = useRef();
  const [err, setErr] = useState('');
  const add = (list) => {
    const arr = Array.from(list || []);
    const bad = arr.find((f) => f.size > MAX) || arr.find((f) => !types.includes(f.type));
    ref.current.value = '';
    if (bad) { setErr(bad.size > MAX ? `${bad.name} ist größer als 10 MB.` : `${bad.name}: Dateityp nicht erlaubt.`); return; }
    setErr('');
    setFiles(multiple ? [...files, ...arr].slice(0, 5) : arr.slice(0, 1));
  };
  return (
    <div>
      <button type="button" disabled={disabled} onClick={() => ref.current.click()} data-testid={`${testid}-btn`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 bg-white px-4 py-5 text-sm font-medium text-[#555] transition-colors hover:border-[#36A852] hover:text-[#36A852] disabled:opacity-50">
        <FileUp size={18} /> {label}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => add(e.target.files)} data-testid={`${testid}-input`} />
      {err && <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert" data-testid={`${testid}-error`}>{err}</p>}
      {files.map((f, i) => (
        <div key={f.name + i} className="mt-2 flex items-center justify-between rounded-lg bg-[#36A852]/8 px-3 py-2 text-sm">
          <span className="truncate">{f.name}</span>
          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Entfernen"><X size={15} /></button>
        </div>
      ))}
    </div>
  );
};

const Success = () => (
  <div className="mx-auto max-w-xl px-5 py-28 text-center" data-testid="apply-success">
    <CheckCircle2 size={56} className="mx-auto text-[#36A852]" strokeWidth={1.5} />
    <h1 className="mt-6 font-display text-3xl sm:text-4xl">Vielen Dank für Ihre Bewerbung!</h1>
    <p className="mt-4 text-lg text-[#555]">Wir haben Ihre Unterlagen erhalten und melden uns schnellstmöglich bei Ihnen.</p>
    <Link to="/karriere" className="mt-8 inline-block rounded-full bg-[#36A852] px-7 py-3.5 font-semibold text-white">Zur Karriereseite</Link>
  </div>
);

export default function CareerApply() {
  const { status } = useOutletContext();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job: params.get('stelle') || (params.get('initiativ') ? 'initiativ' : ''), position: '', experience: '', start_date: '', message: '', website: '' });
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState([]);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());
  const enabled = status.applications_enabled;

  useEffect(() => {
    careersApi.get('/jobs', { params: { preview: status.is_staff ? 1 : undefined } }).then((r) => setJobs(r.data.items)).catch(() => {});
  }, [status.is_staff]);

  const selected = useMemo(() => jobs.find((j) => j.slug === form.job), [jobs, form.job]);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (errors[k]) setErrors({ ...errors, [k]: undefined }); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate(form);
    if (!consent) v.consent = 'Bitte bestätigen Sie die Datenschutzhinweise.';
    setErrors(v);
    if (Object.keys(v).length) {
      setError('Bitte prüfen Sie die markierten Felder.');
      document.querySelector(`[data-field="${Object.keys(v)[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const fd = new FormData();
    ['first_name', 'last_name', 'email', 'phone', 'experience', 'start_date', 'message', 'website'].forEach((k) => fd.append(k, form[k]));
    fd.append('position', selected ? selected.title : form.position);
    fd.append('job_id', selected ? selected.id : '');
    fd.append('privacy_consent', 'true');
    fd.append('form_started_at', String(startedAt.current));
    cv.forEach((f) => fd.append('cv', f));
    docs.forEach((f) => fd.append('attachments', f));
    setBusy(true);
    try {
      await careersApi.post('/applications', fd);
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(errMsg(err, 'Ihre Bewerbung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Success />;
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:py-16">
      <PageMeta title="Online bewerben | Karriere bei der Fröhlich Vermögensberatung GmbH" description="Bewerben Sie sich online bei der Fröhlich Vermögensberatung GmbH." path="/karriere/bewerben" />
      <h1 className="font-display text-4xl sm:text-5xl">Online bewerben</h1>
      <p className="mt-3 text-[#555]">In wenigen Minuten erledigt – auch bequem per Smartphone. Pflichtfelder sind mit <span className="text-[#36A852]">*</span> markiert, Unterlagen können Sie optional anhängen.</p>
      {!enabled && (
        <div className="mt-6 flex gap-3 rounded-xl bg-amber-100 p-4 text-sm text-amber-900" data-testid="apply-disabled-notice">
          <Lock size={18} className="shrink-0" /> Online-Bewerbungen sind derzeit noch nicht freigeschaltet. Bitte schauen Sie bald wieder vorbei.
        </div>
      )}
      <form onSubmit={submit} className="mt-8 space-y-8" data-testid="apply-form" noValidate>
        <fieldset disabled={!enabled || busy} className="space-y-5 rounded-2xl border border-black/5 bg-white p-6 sm:p-8">
          <legend className="sr-only">Persönliche Angaben</legend>
          <p className="text-lg font-semibold">Persönliche Angaben</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <F label="Vorname" required error={errors.first_name} testid="apply-first-name"><input data-field="first_name" aria-invalid={!!errors.first_name} className={inputCls} autoComplete="given-name" value={form.first_name} onChange={set('first_name')} data-testid="apply-first-name" /></F>
            <F label="Nachname" required error={errors.last_name} testid="apply-last-name"><input data-field="last_name" aria-invalid={!!errors.last_name} className={inputCls} autoComplete="family-name" value={form.last_name} onChange={set('last_name')} data-testid="apply-last-name" /></F>
            <F label="E-Mail-Adresse" required error={errors.email} testid="apply-email"><input data-field="email" aria-invalid={!!errors.email} type="email" inputMode="email" className={inputCls} autoComplete="email" value={form.email} onChange={set('email')} data-testid="apply-email" /></F>
            <F label="Telefonnummer" required error={errors.phone} testid="apply-phone"><input data-field="phone" aria-invalid={!!errors.phone} type="tel" inputMode="tel" className={inputCls} autoComplete="tel" value={form.phone} onChange={set('phone')} data-testid="apply-phone" /></F>
          </div>
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set('website')} aria-hidden="true" />
        </fieldset>
        <fieldset disabled={!enabled || busy} className="space-y-5 rounded-2xl border border-black/5 bg-white p-6 sm:p-8">
          <p className="text-lg font-semibold">Ihre Bewerbung</p>
          <F label="Gewünschte Position" required error={errors.job} testid="apply-position">
            <select data-field="job" aria-invalid={!!errors.job} className={inputCls} value={form.job} onChange={set('job')} data-testid="apply-position-select">
              <option value="">Bitte wählen</option>
              {jobs.map((j) => <option key={j.id} value={j.slug}>{j.title}{j.status === 'draft' ? ' (Entwurf)' : ''}</option>)}
              <option value="initiativ">Initiativbewerbung</option>
            </select>
          </F>
          {form.job === 'initiativ' && (
            <F label="Für welche Position bewerben Sie sich?" required error={errors.position} testid="apply-initiative-position"><input data-field="position" className={inputCls} value={form.position} onChange={set('position')} placeholder="z. B. Finanzberatung" data-testid="apply-initiative-position" /></F>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <F label="Berufserfahrung">
              <select className={inputCls} value={form.experience} onChange={set('experience')} data-testid="apply-experience">
                <option value="">Bitte wählen</option>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Frühester Eintrittstermin"><input type="date" className={inputCls} value={form.start_date} onChange={set('start_date')} data-testid="apply-start-date" /></F>
          </div>
          <F label="Persönliche Nachricht"><textarea rows={5} maxLength={4000} className={inputCls} value={form.message} onChange={set('message')} data-testid="apply-message" /></F>
          <div className="grid gap-5 sm:grid-cols-2">
            <F label="Lebenslauf (PDF)" hint="Max. 10 MB"><FilePick label="Lebenslauf hochladen" accept="application/pdf,.pdf" types={['application/pdf']} files={cv} setFiles={setCv} testid="apply-cv" disabled={!enabled || busy} /></F>
            <F label="Weitere Dokumente" hint="PDF, JPG, PNG · bis zu 5 Dateien à 10 MB"><FilePick label="Dokumente hinzufügen" accept=".pdf,.jpg,.jpeg,.png" types={['application/pdf', 'image/jpeg', 'image/png']} multiple files={docs} setFiles={setDocs} testid="apply-docs" disabled={!enabled || busy} /></F>
          </div>
        </fieldset>
        <div className="rounded-2xl border border-black/5 bg-white p-6 sm:p-8">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-[#444]" data-field="consent">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#36A852]" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors({ ...errors, consent: undefined }); }} disabled={!enabled} data-testid="apply-consent" />
            <span>Ich habe die <Link to="/karriere/datenschutz" target="_blank" className="font-semibold text-[#36A852] underline">Datenschutzhinweise für Bewerber</Link> gelesen und bin mit der Verarbeitung meiner Daten zum Zweck des Bewerbungsverfahrens einverstanden. <span className="text-[#36A852]">*</span></span>
          </label>
          {errors.consent && <p className="mt-2 text-xs font-medium text-rose-600" data-testid="apply-consent-error">{errors.consent}</p>}
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" data-testid="apply-error">{error}</p>}
          <button type="submit" disabled={!enabled || busy} data-testid="apply-submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#36A852] py-4 text-base font-semibold text-white transition-colors hover:bg-[#2E9446] disabled:cursor-not-allowed disabled:opacity-50">
            {busy && <Loader2 size={18} className="animate-spin" />} Bewerbung absenden
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#686A64]"><Lock size={12} /> Verschlüsselte Übertragung · Zugriff nur für unser Recruiting-Team</p>
        </div>
      </form>
    </div>
  );
}

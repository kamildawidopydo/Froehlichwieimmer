import { getApiBase } from '@/lib/apiBase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Upload,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
} from 'lucide-react';

const BASE = getApiBase();
const EMPTY_FORM = {
  id: null,
  company_name: '',
  ticker: '',
  current_price: '',
  target_price: '',
  currency: 'EUR',
  analyst: '',
  research_house: '',
  rating: '',
  source_name: '',
  source_url: '',
  research_date: '',
  notes: '',
  published: false,
};

// Session 82.88 — Auth via JWT-Cookie (withCredentials). Kein Bearer-Header
// mehr aus Supabase — Backend liest Auth ausschließlich aus dem access_token
// Cookie via `get_current_user()`. Rolle kommt serverseitig aus `/api/auth/me`.
const useAuthedApi = () => useMemo(() =>
  axios.create({ baseURL: `${BASE}/api`, withCredentials: true }),
[]);

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
};

const fmtPrice = (v, currency = 'EUR') => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v));
  } catch {
    return `${Number(v).toFixed(2)} ${currency}`;
  }
};

const fmtUpside = (pct) => {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return '—';
  const n = Number(pct);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} %`;
};

// ---------------------------------------------------------------------------
// Modal — manuelle Anlage / Bearbeitung
// ---------------------------------------------------------------------------

const StockResearchForm = ({ open, initial, onClose, onSaved, api }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState({});
  const [lookup, setLookup] = useState({ loading: false, error: null, info: null });

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM);
      setErrs({});
      setLookup({ loading: false, error: null, info: null });
    }
  }, [open, initial]);

  if (!open) return null;

  const isEdit = !!form.id;

  const patch = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const patchBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  // Ticker-Normalisierung: trim, uppercase, nur A-Z, 0-9, . und -.
  const normaliseTicker = (raw) => (raw || '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);

  const runLookup = async () => {
    const t = normaliseTicker(form.ticker);
    if (!t) {
      setLookup({ loading: false, error: 'Bitte einen Ticker eingeben.', info: null });
      return;
    }
    setForm((f) => ({ ...f, ticker: t }));
    setLookup({ loading: true, error: null, info: null });
    try {
      const { data } = await api.get(`/news-markte/market/quote/${encodeURIComponent(t)}`);
      // NUR echte Felder aus der Response verwenden — nichts erfinden.
      const price = typeof data?.display_price === 'number' ? data.display_price
                   : typeof data?.price === 'number' ? data.price : null;
      const currency = data?.display_currency || data?.currency || null;
      const name = data?.name || null;
      const lastUpdated = data?.last_updated || null;
      const marketStatus = data?.market_status || null;   // "live" | "delayed" | ...
      const dataSource = data?.data_source || null;       // "provider" | "fallback" | ...
      const isDelayed = data?.is_delayed === true;

      setForm((f) => ({
        ...f,
        ticker: (data?.symbol || t).toUpperCase(),
        // Company-Name nur, wenn tatsächlich geliefert. Bestehenden Wert nie überschreiben,
        // wenn Admin bereits etwas eingetragen hat und die API nichts liefert.
        company_name: name || f.company_name,
        current_price: price !== null ? String(price) : f.current_price,
        currency: currency || f.currency,
      }));
      setLookup({
        loading: false,
        error: null,
        info: {
          symbol: (data?.symbol || t).toUpperCase(),
          name,
          price,
          currency,
          lastUpdated,
          marketStatus,
          dataSource,
          isDelayed,
          hasName: !!name,
          hasTimestamp: !!lastUpdated,
        },
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg = status === 404
        ? 'Für dieses Symbol konnten keine Marktdaten gefunden werden.'
        : 'Marktdaten konnten momentan nicht geladen werden. Sie können die Analyse weiterhin manuell erfassen.';
      setLookup({ loading: false, error: msg, info: null });
    }
  };

  const validate = () => {
    const e = {};
    if (!form.company_name.trim()) e.company_name = 'Unternehmen ist ein Pflichtfeld.';
    if (!form.ticker.trim()) e.ticker = 'Ticker ist ein Pflichtfeld.';
    if (!(Number(form.current_price) > 0)) e.current_price = 'Aktueller Kurs muss größer als 0 sein.';
    if (!(Number(form.target_price) > 0)) e.target_price = 'Kursziel muss größer als 0 sein.';
    if (!form.currency) e.currency = 'Währung ist ein Pflichtfeld.';
    if (!form.source_name.trim()) e.source_name = 'Quelle ist ein Pflichtfeld.';
    if (!form.research_date) e.research_date = 'Research-Datum ist ein Pflichtfeld.';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (evt) => {
    evt.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        current_price: Number(form.current_price),
        target_price: Number(form.target_price),
      };
      // Backend expects strings; keep as-is
      const { data } = isEdit
        ? await api.patch(`/admin/stock-research/${form.id}`, payload)
        : await api.post('/admin/stock-research', payload);
      toast.success(isEdit ? 'Analyse aktualisiert.' : 'Analyse gespeichert.');
      onSaved(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const upside = (() => {
    const c = Number(form.current_price);
    const t = Number(form.target_price);
    if (!c || c <= 0 || !t) return null;
    return ((t - c) / c) * 100;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bank-ink/40 backdrop-blur-sm p-4 sm:p-8" data-testid="stock-research-form-modal">
      <div className="w-full max-w-3xl rounded-2xl border border-bank-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong/85">
              {isEdit ? 'Analyse bearbeiten' : 'Neue Analyse'}
            </p>
            <h2 className="mt-1 font-display text-xl text-bank-text">
              Analysteneinschätzung erfassen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-bank-text-muted hover:bg-bank-mint/60 hover:text-bank-text"
            aria-label="Schließen"
            data-testid="stock-research-form-close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2">
          <FormField label="Unternehmen *" error={errs.company_name}>
            <input
              type="text"
              value={form.company_name}
              onChange={patch('company_name')}
              className={inputCls}
              data-testid="sr-input-company"
              maxLength={200}
            />
          </FormField>

          <FormField label="Ticker *" error={errs.ticker}>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.ticker}
                onChange={patch('ticker')}
                onBlur={(e) => setForm((f) => ({ ...f, ticker: normaliseTicker(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runLookup(); } }}
                className={`${inputCls} uppercase`}
                data-testid="sr-input-ticker"
                maxLength={20}
                placeholder="z. B. AAPL"
              />
              <button
                type="button"
                onClick={runLookup}
                disabled={lookup.loading || !form.ticker.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-bank-primary bg-white px-3 py-2 text-[12px] font-medium text-bank-primary-strong hover:bg-bank-mint/50 disabled:opacity-50"
                data-testid="sr-ticker-lookup-btn"
                title="Aktuelle Marktdaten aus dem hauseigenen Quote-Endpoint übernehmen"
              >
                {lookup.loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                <span className="hidden sm:inline">Marktdaten laden</span>
                <span className="sm:hidden">Prüfen</span>
              </button>
            </div>
            {lookup.loading ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-bank-text-muted" data-testid="sr-lookup-loading">
                <Loader2 size={11} className="animate-spin" /> Marktdaten werden geladen …
              </p>
            ) : lookup.error ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-bank-accent-strong" data-testid="sr-lookup-error">
                <AlertCircle size={11} className="mt-0.5 shrink-0" />
                <span>{lookup.error}</span>
              </p>
            ) : lookup.info ? (
              <div className="mt-1.5 rounded border border-bank-primary/25 bg-bank-mint/30 px-2.5 py-2 text-[11.5px] text-bank-text" data-testid="sr-lookup-info">
                <p className="flex items-center gap-1.5 font-medium text-bank-primary-strong">
                  <CheckCircle2 size={11} /> Marktdaten geladen
                </p>
                <ul className="mt-1 space-y-0.5 text-bank-text-muted">
                  <li>
                    <span className="font-mono uppercase tracking-[0.14em]">{lookup.info.symbol}</span>
                    {lookup.info.hasName ? <> · {lookup.info.name}</> : <> · <em>Kein Unternehmensname geliefert — bitte manuell prüfen</em></>}
                  </li>
                  {lookup.info.price !== null && lookup.info.currency ? (
                    <li>
                      Kurs: <span className="tabular-nums">{fmtPrice(lookup.info.price, lookup.info.currency)}</span>
                      {lookup.info.isDelayed || lookup.info.dataSource === 'fallback' ? (
                        <span className="ml-1.5 rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber-800">
                          {lookup.info.dataSource === 'fallback' ? 'Fallback' : 'Verzögert'}
                        </span>
                      ) : null}
                    </li>
                  ) : null}
                  {lookup.info.hasTimestamp ? (
                    <li>Kursstand: <span className="font-mono">{new Date(lookup.info.lastUpdated).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></li>
                  ) : (
                    <li><em>Kein Datenstand geliefert</em></li>
                  )}
                </ul>
                <p className="mt-1.5 text-[10.5px] text-bank-text-muted">
                  Nur Kurs, Währung und Name wurden übernommen. Kursziel, Analyst und Quelle bitte manuell aus verifizierter Research-Quelle eintragen.
                </p>
              </div>
            ) : null}
          </FormField>

          <FormField label="Aktueller Kurs *" error={errs.current_price}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.current_price}
              onChange={patch('current_price')}
              className={inputCls}
              data-testid="sr-input-current"
            />
          </FormField>

          <FormField label="Kursziel *" error={errs.target_price}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.target_price}
              onChange={patch('target_price')}
              className={inputCls}
              data-testid="sr-input-target"
            />
          </FormField>

          <FormField label="Währung *" error={errs.currency}>
            <select value={form.currency} onChange={patch('currency')} className={inputCls} data-testid="sr-input-currency">
              {['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Berechneter Abstand" hint="Automatisch (nicht editierbar)">
            <div className={`${inputCls} bg-bank-mint/30 tabular-nums`} data-testid="sr-input-upside">
              {upside === null ? '—' : fmtUpside(upside)}
            </div>
          </FormField>

          <FormField label="Analyst">
            <input type="text" value={form.analyst} onChange={patch('analyst')} className={inputCls} data-testid="sr-input-analyst" maxLength={200} />
          </FormField>

          <FormField label="Research-Haus">
            <input type="text" value={form.research_house} onChange={patch('research_house')} className={inputCls} data-testid="sr-input-house" maxLength={200} />
          </FormField>

          <FormField label="Rating">
            <input type="text" value={form.rating} onChange={patch('rating')} placeholder="Kaufen / Halten / …" className={inputCls} data-testid="sr-input-rating" maxLength={60} />
          </FormField>

          <FormField label="Research-Datum *" error={errs.research_date}>
            <input type="date" value={form.research_date?.slice(0, 10) || ''} onChange={patch('research_date')} className={inputCls} data-testid="sr-input-date" />
          </FormField>

          <FormField label="Quelle *" error={errs.source_name}>
            <input type="text" value={form.source_name} onChange={patch('source_name')} className={inputCls} data-testid="sr-input-source" maxLength={200} />
          </FormField>

          <FormField label="Quellen-URL">
            <input type="url" value={form.source_url || ''} onChange={patch('source_url')} placeholder="https://…" className={inputCls} data-testid="sr-input-source-url" maxLength={400} />
          </FormField>

          <FormField label="Notizen" className="sm:col-span-2">
            <textarea rows={2} value={form.notes || ''} onChange={patch('notes')} className={inputCls} data-testid="sr-input-notes" maxLength={1000} />
          </FormField>

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.published}
              onChange={patchBool('published')}
              className="h-4 w-4 border border-bank-border accent-bank-primary"
              data-testid="sr-input-published"
            />
            <span className="text-[14px] text-bank-text">
              Auf Homepage veröffentlichen
              <span className="ml-2 text-[12px] text-bank-text-muted">
                (nur mit gültiger Quelle & Datum möglich)
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3 border-t border-bank-border pt-5 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-bank-border px-4 py-2 text-[13px] text-bank-text hover:border-bank-primary hover:text-bank-primary"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-bank-primary px-5 py-2 text-[13px] font-medium text-white hover:bg-bank-primary-hover disabled:opacity-60"
              data-testid="sr-form-submit"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputCls = 'w-full border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text focus:border-bank-primary focus:outline-none';

const FormField = ({ label, hint, error, children, className = '' }) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-bank-text-muted">{label}</span>
    {children}
    {error ? (
      <span className="text-[11.5px] text-bank-accent-strong">{error}</span>
    ) : hint ? (
      <span className="text-[11.5px] text-bank-text-muted">{hint}</span>
    ) : null}
  </label>
);

// ---------------------------------------------------------------------------
// CSV Import Wizard
// ---------------------------------------------------------------------------

const CsvImportModal = ({ open, onClose, onImported, api }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) { setFile(null); setPreview(null); }
  }, [open]);

  if (!open) return null;

  const runPreview = async () => {
    if (!file) return;
    setLoading(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/admin/stock-research/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'CSV konnte nicht gelesen werden.');
    } finally {
      setLoading(false);
    }
  };

  const runConfirm = async () => {
    if (!preview?.importable?.length) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/admin/stock-research/import/confirm', {
        rows: preview.importable,
      });
      toast.success(`${data.inserted} Datensätze als Entwurf importiert (${data.skipped} übersprungen).`);
      onImported();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Import fehlgeschlagen.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bank-ink/40 backdrop-blur-sm p-4 sm:p-8" data-testid="csv-import-modal">
      <div className="w-full max-w-4xl rounded-2xl border border-bank-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong/85">
              CSV-Import
            </p>
            <h2 className="mt-1 font-display text-xl text-bank-text">Analysten-Datensätze importieren</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-bank-text-muted hover:bg-bank-mint/60" aria-label="Schließen" data-testid="csv-import-close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-bank-border bg-bank-mint/25 px-4 py-4 text-[13px] text-bank-text-muted">
            <p className="font-medium text-bank-text">Erforderliche Spalten:</p>
            <p className="mt-1 font-mono text-[12px]">
              company_name, ticker, current_price, target_price, currency, source_name, research_date
            </p>
            <p className="mt-2 font-medium text-bank-text">Optional:</p>
            <p className="mt-1 font-mono text-[12px]">
              analyst, research_house, rating, source_url, notes, published
            </p>
            <p className="mt-3">
              Datensätze werden immer als <strong>Entwurf</strong> importiert. Veröffentlichung erfolgt danach bewusst pro Datensatz oder per Bulk-Aktion.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-[12px] uppercase tracking-[0.14em] text-bank-text-muted">CSV-Datei</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }}
                data-testid="csv-file-input"
                className="block w-full text-[13px] file:mr-3 file:rounded file:border file:border-bank-border file:bg-bank-mint/40 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-bank-text-strong hover:file:bg-bank-mint"
              />
            </label>
            <button
              type="button"
              onClick={runPreview}
              disabled={!file || loading}
              className="inline-flex items-center gap-2 rounded border border-bank-primary bg-bank-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-bank-primary-hover disabled:opacity-60"
              data-testid="csv-preview-btn"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Vorschau erstellen
            </button>
          </div>

          {preview && (
            <div className="space-y-4" data-testid="csv-preview-panel">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Erkannt" value={preview.summary.total} />
                <StatTile label="Gültig" value={preview.summary.valid} tone="ok" />
                <StatTile label="Warnungen" value={preview.summary.warnings} tone="warn" />
                <StatTile label="Fehler" value={preview.summary.errors} tone="err" />
              </div>

              {preview.summary.unknown_columns?.length ? (
                <p className="text-[12.5px] text-bank-text-muted">
                  Unbekannte Spalten (ignoriert): <span className="font-mono">{preview.summary.unknown_columns.join(', ')}</span>
                </p>
              ) : null}

              <div className="max-h-[360px] overflow-auto border border-bank-border">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="sticky top-0 bg-bank-mint/60 text-[10.5px] uppercase tracking-[0.16em] text-bank-primary-strong">
                    <tr>
                      <th className="px-3 py-2">Zeile</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Unternehmen · Ticker</th>
                      <th className="px-3 py-2">Kursziel</th>
                      <th className="px-3 py-2">Analyst</th>
                      <th className="px-3 py-2">Datum</th>
                      <th className="px-3 py-2">Meldungen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bank-border">
                    {preview.rows.map((r) => {
                      const p = r.preview || {};
                      const hasErr = r.errors?.length > 0;
                      const hasWarn = r.warnings?.length > 0;
                      return (
                        <tr key={r.line} className={hasErr ? 'bg-bank-accent/5' : hasWarn ? 'bg-amber-50/60' : ''}>
                          <td className="px-3 py-2 font-mono text-bank-text-muted">{r.line}</td>
                          <td className="px-3 py-2">
                            {hasErr ? (
                              <span className="inline-flex items-center gap-1 text-bank-accent-strong">
                                <AlertCircle size={12} /> Fehler
                              </span>
                            ) : hasWarn ? (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <AlertTriangle size={12} /> Warnung
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-bank-primary-strong">
                                <CheckCircle2 size={12} /> Gültig
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {p.company_name || '—'}
                            {p.ticker ? <span className="ml-2 font-mono text-[11px] text-bank-text-muted">{p.ticker}</span> : null}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {p.target_price !== undefined ? fmtPrice(p.target_price, p.currency) : '—'}
                          </td>
                          <td className="px-3 py-2">{p.analyst || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[11.5px] text-bank-text-muted">{p.research_date || '—'}</td>
                          <td className="px-3 py-2 text-[11.5px] text-bank-text-muted">
                            {[...(r.errors || []), ...(r.warnings || [])].map((m, i) => (
                              <div key={i}>{m}</div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 border-t border-bank-border pt-4">
                <button type="button" onClick={onClose} className="rounded border border-bank-border px-4 py-2 text-[13px] hover:border-bank-primary hover:text-bank-primary">
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={runConfirm}
                  disabled={!preview.importable?.length || confirming}
                  className="inline-flex items-center gap-2 rounded bg-bank-primary px-5 py-2 text-[13px] font-medium text-white hover:bg-bank-primary-hover disabled:opacity-60"
                  data-testid="csv-confirm-btn"
                >
                  {confirming && <Loader2 size={14} className="animate-spin" />}
                  {preview.importable?.length ?? 0} Datensätze als Entwurf importieren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ label, value, tone }) => {
  const toneCls = tone === 'ok'
    ? 'border-bank-primary/40 bg-bank-mint/40 text-bank-primary-strong'
    : tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : tone === 'err'
        ? 'border-bank-accent/40 bg-bank-accent/5 text-bank-accent-strong'
        : 'border-bank-border bg-bank-bg text-bank-text';
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneCls}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-1 text-2xl font-light tabular-nums">{value}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AdminStockResearch = () => {
  const api = useAuthedApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/stock-research');
      setItems(data?.items || []);
      setSelected(new Set());
    } catch (err) {
      toast.error('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const toggleOne = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  };

  const publish = async (id) => {
    try {
      await api.post(`/admin/stock-research/${id}/publish`);
      toast.success('Analyse veröffentlicht.');
      load();
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Veröffentlichung fehlgeschlagen.');
    }
  };
  const unpublish = async (id) => {
    try {
      await api.post(`/admin/stock-research/${id}/unpublish`);
      toast.success('Analyse depubliziert.');
      load();
    } catch (err) {
      toast.error('Depublizieren fehlgeschlagen.');
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Analyse ${row.company_name} (${row.ticker}) wirklich löschen?`)) return;
    try {
      await api.delete(`/admin/stock-research/${row.id}`);
      toast.success('Analyse gelöscht.');
      load();
    } catch (err) {
      toast.error('Löschen fehlgeschlagen.');
    }
  };

  const runBulk = async (action) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm(`${ids.length} Datensätze wirklich löschen?`)) return;
    setBulkBusy(true);
    try {
      const { data } = await api.post('/admin/stock-research/bulk', { ids, action });
      toast.success(`${data.affected} Datensätze verarbeitet.`);
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'object' && detail.failed) {
        toast.error(`${detail.message}: ${detail.failed.length} Datensätze ungültig.`);
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Bulk-Aktion fehlgeschlagen.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const openEdit = (row) => { setEditing(row); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormOpen(true); };

  const publishedCount = items.filter((i) => i.published).length;

  return (
    <div className="p-6 sm:p-10" data-testid="admin-stock-research-page">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-primary-strong/85">
            Homepage · Research
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-tight text-bank-text">
            Aktienanalysen
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] text-bank-text-muted">
            Analysteneinschätzungen &amp; Kursziele für den Homepage-Bereich „Aktien mit Potenzial".
            {' '}
            {publishedCount > 0
              ? <><strong className="text-bank-text">{publishedCount}</strong> veröffentlicht · {items.length - publishedCount} Entwürfe.</>
              : <>Aktuell keine veröffentlichten Datensätze — auf der Homepage erscheint der Empty-State.</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCsvOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-bank-border bg-white px-4 py-2 text-[13px] hover:border-bank-primary hover:text-bank-primary"
            data-testid="open-csv-import-btn"
          >
            <Upload size={14} /> CSV importieren
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded bg-bank-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-bank-primary-hover"
            data-testid="open-new-analysis-btn"
          >
            <Plus size={14} /> Neue Analyse
          </button>
        </div>
      </header>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bank-primary/30 bg-bank-mint/40 px-4 py-3" data-testid="bulk-toolbar">
          <span className="text-[13px] text-bank-text">{selected.size} ausgewählt</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk('publish')}
              className="inline-flex items-center gap-1.5 rounded border border-bank-primary bg-white px-3 py-1.5 text-[12px] text-bank-primary-strong hover:bg-bank-primary hover:text-white disabled:opacity-60"
              data-testid="bulk-publish-btn"
            >
              <Eye size={12} /> Veröffentlichen
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk('unpublish')}
              className="inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-3 py-1.5 text-[12px] text-bank-text hover:border-bank-primary hover:text-bank-primary disabled:opacity-60"
              data-testid="bulk-unpublish-btn"
            >
              <EyeOff size={12} /> Depublizieren
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk('delete')}
              className="inline-flex items-center gap-1.5 rounded border border-bank-accent/40 bg-white px-3 py-1.5 text-[12px] text-bank-accent-strong hover:bg-bank-accent/10 disabled:opacity-60"
              data-testid="bulk-delete-btn"
            >
              <Trash2 size={12} /> Löschen
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-bank-text-muted">
          <Loader2 className="animate-spin" size={16} /> Wird geladen …
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bank-border bg-bank-bg px-6 py-16 text-center">
          <p className="text-bank-text-muted">Noch keine Analysteneinschätzungen vorhanden.</p>
          <p className="mt-2 text-[13px] text-bank-text-muted">
            Legen Sie einen ersten Datensatz manuell an oder importieren Sie eine CSV.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-bank-border">
          <table className="w-full min-w-[1180px] text-left text-[13.5px]">
            <thead className="bg-bank-mint/50 text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} data-testid="select-all-checkbox" />
                </th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Unternehmen · Ticker</th>
                <th className="px-3 py-3 text-right">Aktuell</th>
                <th className="px-3 py-3 text-right">Kursziel</th>
                <th className="px-3 py-3 text-right">Abstand</th>
                <th className="px-3 py-3">Analyst · Haus</th>
                <th className="px-3 py-3">Quelle</th>
                <th className="px-3 py-3">Research-Datum</th>
                <th className="px-3 py-3">Geändert</th>
                <th className="px-3 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border">
              {items.map((it) => (
                <tr key={it.id} data-testid={`sr-row-${it.ticker}`} className="align-top hover:bg-bank-mint/20">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleOne(it.id)} data-testid={`select-${it.ticker}`} />
                  </td>
                  <td className="px-3 py-3">
                    {it.published ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-bank-primary/40 bg-bank-mint/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-primary-strong">
                        <Eye size={10} /> Veröffentlicht
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-bank-border bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
                        Entwurf
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-bank-text">{it.company_name}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">{it.ticker}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPrice(it.current_price, it.currency)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPrice(it.target_price, it.currency)}</td>
                  <td className={`px-3 py-3 text-right tabular-nums font-medium ${(it.upside_pct ?? 0) >= 0 ? 'text-bank-primary-strong' : 'text-bank-text-muted'}`}>
                    {fmtUpside(it.upside_pct)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-bank-text">{it.analyst || '—'}</p>
                    {it.research_house ? <p className="mt-0.5 text-[11.5px] text-bank-text-muted">{it.research_house}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-bank-text">{it.source_name || '—'}</p>
                    {it.source_url ? (
                      <a href={it.source_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex text-[11px] text-bank-primary hover:underline">
                        Quelle öffnen ↗
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11.5px] text-bank-text-muted">{fmtDate(it.research_date)}</td>
                  <td className="px-3 py-3 font-mono text-[11.5px] text-bank-text-muted">{fmtDate(it.updated_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn title="Bearbeiten" testid={`sr-edit-${it.ticker}`} onClick={() => openEdit(it)}>
                        <Pencil size={13} />
                      </IconBtn>
                      {it.published ? (
                        <IconBtn title="Depublizieren" testid={`sr-unpub-${it.ticker}`} onClick={() => unpublish(it.id)}>
                          <EyeOff size={13} />
                        </IconBtn>
                      ) : (
                        <IconBtn title="Veröffentlichen" testid={`sr-pub-${it.ticker}`} onClick={() => publish(it.id)}>
                          <Eye size={13} />
                        </IconBtn>
                      )}
                      <IconBtn title="Löschen" testid={`sr-del-${it.ticker}`} tone="danger" onClick={() => remove(it)}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StockResearchForm
        open={formOpen}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
        api={api}
      />
      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImported={() => { setCsvOpen(false); load(); }}
        api={api}
      />
    </div>
  );
};

const IconBtn = ({ children, onClick, title, tone, testid }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    data-testid={testid}
    className={`rounded border px-2 py-1.5 transition-colors ${
      tone === 'danger'
        ? 'border-bank-accent/30 bg-white text-bank-accent-strong hover:bg-bank-accent/10'
        : 'border-bank-border bg-white text-bank-text hover:border-bank-primary hover:text-bank-primary'
    }`}
  >
    {children}
  </button>
);

export default AdminStockResearch;

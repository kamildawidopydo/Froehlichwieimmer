// Session 93 · Phase 5 — Import-Wizard.
// Upload → Parse/Validation → Dry-Run → Diff-Preview → Review → Apply/Publish.
// Apply wird NIE beim Upload ausgelöst; die Zusammenfassung erscheint immer vor Apply.
import React, { useState, useMemo, useCallback } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Upload, FileText, PlayCircle, ShieldCheck, AlertTriangle, CheckCircle2, Database, Clock, RefreshCw,
} from 'lucide-react';

const STEPS = [
  { key: 'upload', label: '1 · Upload' },
  { key: 'validate', label: '2 · Validate' },
  { key: 'dryrun', label: '3 · Dry-Run' },
  { key: 'preview', label: '4 · Diff-Preview' },
  { key: 'review', label: '5 · Review' },
  { key: 'apply', label: '6 · Apply / Publish' },
];

function StepBar({ current }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map((s, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div
            key={s.key}
            data-testid={`import-step-${s.key}`}
            className={`border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
              active
                ? 'border-bank-gold bg-bank-ink text-white'
                : done
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-bank-border bg-white text-bank-text-muted'
            }`}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function CountsSummary({ counts, testidPrefix }) {
  const entries = [
    ['create', 'Neu', 'success'],
    ['update', 'Geändert', 'info'],
    ['unchanged', 'Unverändert', 'neutral'],
    ['needs_review', 'Needs Review', 'warn'],
    ['invalid', 'Ungültig', 'danger'],
  ];
  const toneColor = {
    success: 'text-emerald-700',
    info: 'text-bank-primary',
    neutral: 'text-bank-text',
    warn: 'text-amber-700',
    danger: 'text-red-700',
  };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {entries.map(([k, l, tone]) => (
        <div key={k} data-testid={`${testidPrefix}-${k}`} className="border border-bank-border bg-white p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{l}</p>
          <p className={`mt-1 font-display text-[1.4rem] font-light tabular-nums ${toneColor[tone]}`}>
            {counts?.[k] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}

function DiffTable({ diffs }) {
  if (!diffs?.length) return null;
  return (
    <div className="overflow-x-auto border border-bank-border/70">
      <table className="w-full text-sm">
        <thead className="bg-bank-bg/50">
          <tr>
            <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Aktion</th>
            <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Bank</th>
            <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Produkt</th>
            <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Änderungen</th>
            <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Review?</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((d, i) => (
            <tr key={i} className={d.action === 'invalid' ? 'bg-red-50/70' : d.needs_review ? 'bg-amber-50/50' : ''}>
              <td className="border-b border-bank-border/40 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
                {d.action}
              </td>
              <td className="border-b border-bank-border/40 px-3 py-2">{d.bank_slug || '—'}</td>
              <td className="border-b border-bank-border/40 px-3 py-2">
                {d.product_type ? `${d.product_type} · ${d.term_months ?? '–'} M` : '—'}
              </td>
              <td className="border-b border-bank-border/40 px-3 py-2 text-[12px] text-bank-text-muted">
                {d.action === 'invalid' ? (
                  <span className="font-mono text-red-700">{(d.errors || []).join('; ') || 'invalid'}</span>
                ) : d.changes?.length ? (
                  <ul>
                    {d.changes.map((c, j) => (
                      <li key={j}>
                        <span className="font-mono text-[10.5px] uppercase text-bank-text-muted">{c.field}</span>{' '}
                        <span className="line-through decoration-red-400/60">{String(c.before ?? '—')}</span>{' '}
                        → <span className="font-medium text-bank-text">{String(c.after ?? '—')}</span>
                        {c.field === 'interest_rate' && typeof c.delta_pp === 'number' ? (
                          <span className="ml-1 text-[11px] text-bank-text-muted">(Δ {c.delta_pp} pp)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </td>
              <td className="border-b border-bank-border/40 px-3 py-2">
                {d.needs_review ? (
                  <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-800">
                    <AlertTriangle size={11} /> ja
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-bank-text-muted">nein</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminSavingsImport() {
  const [sourceSlug, setSourceSlug] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [verification, setVerification] = useState('manual_review');
  const [rawText, setRawText] = useState('');
  const [format, setFormat] = useState('json'); // json | csv
  const [step, setStep] = useState('upload');
  const [dryRun, setDryRun] = useState(null);
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);

  const parseError = useMemo(() => {
    if (!rawText.trim()) return null;
    if (format !== 'json') return null;
    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) return 'JSON muss ein Array sein.';
      return null;
    } catch (err) {
      return `JSON ungültig: ${err.message}`;
    }
  }, [rawText, format]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    setRawText(txt);
    setFormat(file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json');
    setStep('validate');
    toast.success(`Datei geladen (${(txt.length / 1024).toFixed(1)} KB).`);
  };

  const buildPayload = () => {
    const base = {
      source_slug: sourceSlug.trim(),
      source_url: sourceUrl.trim() || null,
      verification_method: verification.trim() || 'manual_review',
    };
    if (format === 'csv') return { ...base, csv_text: rawText };
    return { ...base, records: JSON.parse(rawText) };
  };

  const runDryRun = useCallback(async () => {
    if (!sourceSlug.trim()) {
      toast.error('source_slug ist Pflicht.');
      return;
    }
    if (parseError) {
      toast.error(parseError);
      return;
    }
    setBusy(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.post(
        `${_api}/api/admin/imports/savings-offers/dry-run`,
        buildPayload(),
        { withCredentials: true },
      );
      setDryRun(data);
      setApplied(null);
      setStep('preview');
      toast.success(`Dry-Run OK: ${data.records_received} Records.`);
    } catch (err) {
      console.error('dry-run', err);
      toast.error(err?.response?.data?.detail || 'Dry-Run fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSlug, sourceUrl, verification, rawText, format, parseError]);

  const applyImport = useCallback(async () => {
    if (!dryRun) return;
    if (!window.confirm('Änderungen jetzt in die Datenbank schreiben?')) return;
    setBusy(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.post(
        `${_api}/api/admin/imports/savings-offers/apply`,
        buildPayload(),
        { withCredentials: true },
      );
      setApplied(data);
      setStep('apply');
      toast.success(`Import angewendet · Run-ID ${data.import_run_id}`);
    } catch (err) {
      console.error('apply', err);
      toast.error(err?.response?.data?.detail || 'Apply fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryRun, sourceSlug, sourceUrl, verification, rawText, format]);

  const canDryRun = sourceSlug.trim() && rawText.trim() && !parseError;
  const invalidCount = dryRun?.counts?.invalid ?? 0;

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Daten-Import"
        titleIcon={Upload}
        description="JSON- oder CSV-Import mit obligatorischem Dry-Run und Diff-Preview vor jedem Publish. Kein automatisches Web-Scraping."
      />

      <AdminToolbarCard>
        <StepBar current={step} />
      </AdminToolbarCard>

      <AdminSurfaceCard>
        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                Source Slug*
              </label>
              <Input
                value={sourceSlug}
                onChange={(e) => setSourceSlug(e.target.value)}
                placeholder="z. B. bunq_official_2026_02"
                data-testid="import-source-slug"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                Source URL (öffentlich)
              </label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                data-testid="import-source-url"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                Verification Method
              </label>
              <Input
                value={verification}
                onChange={(e) => setVerification(e.target.value)}
                placeholder="manual_review"
                data-testid="import-verification"
              />
            </div>
          </div>
          <div className="space-y-3 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer border border-bank-border bg-white px-3 py-2 text-sm hover:border-bank-gold/55">
                <FileText size={14} className="mr-1 inline" />
                Datei wählen
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={onFile}
                  className="hidden"
                  data-testid="import-file-input"
                />
              </label>
              <div className="inline-flex overflow-hidden border border-bank-border">
                {['json', 'csv'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    data-testid={`import-format-${f}`}
                    className={`px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.18em] ${
                      format === f ? 'bg-bank-ink text-white' : 'bg-white text-bank-text-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {parseError ? (
                <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-1 font-mono text-[11px] text-red-700">
                  <AlertTriangle size={12} /> {parseError}
                </span>
              ) : rawText ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-bank-text-muted">
                  <CheckCircle2 size={12} className="text-emerald-600" /> {rawText.length.toLocaleString('de-DE')} Zeichen
                </span>
              ) : null}
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (step === 'upload' && e.target.value.trim()) setStep('validate');
              }}
              rows={12}
              placeholder={format === 'json' ? 'JSON-Array einfügen…' : 'CSV-Text einfügen (Header + Zeilen)…'}
              className="w-full border border-bank-border p-3 font-mono text-[12px] text-bank-text focus:border-bank-gold focus:outline-none"
              data-testid="import-raw-text"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={runDryRun}
                disabled={!canDryRun || busy}
                data-testid="import-dry-run-btn"
                className="gap-2"
              >
                <PlayCircle size={14} /> Dry-Run starten
              </Button>
              <span className="text-[11px] text-bank-text-muted">
                Änderungen werden erst nach expliziter Bestätigung geschrieben.
              </span>
            </div>
          </div>
        </div>
      </AdminSurfaceCard>

      {dryRun ? (
        <AdminSurfaceCard className="mt-6">
          <div className="border-b border-bank-border/70 px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Zusammenfassung</p>
            <h2 className="mt-2 font-display text-[1.15rem] font-light text-bank-text">
              Dry-Run · {dryRun.records_received} Datensätze
            </h2>
          </div>
          <div className="space-y-5 p-5">
            <CountsSummary counts={dryRun.counts} testidPrefix="dryrun-count" />
            <DiffTable diffs={dryRun.diffs} />
            <div className="flex flex-wrap items-center gap-3 border-t border-bank-border/60 pt-4">
              {invalidCount > 0 ? (
                <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-1 font-mono text-[11px] text-red-700">
                  <AlertTriangle size={12} /> {invalidCount} ungültige Datensätze — Apply bleibt möglich, ignoriert sie aber.
                </span>
              ) : null}
              <Button
                variant="primary"
                onClick={applyImport}
                disabled={busy}
                data-testid="import-apply-btn"
                className="gap-2"
              >
                <ShieldCheck size={14} /> Änderungen anwenden
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDryRun(null);
                  setApplied(null);
                  setStep(rawText ? 'validate' : 'upload');
                }}
                className="gap-2"
              >
                <RefreshCw size={14} /> Verwerfen
              </Button>
            </div>
          </div>
        </AdminSurfaceCard>
      ) : null}

      {applied ? (
        <AdminSurfaceCard className="mt-6">
          <div className="border-b border-bank-border/70 px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Publish</p>
            <h2 className="mt-2 font-display text-[1.15rem] font-light text-bank-text">
              Import angewendet · Run <span className="font-mono">{applied.import_run_id}</span>
            </h2>
          </div>
          <div className="space-y-3 p-5 text-sm text-bank-text-muted">
            <div className="flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-2"><Database size={12} /> Neu: {applied.applied?.created ?? 0}</span>
              <span className="inline-flex items-center gap-2"><Database size={12} /> Geändert: {applied.applied?.updated ?? 0}</span>
              <span className="inline-flex items-center gap-2"><Database size={12} /> Unverändert: {applied.applied?.unchanged ?? 0}</span>
              <span className="inline-flex items-center gap-2"><Clock size={12} /> {applied.started_at} → {applied.finished_at}</span>
            </div>
            <p className="text-[12px] text-bank-text-muted">
              Kritische Änderungen landen automatisch in der Review-Queue.
            </p>
          </div>
        </AdminSurfaceCard>
      ) : null}
    </AdminSubpageLayout>
  );
}

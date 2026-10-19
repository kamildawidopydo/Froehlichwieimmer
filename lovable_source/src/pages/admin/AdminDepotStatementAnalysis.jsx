import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileSearch, Upload, RefreshCw, Sparkles, X, AlertTriangle } from 'lucide-react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const TEXT_TYPES = ['text/plain', 'text/csv'];

const fmtMoney = (v, cur = 'EUR') =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: /^[A-Z]{3}$/.test(cur) ? cur : 'EUR' });
const fmtNum = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: 4 }));
const fmtPct = (v) => (v == null ? '–' : `${Number(v).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`);

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const AdminDepotStatementAnalysis = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const inputRef = useRef(null);

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error('Die Datei ist größer als 10 MB.');
    if (TEXT_TYPES.includes(f.type) || /\.(csv|txt)$/i.test(f.name)) {
      setText(await f.text());
      setFile(null);
      return;
    }
    if (!FILE_TYPES.includes(f.type)) return toast.error('Bitte PDF, Bild (PNG/JPG/WebP), CSV oder Text verwenden.');
    setFile(f);
  };

  const run = async () => {
    setError('');
    setAnalysis(null);
    let body;
    if (file) {
      body = { file_base64: await readAsBase64(file), media_type: file.type, filename: file.name };
    } else if (text.trim().length >= 20) {
      body = { text };
    } else {
      setError('Bitte einen Depotauszug hochladen oder den Text einfügen.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/depot-statement-analysis', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.detail || `Fehler ${resp.status}`);
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message || 'Die Auswertung ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const a = analysis;
  const cur = a?.currency || 'EUR';

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Vermögen & Depot"
        title="Depotauszug-Analyse"
        titleIcon={FileSearch}
        description="Depotauszug hochladen – Lovable AI fasst Positionen und Vermögensaufteilung zusammen. Die Datei wird nicht gespeichert."
      />

      <AdminSurfaceCard>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt" className="hidden" onChange={onPickFile} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => inputRef.current?.click()} disabled={loading}>
              <Upload size={15} /> Datei wählen
            </Button>
            {file && (
              <span className="inline-flex items-center gap-2 rounded-md border border-bank-border px-3 py-1.5 text-sm text-bank-text">
                {file.name}
                <button type="button" aria-label="Datei entfernen" onClick={() => setFile(null)} className="text-bank-text-muted hover:text-bank-text">
                  <X size={14} />
                </button>
              </span>
            )}
            <span className="text-xs text-bank-text-muted">PDF, Bild, CSV oder Text · max. 10 MB</span>
          </div>
          {!file && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="…oder den Text des Depotauszugs hier einfügen"
              className="w-full rounded-md border border-bank-border bg-white p-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary dark:bg-bank-surface"
            />
          )}
          <div className="flex items-center gap-3">
            <Button type="button" onClick={run} disabled={loading} className="gap-2 bg-bank-ink text-white hover:bg-bank-ink-elev">
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? 'Wird ausgewertet …' : 'Auswerten'}
            </Button>
            {loading && <span className="text-xs text-bank-text-muted">Das kann bis zu einer Minute dauern.</span>}
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-bank-error/25 bg-bank-error/10 p-3 text-sm text-bank-text">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-bank-error" /> {error}
            </div>
          )}
        </div>
      </AdminSurfaceCard>

      {a && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['Depotinhaber', a.depot_holder || '–'],
              ['Stichtag', a.statement_date || '–'],
              ['Gesamtwert', fmtMoney(a.total_value, cur)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-bank-border bg-white p-5 shadow-sm dark:bg-bank-surface">
                <p className="mb-1 text-sm text-bank-text-muted">{k}</p>
                <p className="text-xl font-bold text-bank-text">{v}</p>
              </div>
            ))}
          </div>

          <AdminSurfaceCard>
            <div className="p-5">
              <h2 className="mb-2 text-base font-semibold text-bank-text">Zusammenfassung</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-bank-text">{a.summary}</p>
              {a.observations?.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-bank-text">
                  {a.observations.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              )}
            </div>
          </AdminSurfaceCard>

          {a.allocation?.length > 0 && (
            <AdminSurfaceCard>
              <div className="p-5">
                <h2 className="mb-4 text-base font-semibold text-bank-text">Vermögensaufteilung</h2>
                <div className="space-y-3">
                  {[...a.allocation].sort((x, y) => y.percent - x.percent).map((row) => (
                    <div key={row.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-bank-text">{row.category}</span>
                        <span className="text-bank-text-muted">{fmtPct(row.percent)} · {fmtMoney(row.value, cur)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bank-border/40">
                        <div className="h-full rounded-full bg-bank-gold" style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AdminSurfaceCard>
          )}

          <AdminSurfaceCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={adminTheadClass}>
                  <tr>
                    {['Position', 'ISIN', 'Anlageklasse', 'Stück', 'Kurswert', 'Anteil'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-sm font-semibold text-bank-text-muted ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.positions.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-bank-text-muted">Keine Positionen erkannt.</td></tr>
                  ) : a.positions.map((p, i) => (
                    <tr key={i} className={`border-b border-bank-border/80 ${adminRowHover}`}>
                      <td className="px-4 py-3 text-sm font-medium text-bank-text">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-bank-text-muted">{p.isin || '–'}</td>
                      <td className="px-4 py-3 text-sm text-bank-text-muted">{p.asset_class}</td>
                      <td className="px-4 py-3 text-right text-sm text-bank-text">{fmtNum(p.quantity)}</td>
                      <td className="px-4 py-3 text-right text-sm text-bank-text">{fmtMoney(p.market_value, cur)}</td>
                      <td className="px-4 py-3 text-right text-sm text-bank-text">{fmtPct(p.weight_percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSurfaceCard>

          {a.data_quality_notes?.length > 0 && (
            <div className="rounded-md border border-bank-border bg-bank-bg p-4 text-sm text-bank-text-muted">
              <p className="mb-1 font-medium text-bank-text">Hinweise zur Datenqualität</p>
              <ul className="list-disc space-y-1 pl-5">{a.data_quality_notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-bank-text-muted">KI-gestützte Auswertung – bitte vor Weitergabe mit dem Originalauszug abgleichen. Keine Anlageberatung.</p>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminDepotStatementAnalysis;

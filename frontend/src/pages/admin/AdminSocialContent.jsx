import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, PlayCircle, CheckCircle2, XCircle, Clock, Edit3, Send, ShieldCheck, ShieldAlert, ExternalLink, PlaySquare } from 'lucide-react';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

const STATUS_TONE = {
  draft: 'bg-neutral-100 text-neutral-800 border-neutral-300',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  scheduled: 'bg-sky-50 text-sky-800 border-sky-300',
  rejected: 'bg-red-50 text-red-800 border-red-300',
  publishing: 'bg-amber-50 text-amber-800 border-amber-300',
  published: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  publish_failed: 'bg-red-100 text-red-900 border-red-400',
};

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const AdminSocialContent = () => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [busyIds, setBusyIds] = useState({});
  const [editing, setEditing] = useState({});
  const [scheduling, setScheduling] = useState({});
  const [err, setErr] = useState('');
  // Session 80.1 — LinkedIn Provider
  const [provider, setProvider] = useState(null);
  const [providerProbe, setProviderProbe] = useState(null);
  const [dryRun, setDryRun] = useState({});
  const [publishConfirm, setPublishConfirm] = useState({});

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [res, prov] = await Promise.all([
        api.get('/admin/social-content?limit=100'),
        api.get('/admin/social-content/provider/status'),
      ]);
      setItems(res.data.items || []);
      setProvider(prov.data.config || null);
      setState('ready');
      setErr('');
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
      setState('error');
    }
  }, []);

  const runProbe = async () => {
    try {
      const r = await api.get('/admin/social-content/provider/status?probe=true');
      setProviderProbe(r.data.probe);
    } catch (e) {
      setProviderProbe({ error: e?.response?.data?.detail || e.message });
    }
  };

  useEffect(() => { load(); }, [load]);

  const setBusy = (id, v) => setBusyIds((b) => ({ ...b, [id]: v }));

  const withBusy = (id, fn) => async () => {
    if (busyIds[id]) return;
    setBusy(id, true);
    try { await fn(); await load(); } finally { setBusy(id, false); }
  };

  const runCron = async () => {
    setState('loading');
    try { await api.post('/admin/social-content/generate?limit=5'); await load(); }
    catch (e) { setErr(e?.response?.data?.detail || e.message); setState('error'); }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10" data-testid="admin-social-content-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-bank-text">LinkedIn Editorial Queue</h1>
          <p className="mt-1 text-[13px] text-bank-text-muted">
            Automatisch generierte LinkedIn-Draft-Entwürfe aus neuen Fröhlich-Artikeln.
            Freigabe erfolgt manuell — keine automatische Veröffentlichung.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            data-testid="admin-social-refresh"
            className="inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text hover:border-bank-primary"
          >
            <RefreshCw size={12} strokeWidth={1.7} /> Refresh
          </button>
          <button
            type="button"
            onClick={runCron}
            data-testid="admin-social-generate"
            className="inline-flex items-center gap-1.5 rounded border border-bank-primary bg-bank-primary px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white hover:bg-bank-primary-strong"
          >
            <PlayCircle size={12} strokeWidth={1.7} /> Generate now
          </button>
        </div>
      </div>

      {state === 'error' && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          Fehler: {err || 'unbekannt'}
        </p>
      )}

      {/* Session 80.1 — LinkedIn Provider-Kachel */}
      {provider && (
        <section
          data-testid="linkedin-provider-tile"
          className={`mb-6 rounded border px-4 py-3 ${provider.configured ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-300 bg-neutral-50'}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {provider.configured
                ? <ShieldCheck size={16} className="text-emerald-700" strokeWidth={1.7} />
                : <ShieldAlert size={16} className="text-neutral-600" strokeWidth={1.7} />}
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                LinkedIn · {provider.configured ? 'konfiguriert' : 'nicht konfiguriert'}
              </span>
              <span className="ml-2 text-[12px] text-bank-text-muted">
                API: {provider.api_version} · Auto-Publish: {provider.auto_publish_enabled ? 'AN' : 'AUS'}
                {provider.organization_urn ? ` · Org: ${provider.organization_urn}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={runProbe}
              data-testid="linkedin-probe-btn"
              className="rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] hover:border-bank-primary"
            >
              Live-Probe
            </button>
          </div>
          {providerProbe && (
            <p className="mt-2 text-[12px] text-bank-text-muted" data-testid="linkedin-probe-result">
              Probe: token_valid={String(providerProbe.token_valid)}
              · scopes_ok={String(providerProbe.scopes_ok)}
              · org_accessible={String(providerProbe.organization_accessible)}
              {providerProbe.error ? ` · error=${providerProbe.error}` : ''}
            </p>
          )}
        </section>
      )}
      {state === 'loading' && <p className="text-[13px] text-bank-text-muted">Lädt …</p>}
      {state === 'ready' && items.length === 0 && (
        <p className="rounded border border-bank-border bg-bank-panel px-4 py-6 text-center text-[13px] text-bank-text-muted">
          Noch keine Drafts. Klick auf „Generate now", um Kandidaten zu erzeugen.
        </p>
      )}

      <div className="space-y-4">
        {items.map((it) => {
          const isBusy = !!busyIds[it.id];
          const isEditing = editing[it.id] !== undefined;
          const isScheduling = scheduling[it.id] !== undefined;
          return (
            <section
              key={it.id}
              data-testid={`admin-social-item-${it.id}`}
              className="rounded border border-bank-border bg-white p-4 shadow-editorial-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${STATUS_TONE[it.status] || STATUS_TONE.draft}`}
                    data-testid={`admin-social-status-${it.id}`}
                  >
                    {it.status}
                  </span>
                  <h3 className="mt-2 font-serif text-lg text-bank-text">{it.article_title}</h3>
                  <p className="text-[12px] text-bank-text-muted">
                    Slug: <a href={it.canonical_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-bank-primary">{it.article_slug}</a>
                    · Kategorie: {it.article_category || '—'}
                    · erzeugt: {fmt(it.generated_at)}
                    · Modell: <code className="text-[11px]">{it.generation_model}</code>
                  </p>
                  {it.scheduled_at && (
                    <p className="text-[12px] text-sky-800">Geplant für: {fmt(it.scheduled_at)}</p>
                  )}
                  {it.approved_at && (
                    <p className="text-[12px] text-emerald-800">Freigegeben von {it.approved_by} am {fmt(it.approved_at)}</p>
                  )}
                  {it.published_at && (
                    <p className="text-[12px] text-emerald-900" data-testid={`admin-social-published-${it.id}`}>
                      Veröffentlicht am {fmt(it.published_at)}
                      {it.external_post_url && (
                        <a href={it.external_post_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline hover:text-bank-primary">
                          <ExternalLink size={11} /> Auf LinkedIn ansehen
                        </a>
                      )}
                    </p>
                  )}
                  {it.publish_error && (
                    <p className="text-[12px] text-red-800" data-testid={`admin-social-publish-error-${it.id}`}>
                      Publish-Fehler: {it.publish_error} · Versuche: {it.publish_attempts}
                    </p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  data-testid={`admin-social-editor-${it.id}`}
                  className="mt-3 w-full rounded border border-bank-border bg-white p-3 font-mono text-[13px] text-bank-text"
                  rows={10}
                  value={editing[it.id]}
                  onChange={(e) => setEditing({ ...editing, [it.id]: e.target.value })}
                />
              ) : (
                <pre className="mt-3 whitespace-pre-wrap rounded bg-bank-panel p-3 font-sans text-[13px] leading-relaxed text-bank-text">
                  {it.draft_text}
                </pre>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={withBusy(it.id, async () => {
                        await api.patch(`/admin/social-content/${it.id}`, { draft_text: editing[it.id] });
                        const next = { ...editing }; delete next[it.id]; setEditing(next);
                      })}
                      className="rounded border border-bank-primary bg-bank-primary px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => { const n = { ...editing }; delete n[it.id]; setEditing(n); }}
                      className="rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em]"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, [it.id]: it.draft_text })}
                    disabled={isBusy || it.status === 'approved' || it.status === 'scheduled'}
                    data-testid={`admin-social-edit-${it.id}`}
                    className="inline-flex items-center gap-1 rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] hover:border-bank-primary disabled:opacity-40"
                  >
                    <Edit3 size={11} /> Bearbeiten
                  </button>
                )}

                <button
                  type="button"
                  onClick={withBusy(it.id, () => api.post(`/admin/social-content/${it.id}/regenerate`))}
                  disabled={isBusy || it.status === 'approved' || it.status === 'scheduled'}
                  data-testid={`admin-social-regen-${it.id}`}
                  className="inline-flex items-center gap-1 rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] hover:border-bank-primary disabled:opacity-40"
                >
                  <RefreshCw size={11} /> Regenerieren
                </button>

                {it.status !== 'approved' && it.status !== 'scheduled' && (
                  <button
                    type="button"
                    onClick={withBusy(it.id, () => api.post(`/admin/social-content/${it.id}/approve`))}
                    disabled={isBusy}
                    data-testid={`admin-social-approve-${it.id}`}
                    className="inline-flex items-center gap-1 rounded border border-emerald-600 bg-emerald-600 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={11} /> Freigeben
                  </button>
                )}

                {it.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={withBusy(it.id, () => api.post(`/admin/social-content/${it.id}/reject`))}
                    disabled={isBusy}
                    data-testid={`admin-social-reject-${it.id}`}
                    className="inline-flex items-center gap-1 rounded border border-red-500 bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle size={11} /> Ablehnen
                  </button>
                )}

                {(it.status === 'approved' || it.status === 'scheduled') && (
                  isScheduling ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduling[it.id]}
                        onChange={(e) => setScheduling({ ...scheduling, [it.id]: e.target.value })}
                        className="rounded border border-bank-border bg-white px-2 py-1 text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={withBusy(it.id, async () => {
                          const iso = new Date(scheduling[it.id]).toISOString();
                          await api.post(`/admin/social-content/${it.id}/schedule`, { scheduled_at: iso });
                          const n = { ...scheduling }; delete n[it.id]; setScheduling(n);
                        })}
                        className="rounded border border-sky-600 bg-sky-600 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
                      >
                        Setzen
                      </button>
                      <button
                        type="button"
                        onClick={() => { const n = { ...scheduling }; delete n[it.id]; setScheduling(n); }}
                        className="rounded border border-bank-border bg-white px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em]"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setScheduling({ ...scheduling, [it.id]: '' })}
                      data-testid={`admin-social-schedule-${it.id}`}
                      className="inline-flex items-center gap-1 rounded border border-sky-600 bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-sky-700 hover:bg-sky-50"
                    >
                      <Clock size={11} /> Termin
                    </button>
                  )
                )}

                {/* Session 80.1 — Dry-Run + realer Publish (letzterer geblockt wenn Provider nicht konfiguriert) */}
                {it.status === 'scheduled' && !it.external_post_id && (
                  <>
                    <button
                      type="button"
                      onClick={withBusy(it.id, async () => {
                        const r = await api.post(`/admin/social-content/${it.id}/publish?dry_run=true`);
                        setDryRun({ ...dryRun, [it.id]: r.data });
                      })}
                      disabled={isBusy}
                      data-testid={`admin-social-dryrun-${it.id}`}
                      className="inline-flex items-center gap-1 rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] hover:border-bank-primary disabled:opacity-40"
                    >
                      <PlaySquare size={11} /> Dry-Run
                    </button>
                    {publishConfirm[it.id] ? (
                      <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-2 py-1">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-red-800">
                          Echt veröffentlichen?
                        </span>
                        <button
                          type="button"
                          onClick={withBusy(it.id, async () => {
                            const n = { ...publishConfirm }; delete n[it.id]; setPublishConfirm(n);
                            await api.post(`/admin/social-content/${it.id}/publish?dry_run=false`);
                          })}
                          disabled={!provider?.configured}
                          data-testid={`admin-social-publish-confirm-${it.id}`}
                          className="rounded border border-red-700 bg-red-700 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
                        >
                          Ja, jetzt
                        </button>
                        <button
                          type="button"
                          onClick={() => { const n = { ...publishConfirm }; delete n[it.id]; setPublishConfirm(n); }}
                          className="rounded border border-bank-border bg-white px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em]"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!provider?.configured || isBusy}
                        onClick={() => setPublishConfirm({ ...publishConfirm, [it.id]: true })}
                        data-testid={`admin-social-publish-btn-${it.id}`}
                        title={provider?.configured ? 'Sofort veröffentlichen' : 'LinkedIn-Provider ist nicht konfiguriert'}
                        className="inline-flex items-center gap-1 rounded border border-red-700 bg-red-700 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send size={11} /> Jetzt veröffentlichen
                      </button>
                    )}
                  </>
                )}
              </div>

              {dryRun[it.id] && (
                <div className={`mt-3 rounded border px-3 py-2 text-[12px] ${dryRun[it.id].ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  Dry-Run: {dryRun[it.id].ok ? 'OK — Payload valide, Provider bereit.' : `Blockiert: ${(dryRun[it.id].issues || []).join(', ')}`}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSocialContent;

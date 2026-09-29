// Session 93 · Phase 5 — Datenquellen (CRUD + Monitoring).
// `trusted` wird NIE automatisch gesetzt — der Admin muss die Freischaltung explizit vornehmen.
import React, { useEffect, useState, useCallback } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  RefreshCw, Database, Plus, X, ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle,
} from 'lucide-react';

const SOURCE_TYPES = [
  'official_bank',
  'official_document',
  'partner_feed',
  'manual_verified',
  'api',
  'import',
  'demo_seed',
];

const TRUST_LEVELS = [
  { key: 'review_required', label: 'Review erforderlich', tone: 'warn' },
  { key: 'manual', label: 'Manuell verwaltet', tone: 'neutral' },
  { key: 'trusted', label: 'Trusted (Auto-Publish)', tone: 'danger' },
];

function TrustBadge({ level }) {
  const t = TRUST_LEVELS.find((x) => x.key === level) || { label: level, tone: 'neutral' };
  const cls =
    t.tone === 'danger'
      ? 'border-red-300 bg-red-50 text-red-700'
      : t.tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-bank-border bg-bank-bg/40 text-bank-text-muted';
  const Icon = t.tone === 'danger' ? ShieldAlert : t.tone === 'warn' ? ShieldQuestion : ShieldCheck;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] ${cls}`}>
      <Icon size={11} /> {t.label}
    </span>
  );
}

const EMPTY = {
  slug: '',
  name: '',
  type: 'manual_verified',
  provider: '',
  source_url: '',
  trust_level: 'review_required',
  country_code: '',
};

export default function AdminSavingsSources() {
  const [sources, setSources] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [trustConfirm, setTrustConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const [{ data: srcs }, { data: mon }] = await Promise.all([
        _axios.get(`${_api}/api/admin/savings/data-sources`, { withCredentials: true }),
        _axios.get(`${_api}/api/admin/savings/source-monitoring`, { withCredentials: true }),
      ]);
      setSources(srcs?.items || []);
      setMonitoring(mon?.items || []);
    } catch (err) {
      console.error('sources', err);
      toast.error('Datenquellen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monBySlug = new Map(monitoring.map((m) => [m.slug, m]));

  const openAdd = () => {
    setForm(EMPTY);
    setTrustConfirm(false);
    setShowModal(true);
  };

  const openEdit = (src) => {
    setForm({
      slug: src.slug || '',
      name: src.name || '',
      type: src.type || 'manual_verified',
      provider: src.provider || '',
      source_url: src.source_url || '',
      trust_level: src.trust_level || 'review_required',
      country_code: src.country_code || '',
    });
    setTrustConfirm(false);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      toast.error('Slug und Name sind Pflicht.');
      return;
    }
    if (form.trust_level === 'trusted' && !trustConfirm) {
      toast.error('Trusted-Status muss explizit bestätigt werden.');
      return;
    }
    setSaving(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.post(
        `${_api}/api/admin/savings/data-sources`,
        { ...form, source_url: form.source_url || null, provider: form.provider || null, country_code: form.country_code || null },
        { withCredentials: true },
      );
      toast.success('Datenquelle gespeichert.');
      setShowModal(false);
      await load();
    } catch (err) {
      console.error('save source', err);
      toast.error(err?.response?.data?.detail || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Datenquellen"
        titleIcon={Database}
        description="Alle Import-Quellen inkl. Trust-Level und Monitoring. Trusted-Freischaltung erfolgt nur manuell und explizit."
      />

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            <span>{sources.length} Quellen</span>
            <span>·</span>
            <span>{monitoring.reduce((s, m) => s + (m.review_count || 0), 0)} offene Reviews gesamt</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
            </Button>
            <Button variant="primary" onClick={openAdd} data-testid="sources-add-btn" className="gap-2">
              <Plus size={14} /> Quelle hinzufügen
            </Button>
          </div>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-bank-text-muted/70" />
            <p className="text-sm text-bank-text-muted">Lade Datenquellen…</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="py-16 text-center text-sm text-bank-text-muted">Keine Datenquellen vorhanden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Slug / Name</th>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Trust-Level</th>
                  <th className="px-4 py-3 text-right">Offers</th>
                  <th className="px-4 py-3 text-right">Reviews</th>
                  <th className="px-4 py-3 text-left">Letzter Erfolg</th>
                  <th className="px-4 py-3 text-left">Letzter Fehler</th>
                  <th className="px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const m = monBySlug.get(s.slug) || {};
                  return (
                    <tr
                      key={s.slug}
                      data-testid={`source-row-${s.slug}`}
                      className={`border-b border-bank-border/70 ${adminRowHover}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-bank-text">{s.name}</p>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">{s.slug}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
                        {s.type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] ${
                            s.status === 'active'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-bank-border bg-bank-bg/40 text-bank-text-muted'
                          }`}
                        >
                          {s.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <TrustBadge level={s.trust_level || 'review_required'} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{m.offer_count ?? 0}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{m.review_count ?? 0}</td>
                      <td className="px-4 py-3 text-[12px] text-bank-text-muted">
                        {s.last_success_at ? new Date(s.last_success_at).toLocaleString('de-DE') : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-bank-text-muted">
                        {s.last_failure_at ? (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <AlertTriangle size={11} /> {new Date(s.last_failure_at).toLocaleString('de-DE')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => openEdit(s)} data-testid={`source-edit-${s.slug}`}>
                          Bearbeiten
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg border border-bank-border bg-white shadow-editorial-lg">
            <div className="flex items-center justify-between border-b border-bank-border px-5 py-3">
              <h3 className="font-display text-lg text-bank-text">Datenquelle</h3>
              <button onClick={() => setShowModal(false)} aria-label="Schliessen" className="text-bank-text-muted hover:text-bank-text">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Slug*</span>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} data-testid="source-form-slug" />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Name*</span>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="source-form-name" />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Typ</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border border-bank-border bg-white px-3 py-2 text-sm focus:border-bank-gold focus:outline-none"
                  data-testid="source-form-type"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Provider (optional)</span>
                <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Source URL (öffentlich)</span>
                <Input
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="https://…"
                  data-testid="source-form-url"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Land (ISO-2)</span>
                <Input value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} maxLength={2} />
              </label>
              <label className="block">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Trust-Level</span>
                <select
                  value={form.trust_level}
                  onChange={(e) => {
                    setForm({ ...form, trust_level: e.target.value });
                    if (e.target.value !== 'trusted') setTrustConfirm(false);
                  }}
                  className="mt-1 w-full border border-bank-border bg-white px-3 py-2 text-sm focus:border-bank-gold focus:outline-none"
                  data-testid="source-form-trust"
                >
                  {TRUST_LEVELS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </label>
              {form.trust_level === 'trusted' ? (
                <label className="flex items-start gap-2 border border-red-300 bg-red-50 p-3 text-[12px] text-red-800">
                  <input
                    type="checkbox"
                    checked={trustConfirm}
                    onChange={(e) => setTrustConfirm(e.target.checked)}
                    data-testid="source-form-trust-confirm"
                  />
                  <span>
                    Ich verstehe, dass „Trusted" Auto-Publish ohne Review bedeutet und die Quelle
                    verifiziert ist. Ohne Bestätigung wird gespeichert als „review_required".
                  </span>
                </label>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-bank-border bg-bank-bg/40 px-5 py-3">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Abbrechen</Button>
              <Button variant="primary" onClick={save} disabled={saving} data-testid="source-form-save">
                Speichern
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminSubpageLayout>
  );
}

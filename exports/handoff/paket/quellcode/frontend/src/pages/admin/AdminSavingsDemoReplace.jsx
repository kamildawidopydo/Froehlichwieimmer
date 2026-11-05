// Session 93 · Phase 5 — Demo → Real Replacement.
// Side-by-Side-Vergleich DEMO ↔ REAL. Aktivierung nur, wenn Backend-Validierung
// (Diff-Pipeline) erfolgreich ist. Fehlerhafte Records lösen KEINE Aktivierung aus
// und die Deaktivierung des Demo-Angebots wird server-seitig zurückgerollt.
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowRightLeft, ShieldCheck, RefreshCw, AlertTriangle, Search } from 'lucide-react';

const COMPARE_FIELDS = [
  ['bank_slug', 'Bank'],
  ['product_type', 'Produkt-Typ'],
  ['product_name', 'Produktname'],
  ['interest_rate', 'Zinssatz (%)'],
  ['promo_rate', 'Promo-Zinssatz (%)'],
  ['promo_duration_months', 'Promo-Dauer (M)'],
  ['standard_rate_after_promo', 'Standard-Zins nach Promo'],
  ['term_months', 'Laufzeit (M)'],
  ['min_amount', 'Min-Einlage'],
  ['max_amount', 'Max-Einlage'],
  ['currency', 'Währung'],
  ['country', 'Bankland'],
  ['deposit_guarantee_country', 'DGS-Land'],
];

async function fetchDemoOffers(search) {
  const _axios = (await import('axios')).default;
  const _api = (await import('@/lib/apiBase')).getApiBase();
  const params = new URLSearchParams({ data_status: 'demo', limit: '100' });
  if (search) params.set('search', search);
  const { data } = await _axios.get(`${_api}/api/public/savings-offers?${params}`, {
    withCredentials: true,
  });
  return data?.items || [];
}

function toReadable(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('de-DE');
  return String(v);
}

export default function AdminSavingsDemoReplace() {
  const [search, setSearch] = useState('');
  const [demoOffers, setDemoOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [realJson, setRealJson] = useState('');
  const [sourceSlug, setSourceSlug] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [verification, setVerification] = useState('manual_review');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDemoOffers(search);
      setDemoOffers(items);
    } catch (err) {
      console.error('demo offers', err);
      toast.error('Demo-Angebote konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => demoOffers.find((o) => o.id === selectedId), [demoOffers, selectedId]);

  const seedRealFromDemo = () => {
    if (!selected) return;
    const seed = {};
    for (const [key] of COMPARE_FIELDS) {
      if (selected[key] !== undefined && selected[key] !== null) seed[key] = selected[key];
    }
    seed.bank_slug = selected.bank_slug || selected.banks?.slug;
    setRealJson(JSON.stringify(seed, null, 2));
  };

  const realParsed = useMemo(() => {
    if (!realJson.trim()) return null;
    try {
      return JSON.parse(realJson);
    } catch {
      return null;
    }
  }, [realJson]);

  const runReplace = useCallback(async () => {
    if (!selected) {
      toast.error('Bitte Demo-Angebot auswählen.');
      return;
    }
    if (!realParsed) {
      toast.error('Real-Record muss gültiges JSON sein.');
      return;
    }
    if (!sourceSlug.trim()) {
      toast.error('source_slug ist Pflicht.');
      return;
    }
    if (!window.confirm('Demo-Angebot deaktivieren und Real-Datensatz aktivieren?')) return;
    setBusy(true);
    setResult(null);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.post(
        `${_api}/api/admin/savings/demo-replace`,
        {
          demo_offer_id: selected.id,
          real_record: realParsed,
          source_slug: sourceSlug.trim(),
          source_url: sourceUrl.trim() || null,
          verification_method: verification.trim() || 'manual_review',
        },
        { withCredentials: true },
      );
      setResult(data);
      toast.success(`Real-Angebot aktiviert · Demo ${data.deactivated_demo_id} deaktiviert.`);
      await load();
      setSelectedId(null);
      setRealJson('');
    } catch (err) {
      console.error('demo-replace', err);
      const msg = err?.response?.data?.detail;
      toast.error(
        typeof msg === 'string'
          ? msg
          : msg?.errors
          ? `Validation-Fehler: ${JSON.stringify(msg.errors)}`
          : 'Ersetzen fehlgeschlagen — Demo bleibt aktiv.',
      );
    } finally {
      setBusy(false);
    }
  }, [selected, realParsed, sourceSlug, sourceUrl, verification, load]);

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Demo → Real"
        titleIcon={ArrowRightLeft}
        description="Ersetzt ein Demo-Angebot durch einen verifizierten Real-Datensatz. Aktivierung erfolgt nur, wenn die Import-Pipeline valide zurückmeldet."
      />

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Demo-Angebot suchen (Bank / Slug)"
              className="pl-9"
              data-testid="demo-replace-search"
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </Button>
        </div>
      </AdminToolbarCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <AdminSurfaceCard className="lg:col-span-4">
          <div className="border-b border-bank-border/70 px-4 py-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Demo-Angebote</p>
            <h2 className="mt-1 text-sm font-medium text-bank-text">{demoOffers.length} Ergebnisse</h2>
          </div>
          <ul className="max-h-[600px] overflow-y-auto">
            {demoOffers.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => {
                    setSelectedId(o.id);
                    setResult(null);
                  }}
                  data-testid={`demo-offer-${o.id}`}
                  className={`w-full border-l-2 px-4 py-3 text-left text-sm transition-colors ${
                    selectedId === o.id
                      ? 'border-l-bank-gold bg-bank-bg/60 text-bank-text'
                      : 'border-l-transparent text-bank-text-muted hover:border-l-bank-border hover:bg-bank-bg/30'
                  }`}
                >
                  <p className="font-medium text-bank-text">{o.banks?.name || o.bank_slug}</p>
                  <p className="mt-0.5 text-[12px]">
                    {o.product_type} · {o.term_months ?? '–'} M · {o.interest_rate}%
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted/80">
                    {o.country_code} · demo
                  </p>
                </button>
              </li>
            ))}
            {!loading && demoOffers.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-bank-text-muted">Keine Demo-Angebote gefunden.</li>
            ) : null}
          </ul>
        </AdminSurfaceCard>

        <AdminSurfaceCard className="lg:col-span-8">
          {!selected ? (
            <div className="py-16 text-center text-sm text-bank-text-muted">
              Bitte links ein Demo-Angebot auswählen.
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Source Slug*</span>
                  <Input value={sourceSlug} onChange={(e) => setSourceSlug(e.target.value)} data-testid="demo-replace-source-slug" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Source URL (öffentlich)</span>
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" data-testid="demo-replace-source-url" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Verification</span>
                  <Input value={verification} onChange={(e) => setVerification(e.target.value)} data-testid="demo-replace-verification" />
                </label>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={seedRealFromDemo} className="gap-2" data-testid="demo-replace-seed-btn">
                  <ArrowRightLeft size={14} /> Aus Demo vorbelegen
                </Button>
                <span className="text-[11px] text-bank-text-muted">
                  Danach Zinssatz, Provenance und Änderungen manuell überschreiben.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="border border-bank-border/70">
                  <div className="border-b border-bank-border/70 bg-amber-50 px-4 py-2">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-amber-800">Demo</p>
                    <p className="mt-1 text-sm font-medium text-amber-900">{selected.banks?.name || selected.bank_slug}</p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {COMPARE_FIELDS.map(([k, l]) => (
                        <tr key={k}>
                          <td className="border-b border-bank-border/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">{l}</td>
                          <td className="border-b border-bank-border/40 px-3 py-1.5 text-bank-text">{toReadable(selected[k])}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="border-b border-bank-border/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">Quelle</td>
                        <td className="border-b border-bank-border/40 px-3 py-1.5 text-bank-text-muted">demo_seed</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">verified_at</td>
                        <td className="px-3 py-1.5 text-bank-text-muted">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-bank-border/70">
                  <div className="border-b border-bank-border/70 bg-emerald-50 px-4 py-2">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-emerald-800">Real Candidate</p>
                    <p className="mt-1 text-sm font-medium text-emerald-900">
                      {realParsed?.product_name || realParsed?.bank_slug || 'JSON eingeben →'}
                    </p>
                  </div>
                  {realParsed ? (
                    <table className="w-full text-sm">
                      <tbody>
                        {COMPARE_FIELDS.map(([k, l]) => (
                          <tr key={k} className={String(selected[k] ?? '') !== String(realParsed[k] ?? '') ? 'bg-amber-50/40' : ''}>
                            <td className="border-b border-bank-border/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">{l}</td>
                            <td className="border-b border-bank-border/40 px-3 py-1.5 text-bank-text">{toReadable(realParsed[k])}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border-b border-bank-border/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">Quelle</td>
                          <td className="border-b border-bank-border/40 px-3 py-1.5 text-bank-text">{sourceSlug || '—'}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">Verification</td>
                          <td className="px-3 py-1.5 text-bank-text">{verification || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-sm text-bank-text-muted">Real-JSON eingeben →</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Real-Record (JSON)*</span>
                  <textarea
                    value={realJson}
                    onChange={(e) => setRealJson(e.target.value)}
                    rows={12}
                    className="mt-1 w-full border border-bank-border p-3 font-mono text-[12px] text-bank-text focus:border-bank-gold focus:outline-none"
                    data-testid="demo-replace-real-json"
                  />
                </label>
                {realJson.trim() && !realParsed ? (
                  <span className="mt-2 inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-1 font-mono text-[11px] text-red-700">
                    <AlertTriangle size={12} /> JSON ungültig.
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-bank-border/60 pt-4">
                <Button
                  variant="primary"
                  onClick={runReplace}
                  disabled={busy || !realParsed || !sourceSlug.trim()}
                  data-testid="demo-replace-submit"
                  className="gap-2"
                >
                  <ShieldCheck size={14} /> Demo deaktivieren & Real aktivieren
                </Button>
                <span className="text-[11px] text-bank-text-muted">
                  Serverseitig validiert · Rollback bei Validation-Fehler garantiert.
                </span>
              </div>

              {result ? (
                <div className="mt-4 border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" data-testid="demo-replace-result">
                  <p className="font-medium">Erfolg</p>
                  <p className="mt-1 font-mono text-[11px]">
                    Erstellt {result.applied?.created ?? 0} · Geändert {result.applied?.updated ?? 0} · Deaktivierte Demo-ID {result.deactivated_demo_id}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </AdminSurfaceCard>
      </div>
    </AdminSubpageLayout>
  );
}

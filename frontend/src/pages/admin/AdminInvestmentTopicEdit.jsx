import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BASE = process.env.REACT_APP_BACKEND_URL;

const useAuthedApi = () => {
  return useMemo(() => {
    const client = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });
    client.interceptors.request.use(async (cfg) => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
      } catch {}
      return cfg;
    });
    return client;
  }, []);
};

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[12px] text-bank-text-muted">{hint}</span>}
  </label>
);

const AdminInvestmentTopicEdit = () => {
  const { slug } = useParams();
  const api = useAuthedApi();
  const nav = useNavigate();
  const [topic, setTopic] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [related, setRelated] = useState([]); // Array of {slug, title, category, published_at}
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/investment-topics/${encodeURIComponent(slug)}`);
        if (!alive) return;
        setTopic(data);
        setForm({
          category: data.category || '',
          overview_short: data.overview_short || '',
          image_url: data.image_url || '',
          headline: data.headline || '',
          teaser: data.teaser || '',
          enabled: !!data.enabled,
          priority: Number(data.priority || 0),
          display_delay_ms: Number(data.display_delay_ms || 35000),
          scroll_threshold_pct: Number(data.scroll_threshold_pct || 50),
          cooldown_days: Number(data.cooldown_days || 7),
        });
        // Related-News hydratisieren (Titel/Kategorie via public /news/by-slugs)
        const slugs = data.related_news_slugs || [];
        if (slugs.length) {
          const publicApi = axios.create({ baseURL: `${BASE}/api` });
          const { data: nd } = await publicApi.get('/news/by-slugs', { params: { slugs: slugs.join(',') } });
          // Reihenfolge aus data.related_news_slugs bewahren
          const bySlug = Object.fromEntries((nd.items || []).map((i) => [i.slug, i]));
          setRelated(slugs.map((s) => bySlug[s] || { slug: s, title: s, category: '', published_at: null, missing: true }));
        }
      } catch (err) {
        toast.error('Thema konnte nicht geladen werden.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchNews = async () => {
    setSearching(true);
    try {
      const { data } = await api.get('/admin/news-search', { params: { q: searchQ, limit: 12 } });
      setSearchResults(data?.items || []);
    } catch {
      toast.error('Suche fehlgeschlagen.');
    } finally {
      setSearching(false);
    }
  };

  const addNews = (art) => {
    if (related.length >= 6) {
      toast.error('Maximal 6 News-Zuordnungen erlaubt.');
      return;
    }
    if (related.find((r) => r.slug === art.slug)) return;
    setRelated((prev) => [...prev, art]);
  };
  const removeNews = (s) => setRelated((prev) => prev.filter((r) => r.slug !== s));
  const move = (idx, dir) => {
    setRelated((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, related_news_slugs: related.map((r) => r.slug) };
      await api.patch(`/admin/investment-topics/${encodeURIComponent(slug)}`, payload);
      toast.success('Änderungen gespeichert.');
    } catch (err) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-bank-text-muted"><Loader2 className="inline animate-spin" size={16} /> Wird geladen …</div>;
  }
  if (!topic) {
    return <div className="p-10 text-bank-text-muted">Thema nicht gefunden.</div>;
  }

  return (
    <div className="p-6 sm:p-10" data-testid="admin-topic-edit">
      <div className="mb-8">
        <Link to="/admin/investment-topics" className="inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted hover:text-bank-primary">
          <ArrowLeft size={12} /> Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 font-serif text-[28px] leading-tight text-bank-text">
          {topic.category || topic.slug}
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Slug: {topic.slug}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* BASIS */}
        <section className="space-y-5 border border-bank-border bg-white p-6">
          <h2 className="font-serif text-[20px] text-bank-text">Basis</h2>
          <Field label="Kategorie">
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                   data-testid="topic-edit-category"
                   className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
          </Field>
          <Field label="Overview-Text (Übersichtsseite)">
            <textarea rows={3} value={form.overview_short} onChange={(e) => setForm({ ...form, overview_short: e.target.value })}
                      data-testid="topic-edit-overview"
                      className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
          </Field>
          <Field label="Bild-URL">
            <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                   data-testid="topic-edit-image"
                   className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority (0–100)">
              <input type="number" min={0} max={100} value={form.priority}
                     onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                     data-testid="topic-edit-priority"
                     className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
            </Field>
            <Field label="Aktiv">
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.enabled}
                       onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                       data-testid="topic-edit-enabled"
                       className="h-4 w-4 accent-bank-primary" />
                <span className="text-[13.5px]">{form.enabled ? 'Aktiv' : 'Deaktiviert'}</span>
              </label>
              {!form.enabled && (
                <p className="mt-1 text-[11.5px] text-amber-700">
                  Das Thema wird aus /themen, Teaser und Cross-Links ausgeblendet.
                </p>
              )}
            </Field>
          </div>
        </section>

        {/* TEASER */}
        <section className="space-y-5 border border-bank-border bg-white p-6">
          <h2 className="font-serif text-[20px] text-bank-text">Teaser</h2>
          <Field label="Teaser-Headline">
            <input type="text" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })}
                   data-testid="topic-edit-headline"
                   className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
          </Field>
          <Field label="Teaser-Text">
            <textarea rows={3} value={form.teaser} onChange={(e) => setForm({ ...form, teaser: e.target.value })}
                      data-testid="topic-edit-teaser"
                      className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Delay (ms)">
              <input type="number" min={0} value={form.display_delay_ms}
                     onChange={(e) => setForm({ ...form, display_delay_ms: Number(e.target.value) })}
                     className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
            </Field>
            <Field label="Scroll (%)">
              <input type="number" min={0} max={100} value={form.scroll_threshold_pct}
                     onChange={(e) => setForm({ ...form, scroll_threshold_pct: Number(e.target.value) })}
                     className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
            </Field>
            <Field label="Cooldown (Tage)">
              <input type="number" min={1} max={90} value={form.cooldown_days}
                     onChange={(e) => setForm({ ...form, cooldown_days: Number(e.target.value) })}
                     className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px]" />
            </Field>
          </div>
        </section>

        {/* NEWS-ZUORDNUNG */}
        <section className="space-y-5 border border-bank-border bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[20px] text-bank-text">Passende Redaktionsartikel</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-bank-text-muted">
              {related.length}/6
            </span>
          </div>
          <p className="text-[13.5px] text-bank-text-muted">
            Suchen Sie einen Artikel und ordnen Sie ihn zu. Reihenfolge per Hoch/Runter-Buttons anpassen.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
              <input type="text" value={searchQ}
                     onChange={(e) => setSearchQ(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && searchNews()}
                     data-testid="admin-news-search-input"
                     placeholder="Artikel suchen (Titel, Slug, Kategorie) …"
                     className="w-full border border-bank-border bg-white py-2 pl-9 pr-3 text-[14px]" />
            </div>
            <button type="button" onClick={searchNews} disabled={searching}
                    data-testid="admin-news-search-btn"
                    className="border border-bank-primary bg-bank-primary px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-bank-primary/90 disabled:opacity-50">
              {searching ? 'Sucht …' : 'Suchen'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-bank-border">
              <div className="max-h-64 overflow-auto divide-y divide-bank-border">
                {searchResults.map((a) => {
                  const already = !!related.find((r) => r.slug === a.slug);
                  return (
                    <div key={a.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-bank-text">{a.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {a.category || 'Nachrichten'}
                          {a.published_at && ` · ${new Date(a.published_at).toLocaleDateString('de-DE')}`}
                        </p>
                      </div>
                      <button type="button" disabled={already}
                              onClick={() => addNews(a)}
                              data-testid={`admin-news-add-${a.slug}`}
                              className="inline-flex items-center gap-1 border border-bank-border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-bank-text hover:border-bank-primary hover:text-bank-primary disabled:opacity-40">
                        {already ? 'Zugeordnet' : (<><Plus size={11} /> Hinzufügen</>)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2" data-testid="admin-related-list">
            {related.length === 0 ? (
              <p className="text-[13px] text-bank-text-muted">Noch keine Artikel zugeordnet.</p>
            ) : related.map((a, idx) => (
              <div key={a.slug} data-testid={`admin-related-item-${a.slug}`}
                   className={`flex items-center justify-between gap-3 border border-bank-border bg-white px-4 py-2.5 ${a.missing ? 'border-amber-300 bg-amber-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-[13.5px] text-bank-text">{a.title || a.slug}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
                      {a.missing ? 'Artikel nicht mehr verfügbar' : (a.category || 'Nachrichten')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                          data-testid={`admin-related-up-${a.slug}`}
                          className="border border-bank-border p-1.5 hover:border-bank-primary disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === related.length - 1}
                          data-testid={`admin-related-down-${a.slug}`}
                          className="border border-bank-border p-1.5 hover:border-bank-primary disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" onClick={() => removeNews(a.slug)}
                          data-testid={`admin-related-remove-${a.slug}`}
                          className="border border-bank-border p-1.5 text-rose-700 hover:border-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-bank-border pt-6">
        <button type="button" onClick={() => nav('/admin/investment-topics')}
                className="border border-bank-border px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-bank-text hover:border-bank-primary hover:text-bank-primary">
          Abbrechen
        </button>
        <button type="button" onClick={save} disabled={saving}
                data-testid="topic-edit-save"
                className="border border-bank-primary bg-bank-primary px-6 py-2 text-[12px] uppercase tracking-[0.16em] text-white hover:bg-bank-primary/90 disabled:opacity-50">
          {saving ? 'Speichert …' : 'Änderungen speichern'}
        </button>
      </div>
    </div>
  );
};

export default AdminInvestmentTopicEdit;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BASE = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 25;

const useAuthedApi = () => useMemo(() => {
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

const publicApi = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
};

const AdminNewsArticles = () => {
  const api = useAuthedApi();
  const [topics, setTopics] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [page, setPage] = useState(0);
  const [savingSlug, setSavingSlug] = useState('');
  // Optimistische lokale Overrides je Slug (bis Reload).
  const [pending, setPending] = useState({});

  // Alle Investment-Themen laden — auch deaktivierte, damit Admin sie zuordnen kann.
  useEffect(() => {
    let alive = true;
    api.get('/admin/investment-topics').then(({ data }) => {
      if (!alive) return;
      setTopics(data?.items || []);
    }).catch(() => { if (alive) setTopics([]); });
    return () => { alive = false; };
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (q.trim()) params.q = q.trim();
      if (topicFilter) params.topic = topicFilter;
      const { data } = await api.get('/admin/news', { params });
      setItems(data?.items || []);
      setTotal(data?.total || 0);
      setPending({});
    } catch (err) {
      toast.error('News-Artikel konnten nicht geladen werden.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, page, q, topicFilter]);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (slug, nextRaw) => {
    const next = nextRaw || null; // '' → null
    const prev = items.find((it) => it.slug === slug)?.investment_topic_slug || null;
    if (next === prev) return;
    setSavingSlug(slug);
    // optimistisches UI
    setPending((p) => ({ ...p, [slug]: next }));
    try {
      const { data } = await api.patch(`/admin/news/${encodeURIComponent(slug)}`, {
        investment_topic_slug: next,
      });
      const saved = data?.investment_topic_slug ?? null;
      setPending((p) => ({ ...p, [slug]: saved }));
      toast.success(saved
        ? `Thema zugeordnet: ${saved}`
        : 'Themenzuordnung entfernt.');
    } catch (err) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Speichern fehlgeschlagen.');
      // rollback
      setPending((p) => {
        const { [slug]: _drop, ...rest } = p;
        return rest;
      });
    } finally {
      setSavingSlug('');
    }
  };

  const valueFor = (it) => (pending[it.slug] !== undefined ? pending[it.slug] : it.investment_topic_slug) || '';

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 sm:p-10" data-testid="admin-news-articles">
      <div className="mb-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">News-Zuordnung</p>
        <h1 className="mt-1 font-serif text-[28px] leading-tight text-bank-text">
          News-Artikel &nbsp;·&nbsp; Investment-Thema
        </h1>
        <p className="mt-2 max-w-3xl text-[13.5px] text-bank-text-muted">
          Ordnen Sie einzelnen Redaktionsartikeln ein Investment-Thema zu. Auf der Detailseite erscheint dann eine
          dezente Cross-Link-Box zum Thema — nur, solange das Thema aktiv ist. „Kein Thema" entfernt die Zuordnung.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px_auto]">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load())}
            placeholder="Titel, Slug oder Kategorie …"
            data-testid="admin-news-search"
            className="w-full border border-bank-border bg-white py-2 pl-9 pr-3 text-[14px]"
          />
        </div>
        <select
          value={topicFilter}
          onChange={(e) => { setTopicFilter(e.target.value); setPage(0); }}
          data-testid="admin-news-topic-filter"
          className="border border-bank-border bg-white px-3 py-2 text-[14px]"
        >
          <option value="">Alle Zuordnungen</option>
          <option value="__none__">Ohne Zuordnung</option>
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>{t.category} ({t.slug})</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setPage(0); load(); }}
          className="border border-bank-primary bg-bank-primary px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-white hover:bg-bank-primary/90"
        >
          Anwenden
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-bank-text-muted">
          <Loader2 className="animate-spin" size={16} /> Wird geladen …
        </div>
      ) : items.length === 0 ? (
        <p className="text-bank-text-muted">Keine Artikel gefunden.</p>
      ) : (
        <div className="overflow-x-auto border border-bank-border">
          <table className="w-full min-w-[900px] text-left text-[13.5px]">
            <thead className="bg-bank-bg text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <tr>
                <th className="px-4 py-3">Titel</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Investment-Thema</th>
                <th className="px-4 py-3">Ansicht</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border">
              {items.map((it) => (
                <tr key={it.slug} data-testid={`admin-news-row-${it.slug}`} className="align-top">
                  <td className="px-4 py-3">
                    <p className="text-bank-text">{it.title}</p>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                      {it.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-bank-text-muted">{it.category || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-bank-text-muted">{fmtDate(it.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={valueFor(it)}
                        onChange={(e) => handleChange(it.slug, e.target.value)}
                        disabled={savingSlug === it.slug}
                        data-testid={`news-investment-topic-select-${it.slug}`}
                        className="min-w-[220px] border border-bank-border bg-white px-3 py-1.5 text-[13.5px] disabled:opacity-60"
                      >
                        <option value="">Kein Thema</option>
                        {topics.map((t) => (
                          <option key={t.slug} value={t.slug}>
                            {t.category}
                            {!t.enabled ? ' (deaktiviert)' : ''}
                          </option>
                        ))}
                      </select>
                      {savingSlug === it.slug && <Loader2 className="animate-spin text-bank-text-muted" size={14} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/news/nachrichten/${encodeURIComponent(it.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] text-bank-primary hover:text-bank-primary/80"
                    >
                      Öffnen <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4 text-[12.5px] text-bank-text-muted">
          <span data-testid="admin-news-pagination-info">
            Seite {page + 1} von {totalPages} · {total} Artikel gesamt
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 border border-bank-border px-3 py-1.5 text-[11.5px] uppercase tracking-[0.14em] hover:border-bank-primary hover:text-bank-primary disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Zurück
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 border border-bank-border px-3 py-1.5 text-[11.5px] uppercase tracking-[0.14em] hover:border-bank-primary hover:text-bank-primary disabled:opacity-40"
            >
              Weiter <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNewsArticles;

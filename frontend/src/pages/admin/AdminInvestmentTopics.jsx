import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, CircleSlash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BASE = getApiBase();

const useAuthedApi = () => {
  return React.useMemo(() => {
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

const StatusPill = ({ enabled }) =>
  enabled ? (
    <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-emerald-700">
      <CheckCircle2 size={12} strokeWidth={1.7} /> Aktiv
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-neutral-500">
      <CircleSlash size={12} strokeWidth={1.7} /> Deaktiviert
    </span>
  );

const AdminInvestmentTopics = () => {
  const api = useAuthedApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/investment-topics');
      setItems(data?.items || []);
    } catch (err) {
      toast.error('Themen konnten nicht geladen werden.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (slug, next) => {
    setToggling(slug);
    try {
      await api.patch(`/admin/investment-topics/${encodeURIComponent(slug)}`, { enabled: next });
      toast.success(`Thema ${next ? 'aktiviert' : 'deaktiviert'}.`);
      if (!next) toast.message('Das Thema wird nun aus /themen, Teaser und Cross-Links ausgeblendet.');
      setItems((prev) => prev.map((it) => (it.slug === slug ? { ...it, enabled: next } : it)));
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Statusänderung fehlgeschlagen.');
    } finally {
      setToggling('');
    }
  };

  return (
    <div className="p-6 sm:p-10" data-testid="admin-investment-topics">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Themen-Verwaltung</p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight text-bank-text">Investment-Themen</h1>
          <p className="mt-2 text-[13.5px] text-bank-text-muted">
            Aktivierung, Priorität, Overview-Text, Teaser-Konfiguration und News-Zuordnung.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-bank-text-muted"><Loader2 className="animate-spin" size={16} /> Wird geladen …</div>
      ) : items.length === 0 ? (
        <p className="text-bank-text-muted">Keine Themen vorhanden.</p>
      ) : (
        <div className="overflow-x-auto border border-bank-border">
          <table className="w-full min-w-[880px] text-left text-[13.5px]">
            <thead className="bg-bank-bg text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <tr>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prio</th>
                <th className="px-4 py-3">News</th>
                <th className="px-4 py-3">Aktualisiert</th>
                <th className="px-4 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border">
              {items.map((t) => (
                <tr key={t.slug} data-testid={`admin-topic-row-${t.slug}`} className="align-top">
                  <td className="px-4 py-3 font-mono text-[12px] text-bank-text">{t.slug}</td>
                  <td className="px-4 py-3">{t.category}</td>
                  <td className="px-4 py-3"><StatusPill enabled={t.enabled} /></td>
                  <td className="px-4 py-3 tabular-nums">{t.priority}</td>
                  <td className="px-4 py-3 tabular-nums">{t.related_news_count}</td>
                  <td className="px-4 py-3 text-bank-text-muted">
                    {t.updated_at ? new Date(t.updated_at).toLocaleString('de-DE') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={toggling === t.slug}
                        onClick={() => toggleActive(t.slug, !t.enabled)}
                        data-testid={`admin-topic-toggle-${t.slug}`}
                        className="border border-bank-border px-3 py-1.5 text-[11.5px] uppercase tracking-[0.16em] text-bank-text transition-colors hover:border-bank-primary hover:text-bank-primary disabled:opacity-50"
                      >
                        {t.enabled ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                      <Link
                        to={`/admin/investment-topics/${encodeURIComponent(t.slug)}`}
                        data-testid={`admin-topic-edit-${t.slug}`}
                        className="border border-bank-primary bg-bank-primary px-3 py-1.5 text-[11.5px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-bank-primary/90"
                      >
                        Bearbeiten
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminInvestmentTopics;

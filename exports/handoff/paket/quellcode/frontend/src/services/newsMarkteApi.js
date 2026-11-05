import { getApiBase } from '@/lib/apiBase';
/**
 * Client + hooks for News & Märkte endpoints.
 * All requests go through REACT_APP_BACKEND_URL (proxied to FastAPI via /api).
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useDisplayCurrency } from '@/context/DisplayCurrencyContext';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

const unwrap = (res) => res.data;

export const newsMarkteApi = {
  feed: (category) =>
    api.get('/news-markte/feed', { params: category && category !== 'alle' ? { category } : {} }).then(unwrap),
  markets: (displayCurrency) =>
    api.get('/news-markte/markets', { params: displayCurrency ? { display_currency: displayCurrency } : {} }).then(unwrap),
  editorial: () => api.get('/news-markte/editorial').then(unwrap),
  adminList: () => api.get('/news-markte/editorial/admin').then(unwrap),
  adminCreate: (payload) => api.post('/news-markte/editorial', payload).then(unwrap),
  adminUpdate: (id, payload) => api.put(`/news-markte/editorial/${id}`, payload).then(unwrap),
  adminDelete: (id) => api.delete(`/news-markte/editorial/${id}`).then(unwrap),
};

export const useNewsFeed = (category) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await newsMarkteApi.feed(category);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err });
    }
  }, [category]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
};

export const useMarketInsights = () => {
  const { currency } = useDisplayCurrency();
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await newsMarkteApi.markets(currency);
        if (alive) setState({ data, loading: false, error: null });
      } catch (err) {
        if (alive) setState({ data: [], loading: false, error: err });
      }
    };
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [currency]);
  return state;
};

export const useEditorial = () => {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    newsMarkteApi
      .editorial()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: [], loading: false, error: err }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
};

export const formatRelative = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatClock = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

export const formatValue = (num, unit) => {
  if (typeof num !== 'number' || Number.isNaN(num)) return '—';
  const abs = Math.abs(num);
  const fractionDigits = abs >= 1000 ? 2 : abs >= 10 ? 2 : 4;
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: abs >= 1000 ? 2 : fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return unit ? `${formatted} ${unit}` : formatted;
};

export const formatChangePct = (num) => {
  if (typeof num !== 'number' || Number.isNaN(num)) return '—';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

export const useAnlagetrends = () => {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    api.get('/news-markte/anlagetrends').then(unwrap)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: [], loading: false, error: err }));
    return () => { alive = false; };
  }, []);
  return state;
};

export const useInvestmentRadar = () => {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    api.get('/news-markte/investment-radar').then(unwrap)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: [], loading: false, error: err }));
    return () => { alive = false; };
  }, []);
  return state;
};

export const useMarketVoices = () => {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    api.get('/news-markte/market-voices').then(unwrap)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: [], loading: false, error: err }));
    return () => { alive = false; };
  }, []);
  return state;
};

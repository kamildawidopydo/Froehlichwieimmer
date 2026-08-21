/**
 * API client for customer reviews with moderation workflow.
 */
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });
const unwrap = (r) => r.data;

export const reviewsApi = {
  submit: (payload) => api.post('/reviews/submit', payload).then(unwrap),
  list: (params = {}) => api.get('/reviews/public', { params }).then(unwrap),
  stats: () => api.get('/reviews/stats').then(unwrap),
  adminList: (status) => api.get('/reviews/admin', { params: status ? { status } : {} }).then(unwrap),
  moderate: (id, payload) => api.put(`/reviews/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/reviews/${id}`).then(unwrap),
};

export const useReviewStats = () => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    try {
      const data = await reviewsApi.stats();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
};

export const usePublicReviews = (params = {}) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await reviewsApi.list(params);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
};

export const formatReviewDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return 'vor wenigen Minuten';
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
  if (diff < 2419200) return `vor ${Math.floor(diff / 604800)} Wochen`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
};

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
  topics: (opts = {}) => api.get('/reviews/topics', {
    params: opts.include_demo ? { include_demo: true } : undefined,
  }).then(unwrap),
  adminList: (status, opts = {}) => api.get('/reviews/admin', {
    params: {
      ...(status ? { status } : {}),
      ...(opts.include_demo ? { include_demo: true } : {}),
    },
  }).then(unwrap),
  moderate: (id, payload) => api.put(`/reviews/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/reviews/${id}`).then(unwrap),
  createInvite: (payload) => api.post('/reviews/invite', payload).then(unwrap),
  getInvite: (token) => api.get(`/reviews/invite/${token}`).then(unwrap),
  listInvites: () => api.get('/reviews/invites').then(unwrap),
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
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Öffentliches Kommentardatum im deutschen Kurzformat: TT.MM.JJJJ */
export const formatCommentDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

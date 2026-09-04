import { getApiBase } from '@/lib/apiBase';
import axios from 'axios';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });
const unwrap = (r) => r.data;

export const einordnungApi = {
  list: (params = {}) => api.get('/einordnung', { params }).then(unwrap),
  detail: (slug) => api.get(`/einordnung/${encodeURIComponent(slug)}`).then(unwrap),
  categories: () => api.get('/einordnung/categories').then(unwrap),
};

/**
 * Session 80.69 — zentraler Public-Filter.
 * Ein Beitrag darf öffentlich nur ausgespielt werden, wenn er (a) keine
 * Demo-/Test-Kennung trägt und (b) im regulären published-Status ist.
 * Backend liefert bereits nur `status === 'published'`, der zusätzliche
 * Guard schützt gegen künftige API-Änderungen und defensives Rendern.
 */
export const isPublicEinordnung = (item) =>
  !!item
  && item.is_demo !== true
  && (item.status ? item.status === 'published' : true);

export const EINORDNUNG_CATEGORY_LABEL = {
  zinsen: 'Zinsen',
  aktienmaerkte: 'Aktienmärkte',
  rohstoffe: 'Rohstoffe',
  technologie: 'Technologie',
  makro: 'Makro',
  portfolio: 'Portfolio',
};

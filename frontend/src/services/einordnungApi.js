import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });
const unwrap = (r) => r.data;

export const einordnungApi = {
  list: (params = {}) => api.get('/einordnung', { params }).then(unwrap),
  detail: (slug) => api.get(`/einordnung/${encodeURIComponent(slug)}`).then(unwrap),
  categories: () => api.get('/einordnung/categories').then(unwrap),
};

export const EINORDNUNG_CATEGORY_LABEL = {
  zinsen: 'Zinsen',
  aktienmaerkte: 'Aktienmärkte',
  rohstoffe: 'Rohstoffe',
  technologie: 'Technologie',
  makro: 'Makro',
  portfolio: 'Portfolio',
};

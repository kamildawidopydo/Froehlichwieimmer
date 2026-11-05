import { getApiBase } from '@/lib/apiBase';
/**
 * Central HTTP client for the Fröhlich Vermögensberatung FastAPI backend.
 * - Uses REACT_APP_BACKEND_URL (never localhost)
 * - Sends & receives httpOnly auth cookies via withCredentials
 * - Exposes typed helpers for auth + public content
 */

import axios from 'axios';

const BACKEND_URL = getApiBase() || '';
export const API_BASE = `${BACKEND_URL}/api`;

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/**
 * FastAPI 422 validation errors ship `detail` as an array of objects, not a string.
 * Rendering that array directly in JSX crashes React. This normalizes it.
 */
export function formatApiErrorDetail(detail) {
  if (detail == null) return 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  }
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

export function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  return formatApiErrorDetail(detail) || err?.message || 'Netzwerkfehler.';
}

// --- Auth --------------------------------------------------------------

export const authApi = {
  async register({ email, password, name, first_name, last_name, country, phone }) {
    const { data } = await client.post('/auth/register', { email, password, name, first_name, last_name, country, phone });
    return data;
  },
  async login({ email, password }) {
    const { data } = await client.post('/auth/login', { email, password });
    return data;
  },
  async logout() {
    const { data } = await client.post('/auth/logout');
    return data;
  },
  async me() {
    const { data } = await client.get('/auth/me');
    return data;
  },
  async updateMe(patch) {
    const { data } = await client.patch('/auth/me', patch);
    return data;
  },
  async refresh() {
    const { data } = await client.post('/auth/refresh');
    return data;
  },
  async forgotPassword(email) {
    const { data } = await client.post('/auth/forgot-password', { email });
    return data;
  },
  async resetPassword({ token, password }) {
    const { data } = await client.post('/auth/reset-password', { token, password });
    return data;
  },
};

// --- Public content ----------------------------------------------------

export const contentApi = {
  async listBanks() {
    const { data } = await client.get('/content/banks');
    return data;
  },
  async listOffers({ bankSlug, productType } = {}) {
    const params = {};
    if (bankSlug) params.bank_slug = bankSlug;
    if (productType) params.product_type = productType;
    const { data } = await client.get('/content/offers', { params });
    return data;
  },
  async listNews({ limit = 20 } = {}) {
    const { data } = await client.get('/content/news', { params: { limit } });
    return data;
  },
};

// --- Health ------------------------------------------------------------

export async function apiHealth() {
  const { data } = await client.get('/health');
  return data;
}

export default client;

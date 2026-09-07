/**
 * Portfolio-Order SDK — FastAPI/Mongo-native (Session 82.21).
 *
 * Ausschließlich für Customer-facing Limit-Kauforders und Stornierungen.
 * Backend-Endpunkte:
 *   POST   /api/portfolio/orders
 *   POST   /api/portfolio/orders/{id}/cancel
 *   GET    /api/portfolio/orders
 *   GET    /api/portfolio/cash
 */
import { getApiBase } from '@/lib/apiBase';

const BASE = getApiBase();

async function req(path, opts = {}) {
  const resp = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...opts,
  });
  const text = await resp.text();
  const body = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const err = new Error(body?.detail || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.detail = body?.detail;
    throw err;
  }
  return body;
}

export const portfolioOrderApi = {
  listOrders: () => req('/portfolio/orders'),
  createOrder: (payload) => req('/portfolio/orders', { method: 'POST', body: JSON.stringify(payload) }),
  cancelOrder: (id) => req(`/portfolio/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  getCash: () => req('/portfolio/cash'),
};

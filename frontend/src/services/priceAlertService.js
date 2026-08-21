/**
 * Price alerts service — FastAPI backend (`/api/alerts`).
 *
 * Replaces the earlier Supabase-based implementation. The FastAPI backend
 * evaluates alerts every 15 minutes via cron and sends emails through Resend
 * (managed via the Emergent Email integration). Users can also trigger a
 * manual check via `checkPriceAlerts()`.
 */
import apiClient from './apiClient';

/** Normalise backend payload to the shape existing UI already consumes. */
const normalize = (row) => ({
  id: row.id,
  symbol: row.symbol,
  direction: row.direction,
  target_price: Number(row.target_price),
  currency: row.currency || null,
  note: row.note || null,
  is_active: !!row.is_active,
  triggered_at: row.triggered_at || null,
  triggered_price: row.triggered_price ?? null,
  triggered_count: Number(row.triggered_count || 0),
  cooldown_until: row.cooldown_until || null,
  created_at: row.created_at || null,
});

/** Only active alerts (for symbol-detail panel). */
export async function fetchPriceAlerts() {
  const { data } = await apiClient.get('/alerts');
  const items = (data?.items || []).map(normalize).filter((a) => a.is_active);
  return items;
}

/** All alerts incl. triggered (for the dashboard `/dashboard/alarme` page). */
export async function fetchAllPriceAlerts() {
  const { data } = await apiClient.get('/alerts');
  return (data?.items || []).map(normalize);
}

export async function createPriceAlert({ symbol, direction, targetPrice, currency, note }) {
  const { data } = await apiClient.post('/alerts', {
    symbol: String(symbol).toUpperCase(),
    direction: direction || 'above',
    target_price: Number(targetPrice),
    currency: currency || undefined,
    note: note || undefined,
  });
  return normalize(data);
}

export async function updatePriceAlert(id, patch) {
  const body = {};
  if (patch.isActive !== undefined) body.is_active = !!patch.isActive;
  if (patch.targetPrice !== undefined) body.target_price = Number(patch.targetPrice);
  if (patch.direction !== undefined) body.direction = patch.direction;
  if (patch.note !== undefined) body.note = patch.note;
  const { data } = await apiClient.patch(`/alerts/${id}`, body);
  return normalize(data);
}

export async function deletePriceAlert(id) {
  await apiClient.delete(`/alerts/${id}`);
}

/** Invoke the FastAPI trigger evaluator — only checks caller's own alerts. */
export async function checkPriceAlerts() {
  const { data } = await apiClient.post('/alerts/check');
  return {
    triggered: data?.triggered || [],
    stats: {
      checked: data?.checked || 0,
      triggered: data?.triggered_count || (data?.triggered || []).length,
      mails_sent: data?.mails_sent || 0,
    },
  };
}

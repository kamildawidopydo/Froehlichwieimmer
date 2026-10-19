// Session 82.70 · Mongo-nativer Support-API-Client.
const BASE = process.env.REACT_APP_BACKEND_URL;

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.detail = body?.detail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const supportApi = {
  listTickets: () => req('/api/support/tickets'),
  createTicket: ({ subject, category = 'general', body }) =>
    req('/api/support/tickets', { method: 'POST', body: JSON.stringify({ subject, category, body }) }),
  listMessages: (ticketId) => req(`/api/support/tickets/${encodeURIComponent(ticketId)}/messages`),
  createMessage: (ticketId, body) =>
    req(`/api/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST', body: JSON.stringify({ body }),
    }),
  markRead: (ticketId) =>
    req(`/api/support/tickets/${encodeURIComponent(ticketId)}/read`, { method: 'POST' }),
  // Session 82.71 · Admin
  adminListTickets: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return req(`/api/admin/support/tickets${q ? `?${q}` : ''}`);
  },
  adminListMessages: (ticketId) =>
    req(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/messages`),
  adminReply: (ticketId, body) =>
    req(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: 'POST', body: JSON.stringify({ body }),
    }),
  adminSetStatus: (ticketId, status) =>
    req(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, {
      method: 'POST', body: JSON.stringify({ status }),
    }),
  adminMarkRead: (ticketId) =>
    req(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/read`, { method: 'POST' }),
};

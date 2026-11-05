// Presentation-only helpers for the admin customer overview (no data mutation).
const DAY = 86400000;

export const isIdle90 = (c, now = Date.now()) =>
  !c.last_activity || now - new Date(c.last_activity).getTime() > 90 * DAY;

export const CUSTOMER_FILTERS = [
  ['all', 'Alle Kunden', (c) => c.role !== 'admin'],
  ['active', 'Aktive Kunden', (c) => c.role !== 'admin' && c.status === 'active'],
  ['inactive', 'Inaktive Kunden', (c) => c.role !== 'admin' && c.status === 'inactive'],
  ['blocked', 'Gesperrt', (c) => c.role !== 'admin' && (c.status === 'blocked' || c.login_locked)],
  ['depot', 'Mit Depot', (c) => c.role !== 'admin' && c.has_depot],
  ['nodepot', 'Ohne Depot', (c) => c.role !== 'admin' && !c.has_depot],
  ['open', 'Mit offenen Anfragen', (c) => c.role !== 'admin' && c.open_requests > 0],
  ['idle', 'Keine Aktivität seit 90 Tagen', (c) => c.role !== 'admin' && isIdle90(c)],
  ['admins', 'Administratoren', (c) => c.role === 'admin'],
];

export const CUSTOMER_SORTS = [
  ['name:asc', 'Name A–Z'],
  ['name:desc', 'Name Z–A'],
  ['total_assets:desc', 'Gesamtvermögen ↓'],
  ['total_assets:asc', 'Gesamtvermögen ↑'],
  ['last_activity:desc', 'Letzte Aktivität ↓'],
  ['last_activity:asc', 'Letzte Aktivität ↑'],
  ['open_requests:desc', 'Offene Vorgänge ↓'],
  ['open_requests:asc', 'Offene Vorgänge ↑'],
];

const sortValue = (c, key) => {
  if (key === 'name') return (c.name || c.email || '').toLowerCase();
  if (key === 'last_activity') return c.last_activity ? new Date(c.last_activity).getTime() : null;
  return c[key];
};

export const filterSortCustomers = (items, { filter, query, sort }) => {
  const fn = (CUSTOMER_FILTERS.find(([k]) => k === filter) || CUSTOMER_FILTERS[0])[2];
  const q = query.trim().toLowerCase();
  const [key, dir] = sort.split(':');
  const m = dir === 'asc' ? 1 : -1;
  return items
    .filter(fn)
    .filter((c) => !q || [c.name, c.email, c.customer_number, c.id].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv, 'de') * m;
      return (av - bv) * m;
    });
};

export const OPEN_LABELS = {
  ipo_requests: 'IPO-Anfragen',
  stock_orders: 'Aktienaufträge',
  bond_purchase_requests: 'Anleihen-Anfragen',
  payout_requests: 'Auszahlungen',
  support_tickets: 'Support',
};

export const fmtDateDE = (v, withTime = false) =>
  v
    ? new Date(v).toLocaleString('de-DE', withTime
      ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '–';

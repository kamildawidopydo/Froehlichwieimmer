import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '@/lib/apiBase';
import { formatEUR, formatEURSigned, pnlTone } from '@/lib/dashboardFormatters';
import { fmtDateDE } from '@/lib/adminCustomers';

const STATUS = { pending: 'Offen', approved: 'Genehmigt', allocated: 'Zugeteilt', rejected: 'Abgelehnt', cancelled: 'Storniert' };

export const useAdminJson = (path) => {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    fetch(`${getApiBase()}${path}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (alive) setState({ data, error: null }); })
      .catch((error) => { if (alive) setState({ data: null, error }); });
    return () => { alive = false; };
  }, [path]);
  return state;
};

const IpoRow = ({ r }) => {
  const cost = r.subscription_price != null ? r.shares * r.subscription_price : null;
  const est = r.listing_price != null && r.use_admin_valuation ? r.shares * r.listing_price : null;
  const gv = cost != null && est != null ? est - cost : null;
  return (
    <tr className="border-b border-bank-border last:border-0" data-testid={`admin-customer-ipo-${r.id}`}>
      <td className="px-3 py-2.5"><p className="font-medium">{r.company_name || '–'}</p><p className="font-mono text-[11px] text-bank-text-muted">{r.ticker || '–'}</p></td>
      <td className="px-3 py-2.5">{STATUS[r.status] || r.status}{r.is_archived && ' · archiviert'}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{r.shares.toLocaleString('de-DE')}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{cost != null ? formatEUR(cost) : '–'}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{est != null ? formatEUR(est) : <span className="text-bank-text-muted">keine Schätzung</span>}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${gv != null ? pnlTone(gv) : ''}`}>{gv != null ? formatEURSigned(gv) : '–'}</td>
      <td className="px-3 py-2.5 font-mono text-[11.5px] text-bank-text-muted">{fmtDateDE(r.allocation_date || r.created_at)}</td>
    </tr>
  );
};

const AdminCustomerIpoTab = ({ userId }) => {
  const { data, error } = useAdminJson(`/api/admin/customers/${userId}/ipo-requests`);
  return (
    <section className="border border-bank-border bg-white p-4 shadow-editorial-sm sm:p-6" data-testid="admin-customer-ipo-tab">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-bank-text">IPO-Beteiligungen</h2>
          <p className="text-[12px] text-bank-text-muted">Nur Ansicht. Schätzwerte der Emissionsbank, keine Börsenkurse.</p>
        </div>
        <Link to="/admin/ipo-requests" className="text-[12.5px] font-medium text-bank-primary hover:underline" data-testid="admin-customer-ipo-manage-link">
          In der IPO-Verwaltung bearbeiten →
        </Link>
      </div>
      {error && <p className="text-[12px] text-rose-700">Konnte nicht geladen werden ({error.message}).</p>}
      {data && data.length === 0 && <p className="text-[12px] text-bank-text-muted" data-testid="admin-customer-ipo-empty">Keine IPO-Anfragen oder -Beteiligungen.</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-bank-bg/60 text-[10.5px] uppercase tracking-wide text-bank-text-muted">
              <tr>{['Emission', 'Status', 'Stück', 'Kaufpreis (EUR)', 'Geschätzter Wert', 'G/V (geschätzt)', 'Datum'].map((h, i) => <th key={h} className={`px-3 py-2 font-medium ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
            </thead>
            <tbody>{data.map((r) => <IpoRow key={r.id} r={r} />)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminCustomerIpoTab;

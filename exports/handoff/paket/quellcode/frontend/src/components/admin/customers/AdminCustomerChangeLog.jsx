import React from 'react';
import { useAdminJson } from '@/components/admin/customers/AdminCustomerIpoTab';
import { fmtDateDE } from '@/lib/adminCustomers';

const Entry = ({ e, i }) => (
  <li className="border-b border-bank-border py-3 last:border-0" data-testid={`admin-changelog-entry-${i}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[13px] font-medium text-bank-text">{e.area} · <span className="font-normal">{e.subject}</span></p>
      <p className="font-mono text-[11px] text-bank-text-muted">{fmtDateDE(e.at, true)}</p>
    </div>
    <p className="mt-1 text-[12px] text-bank-text-muted">
      Administrator: {e.admin_label}
      {' · '}Vorher: {e.before ?? 'nicht erfasst'}
      {' · '}Nachher: {e.after ?? 'nicht erfasst'}
      {' · '}Grund: {e.reason || 'nicht erfasst'}
    </p>
    {!e.complete && <p className="mt-0.5 text-[11px] text-amber-800">Unvollständig protokolliert (aus vorhandenen Daten rekonstruiert)</p>}
  </li>
);

const AdminCustomerChangeLog = ({ userId }) => {
  const { data, error } = useAdminJson(`/api/admin/customers/${userId}/change-log`);
  return (
    <section className="border border-bank-border bg-white p-4 shadow-editorial-sm sm:p-6" data-testid="admin-customer-changelog">
      <h2 className="text-[15px] font-semibold text-bank-text">Änderungsprotokoll</h2>
      <p className="text-[12px] text-bank-text-muted">Bisher vorhandene Spuren administrativer Eingriffe. Ein vollständiges Protokoll ist geplant (Phase 2, Schritt 1).</p>
      {error && <p className="mt-3 text-[12px] text-rose-700">Konnte nicht geladen werden ({error.message}).</p>}
      {data && (
        <>
          {data.items.length === 0
            ? <p className="mt-3 text-[12px] text-bank-text-muted" data-testid="admin-changelog-empty">Keine protokollierten Eingriffe vorhanden.</p>
            : <ul className="mt-2">{data.items.map((e, i) => <Entry key={`${e.area}-${e.at}-${i}`} e={e} i={i} />)}</ul>}
          <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900" data-testid="admin-changelog-gaps">
            <p className="font-semibold">Derzeit nicht protokolliert:</p>
            <ul className="mt-1 list-disc pl-5">{data.not_logged.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminCustomerChangeLog;

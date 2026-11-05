import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ACTION_LABELS = {
  create: 'Angelegt',
  update: 'Geändert',
  delete: 'Gelöscht',
  pending: 'Offen',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
  executed: 'Ausgeführt',
  note_added: 'Notiz hinzugefügt',
  offer_created: 'Angebot erstellt',
  archived: 'Archiviert',
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString('de-DE') : '–');
const fmtNum = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: 4 }));

export const AuditList = ({ entries }) =>
  entries.length === 0 ? (
    <p className="text-xs text-bank-text-muted">Noch keine Einträge.</p>
  ) : (
    <ul className="space-y-1.5" data-testid="audit-list">
      {entries.map((a) => (
        <li key={a.id} className="border-b border-bank-border/40 pb-1.5 text-[12px]">
          <span className="tabular-nums text-bank-text-muted">{fmtDate(a.changed_at)}</span>
          <span className="ml-2 font-medium text-bank-text">{ACTION_LABELS[a.action] || a.action}</span>
          <span className="ml-2 text-bank-text-muted">{a.changed_by || '–'}</span>
          {a.changed_fields?.length > 0 && (
            <p className="mt-0.5 text-[11px] text-bank-text-muted">
              {a.changed_fields.map((f) => `${f}: ${a.before?.[f] ?? '–'} → ${a.after?.[f] ?? '–'}`).join(' · ')}
            </p>
          )}
          {a.after?.note && <p className="mt-0.5 text-[11px] text-bank-text-muted">{a.after.note}</p>}
        </li>
      ))}
    </ul>
  );

export const BondHistoryDialog = ({ bond, onClose, fetchJson }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!bond) {
      setData(null);
      return;
    }
    fetchJson(`/api/admin/bonds/catalog/${bond.id}/history`).then(setData).catch(() => setData({ prices: [], audit: [] }));
  }, [bond, fetchJson]);

  return (
    <Dialog open={!!bond} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white" data-testid="bond-history-dialog">
        <DialogHeader>
          <DialogTitle>Kurshistorie & Änderungsprotokoll · {bond?.bond_name}</DialogTitle>
        </DialogHeader>
        {!data ? (
          <p className="text-sm text-bank-text-muted">Lädt…</p>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-bank-text">Kurshistorie</h3>
              {data.prices.length === 0 ? (
                <p className="text-xs text-bank-text-muted">Keine Kurse erfasst.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" data-testid="bond-price-history-table">
                    <thead className="text-left text-bank-text-muted">
                      <tr>
                        {['Erfasst', 'Kurs', 'Kauf', 'Verkauf', 'Veränd.', 'Art', 'Stand', 'Quelle', 'Von'].map((h) => (
                          <th key={h} className="px-2 py-1.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.prices.map((p) => (
                        <tr key={p.id} className="border-t border-bank-border/40">
                          <td className="px-2 py-1.5 tabular-nums">{fmtDate(p.recorded_at)}</td>
                          <td className="px-2 py-1.5 tabular-nums">{fmtNum(p.aktueller_kurs)}</td>
                          <td className="px-2 py-1.5 tabular-nums">{fmtNum(p.kaufkurs)}</td>
                          <td className="px-2 py-1.5 tabular-nums">{fmtNum(p.verkaufskurs)}</td>
                          <td className="px-2 py-1.5 tabular-nums">{fmtNum(p.kursveraenderung_abs)} / {fmtNum(p.kursveraenderung_pct)} %</td>
                          <td className="px-2 py-1.5">{p.kurs_typ === 'reference' ? 'Referenz' : p.kurs_typ === 'market' ? 'Markt' : '–'}</td>
                          <td className="px-2 py-1.5">{p.kurs_datum || '–'}</td>
                          <td className="px-2 py-1.5">{p.kurs_quelle || '–'}</td>
                          <td className="px-2 py-1.5">{p.recorded_by || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-bank-text">Änderungsprotokoll</h3>
              <AuditList entries={data.audit} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BondHistoryDialog;

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatEUR } from '@/lib/dashboardFormatters';
import { AuditList } from '@/components/admin/bonds/BondHistoryDialog';

const TITLES = {
  details: 'Anfrage-Details & Protokoll',
  note: 'Interne Notiz hinzufügen',
  offer: 'Individuelles Kaufangebot erstellen',
  cancel: 'Anfrage stornieren',
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString('de-DE') : '–');
const STATUS_DE = {
  pending: 'Offen', approved: 'Genehmigt', rejected: 'Abgelehnt', cancelled: 'Storniert', executed: 'Ausgeführt',
};

const Row = ({ l, v }) => (
  <div>
    <p className="text-bank-text-muted">{l}</p>
    <p className="font-medium">{v ?? '–'}</p>
  </div>
);

const RequestSummary = ({ r }) => (
  <div className="grid grid-cols-2 gap-2 rounded-lg border border-bank-border bg-bank-bg/40 p-3 text-[12.5px]" data-testid="bond-request-summary">
    <Row l="Kunden-ID" v={r.customer_display_id} />
    <Row l="Kunde" v={r.customer_name || r.customer_email} />
    <Row l="Anleihe" v={r.bond_name} />
    <Row l="ISIN" v={r.isin} />
    <Row l="Kupon" v={r.kupon_rate != null ? `${r.kupon_rate} %` : null} />
    <Row l="Ordervolumen" v={r.amount_eur != null ? formatEUR(r.amount_eur) : null} />
    <Row
      l="Angezeigter Kurs bei Anfrage"
      v={r.reference_price_pct != null
        ? `${r.reference_price_pct} %${r.reference_price_type === 'reference' ? ' (Referenzkurs)' : ''}`
        : null}
    />
    <Row l="Kurs-Zeitstempel" v={r.reference_price_date || fmtDate(r.reference_price_updated_at)} />
    <Row l="Anfrage am" v={fmtDate(r.requested_at || r.created_at)} />
    <Row l="Status" v={STATUS_DE[r.status] || r.status} />
  </div>
);

const OfferForm = ({ form, setForm }) => {
  const nominal = Number(String(form.nominal).replace(',', '.'));
  const price = Number(String(form.price_pct).replace(',', '.'));
  const total = nominal > 0 && price > 0 ? (nominal * price) / 100 : null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kurs in % *</Label>
          <Input value={form.price_pct} onChange={(e) => setForm({ ...form, price_pct: e.target.value })} data-testid="bond-offer-price" />
        </div>
        <div>
          <Label>Nominal (€) *</Label>
          <Input value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} data-testid="bond-offer-nominal" />
        </div>
        <div>
          <Label>Gültig bis</Label>
          <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} data-testid="bond-offer-valid-until" />
        </div>
        <div>
          <Label>Angebotsbetrag (Vorschau)</Label>
          <p className="mt-2 font-semibold tabular-nums" data-testid="bond-offer-total">{total != null ? formatEUR(total) : '–'}</p>
        </div>
      </div>
      <div>
        <Label>Nachricht an den Kunden</Label>
        <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="bond-offer-message" />
      </div>
      <p className="text-[11px] text-bank-text-muted">Das Angebot ist unverbindlich und löst keine Buchung aus.</p>
    </div>
  );
};

export const BondRequestActionDialog = ({ action, row, onClose, onDone, fetchJson }) => {
  const [text, setText] = useState('');
  const [offer, setOffer] = useState({ price_pct: '', nominal: '', valid_until: '', message: '' });
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!row) return;
    setText('');
    setError(null);
    setOffer({
      price_pct: row.offer?.price_pct ?? row.reference_price_pct ?? '',
      nominal: row.offer?.nominal ?? row.amount_eur ?? '',
      valid_until: row.offer?.valid_until ?? '',
      message: row.offer?.message ?? '',
    });
    if (action === 'details') {
      fetchJson(`/api/admin/bonds/requests/${row.id}/audit`).then(setAudit).catch(() => setAudit([]));
    }
  }, [row, action, fetchJson]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const num = (v) => Number(String(v).replace(',', '.'));
      const map = {
        note: ['notes', { text }],
        cancel: ['cancel', { decision_note: text || null }],
        offer: ['offer', {
          price_pct: num(offer.price_pct),
          nominal: num(offer.nominal),
          valid_until: offer.valid_until || null,
          message: offer.message || null,
        }],
      };
      const [path, body] = map[action];
      await fetchJson(`/api/admin/bonds/requests/${row.id}/${path}`, { method: 'POST', body: JSON.stringify(body) });
      await onDone(action);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-white" data-testid={`bond-request-dialog-${action}`}>
        <DialogHeader>
          <DialogTitle>{TITLES[action]}</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-4">
            <RequestSummary r={row} />
            {action === 'details' && (
              <>
                {row.offer && (
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-[12.5px]" data-testid="bond-request-offer-info">
                    Angebot: {row.offer.price_pct} % · Nominal {formatEUR(row.offer.nominal)} · {formatEUR(row.offer.amount_eur)}
                    {row.offer.valid_until && ` · gültig bis ${new Date(row.offer.valid_until).toLocaleDateString('de-DE')}`}
                  </div>
                )}
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Interne Notizen</h3>
                  {(row.internal_notes || []).length === 0 ? (
                    <p className="text-xs text-bank-text-muted">Keine Notizen.</p>
                  ) : (
                    <ul className="space-y-1.5 text-[12px]">
                      {row.internal_notes.map((n, i) => (
                        <li key={i} className="border-b border-bank-border/40 pb-1.5">
                          <span className="text-bank-text-muted">{fmtDate(n.created_at)} · {n.created_by}</span>
                          <p>{n.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Bearbeitungsprotokoll</h3>
                  <AuditList entries={audit} />
                </section>
              </>
            )}
            {action === 'offer' && <OfferForm form={offer} setForm={setOffer} />}
            {(action === 'note' || action === 'cancel') && (
              <div>
                <Label>{action === 'note' ? 'Notiz (nur für Admins sichtbar) *' : 'Grund der Stornierung (optional)'}</Label>
                <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} data-testid="bond-request-dialog-text" />
              </div>
            )}
            {error && <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800" data-testid="bond-request-dialog-error">{error}</div>}
            {action !== 'details' && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={busy}>Abbrechen</Button>
                <Button onClick={submit} disabled={busy || (action === 'note' && !text.trim())} data-testid="bond-request-dialog-submit">
                  {busy ? 'Speichert…' : action === 'cancel' ? 'Stornieren' : 'Speichern'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BondRequestActionDialog;

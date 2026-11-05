import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatEUR } from '@/lib/dashboardFormatters';
import { AuditList } from '@/components/admin/bonds/BondHistoryDialog';
import { pctDe, eurDe, dateDe, dateTimeDe, parseDeNumber } from '@/lib/bondDisplay';

export const OFFER_STATUS_DE = {
  offered: 'Angebot versendet', accepted: 'Vom Kunden angenommen', declined: 'Vom Kunden abgelehnt', expired: 'Abgelaufen',
};

const TITLES = {
  details: 'Anfrage-Details & Protokoll',
  note: 'Interne Notiz hinzufügen',
  offer: 'Individuelles Kaufangebot erstellen',
  cancel: 'Anfrage stornieren',
};

const fmtDate = (v) => dateTimeDe(v);
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
    <Row l="Kupon" v={r.kupon_rate != null ? pctDe(r.kupon_rate) : null} />
    <Row l="Ordervolumen" v={r.amount_eur != null ? formatEUR(r.amount_eur) : null} />
    <Row
      l="Angezeigter Kurs bei Anfrage"
      v={r.reference_price_pct != null
        ? `${pctDe(r.reference_price_pct, 2, 4)}${r.reference_price_type === 'reference' ? ' (Referenzkurs)' : ''}`
        : null}
    />
    <Row l="Kurs-Zeitstempel" v={r.reference_price_date || fmtDate(r.reference_price_updated_at)} />
    <Row l="Anfrage am" v={fmtDate(r.requested_at || r.created_at)} />
    <Row l="Status" v={STATUS_DE[r.status] || r.status} />
  </div>
);

const OfferForm = ({ form, setForm }) => {
  const n = (v) => parseDeNumber(v) || 0;
  const nominal = n(form.nominal);
  const price = n(form.price_pct);
  const amount = nominal > 0 && price > 0 ? (nominal * price) / 100 : null;
  const total = amount != null ? amount + n(form.accrued_interest) + n(form.fees) : null;
  const field = (k, l, extra = {}) => (
    <div>
      <Label>{l}</Label>
      <Input inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`bond-offer-${k.replace('_', '-')}`} {...extra} />
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field('price_pct', 'Kurs in % *')}
        {field('nominal', 'Nominal (€) *')}
        {field('accrued_interest', 'Stückzinsen (€)')}
        {field('fees', 'Gebühren (€)')}
        <div>
          <Label>Gültig bis</Label>
          <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} data-testid="bond-offer-valid-until" />
        </div>
        <div>
          <Label>Anlagebetrag · Gesamtkosten</Label>
          <p className="mt-2 font-semibold tabular-nums" data-testid="bond-offer-total">
            {amount != null ? `${formatEUR(amount)} · ${formatEUR(total)}` : '–'}
          </p>
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
  const [offer, setOffer] = useState({ price_pct: '', nominal: '', accrued_interest: '', fees: '', valid_until: '', message: '' });
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!row) return;
    setText('');
    setError(null);
    const de = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
    setOffer({
      price_pct: de(row.offer?.price_pct ?? row.reference_price_pct),
      nominal: de(row.offer?.nominal ?? row.amount_eur),
      accrued_interest: de(row.offer?.accrued_interest),
      fees: de(row.offer?.fees),
      valid_until: row.offer?.valid_until ?? '',
      message: row.offer?.message ?? '',
    });
    if (action === 'details') {
      fetchJson(`/api/admin/bonds/requests/${row.id}/audit`).then(setAudit).catch(() => setAudit([]));
      if (row.offer && row.offer.admin_seen === false) {
        fetchJson(`/api/admin/bonds/requests/${row.id}/offer/seen`, { method: 'POST', body: '{}' }).catch(() => {});
      }
    }
  }, [row, action, fetchJson]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const num = (v) => parseDeNumber(v);
      const map = {
        note: ['notes', { text }],
        cancel: ['cancel', { decision_note: text || null }],
        offer: ['offer', {
          price_pct: num(offer.price_pct),
          nominal: num(offer.nominal),
          accrued_interest: offer.accrued_interest === '' ? null : num(offer.accrued_interest),
          fees: offer.fees === '' ? null : num(offer.fees),
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
                    <p className="font-medium">{OFFER_STATUS_DE[row.offer.status] || row.offer.status}</p>
                    Kurs {pctDe(row.offer.price_pct, 2, 4)} · Nominal {eurDe(row.offer.nominal)} · Anlagebetrag {eurDe(row.offer.amount_eur)}
                    {' · '}Stückzinsen {eurDe(row.offer.accrued_interest)} · Gebühren {eurDe(row.offer.fees)} · Gesamt {eurDe(row.offer.total_cost ?? row.offer.amount_eur)}
                    {row.offer.valid_until && ` · gültig bis ${dateDe(row.offer.valid_until)}`}
                    {row.offer.responded_at && ` · Kundenentscheidung am ${dateTimeDe(row.offer.responded_at)}`}
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

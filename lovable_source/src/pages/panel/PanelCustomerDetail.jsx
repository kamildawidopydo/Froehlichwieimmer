import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRound, Plus, Pencil, Trash2, Lock, Unlock, Ban, Wallet, Check, X } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { panelApi } from '@/lib/panelApi';
import {
  useLoad, State, Table, KycBadge, AccountBadge, TxBadge, OriginBadge, Pill, Input, Button, Field, act, ConfirmDialog,
  eur, num, pct, d, dt, CAT_LABEL, DOC_LABEL,
} from './_ui';
import KycDocViewer from './KycDocViewer';
import AdminKycUpload from './AdminKycUpload';

const FIELDS = [['first_name', 'Vorname'], ['last_name', 'Nachname'], ['phone', 'Telefon'], ['street', 'Straße'], ['house_number', 'Hausnummer'], ['postal_code', 'PLZ'], ['city', 'Ort'], ['country', 'Land']];
const addMonths = (iso, m) => { const x = new Date(`${iso}T00:00:00`); x.setMonth(x.getMonth() + Number(m)); return x.toISOString().slice(0, 10); };

function BookingDialog({ open, onOpenChange, customerId, products, onDone }) {
  const [f, setF] = useState({ product_id: '', quantity: '', unit_price: '', current_price: '', amount: '', interest_rate: '', purchase_date: new Date().toISOString().slice(0, 10), available_from: '', maturity_date: '', currency: 'EUR', fees: '', note: '' });
  const pr = products.find((p) => p.id === f.product_id);
  const sec = pr && ['aktie', 'anleihe'].includes(pr.category);
  const ipo = pr && pr.category === 'ipo';
  const term = pr && ['festgeld', 'flexgeld'].includes(pr.category);
  const bookingValue = sec ? Number(f.quantity || 0) * Number(f.unit_price || 0) : Number(f.amount || 0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <ConfirmDialog open={open} onOpenChange={onOpenChange} title="Produkt ins Depot buchen" confirmLabel="Buchung speichern" reasonOptional
      description="Interne Buchung für den Kunden – kein Börsengeschäft; der Bestand erscheint sofort im Depot des Kunden."
      onConfirm={async (reason) => {
        const r = await act(() => panelApi.post(`customers/${customerId}/positions`, { ...f, reason }), 'Buchung gespeichert');
        if (r) onDone(); return Boolean(r);
      }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Produkt" className="sm:col-span-2">
          <select className="h-10 w-full border border-bank-border bg-white px-3 text-sm" value={f.product_id}
            onChange={(e) => { const p = products.find((x) => x.id === e.target.value); setF({ ...f, product_id: e.target.value, currency: p?.currency || 'EUR', interest_rate: p?.category === 'ipo' ? '' : (p?.interest_rate ?? ''), unit_price: p?.category === 'ipo' ? (p?.market_price ?? f.unit_price) : f.unit_price, current_price: p?.category === 'ipo' ? (p?.market_price ?? '') : '', available_from: p?.category === 'festgeld' ? addMonths(f.purchase_date, 3) : '', maturity_date: p?.maturity_date || (p?.term_months ? addMonths(f.purchase_date, p.term_months) : '') }); }}>
            <option value="">Bitte wählen</option>
            {products.map((p) => <option key={p.id} value={p.id}>{CAT_LABEL[p.category]} · {p.name}{p.isin ? ` · ${p.isin}` : ''}{p.status === 'inactive' ? ' (inaktiv)' : ''}</option>)}
          </select>
        </Field>
        {pr && (sec ? <>
          <Field label="Stückzahl"><Input type="number" min="0" step="any" value={f.quantity} onChange={set('quantity')} /></Field>
          <Field label="Kaufpreis pro Stück (dokumentiert)"><Input type="number" min="0" step="any" value={f.unit_price} onChange={set('unit_price')} /></Field>
        </> : ipo ? <>
          <Field label="Zeichnungssumme"><Input type="number" min="0" step="any" value={f.amount} onChange={set('amount')} /></Field>
          <Field label="Zeichnungskurs je Stück"><Input type="number" min="0" step="any" value={f.unit_price} onChange={set('unit_price')} /></Field>
          <Field label="Aktueller Kurs je Stück"><Input type="number" min="0" step="any" value={f.current_price} onChange={set('current_price')} /></Field>
        </> : <>
          <Field label="Anlagebetrag"><Input type="number" min="0" step="any" value={f.amount} onChange={set('amount')} /></Field>
          <Field label="Vereinbarter Zinssatz %"><Input type="number" min="0" step="any" value={f.interest_rate} onChange={set('interest_rate')} /></Field>
        </>)}
        <Field label={term ? 'Startdatum (Anlage)' : 'Kaufdatum'}><Input type="date" value={f.purchase_date} onChange={set('purchase_date')} /></Field>
        {term && <Field label="Geld verfügbar ab"><Input type="date" value={f.available_from} onChange={set('available_from')} /></Field>}
        <Field label={term ? 'Enddatum (freiwillig)' : 'Fälligkeit (Festgeld/Anleihe)'}><Input type="date" value={f.maturity_date} onChange={set('maturity_date')} /></Field>
        {term && <p className="text-xs text-bank-text-muted sm:col-span-2">Startdatum = Tag der Anlage. „Verfügbar ab“ leer = sofort verfügbar. Das Enddatum kann leer bleiben – dann läuft die Anlage offen weiter.</p>}
        <Field label="Währung"><Input maxLength={3} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} /></Field>
        <Field label="Gebühren"><Input type="number" min="0" step="any" value={f.fees} onChange={set('fees')} /></Field>
        <Field label="Interne Notiz" className="sm:col-span-2"><Input value={f.note} onChange={set('note')} /></Field>
      </div>
      {pr && (
        <div className="border border-bank-border bg-bank-bg/50 p-3 text-sm">
          {sec && <p>Stückzahl: <b>{num(f.quantity || 0)}</b> · Kaufpreis je Stück: <b>{eur(f.unit_price || 0, f.currency)}</b></p>}
          <p>Buchungswert: <b>{eur(bookingValue, f.currency)}</b>{Number(f.fees) > 0 && <> · zzgl. Gebühren {eur(f.fees, f.currency)}</>}</p>
          {ipo && <p>Entspricht <b>{Number(f.unit_price) > 0 ? num(Math.round((Number(f.amount || 0) / Number(f.unit_price)) * 10000) / 10000) : '–'}</b> Stück zum Zeichnungskurs {eur(f.unit_price || 0, f.currency)}.</p>}
          {ipo && Number(f.current_price) > 0 && <p>Aktueller Kurs: <b>{eur(Number(f.current_price), f.currency)}</b>{Number(f.unit_price) > 0 && <> · Gewinn/Verlust: <b>{eur(Math.round((Number(f.current_price) - Number(f.unit_price)) * (Number(f.amount || 0) / Number(f.unit_price)) * 100) / 100, f.currency)}</b></>}</p>}
          {sec && <p className="text-xs text-bank-text-muted">Aktueller Marktpreis laut Produkt: {pr.market_price != null ? eur(pr.market_price, pr.currency) : 'nicht hinterlegt'} – unabhängig vom gebuchten Kaufpreis.</p>}
        </div>
      )}
    </ConfirmDialog>
  );
}

export default function PanelCustomerDetail({ defaultTab = 'stammdaten' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data, error, loading, reload } = useLoad(() => panelApi.get(`customers/${id}`), [id]);
  const products = useLoad(() => panelApi.get('products'));
  const [edit, setEdit] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [cash, setCash] = useState('');
  const c = data?.customer;
  const open = useMemo(() => (data?.positions || []).filter((p) => p.status === 'open'), [data]);
  const byCat = (cat) => open.filter((p) => p.product?.category === cat);

  const posTable = (cat) => {
    const rows = byCat(cat); const sec = ['aktie', 'anleihe'].includes(cat); const ipo = cat === 'ipo';
    return (
      <div className="mb-6">
        <h3 className="mb-2 font-display text-base">{{ aktie: 'Aktienbestände', anleihe: 'Anleihenbestände', ipo: 'IPO-Zeichnungen', festgeld: 'Festgeldanlagen', flexgeld: 'Flexgeldanlagen' }[cat]} <span className="text-sm text-bank-text-muted">· {eur(data.totals[{ aktie: 'aktien', anleihe: 'anleihen', ipo: 'ipo', festgeld: 'festgeld', flexgeld: 'flexgeld' }[cat]])}</span></h3>
        <Table head={sec ? ['Produkt', 'ISIN', 'Stück', 'Kaufpreis/Stück', 'Buchungswert', 'Marktpreis', 'Marktwert', 'Kaufdatum', 'Herkunft', ''] : ipo ? ['Produkt', 'ISIN / Ticker', 'Stück', 'Zeichnungskurs', 'Zeichnungssumme', 'Aktueller Kurs', 'Bewertung', 'Zeichnungstag', 'Herkunft', ''] : ['Produkt', 'Betrag', 'Zinssatz', 'Zinsertrag bisher', 'Startdatum', 'Verfügbar ab', 'Enddatum', 'Herkunft', '']}
          empty={rows.length ? null : 'Keine Bestände.'}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.product?.name}{p.note && <p className="text-xs text-bank-text-muted">{p.note}</p>}</td>
              {sec ? <>
                <td className="font-mono text-xs">{p.product?.isin || '–'}</td>
                <td>{num(p.quantity)}</td><td>{eur(p.unit_price, p.currency)}</td><td>{eur(p.booked_value, p.currency)}</td>
                <td>{p.product?.market_price != null ? eur(p.product.market_price, p.product.currency) : <Pill>nicht hinterlegt</Pill>}</td>
                <td>{p.market_value != null ? eur(p.market_value, p.currency) : '–'}</td>
              </> : ipo ? <>
                <td className="font-mono text-xs">{[p.product?.isin, p.product?.ticker].filter(Boolean).join(' · ') || '–'}</td>
                <td>{Number.isInteger(Number(p.quantity)) ? num(p.quantity, 0) : num(Math.round(Number(p.quantity) * 100) / 100, 2)}</td><td>{p.unit_price != null ? <>{eur(p.unit_price, p.currency)}<p className="text-[11px] text-bank-text-muted">je Stück</p></> : <span className="text-xs text-bank-text-muted">nicht erfasst</span>}</td><td>{eur(p.amount, p.currency)}</td>
                <td>{(p.current_price ?? p.product?.market_price) != null ? <>{eur(p.current_price ?? p.product.market_price, p.product?.currency || p.currency)}{p.current_price != null && <p className="text-[11px] text-bank-text-muted">manuell gepflegt</p>}</> : <Pill>noch nicht notiert</Pill>}</td>
                <td>{p.market_value != null ? <>{eur(p.market_value, p.currency)}{p.booked_value && <p className="text-[11px] text-bank-text-muted">{p.market_value >= p.booked_value ? '+' : ''}{num(Math.round(((p.market_value - p.booked_value) / p.booked_value) * 10000) / 100, 2)} %</p>}</> : <>{eur(p.booked_value ?? p.amount, p.currency)}<p className="text-[11px] text-bank-text-muted">wie gezeichnet</p></>}</td>
              </> : <>
                <td>{eur(p.amount, p.currency)}</td><td>{pct(p.interest_rate)}</td><td>{eur(p.accrued_interest, p.currency)}</td>
              </>}
              <td>{d(p.purchase_date)}</td>
              {!sec && !ipo && <td>{d(p.available_from || p.purchase_date)}</td>}
              {!sec && !ipo && <td>{d(p.maturity_date)}</td>}
              <td><OriginBadge o={p.origin} /></td>
              <td className="whitespace-nowrap">
                <Button size="icon" variant="ghost" aria-label="Bestand ändern" onClick={() => setAdjust({ ...p, sec, ipo, quantity: p.quantity, unit_price: p.unit_price ?? '', current_price: p.current_price ?? '', amount: p.amount, purchase_date: p.purchase_date || '', available_from: p.available_from || '', maturity_date: p.maturity_date || '' })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Aus Depot entfernen" onClick={() => setDialog({ kind: 'remove', pos: p })}><Trash2 className="h-4 w-4" /></Button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    );
  };

  return (
    <AdminSubpageLayout>
      <State loading={loading} error={error} onRetry={reload}>
        {c && <>
          <AdminSubpageHeader title={[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email} titleIcon={UserRound} backTo="/admin/kunden"
            eyebrow={`${c.customer_no} · Depot ${data.portfolio?.portfolio_no || '–'}`}
            description={<span className="flex flex-wrap items-center gap-2">{c.email} <KycBadge s={c.kyc_status} /> <AccountBadge s={c.account_status} /></span>}
            actions={<>
              {c.account_status !== 'active' && <Button variant="outline" onClick={() => setDialog({ kind: 'status', to: 'active' })}><Unlock className="mr-2 h-4 w-4" />Entsperren</Button>}
              {c.account_status === 'active' && <Button variant="outline" onClick={() => setDialog({ kind: 'status', to: 'locked' })}><Lock className="mr-2 h-4 w-4" />Sperren</Button>}
              {c.account_status !== 'deactivated' && <Button variant="outline" onClick={() => setDialog({ kind: 'status', to: 'deactivated' })}><Ban className="mr-2 h-4 w-4" />Deaktivieren</Button>}
              <Button variant="destructive" onClick={() => setDialog({ kind: 'delete' })}><Trash2 className="mr-2 h-4 w-4" />Löschen</Button>
            </>} />
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="stammdaten">Kundendaten</TabsTrigger>
              <TabsTrigger value="depot">Depot</TabsTrigger>
              <TabsTrigger value="transaktionen">Transaktionen</TabsTrigger>
              <TabsTrigger value="kyc">Verifizierung</TabsTrigger>
              <TabsTrigger value="historie">Änderungshistorie</TabsTrigger>
            </TabsList>

            <TabsContent value="stammdaten">
              <AdminSurfaceCard className="p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Kunden-ID"><Input value={c.customer_no} disabled /></Field>
                  <Field label="E-Mail"><Input value={c.email} disabled /></Field>
                  <Field label="Registriert"><Input value={dt(c.created_at)} disabled /></Field>
                  {FIELDS.map(([k, l]) => (
                    <Field key={k} label={l}><Input value={(edit ?? c)[k] ?? ''} disabled={!edit} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>
                  ))}
                  <Field label="Geburtsdatum"><Input type="date" value={(edit ?? c).birth_date ?? ''} disabled={!edit} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} /></Field>
                  <Field label="Interne Notiz" className="sm:col-span-2"><Input value={(edit ?? c).internal_note ?? ''} disabled={!edit} onChange={(e) => setEdit({ ...edit, internal_note: e.target.value })} /></Field>
                </div>
                <div className="mt-4 flex gap-2">
                  {!edit ? <Button variant="outline" onClick={() => setEdit({ ...c })}><Pencil className="mr-2 h-4 w-4" />Bearbeiten</Button> : <>
                    <Button onClick={() => setDialog({ kind: 'save' })}>Speichern</Button><Button variant="outline" onClick={() => setEdit(null)}>Abbrechen</Button>
                  </>}
                </div>
                <p className="mt-3 text-xs text-bank-text-muted">Passwörter werden ausschließlich vom Anmeldedienst verschlüsselt gespeichert und sind nicht einsehbar.</p>
              </AdminSurfaceCard>
            </TabsContent>

            <TabsContent value="depot">
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-7">
                {[['Gesamtwert', data.totals.gesamt], ['Liquidität', data.totals.liquiditaet], ['Aktien', data.totals.aktien], ['Börsengänge', data.totals.ipo], ['Anleihen', data.totals.anleihen], ['Festgeld', data.totals.festgeld], ['Flexgeld', data.totals.flexgeld]].map(([l, v]) => (
                  <div key={l} className="border border-bank-border bg-white p-3"><p className="text-xs text-bank-text-muted">{l}</p><p className="font-display text-lg">{eur(v)}</p></div>
                ))}
              </div>
              <AdminSurfaceCard className="p-5">
                <div className="mb-5 flex flex-wrap items-end gap-3">
                  <Button onClick={() => setDialog({ kind: 'book' })}><Plus className="mr-2 h-4 w-4" />Produkt hinzufügen</Button>
                  <Field label="Liquidität buchen (+ Einzahlung / − Auszahlung)"><Input type="number" step="any" value={cash} onChange={(e) => setCash(e.target.value)} className="w-56" /></Field>
                  <Button variant="outline" disabled={!Number(cash)} onClick={() => setDialog({ kind: 'cash' })}><Wallet className="mr-2 h-4 w-4" />Liquidität buchen</Button>
                </div>
                <p className="mb-4 text-xs text-bank-text-muted">Gesamtwert = Liquidität + Wertpapiere (Marktpreis × Stück, falls hinterlegt, sonst dokumentierter Kaufpreis × Stück) + Festgeld/Flexgeld-Anlagebeträge. Keine Verbindung zu einer Bank oder Börse – alle Werte sind administrativ erfasst.</p>
                {['aktie', 'anleihe', 'ipo', 'festgeld', 'flexgeld'].map((cat) => <React.Fragment key={cat}>{posTable(cat)}</React.Fragment>)}
                <h3 className="mb-2 font-display text-base">Offene Kauf- und Verkaufsaufträge</h3>
                <Table head={['Nr.', 'Produkt', 'Art', 'Menge', 'Status', 'Datum']} empty={data.transactions.some((t) => ['draft', 'submitted', 'in_review', 'accepted'].includes(t.status)) ? null : 'Keine offenen Aufträge.'}>
                  {data.transactions.filter((t) => ['draft', 'submitted', 'in_review', 'accepted'].includes(t.status)).map((t) => (
                    <tr key={t.id}><td className="font-mono text-xs">{t.tx_no}</td><td>{t.product?.name}</td><td>{t.side === 'buy' ? 'Kauf' : 'Verkauf'}</td><td>{Number(t.quantity) ? num(t.quantity) : eur(t.amount)}</td><td><TxBadge s={t.status} /></td><td>{dt(t.created_at)}</td></tr>
                  ))}
                </Table>
              </AdminSurfaceCard>
            </TabsContent>

            <TabsContent value="transaktionen">
              <AdminSurfaceCard>
                <Table head={['Nr.', 'Produkt', 'Art', 'Menge/Betrag', 'Angezeigt', 'Ausgeführt', 'Gebühren', 'Gesamt', 'Status', 'Herkunft', 'Datum']} empty={data.transactions.length ? null : 'Keine Transaktionen.'}>
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.tx_no}</td><td>{t.product?.name}</td><td>{t.side === 'buy' ? 'Kauf' : 'Verkauf'}</td>
                      <td>{Number(t.quantity) ? num(t.quantity) : eur(t.amount)}</td><td>{num(t.displayed_price)}</td><td>{num(t.executed_price)}</td>
                      <td>{eur(t.fees)}</td><td>{eur(t.total)}</td><td><TxBadge s={t.status} /></td><td><OriginBadge o={t.origin} /></td><td>{dt(t.created_at)}</td>
                    </tr>
                  ))}
                </Table>
              </AdminSurfaceCard>
            </TabsContent>

            <TabsContent value="kyc">
              <AdminSurfaceCard className="p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-base">Ausweis & Adressnachweis</h3>
                  <AdminKycUpload customerId={id} customerName={`${c.customer_no} · ${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}`} onDone={reload} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="border border-bank-border p-3 text-sm">
                      <p className="font-medium">{DOC_LABEL[doc.doc_type]} <Pill>{{ accepted: 'Akzeptiert', pending: 'Zu prüfen', rejected: 'Abgelehnt', superseded: 'Ersetzt' }[doc.status] || doc.status}</Pill></p>
                      <p className="text-xs text-bank-text-muted">{doc.file_name} · hochgeladen {dt(doc.uploaded_at)}{doc.document_date && ` · Dokumentdatum ${d(doc.document_date)}`}{doc.address_doc_kind && ` · ${doc.address_doc_kind}`}</p>
                      <div className="flex flex-wrap items-end gap-2">
                        <KycDocViewer docId={doc.id} />
                        {doc.status !== 'accepted' && <Button size="sm" variant="outline" className="mt-2" onClick={async () => { if (await act(() => panelApi.post(`kyc/doc/${doc.id}/status`, { status: 'accepted' }), 'Dokument akzeptiert')) reload(); }}><Check className="mr-1.5 h-3.5 w-3.5" />Akzeptieren</Button>}
                        {doc.status !== 'rejected' && doc.status !== 'superseded' && <Button size="sm" variant="outline" className="mt-2" onClick={async () => { if (await act(() => panelApi.post(`kyc/doc/${doc.id}/status`, { status: 'rejected' }), 'Dokument abgelehnt')) reload(); }}><X className="mr-1.5 h-3.5 w-3.5" />Ablehnen</Button>}
                        <Button size="sm" variant="outline" className="mt-2 text-red-700" onClick={() => setDialog({ kind: 'deldoc', doc })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Löschen</Button>
                      </div>
                    </div>
                  ))}
                  {!data.documents.length && <p className="text-sm text-bank-text-muted">Noch keine Dokumente hochgeladen.</p>}
                </div>
                <h3 className="mb-2 mt-6 font-display text-base">Entscheidungen</h3>
                {data.reviews.map((r) => <p key={r.id} className="text-sm">{dt(r.created_at)} · <b>{{ approved: 'Bestätigt', more_documents: 'Unterlagen nachgefordert', rejected: 'Abgelehnt' }[r.decision]}</b> · {r.admin_email}{r.reason && ` – „${r.reason}“`}</p>)}
                {!data.reviews.length && <p className="text-sm text-bank-text-muted">Noch keine Entscheidung.</p>}
                <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/kyc')}>Zur KYC-Prüfung</Button>
              </AdminSurfaceCard>
            </TabsContent>

            <TabsContent value="historie">
              <AdminSurfaceCard>
                <Table head={['Zeitpunkt', 'Aktion', 'Von', 'Alt', 'Neu', 'Begründung']} empty={data.audit.length ? null : 'Keine Änderungen.'}>
                  {data.audit.map((a) => (
                    <tr key={a.id} className="align-top"><td className="whitespace-nowrap">{dt(a.created_at)}</td><td className="font-mono text-xs">{a.action}</td><td>{a.actor_email}</td>
                      <td className="max-w-[220px] break-words font-mono text-[11px]">{a.old_value ? JSON.stringify(a.old_value) : '–'}</td>
                      <td className="max-w-[220px] break-words font-mono text-[11px]">{a.new_value ? JSON.stringify(a.new_value) : '–'}</td><td>{a.reason || '–'}</td></tr>
                  ))}
                </Table>
              </AdminSurfaceCard>
            </TabsContent>
          </Tabs>

          <BookingDialog open={dialog?.kind === 'book'} onOpenChange={() => setDialog(null)} customerId={id} products={products.data?.items || []} onDone={reload} />
          <ConfirmDialog open={dialog?.kind === 'save'} onOpenChange={() => setDialog(null)} title="Kundendaten speichern"
            onConfirm={async (reason) => { const { first_name, last_name, phone, street, house_number, postal_code, city, country, birth_date, internal_note } = edit;
              const ok = await act(() => panelApi.patch(`customers/${id}`, { first_name, last_name, phone, street, house_number, postal_code, city, country, birth_date, internal_note, reason }), 'Gespeichert');
              if (ok) { setEdit(null); reload(); } return ok; }} />
          <ConfirmDialog open={dialog?.kind === 'status'} onOpenChange={() => setDialog(null)} danger={dialog?.to !== 'active'}
            title={{ active: 'Konto entsperren', locked: 'Konto sperren', deactivated: 'Konto deaktivieren' }[dialog?.to]}
            description="Gesperrte oder deaktivierte Kunden können keine Aufträge erteilen."
            onConfirm={async (reason) => { const ok = await act(() => panelApi.post(`customers/${id}/status`, { account_status: dialog.to, reason }), 'Status geändert'); if (ok) reload(); return ok; }} />
          <ConfirmDialog open={dialog?.kind === 'delete'} onOpenChange={() => setDialog(null)} danger confirmLabel="Endgültig löschen" title="Kunden löschen"
            description="Nur möglich, wenn keine Buchungen, Bestände oder Liquidität vorhanden sind. Sonst bitte deaktivieren (Aufbewahrungspflicht)."
            onConfirm={async (reason) => { const ok = await act(() => panelApi.del(`customers/${id}`, { reason }), 'Kunde gelöscht'); if (ok) navigate('/admin/kunden'); return ok; }} />
          <ConfirmDialog open={dialog?.kind === 'cash'} onOpenChange={() => setDialog(null)} reasonOptional title={`Liquidität ${Number(cash) > 0 ? 'einbuchen' : 'ausbuchen'}: ${eur(Math.abs(Number(cash)))}`}
            description="Manuelle Buchung ohne Bankanbindung – wird protokolliert."
            onConfirm={async (reason) => { const ok = await act(() => panelApi.post(`customers/${id}/cash`, { delta: Number(cash), reason }), 'Liquidität gebucht'); if (ok) { setCash(''); reload(); } return ok; }} />
          <ConfirmDialog open={dialog?.kind === 'deldoc'} onOpenChange={() => setDialog(null)} danger reasonOptional title={`Dokument „${dialog?.doc?.file_name}“ löschen`} description="Die Datei wird endgültig entfernt. Der Vorgang wird im Audit-Log festgehalten." confirmLabel="Endgültig löschen"
            onConfirm={async (reason) => { const ok = await act(() => panelApi.del(`kyc/doc/${dialog.doc.id}`, { reason }), 'Dokument gelöscht'); if (ok) reload(); return ok; }} />
          <ConfirmDialog open={dialog?.kind === 'remove'} onOpenChange={() => setDialog(null)} danger title={`„${dialog?.pos?.product?.name}“ aus dem Depot entfernen`}
            onConfirm={async (reason) => { const ok = await act(() => panelApi.del(`positions/${dialog.pos.id}`, { reason }), 'Entfernt'); if (ok) reload(); return ok; }} />
          <ConfirmDialog open={Boolean(adjust)} onOpenChange={() => setAdjust(null)} reasonOptional title={`Bestand ändern: ${adjust?.product?.name || ''}`}
            description="Alter und neuer Wert werden protokolliert – eine Begründung ist freiwillig."
            onConfirm={async (reason) => { const ok = await act(() => panelApi.patch(`positions/${adjust.id}`, adjust.sec ? { quantity: adjust.quantity, unit_price: adjust.unit_price, reason } : adjust.ipo ? { amount: adjust.amount, unit_price: adjust.unit_price, current_price: adjust.current_price === '' ? undefined : adjust.current_price, purchase_date: adjust.purchase_date, maturity_date: adjust.maturity_date, reason } : { amount: adjust.amount, interest_rate: adjust.interest_rate, purchase_date: adjust.purchase_date, available_from: adjust.available_from, maturity_date: adjust.maturity_date, reason }), 'Bestand geändert'); if (ok) reload(); return ok; }}>
            {adjust && <div className="grid gap-3 sm:grid-cols-2">
              {adjust.sec ? <>
                <Field label="Stückzahl"><Input type="number" min="0" step="any" value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} /></Field>
                <Field label="Kaufpreis pro Stück"><Input type="number" min="0" step="any" value={adjust.unit_price} onChange={(e) => setAdjust({ ...adjust, unit_price: e.target.value })} /></Field>
                <p className="text-sm sm:col-span-2">Neuer Buchungswert: <b>{eur(Number(adjust.quantity || 0) * Number(adjust.unit_price || 0))}</b></p>
              </> : adjust.ipo ? <>
                <Field label="Zeichnungssumme"><Input type="number" min="0" step="any" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} /></Field>
                <Field label="Zeichnungskurs je Stück"><Input type="number" min="0" step="any" value={adjust.unit_price ?? ''} onChange={(e) => setAdjust({ ...adjust, unit_price: e.target.value })} /></Field>
                <Field label="Aktueller Kurs je Stück"><Input type="number" min="0" step="any" value={adjust.current_price ?? ''} onChange={(e) => setAdjust({ ...adjust, current_price: e.target.value })} /></Field>
                <p className="text-sm sm:col-span-2">Entspricht <b>{Number(adjust.unit_price) > 0 ? num(Math.round((Number(adjust.amount || 0) / Number(adjust.unit_price)) * 10000) / 10000) : '–'}</b> Stück.</p>
                <Field label="Zeichnungstag"><Input type="date" value={adjust.purchase_date ?? ''} onChange={(e) => setAdjust({ ...adjust, purchase_date: e.target.value })} /></Field>
                <Field label="Enddatum (freiwillig)"><Input type="date" value={adjust.maturity_date ?? ''} onChange={(e) => setAdjust({ ...adjust, maturity_date: e.target.value })} /></Field>
              </> : <>
                <Field label="Anlagebetrag"><Input type="number" min="0" step="any" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} /></Field>
                <Field label="Zinssatz %"><Input type="number" min="0" step="any" value={adjust.interest_rate ?? ''} onChange={(e) => setAdjust({ ...adjust, interest_rate: e.target.value })} /></Field>
                <Field label="Startdatum (Anlage)"><Input type="date" value={adjust.purchase_date ?? ''} onChange={(e) => setAdjust({ ...adjust, purchase_date: e.target.value })} /></Field>
                <Field label="Geld verfügbar ab"><Input type="date" value={adjust.available_from ?? ''} onChange={(e) => setAdjust({ ...adjust, available_from: e.target.value })} /></Field>
                <Field label="Enddatum (freiwillig)"><Input type="date" value={adjust.maturity_date ?? ''} onChange={(e) => setAdjust({ ...adjust, maturity_date: e.target.value })} /></Field>
              </>}
            </div>}
          </ConfirmDialog>
        </>}
      </State>
    </AdminSubpageLayout>
  );
}

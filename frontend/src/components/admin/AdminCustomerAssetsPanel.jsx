import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Trash2, Plus, Download, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/apiBase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const opts = { withCredentials: true };
const eur = (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const today = () => new Date().toISOString().slice(0, 10);
const idem = () => `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return d || e?.message || 'Fehler';
};

const TABS = [
  ['contract', 'Festgeld / Tagesgeld'],
  ['stock', 'Aktie'],
  ['bond', 'Anleihe'],
  ['cash', 'Guthaben'],
  ['document', 'Dokument'],
];

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">{label}</span>
    {children}
  </label>
);

const selectCls = 'h-10 w-full border border-bank-border bg-white px-3 text-sm';

const ContractForm = ({ userId, onDone }) => {
  const [banks, setBanks] = useState([]);
  const [f, setF] = useState({ bank_id: '', product_type: 'festgeld', amount_eur: '', zinssatz: '', laufzeit_monate: '12', active_from: today(), active_until: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  useEffect(() => {
    axios.get(apiUrl('/api/admin/banks/list?limit=500'), opts).then(({ data }) => setBanks(data?.items || [])).catch(() => setBanks([]));
  }, []);
  const submit = async () => {
    const fest = f.product_type === 'festgeld';
    await axios.post(apiUrl(`/api/admin/customers/${userId}/depot-contracts`), {
      bank_id: f.bank_id,
      product_type: f.product_type,
      amount_eur: Number(f.amount_eur),
      zinssatz: Number(f.zinssatz),
      laufzeit_monate: fest && f.laufzeit_monate ? Number(f.laufzeit_monate) : null,
      active_from: f.active_from,
      active_until: f.active_until || null,
    }, opts);
  };
  return (
    <FormShell onSubmit={submit} onDone={onDone} testid="asset-form-contract">
      <Field label="Bank *">
        <select className={selectCls} value={f.bank_id} onChange={set('bank_id')} required data-testid="asset-contract-bank">
          <option value="">Bank auswählen…</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.country})</option>)}
        </select>
      </Field>
      <Field label="Produkt *">
        <select className={selectCls} value={f.product_type} onChange={set('product_type')} data-testid="asset-contract-type">
          <option value="festgeld">Festgeld</option>
          <option value="tagesgeld">Tagesgeld</option>
          <option value="flexgeld">Flexgeld</option>
        </select>
      </Field>
      <Field label="Betrag (€) *"><Input type="number" min="1" step="0.01" required value={f.amount_eur} onChange={set('amount_eur')} data-testid="asset-contract-amount" /></Field>
      <Field label="Zinssatz (% p.a.) *"><Input type="number" min="0" step="0.01" required value={f.zinssatz} onChange={set('zinssatz')} data-testid="asset-contract-rate" /></Field>
      {f.product_type === 'festgeld' && (
        <Field label="Laufzeit (Monate)"><Input type="number" min="1" value={f.laufzeit_monate} onChange={set('laufzeit_monate')} data-testid="asset-contract-term" /></Field>
      )}
      <Field label="Beginn *"><Input type="date" required value={f.active_from} onChange={set('active_from')} data-testid="asset-contract-from" /></Field>
      <Field label="Ende / Fälligkeit"><Input type="date" value={f.active_until} onChange={set('active_until')} data-testid="asset-contract-until" /></Field>
    </FormShell>
  );
};

const StockForm = ({ userId, onDone }) => {
  const [f, setF] = useState({ symbol: '', name: '', quantity: '', avg_cost: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = () => axios.post(apiUrl(`/api/admin/customers/${userId}/stock-positions`), {
    symbol: f.symbol, name: f.name || null, quantity: Number(f.quantity), avg_cost: Number(f.avg_cost),
  }, opts);
  return (
    <FormShell onSubmit={submit} onDone={onDone} testid="asset-form-stock">
      <Field label="Kürzel *"><Input required placeholder="z. B. SAP" value={f.symbol} onChange={set('symbol')} data-testid="asset-stock-symbol" /></Field>
      <Field label="Name"><Input placeholder="z. B. SAP SE" value={f.name} onChange={set('name')} data-testid="asset-stock-name" /></Field>
      <Field label="Stückzahl *"><Input type="number" min="0" step="any" required value={f.quantity} onChange={set('quantity')} data-testid="asset-stock-qty" /></Field>
      <Field label="Kaufkurs je Stück (€) *"><Input type="number" min="0" step="0.0001" required value={f.avg_cost} onChange={set('avg_cost')} data-testid="asset-stock-cost" /></Field>
    </FormShell>
  );
};

const BondForm = ({ userId, onDone }) => {
  const [f, setF] = useState({ isin: '', bond_name: '', issuer: '', nominal_betrag: '', kurs: '100', coupon_rate: '', maturity_date: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = () => axios.post(apiUrl(`/api/admin/customers/${userId}/bond-positions`), {
    isin: f.isin, bond_name: f.bond_name, issuer: f.issuer || null, nominal_betrag: Number(f.nominal_betrag),
    kurs: Number(f.kurs || 100), coupon_rate: f.coupon_rate === '' ? null : Number(f.coupon_rate), maturity_date: f.maturity_date || null,
  }, opts);
  return (
    <FormShell onSubmit={submit} onDone={onDone} testid="asset-form-bond">
      <Field label="ISIN *"><Input required value={f.isin} onChange={set('isin')} data-testid="asset-bond-isin" /></Field>
      <Field label="Bezeichnung *"><Input required value={f.bond_name} onChange={set('bond_name')} data-testid="asset-bond-name" /></Field>
      <Field label="Emittent"><Input value={f.issuer} onChange={set('issuer')} data-testid="asset-bond-issuer" /></Field>
      <Field label="Nominalbetrag (€) *"><Input type="number" min="1" step="0.01" required value={f.nominal_betrag} onChange={set('nominal_betrag')} data-testid="asset-bond-nominal" /></Field>
      <Field label="Kurs (%)"><Input type="number" min="0" step="0.01" value={f.kurs} onChange={set('kurs')} data-testid="asset-bond-price" /></Field>
      <Field label="Kupon (% p.a.)"><Input type="number" min="0" step="0.01" value={f.coupon_rate} onChange={set('coupon_rate')} data-testid="asset-bond-coupon" /></Field>
      <Field label="Fälligkeit"><Input type="date" value={f.maturity_date} onChange={set('maturity_date')} data-testid="asset-bond-maturity" /></Field>
    </FormShell>
  );
};

const CashForm = ({ userId, onDone }) => {
  const [f, setF] = useState({ direction: 'credit', amount: '', text: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = () => (f.direction === 'credit'
    ? axios.post(apiUrl('/api/admin/portfolio/cash/deposit'), { user_id: userId, amount: String(f.amount), description: f.text || 'Einzahlung', idempotency_key: idem() }, opts)
    : axios.post(apiUrl('/api/admin/portfolio/cash/adjustment'), { user_id: userId, direction: 'debit', amount: String(f.amount), reason: f.text || 'Auszahlung', idempotency_key: idem() }, opts));
  return (
    <FormShell onSubmit={submit} onDone={onDone} testid="asset-form-cash">
      <Field label="Art *">
        <select className={selectCls} value={f.direction} onChange={set('direction')} data-testid="asset-cash-direction">
          <option value="credit">Gutschrift (Einzahlung)</option>
          <option value="debit">Belastung (Auszahlung)</option>
        </select>
      </Field>
      <Field label="Betrag (€) *"><Input type="number" min="0.01" step="0.01" required value={f.amount} onChange={set('amount')} data-testid="asset-cash-amount" /></Field>
      <Field label="Buchungstext"><Input placeholder="z. B. Einzahlung per Überweisung" value={f.text} onChange={set('text')} data-testid="asset-cash-text" /></Field>
    </FormShell>
  );
};

const DocumentForm = ({ userId, onDone }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const submit = () => {
    const form = new FormData();
    form.append('title', title);
    form.append('file', file);
    return axios.post(apiUrl(`/api/admin/customers/${userId}/documents`), form, opts);
  };
  return (
    <FormShell onSubmit={submit} onDone={onDone} testid="asset-form-document">
      <Field label="Titel *"><Input required placeholder="z. B. Festgeldvertrag ING" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="asset-doc-title" /></Field>
      <Field label="Datei (PDF, JPG, PNG) *">
        <input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" data-testid="asset-doc-file" />
      </Field>
    </FormShell>
  );
};

const FormShell = ({ onSubmit, onDone, testid, children }) => {
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit();
      toast.success('Gespeichert – der Kunde sieht es jetzt in seinem Depot.');
      e.target.reset();
      onDone();
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${errMsg(err)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={handle} className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid={testid}>
      {children}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} className="bg-bank-primary text-white" data-testid={`${testid}-submit`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Hinzufügen
        </Button>
      </div>
    </form>
  );
};

const FORMS = { contract: ContractForm, stock: StockForm, bond: BondForm, cash: CashForm, document: DocumentForm };

const ItemRow = ({ title, sub, value, onDelete, onDownload, testid }) => (
  <li className="flex items-center justify-between gap-3 px-4 py-3" data-testid={testid}>
    <div className="min-w-0">
      <p className="truncate text-[13px] font-medium text-bank-text">{title}</p>
      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">{sub}</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {value && <span className="text-[13px] tabular-nums text-bank-text">{value}</span>}
      {onDownload && (
        <button type="button" onClick={onDownload} className="p-1.5 text-bank-text-muted hover:text-bank-text" aria-label="Herunterladen" data-testid={`${testid}-download`}>
          <Download size={14} />
        </button>
      )}
      <button type="button" onClick={onDelete} className="p-1.5 text-red-600 hover:bg-red-50" aria-label="Entfernen" data-testid={`${testid}-delete`}>
        <Trash2 size={14} />
      </button>
    </div>
  </li>
);

const remove = async (url, label, onDone) => {
  if (!window.confirm(`${label} wirklich entfernen?`)) return;
  try {
    await axios.delete(apiUrl(url), opts);
    toast.success('Entfernt.');
    onDone();
  } catch (err) {
    toast.error(`Entfernen fehlgeschlagen: ${errMsg(err)}`);
  }
};

const downloadDoc = async (doc) => {
  try {
    const { data } = await axios.get(apiUrl(`/api/admin/customer-documents/${doc.id}/download`), { ...opts, responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename || 'dokument';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(`Download fehlgeschlagen: ${errMsg(err)}`);
  }
};

const AssetList = ({ assets, onChanged }) => {
  const rows = [
    ...assets.depot_contracts.map((c) => (
      <ItemRow key={`c-${c.id}`} testid={`asset-contract-${c.id}`} title={`${c.banks?.name || 'Bank'} · ${c.product_type}`}
        sub={`${c.zinssatz}% p.a. · ab ${c.active_from}${c.active_until ? ` bis ${c.active_until}` : ''}`} value={eur(c.amount_eur)}
        onDelete={() => remove(`/api/admin/depot-contracts/${c.id}`, 'Vertrag', onChanged)} />
    )),
    ...assets.stock_positions.map((s) => (
      <ItemRow key={`s-${s.id}`} testid={`asset-stock-${s.id}`} title={`${s.symbol}${s.name ? ` · ${s.name}` : ''}`}
        sub={`${s.quantity} Stk · Kaufkurs ${eur(s.avg_cost)}`} value={eur(s.quantity * s.avg_cost)}
        onDelete={() => remove(`/api/admin/stock-positions/${s.id}`, 'Aktienposition', onChanged)} />
    )),
    ...assets.bond_positions.map((b) => (
      <ItemRow key={`b-${b.id}`} testid={`asset-bond-${b.id}`} title={b.bond_name || b.isin}
        sub={`${b.isin} · Kurs ${b.aktueller_kurs ?? 100}%`} value={eur(b.nominal_betrag)}
        onDelete={() => remove(`/api/admin/bond-positions/${b.id}`, 'Anleihe', onChanged)} />
    )),
    ...assets.documents.map((d) => (
      <ItemRow key={`d-${d.id}`} testid={`asset-doc-${d.id}`} title={d.title} sub={d.filename}
        onDownload={() => downloadDoc(d)} onDelete={() => remove(`/api/admin/customer-documents/${d.id}`, 'Dokument', onChanged)} />
    )),
  ];
  if (!rows.length) {
    return <p className="p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">Noch nichts eingetragen</p>;
  }
  return <ul className="divide-y divide-bank-border">{rows}</ul>;
};

export const AdminCustomerAssetsPanel = ({ userId, assets, onChanged }) => {
  const [tab, setTab] = useState('contract');
  const Form = FORMS[tab];
  return (
    <div className="space-y-6" data-testid="admin-customer-assets-panel">
      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} data-testid={`asset-tab-${key}`}
            className={`border px-3 py-1.5 text-[12.5px] transition-colors ${tab === key ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border text-bank-text hover:bg-bank-bg'}`}>
            {label}
          </button>
        ))}
      </div>
      <Form key={tab} userId={userId} onDone={onChanged} />
      <div>
        <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
          Eingetragen · Guthaben {eur(assets.cash_balance)}
        </h3>
        <div className="max-h-96 overflow-auto border border-bank-border bg-bank-bg/30">
          <AssetList assets={assets} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerAssetsPanel;

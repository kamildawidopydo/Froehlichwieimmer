import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Download } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { panelApi, API_BASE } from '@/lib/panelApi';
import { useLoad, State, Table, KycBadge, AccountBadge, Input, Button, Field, act, d, eur, KYC_LABEL } from './_ui';

const EMPTY = { email: '', first_name: '', last_name: '', phone: '', street: '', house_number: '', postal_code: '', city: '', country: 'Deutschland', birth_date: '' };

export default function PanelCustomers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => panelApi.get('customers', { q, status }), [q, status]);
  const items = [...(data?.items || [])].sort((a, b) =>
    sort === 'name' ? `${a.last_name || ''}${a.first_name || ''}`.localeCompare(`${b.last_name || ''}${b.first_name || ''}`)
      : sort === 'no' ? a.customer_no.localeCompare(b.customer_no) : 0);
  const create = async () => {
    const r = await act(() => panelApi.post('customers', form), 'Kunde angelegt');
    if (r) { setOpen(false); setForm(EMPTY); navigate(`/admin/kunden/${r.customer.id}`); }
  };
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Kunden" titleIcon={Users} description="Alle Kunden mit Kunden-ID, Verifizierungs- und Kontostatus. Passwörter sind nie einsehbar."
        actions={<>
          <Button variant="outline" asChild><a href={`${API_BASE}/admin/panel/export/customers.csv`}><Download className="mr-2 h-4 w-4" />CSV-Export</a></Button>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Kunde anlegen</Button>
        </>} />
      <AdminToolbarCard className="flex flex-wrap gap-3">
        <Input className="max-w-sm" placeholder="Name, E-Mail oder Kunden-ID suchen" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 border border-bank-border bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Verifizierungsstatus</option>
          {Object.entries(KYC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="h-10 border border-bank-border bg-white px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created">Neueste zuerst</option><option value="name">Nach Name</option><option value="no">Nach Kunden-ID</option>
        </select>
      </AdminToolbarCard>
      <AdminSurfaceCard>
        <State loading={loading} error={error} onRetry={reload}>
          <Table head={['Kunden-ID', 'Name', 'E-Mail', 'Depot', 'Liquidität', 'Verifizierung', 'Konto', 'Registriert']} empty={items.length ? null : 'Keine Kunden gefunden.'}>
            {items.map((c) => (
              <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/kunden/${c.id}`)}>
                <td className="font-mono text-xs"><Link to={`/admin/kunden/${c.id}`}>{c.customer_no}</Link></td>
                <td>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '–'}</td>
                <td>{c.email}</td>
                <td className="font-mono text-xs">{c.portfolio?.[0]?.portfolio_no ?? c.portfolio?.portfolio_no ?? '–'}</td>
                <td>{eur(c.portfolio?.[0]?.cash_balance ?? c.portfolio?.cash_balance)}</td>
                <td><KycBadge s={c.kyc_status} /></td>
                <td><AccountBadge s={c.account_status} /></td>
                <td>{d(c.created_at)}</td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Neuen Kunden anlegen</DialogTitle>
            <DialogDescription>Es wird ein Konto mit eigener Kunden-ID und eigenem Depot angelegt. Der Kunde vergibt sein Passwort selbst über „Passwort vergessen“.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['email', 'E-Mail *'], ['first_name', 'Vorname'], ['last_name', 'Nachname'], ['phone', 'Telefon'], ['street', 'Straße'], ['house_number', 'Hausnummer'], ['postal_code', 'PLZ'], ['city', 'Ort'], ['country', 'Land']].map(([k, l]) => (
              <Field key={k} label={l}><Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
            ))}
            <Field label="Geburtsdatum"><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button disabled={!form.email} onClick={create}>Anlegen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSubpageLayout>
  );
}

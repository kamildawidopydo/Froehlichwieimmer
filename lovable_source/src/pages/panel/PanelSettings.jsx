import React, { useEffect, useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, Input, Button, Field, Textarea, act, Pill, PERM_LABEL } from './_ui';

export default function PanelSettings() {
  const settings = useLoad(() => panelApi.get('settings'));
  const me = useLoad(() => panelApi.get('me'));
  const staff = useLoad(() => (me.data?.is_admin ? panelApi.get('staff') : Promise.resolve({ items: [] })), [me.data?.is_admin]);
  const [kinds, setKinds] = useState('');
  const [age, setAge] = useState(4);
  const [newStaff, setNewStaff] = useState({ email: '', permissions: [] });
  useEffect(() => { if (settings.data) { setKinds(settings.data.address_doc_kinds.join('\n')); setAge(settings.data.address_doc_max_age_months); } }, [settings.data]);
  const isAdmin = me.data?.is_admin;
  const toggle = (p) => setNewStaff((s) => ({ ...s, permissions: s.permissions.includes(p) ? s.permissions.filter((x) => x !== p) : [...s.permissions, p] }));
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Einstellungen" titleIcon={Settings} description="Zugelassene Adressnachweise und Mitarbeiterrechte. Änderungen nur durch Administratoren." />
      <State loading={settings.loading || me.loading} error={settings.error || me.error} onRetry={settings.reload}>
        <AdminSurfaceCard className="mb-6 p-5">
          <h2 className="mb-3 font-display text-lg">Adressnachweis</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Zugelassene Dokumenttypen (eine Zeile je Typ)" className="md:col-span-2"><Textarea rows={7} value={kinds} disabled={!isAdmin} onChange={(e) => setKinds(e.target.value)} /></Field>
            <Field label="Höchstalter des Dokuments (Monate)"><Input type="number" min="1" max="24" value={age} disabled={!isAdmin} onChange={(e) => setAge(e.target.value)} /></Field>
          </div>
          {isAdmin && <Button className="mt-4" onClick={() => act(() => panelApi.put('settings', { address_doc_kinds: kinds.split('\n').map((s) => s.trim()).filter(Boolean), address_doc_max_age_months: age }), 'Gespeichert')}>Speichern</Button>}
        </AdminSurfaceCard>
        {isAdmin && (
          <AdminSurfaceCard className="p-5">
            <h2 className="mb-1 font-display text-lg">Mitarbeiter mit eingeschränkten Rechten</h2>
            <p className="mb-4 text-sm text-bank-text-muted">Die Person muss sich zuerst selbst registriert haben. Mitarbeiter sehen nur die Bereiche, die Sie hier freigeben.</p>
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <Field label="E-Mail"><Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} /></Field>
              <div className="flex flex-wrap gap-x-4 gap-y-1">{(settings.data?.permissions || []).map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={newStaff.permissions.includes(p)} onChange={() => toggle(p)} />{PERM_LABEL[p]}</label>
              ))}</div>
              <Button disabled={!newStaff.email} onClick={async () => { const ok = await act(() => panelApi.post('staff', newStaff), 'Rechte gespeichert'); if (ok) { setNewStaff({ email: '', permissions: [] }); staff.reload(); } }}>Speichern</Button>
            </div>
            <State loading={staff.loading} error={staff.error}>
              <Table head={['E-Mail', 'Rolle', 'Rechte', '']}>
                {(staff.data?.items || []).map((s) => (
                  <tr key={s.user_id}>
                    <td>{s.email}</td><td>{s.role === 'admin' ? <Pill tone="green">Administrator</Pill> : <Pill tone="blue">Mitarbeiter</Pill>}</td>
                    <td className="text-xs">{s.role === 'admin' ? 'Alle Rechte' : s.permissions.map((p) => PERM_LABEL[p]).join(', ') || 'keine'}</td>
                    <td>{s.role !== 'admin' && <>
                      <Button size="sm" variant="ghost" onClick={() => setNewStaff({ email: s.email, permissions: s.permissions })}>Bearbeiten</Button>
                      <Button size="icon" variant="ghost" aria-label="Entfernen" onClick={async () => { const ok = await act(() => panelApi.del(`staff/${s.user_id}`), 'Entfernt'); if (ok) staff.reload(); }}><Trash2 className="h-4 w-4" /></Button>
                    </>}</td>
                  </tr>
                ))}
              </Table>
            </State>
          </AdminSurfaceCard>
        )}
      </State>
    </AdminSubpageLayout>
  );
}

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { careersApi, errMsg } from '@/lib/careersApi';

const Card = ({ title, children, testid }) => (
  <section className="rounded-2xl border border-black/5 bg-white p-6" data-testid={testid}><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>
);

const Toggle = ({ label, desc, checked, onChange, testid }) => (
  <div className="flex items-start justify-between gap-4 border-b border-black/5 py-4 last:border-0">
    <div><p className="font-medium">{label}</p><p className="text-sm text-[#686A64]">{desc}</p></div>
    <Switch checked={checked} onCheckedChange={onChange} data-testid={testid} />
  </div>
);

const Team = () => {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ email: '', name: '' });
  const [created, setCreated] = useState(null);
  const load = () => careersApi.get('/admin/team').then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    try { const r = await careersApi.post('/admin/team', f); setCreated(r.data); setF({ email: '', name: '' }); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const del = async (u) => { if (window.confirm(`Zugang für ${u.email} entfernen?`)) { await careersApi.delete(`/admin/team/${u.id}`); load(); } };
  return (
    <Card title="Recruiting-Zugänge" testid="recruiting-team">
      <p className="text-sm text-[#686A64]">Diese Konten sehen nur Stellen und Bewerbungen – keine Kundendaten.</p>
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input required className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="team-name" />
        <input required type="email" className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm" placeholder="E-Mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="team-email" />
        <button type="submit" className="rounded-full bg-[#36A852] px-4 py-2 text-sm font-semibold text-white" data-testid="team-add">Zugang anlegen</button>
      </form>
      {created && (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm" data-testid="team-created">
          Zugang für <b>{created.email}</b> angelegt. Vorläufiges Passwort: <code className="font-mono">{created.temporary_password}</code> – bitte sicher weitergeben, es wird nur einmal angezeigt.
        </p>
      )}
      <ul className="mt-4 divide-y divide-black/5">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2.5 text-sm"><span>{u.name} · {u.email}</span><button type="button" className="text-rose-600" onClick={() => del(u)} data-testid={`team-remove-${u.id}`}>Entfernen</button></li>
        ))}
      </ul>
    </Card>
  );
};

export default function RecruitingSettings() {
  const { user } = useOutletContext();
  const [s, setS] = useState(null);
  useEffect(() => { careersApi.get('/admin/settings').then((r) => setS(r.data)); }, []);
  const save = async (next, msg = 'Einstellungen gespeichert') => {
    try {
      const r = await careersApi.put('/admin/settings', { applications_enabled: next.applications_enabled, site_public: next.site_public, retention_days: Number(next.retention_days), notify_email: next.notify_email || null });
      setS(r.data); toast.success(msg);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const runRetention = async () => {
    if (!window.confirm(`${s.expired_count} Bewerbung(en) älter als ${s.retention_days} Tage endgültig löschen?`)) return;
    const r = await careersApi.post('/admin/retention/run');
    toast.success(`${r.data.deleted} Bewerbung(en) gelöscht`);
    const fresh = await careersApi.get('/admin/settings');
    setS(fresh.data);
  };
  if (!s) return null;
  return (
    <div className="max-w-3xl space-y-6" data-testid="recruiting-settings">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <Card title="Freigabe">
        <Toggle label="Karriereseite öffentlich sichtbar" desc="Aus: Besucher sehen „in Vorbereitung“. Sie selbst sehen weiterhin die Vorschau." checked={s.site_public}
          onChange={(v) => save({ ...s, site_public: v }, v ? 'Karriereseite ist jetzt öffentlich' : 'Karriereseite verborgen')} testid="settings-site-public" />
        <Toggle label="Online-Bewerbungen annehmen" desc="Aus: Das Formular ist sichtbar, kann aber nicht abgeschickt werden." checked={s.applications_enabled}
          onChange={(v) => save({ ...s, applications_enabled: v }, v ? 'Bewerbungen aktiviert' : 'Bewerbungen deaktiviert')} testid="settings-applications-enabled" />
      </Card>
      <Card title="Benachrichtigung & Aufbewahrung">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium">E-Mail für neue Bewerbungen</span>
            <input type="email" className="w-full rounded-lg border border-black/10 px-3 py-2" placeholder="Standard: Admin-Adresse" value={s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.value })} data-testid="settings-notify-email" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Aufbewahrungsfrist (Tage)</span>
            <input type="number" min={30} max={3650} className="w-full rounded-lg border border-black/10 px-3 py-2" value={s.retention_days} onChange={(e) => setS({ ...s, retention_days: e.target.value })} data-testid="settings-retention-days" /></label>
        </div>
        <button type="button" onClick={() => save(s)} className="mt-4 rounded-full bg-[#36A852] px-5 py-2 text-sm font-semibold text-white" data-testid="settings-save">Speichern</button>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F5F0] p-4 text-sm">
          <span data-testid="settings-expired-count">{s.expired_count} Bewerbung(en) überschreiten die Aufbewahrungsfrist.</span>
          <button type="button" disabled={!s.expired_count} onClick={runRetention} className="rounded-full border border-rose-200 px-4 py-2 text-rose-700 disabled:opacity-40" data-testid="settings-run-retention">Jetzt löschen</button>
        </div>
        <p className="mt-3 text-xs text-[#686A64]">Die Frist zählt ab der letzten Bearbeitung einer Bewerbung. Abgelaufene Bewerbungen werden zusätzlich automatisch (höchstens alle 6 Stunden geprüft) gelöscht. Gelöscht werden Bewerberdaten, Notizen sowie die verschlüsselten Dateien samt Schlüssel – endgültig.</p>
        <p className="mt-1 text-xs text-[#686A64]">Hinweis: Aufbewahrungsfrist und Datenschutzhinweise bitte vor Veröffentlichung rechtlich prüfen.</p>
      </Card>
      <Card title="Löschprotokoll" testid="settings-deletion-log">
        <p className="text-sm text-[#686A64]">Enthält keine personenbezogenen Daten. Nach einer Wiederherstellung aus einer Sicherung werden die hier protokollierten Bewerbungen automatisch erneut gelöscht.</p>
        {s.deletion_log.length === 0 ? <p className="mt-3 text-sm">Noch keine Löschungen.</p> : (
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {s.deletion_log.map((d, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2" data-testid="deletion-log-row">
                <span>{new Date(d.deleted_at).toLocaleString('de-DE')} · {d.reason}</span>
                <span className="text-[#686A64]">{d.files_deleted} Datei(en){d.by ? ` · ${d.by}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {user.role === 'admin' && <Team />}
    </div>
  );
}

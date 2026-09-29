// Session 93 · Phase 5 — Audit-Log-Viewer.
// Filterbar nach Entity-Type / Entity-ID / Action / Zeitraum.
// Before/After menschenlesbar; Raw-JSON optional aufklappbar.
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RefreshCw, Activity, ChevronDown, ChevronRight, User, Clock } from 'lucide-react';

const ENTITY_TYPES = ['', 'savings_offer', 'data_source', 'bank'];
const ACTIONS = ['', 'create', 'update', 'approve', 'reject', 'edit_and_approve', 'deactivate', 'link_change'];

function diffKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return Array.from(keys).sort();
}

function AuditRow({ item }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(false);
  const fields = useMemo(() => diffKeys(item.before, item.after), [item]);
  const changedFields = fields.filter((f) => String((item.before || {})[f] ?? '') !== String((item.after || {})[f] ?? ''));

  return (
    <li className="border-b border-bank-border/70">
      <button
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-bank-bg/40"
        data-testid={`audit-row-${item.id}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            {item.entity_type || '—'}
          </span>
          <span className="font-mono text-[11px] text-bank-text">{item.entity_id}</span>
          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
            item.action === 'reject' ? 'border-red-300 bg-red-50 text-red-700' :
            item.action === 'deactivate' ? 'border-amber-300 bg-amber-50 text-amber-800' :
            'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}>
            {item.action}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-bank-text-muted">
            <User size={11} /> {item.changed_by || '—'}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-bank-text-muted">
            <Clock size={11} /> {item.changed_at ? new Date(item.changed_at).toLocaleString('de-DE') : '—'}
          </span>
          {changedFields.length > 0 ? (
            <span className="font-mono text-[11px] text-bank-text-muted">{changedFields.length} Felder geändert</span>
          ) : null}
        </div>
        {open ? <ChevronDown size={14} className="text-bank-text-muted" /> : <ChevronRight size={14} className="text-bank-text-muted" />}
      </button>
      {open ? (
        <div className="border-t border-bank-border/60 bg-bank-bg/20 px-5 py-4">
          <div className="overflow-x-auto border border-bank-border/60">
            <table className="w-full text-sm">
              <thead className="bg-bank-bg/40">
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Feld</th>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Vorher</th>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Nachher</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const b = (item.before || {})[f];
                  const a = (item.after || {})[f];
                  const changed = String(b ?? '') !== String(a ?? '');
                  return (
                    <tr key={f} className={changed ? 'bg-amber-50/60' : ''}>
                      <td className="border-b border-bank-border/40 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">{f}</td>
                      <td className="border-b border-bank-border/40 px-3 py-2 text-sm text-bank-text-muted line-through decoration-red-400/60">
                        {b === undefined || b === null || b === '' ? '—' : String(b)}
                      </td>
                      <td className="border-b border-bank-border/40 px-3 py-2 text-sm font-medium text-bank-text">
                        {a === undefined || a === null || a === '' ? '—' : String(a)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted hover:text-bank-text"
            onClick={() => setRaw((x) => !x)}
            data-testid={`audit-raw-toggle-${item.id}`}
          >
            {raw ? '− Raw JSON verbergen' : '+ Raw JSON anzeigen'}
          </button>
          {raw ? (
            <pre
              data-testid={`audit-raw-${item.id}`}
              className="mt-2 max-h-72 overflow-auto border border-bank-border/60 bg-white p-3 font-mono text-[11px] text-bank-text"
            >
{JSON.stringify({ before: item.before, after: item.after }, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function AdminSavingsAudit() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const params = new URLSearchParams({ limit: '300' });
      if (entityType) params.set('entity_type', entityType);
      if (entityId) params.set('entity_id', entityId);
      const { data } = await _axios.get(`${_api}/api/admin/savings/audit-log?${params}`, {
        withCredentials: true,
      });
      setItems(data?.items || []);
    } catch (err) {
      console.error('audit', err);
      toast.error('Audit-Log konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-seitige Zusatz-Filter (Action, Zeitraum), damit die Backend-API klein bleibt.
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (action && it.action !== action) return false;
      if (fromDate) {
        const ts = it.changed_at ? new Date(it.changed_at) : null;
        if (!ts || ts < new Date(fromDate)) return false;
      }
      if (toDate) {
        const ts = it.changed_at ? new Date(it.changed_at) : null;
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (!ts || ts > end) return false;
      }
      return true;
    });
  }, [items, action, fromDate, toDate]);

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Audit-Log"
        titleIcon={Activity}
        description="Alle Admin-Aktionen inkl. Diff (Vorher/Nachher). Server-seitig gefiltert nach Entity, clientseitig nach Action & Zeitraum."
      />

      <AdminToolbarCard>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Entity-Type</span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              data-testid="audit-filter-entity-type"
              className="mt-1 w-full border border-bank-border bg-white px-3 py-2 text-sm"
            >
              {ENTITY_TYPES.map((t) => <option key={t || 'all'} value={t}>{t || 'alle'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Entity-ID</span>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="offer-id / slug" data-testid="audit-filter-entity-id" />
          </label>
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Action</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              data-testid="audit-filter-action"
              className="mt-1 w-full border border-bank-border bg-white px-3 py-2 text-sm"
            >
              {ACTIONS.map((a) => <option key={a || 'all'} value={a}>{a || 'alle'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Von</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} data-testid="audit-filter-from" />
          </label>
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Bis</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} data-testid="audit-filter-to" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2" data-testid="audit-refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Filter anwenden
          </Button>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            {filtered.length} von {items.length}
          </span>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-bank-text-muted/70" />
            <p className="text-sm text-bank-text-muted">Lade Audit-Log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-bank-text-muted" data-testid="audit-empty">
            Keine Einträge im gewählten Filter.
          </div>
        ) : (
          <ul>
            {filtered.map((it) => <AuditRow key={it.id} item={it} />)}
          </ul>
        )}
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}

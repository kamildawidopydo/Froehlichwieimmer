import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/panelApi';
import { cn } from '@/lib/utils';

export const eur = (v, cur = 'EUR') =>
  v == null || v === '' ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: cur || 'EUR' }).format(Number(v));
export const num = (v, d = 4) => (v == null || v === '' ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(Number(v)));
export const pct = (v) => (v == null || v === '' ? '–' : `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))} %`);
export const dt = (v) => (v ? new Date(v).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
export const d = (v) => (v ? new Date(v).toLocaleDateString('de-DE') : '–');

export const KYC_LABEL = {
  documents_missing: 'Dokumente fehlen',
  documents_submitted: 'Dokumente eingereicht',
  review_pending: 'Prüfung ausstehend',
  more_documents_required: 'Weitere Unterlagen erforderlich',
  verified: 'Verifiziert',
  rejected: 'Abgelehnt',
};
export const ACCOUNT_LABEL = { active: 'Aktiv', locked: 'Gesperrt', deactivated: 'Deaktiviert' };
export const TX_LABEL = {
  draft: 'Entwurf', submitted: 'Eingereicht', in_review: 'In Prüfung', accepted: 'Angenommen',
  executed: 'Ausgeführt', rejected: 'Abgelehnt', cancelled: 'Storniert',
};
export const CAT_LABEL = { aktie: 'Aktie', anleihe: 'Anleihe', festgeld: 'Festgeld', flexgeld: 'Flexgeld', ipo: 'IPO-Zeichnung' };
export const DOC_LABEL = { id_front: 'Ausweis Vorderseite', id_back: 'Ausweis Rückseite', address_proof: 'Adressnachweis', other: 'Weiteres Dokument' };
export const PERM_LABEL = {
  kunden: 'Kunden ansehen & bearbeiten', kyc: 'KYC-Prüfung', depots: 'Depots & Buchungen', produkte: 'Produkte',
  preise: 'Preisverwaltung', auftraege: 'Kauf- und Verkaufsaufträge', audit: 'Audit-Log', export: 'Datenexport',
};

const TONE = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  gray: 'bg-bank-bg text-bank-text-muted border-bank-border',
};
const KYC_TONE = { verified: 'green', rejected: 'red', review_pending: 'blue', documents_submitted: 'blue', more_documents_required: 'amber', documents_missing: 'gray' };
const TX_TONE = { executed: 'green', rejected: 'red', cancelled: 'gray', accepted: 'blue', in_review: 'amber', submitted: 'amber', draft: 'gray' };
const ACC_TONE = { active: 'green', locked: 'red', deactivated: 'gray' };

export function Pill({ tone = 'gray', children, className }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[11px] font-medium', TONE[tone], className)}>{children}</span>;
}
export const KycBadge = ({ s }) => <Pill tone={KYC_TONE[s]}>{KYC_LABEL[s] || s}</Pill>;
export const TxBadge = ({ s }) => <Pill tone={TX_TONE[s]}>{TX_LABEL[s] || s}</Pill>;
export const AccountBadge = ({ s }) => <Pill tone={ACC_TONE[s]}>{ACCOUNT_LABEL[s] || s}</Pill>;
export const OriginBadge = ({ o }) =>
  o === 'manuelle_buchung' ? <Pill tone="amber">Interne Buchung</Pill> : <Pill tone="blue">Kundenauftrag · administrativ ausgeführt</Pill>;

export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(null); } catch (e) { setError(extractErrorMessage(e)); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

export function State({ loading, error, onRetry, children }) {
  if (loading) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-bank-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Wird geladen…</div>;
  if (error) return (
    <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      {error} {onRetry && <Button size="sm" variant="outline" className="ml-3" onClick={onRetry}>Erneut versuchen</Button>}
    </div>
  );
  return children;
}

export async function act(fn, success) {
  try { const r = await fn(); if (success) toast.success(success); return r ?? true; }
  catch (e) { toast.error(extractErrorMessage(e)); return false; }
}

export function Kpi({ label, value, hint }) {
  return (
    <div className="relative border border-bank-border bg-white p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 to-transparent" />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-light text-bank-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-bank-text-muted">{hint}</p>}
    </div>
  );
}

export function Field({ label, children, className }) {
  return <div className={cn('space-y-1', className)}><Label className="text-xs text-bank-text-muted">{label}</Label>{children}</div>;
}

/** Bestätigungsdialog mit optionaler/verpflichtender Begründung. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Bestätigen', requireReason = true, reasonOptional = false, danger, onConfirm, children }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);
  const mustExplain = requireReason && !reasonOptional;
  const go = async () => {
    setBusy(true);
    const ok = await onConfirm(reason.trim());
    setBusy(false);
    if (ok !== false) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        {children}
        {requireReason && (
          <Field label={reasonOptional ? 'Begründung (optional, wird protokolliert)' : 'Begründung (Pflichtfeld, wird protokolliert)'}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder={reasonOptional ? 'kann leer bleiben – z. B. Telefonnotiz vom …' : 'z. B. Korrektur laut Kundengespräch vom …'} />
            {mustExplain && reason.trim().length < 3 && <p className="mt-1 text-xs text-amber-700">Bitte eine kurze Begründung eingeben (mind. 3 Zeichen), dann wird „{confirmLabel}“ aktiv.</p>}
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button variant={danger ? 'destructive' : 'default'} disabled={busy || (mustExplain && reason.trim().length < 3)} onClick={go}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-bank-border bg-bank-bg/60 text-left [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-mono [&_th]:text-[10.5px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-bank-text-muted">
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-bank-border/60 [&_tr:hover]:bg-bank-bg/40">{children}</tbody>
      </table>
      {empty && <p className="py-10 text-center text-sm text-bank-text-muted">{empty}</p>}
    </div>
  );
}

export { Input, Button, Textarea };

import React, { useEffect, useState } from 'react';
import { Send, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

const AdminBondRequests = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bond_purchase_requests')
        .select(
          'id, user_id, isin, bond_name, kupon_rate, amount_eur, status, created_at, approved_at, rejected_at, decision_note, handled_at, profiles:user_id(email, first_name, last_name)',
        )
        .order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.message?.toLowerCase().includes('relation')) {
          setTableMissing(true);
        } else {
          toast.error('Fehler beim Laden: ' + error.message);
        }
        setItems([]);
      } else {
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (row) => {
    const kuponInput = window.prompt('Kupon (% p.a.) eingeben (Pflichtfeld):', '');
    if (kuponInput == null) return;
    const kuponRate = Number(String(kuponInput).replace(',', '.'));
    if (!Number.isFinite(kuponRate) || kuponRate < 0) {
      toast.error('Bitte einen gültigen Kupon-Wert eingeben.');
      return;
    }
    const maturityInput =
      window.prompt('Fälligkeit eingeben (optional, YYYY-MM-DD):', '') || null;
    const note = window.prompt('Optionaler Admin-Kommentar für die Freigabe:', '') || null;
    setProcessingId(row.id);
    const { error } = await supabase.rpc('approve_bond_purchase_request', {
      p_request_id: row.id,
      p_decision_note: note,
      p_kupon_rate: kuponRate,
      p_faelligkeitsdatum: maturityInput,
    });
    setProcessingId(null);
    if (error) {
      toast.error('Freigabe fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Anfrage genehmigt und Position erstellt');
    load();
  };

  const reject = async (row) => {
    const reason = window.prompt('Ablehnungsgrund (optional):', '') || null;
    setProcessingId(row.id);
    const { error } = await supabase.rpc('reject_bond_purchase_request', {
      p_request_id: row.id,
      p_decision_note: reason,
    });
    setProcessingId(null);
    if (error) {
      toast.error('Ablehnung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Anfrage abgelehnt');
    load();
  };

  const removeRequest = async (row) => {
    const confirmed = window.confirm('Diese Anleihen-Anfrage wirklich dauerhaft löschen?');
    if (!confirmed) return;
    setProcessingId(row.id);
    const { error } = await supabase.from('bond_purchase_requests').delete().eq('id', row.id);
    setProcessingId(null);
    if (error) {
      toast.error('Löschen fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Anfrage gelöscht');
    setItems((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Anleihen-Anfragen"
        titleIcon={Send}
        description="Kaufanfragen, die Kunden über die Anleihen-Suche an unser Team senden."
      />

      {tableMissing ? (
        <AdminSurfaceCard className="p-6">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            Schema fehlt
          </p>
          <h3
            className="mt-1.5 font-display text-[1.15rem] font-light leading-tight text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
          >
            Tabelle <code className="font-mono text-bank-gold">bond_purchase_requests</code> fehlt
          </h3>
          <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
          <p className="mt-3 max-w-2xl text-[13px] leading-snug text-bank-text-muted">
            Legen Sie die Tabelle in Supabase an. Erwartete Felder:{' '}
            <code className="font-mono">id</code>, <code className="font-mono">user_id</code>,{' '}
            <code className="font-mono">isin</code>, <code className="font-mono">bond_name</code>,{' '}
            <code className="font-mono">kupon_rate</code>,{' '}
            <code className="font-mono">status</code> (<code className="font-mono">pending</code>/
            <code className="font-mono">approved</code>/<code className="font-mono">rejected</code>),{' '}
            <code className="font-mono">created_at</code>,{' '}
            <code className="font-mono">approved_at</code>,{' '}
            <code className="font-mono">rejected_at</code>.
          </p>
        </AdminSurfaceCard>
      ) : (
        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Kunde</th>
                  <th className="px-4 py-3 text-left">Bond</th>
                  <th className="px-4 py-3 text-right">Kupon</th>
                  <th className="px-4 py-3 text-right">Volumen</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                        <RefreshCw size={13} strokeWidth={1.5} className="animate-spin text-bank-gold" />
                        Lädt…
                      </p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted"
                    >
                      Keine offenen Anfragen
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const isPending = row.status === 'pending';
                    const isApproved = row.status === 'approved' || row.status === 'handled';
                    const isRejected = row.status === 'rejected' || row.status === 'cancelled';
                    const statusCls = isApproved
                      ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                      : isRejected
                        ? 'border-rose-300/55 bg-rose-50 text-rose-700'
                        : 'border-amber-300/55 bg-amber-50 text-amber-700';
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-bank-text-muted">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '–'}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-bank-text">
                          {row.profiles
                            ? [row.profiles.first_name, row.profiles.last_name]
                                .filter(Boolean)
                                .join(' ') || row.profiles.email
                            : '–'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-bank-text">
                            {row.bond_name || row.isin || '–'}
                          </p>
                          {row.isin && row.bond_name && (
                            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                              ISIN · {row.isin}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="rate-figure text-[13px] tabular-nums text-bank-gold">
                            {row.kupon_rate != null ? `${row.kupon_rate}%` : '–'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                          {row.amount_eur != null
                            ? Number(row.amount_eur).toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0,
                              })
                            : '–'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusCls}`}
                          >
                            {isApproved ? 'Genehmigt' : isRejected ? 'Abgelehnt' : 'Offen'}
                          </span>
                          {row.decision_note && (
                            <p className="mt-1 max-w-[180px] text-[11px] text-bank-text-muted">
                              {row.decision_note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending ? (
                            <div className="inline-flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approve(row)}
                                disabled={processingId === row.id}
                                className="border-emerald-300/55 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Check size={12} strokeWidth={1.5} /> Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reject(row)}
                                disabled={processingId === row.id}
                                className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <X size={12} strokeWidth={1.5} /> Ablehnen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-ink"
                                onClick={() => removeRequest(row)}
                                disabled={processingId === row.id}
                              >
                                <Trash2 size={12} strokeWidth={1.5} /> Löschen
                              </Button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                                {isApproved && row.approved_at
                                  ? `Freigegeben · ${new Date(row.approved_at).toLocaleString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}`
                                  : isRejected && row.rejected_at
                                    ? `Abgelehnt · ${new Date(row.rejected_at).toLocaleString('de-DE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}`
                                    : 'Abgeschlossen'}
                              </span>
                              <Button
                                size="sm"
                                variant="outline-ink"
                                onClick={() => removeRequest(row)}
                                disabled={processingId === row.id}
                              >
                                <Trash2 size={12} strokeWidth={1.5} /> Löschen
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminBondRequests;

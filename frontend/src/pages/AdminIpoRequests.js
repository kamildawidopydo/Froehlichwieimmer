import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Check, RefreshCw, Trash2, Plus, Edit, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import {
  computeIpoValuation,
  deriveSubscriptionFromVolume,
  fxRatesToRpcPayload,
} from '@/lib/ipoValuation';
import { fetchEurBasedRates } from '@/services/forexService';

const IPO_SELECT =
  'id, user_id, ipo_id, company_name, ticker, amount_eur, shares_requested, status, notes, created_at, approved_at, rejected_at, decision_note, source, subscription_price_per_share, listing_price_per_share, profit_margin_pct, position_symbol, use_admin_valuation, valuation_set_at, profiles:user_id(email, first_name, last_name)';

const formatMoney = (value, currency = 'EUR') => {
  if (value == null || !Number.isFinite(Number(value))) return '–';
  try {
    return Number(value).toLocaleString('de-DE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency === 'GBP' ? 'GBP' : 'EUR',
      maximumFractionDigits: 4,
    });
  } catch {
    return formatEUR(value);
  }
};

const formatPct = (v) => {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} %`;
};

const customerLabel = (profiles) =>
  [profiles?.first_name, profiles?.last_name].filter(Boolean).join(' ') ||
  profiles?.email ||
  '–';

const EMPTY_VALUATION_FORM = {
  listingPrice: '',
  profitPct: '',
  subscriptionPrice: '',
  decisionNote: '',
  useAdminValuation: true,
};

const EMPTY_MANUAL_FORM = {
  userId: '',
  ipoId: '',
  shares: '',
  amountEur: '',
  subscriptionPrice: '',
  listingPrice: '',
  profitPct: '',
  decisionNote: '',
  deductCash: false,
};

// Session 82.36 · Zuteilungs-Modal für Mongo-native (Kundenportal) IPO-Requests.
// Backend bleibt Source of Truth — POST /api/admin/ipo/requests/{id}/allocate.
const EMPTY_ALLOCATE_FORM = {
  allocatedShares: '',
  subscriptionPrice: '',
  listingPrice: '',
  decisionNote: '',
};

const parseDecStr = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const humanAllocationError = (code, detail) => {
  const map = {
    INSUFFICIENT_CASH: 'Nicht genügend Guthaben auf dem Kundenkonto für die Zuteilung.',
    OVER_ALLOCATION: 'Zuzuteilende Stückzahl übersteigt die vom Kunden angefragte Menge.',
    REQUEST_BAD_STATUS: 'Zuteilung nicht möglich — die Anfrage ist nicht mehr im Status „approved".',
    MISSING_SYMBOL: 'IPO hat kein handelbares Ticker-Symbol — Zuteilung abgebrochen.',
    BAD_SHARES: 'Ungültige Stückzahl.',
    BAD_PRICE: 'Ungültiger Zeichnungspreis.',
    REQUEST_NOT_FOUND: 'Anfrage wurde nicht gefunden.',
    REQUEST_REJECTED_RACE: 'Anfrage wurde parallel abgelehnt.',
  };
  return map[code] || detail || 'Zuteilung fehlgeschlagen.';
};

const ValuationPreview = ({ preview, currency }) => {
  if (!preview) {
    return (
      <p className="text-[12px] text-bank-text-muted">
        Listing-Preis oder Gewinn-% eingeben für Vorschau.
      </p>
    );
  }
  const up = (preview.profitAbsEur ?? preview.profitAbs) >= 0;
  const profitEur = preview.profitAbsEur ?? preview.profitAbs;
  return (
    <div className="rounded-lg border border-bank-border bg-bank-bg/40 p-3 text-[12px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <p className="text-bank-text-muted">Einstand</p>
          <p className="font-medium tabular-nums">{formatMoney(preview.costBasis, currency)}</p>
        </div>
        <div>
          <p className="text-bank-text-muted">Bewertung</p>
          <p className="font-medium tabular-nums">{formatMoney(preview.marketValue, currency)}</p>
        </div>
        <div>
          <p className="text-bank-text-muted">Gewinn (EUR)</p>
          <p className={`font-medium tabular-nums ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatEURSigned(profitEur)}
          </p>
          {currency !== 'EUR' && preview.profitAbs != null && (
            <p className="text-[10px] text-bank-text-muted tabular-nums">
              {up ? '+' : ''}
              {formatMoney(preview.profitAbs, currency)}
            </p>
          )}
        </div>
        <div>
          <p className="text-bank-text-muted">Gewinn %</p>
          <p className={`font-medium tabular-nums ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatPct(preview.profitPct)}
          </p>
        </div>
      </div>
    </div>
  );
};

const AdminIpoRequests = () => {
  const [items, setItems] = useState([]);
  const [ipoCatalog, setIpoCatalog] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [approveRow, setApproveRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [allocateRow, setAllocateRow] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [valuationForm, setValuationForm] = useState(EMPTY_VALUATION_FORM);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [allocateForm, setAllocateForm] = useState(EMPTY_ALLOCATE_FORM);
  const [allocateError, setAllocateError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [eurRates, setEurRates] = useState({ EUR: 1 });

  const ipoById = useMemo(() => {
    const m = {};
    (ipoCatalog || []).forEach((i) => {
      m[i.id] = i;
    });
    return m;
  }, [ipoCatalog]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, ipoRes, profRes, ratesRes, mongoRes] = await Promise.all([
        supabase.from('ipo_subscription_requests').select(IPO_SELECT).order('created_at', { ascending: false }),
        supabase
          .from('ipo_catalog')
          .select('id, company_name, ticker_proposed, price_currency, price_range_low, price_range_high')
          .order('company_name'),
        supabase.from('profiles').select('id, email, first_name, last_name').order('first_name'),
        fetchEurBasedRates().catch(() => ({ EUR: 1 })),
        // Session 82.03 (Schritt 5) — Mongo-native Customer-Requests parallel laden.
        // Fällt bei Fehler nicht die ganze Seite, sondern nur die Mongo-Sektion.
        fetch('/api/admin/ipo/requests', { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .catch(() => null),
      ]);
      setEurRates(ratesRes || { EUR: 1 });

      const legacyItems = [];
      if (reqRes.error) {
        if (reqRes.error.code === '42P01' || reqRes.error.message?.toLowerCase().includes('relation')) {
          setTableMissing(true);
        } else {
          toast.error('Fehler: ' + reqRes.error.message);
        }
      } else {
        (reqRes.data || []).forEach((r) => legacyItems.push({ ...r, source: 'supabase', _rowKey: `supabase:${r.id}` }));
      }

      // Mongo-Requests in Legacy-Schema normalisieren.
      const mongoItems = Array.isArray(mongoRes)
        ? mongoRes.map((m) => ({
            id: m.id,
            _rowKey: `mongo:${m.id}`,
            source: 'mongo',
            user_id: m.user_id,
            ipo_id: m.ipo_id,
            company_name: m.company_name,
            ticker: m.ticker,
            amount_eur: m.amount_eur,
            shares_requested: m.shares_requested,
            status: m.status,
            notes: m.notes,
            decision_note: m.decision_note,
            approved_at: m.status === 'approved' ? m.handled_at : null,
            rejected_at: m.status === 'rejected' ? m.handled_at : null,
            created_at: m.created_at,
            profiles: {
              email: m.customer_email,
              first_name: m.customer_name?.split(' ')?.[0],
              last_name: m.customer_name?.split(' ')?.slice(1).join(' '),
            },
          }))
        : [];
      if (mongoRes === null) {
        toast.error('Neue Kundenportal-Anfragen konnten derzeit nicht geladen werden.');
      }

      // Merge + sort DESC nach created_at
      const merged = [...mongoItems, ...legacyItems].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setItems(merged);
      setIpoCatalog(ipoRes.data || []);
      setProfilesList(profRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolveCurrency = (row) => {
    const ipo = ipoById[row?.ipo_id];
    return ipo?.price_currency || 'EUR';
  };

  const rowValuation = (row) =>
    computeIpoValuation({
      shares: row.shares_requested,
      subscriptionPrice: row.subscription_price_per_share,
      amountEur: row.amount_eur,
      listingPrice: row.listing_price_per_share,
      profitPct: row.profit_margin_pct,
      priceCurrency: resolveCurrency(row),
      eurRates,
    });

  const buildPreview = (form, shares, amountEur, ipoId) => {
    const ipo = ipoById[ipoId];
    const priceCurrency = ipo?.price_currency || 'EUR';
    let sub = form.subscriptionPrice ? Number(String(form.subscriptionPrice).replace(',', '.')) : null;
    if (!sub && amountEur && shares) {
      sub = deriveSubscriptionFromVolume(amountEur, shares, priceCurrency, eurRates);
    }
    if (!sub && ipo) {
      if (ipo.price_range_low != null && ipo.price_range_high != null) {
        sub = (Number(ipo.price_range_low) + Number(ipo.price_range_high)) / 2;
      } else if (ipo.price_range_high != null) sub = Number(ipo.price_range_high);
      else if (ipo.price_range_low != null) sub = Number(ipo.price_range_low);
    }
    const listing = form.listingPrice ? Number(String(form.listingPrice).replace(',', '.')) : null;
    const profit = form.profitPct ? Number(String(form.profitPct).replace(',', '.')) : null;
    return computeIpoValuation({
      shares,
      subscriptionPrice: sub,
      amountEur,
      listingPrice: listing,
      profitPct: profit,
      priceCurrency,
      eurRates,
    });
  };

  const parseOptionalNum = (v) => {
    if (v == null || String(v).trim() === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const resolveSubscriptionForSubmit = (form, row, shares, amountEur, ipoId) => {
    const manual = parseOptionalNum(form.subscriptionPrice);
    if (manual != null && manual > 0) return manual;
    const priceCurrency = ipoId ? ipoById[ipoId]?.price_currency || 'EUR' : resolveCurrency(row);
    return deriveSubscriptionFromVolume(amountEur, shares, priceCurrency, eurRates);
  };

  const openApprove = (row) => {
    setApproveRow(row);
    setValuationForm({
      ...EMPTY_VALUATION_FORM,
      decisionNote: '',
    });
  };

  const openEdit = (row) => {
    setEditRow(row);
    setValuationForm({
      listingPrice: row.listing_price_per_share != null ? String(row.listing_price_per_share) : '',
      profitPct: row.profit_margin_pct != null ? String(row.profit_margin_pct) : '',
      subscriptionPrice:
        row.subscription_price_per_share != null ? String(row.subscription_price_per_share) : '',
      decisionNote: row.decision_note || '',
      useAdminValuation: row.use_admin_valuation !== false,
    });
  };

  const openManual = () => {
    setManualForm(EMPTY_MANUAL_FORM);
    setManualOpen(true);
  };

  // Session 82.36 · Zuteilungs-Modal öffnen (nur für Mongo-native + status='approved').
  const openAllocate = (row) => {
    setAllocateError(null);
    setAllocateForm({
      ...EMPTY_ALLOCATE_FORM,
      allocatedShares: String(row.shares_requested ?? ''),
      subscriptionPrice:
        row.subscription_price_per_share != null ? String(row.subscription_price_per_share) : '',
      listingPrice:
        row.listing_price_per_share != null ? String(row.listing_price_per_share) : '',
    });
    setAllocateRow(row);
  };

  const submitAllocate = async () => {
    if (!allocateRow) return;
    setAllocateError(null);
    const shares = parseInt(String(allocateForm.allocatedShares).trim(), 10);
    const subPrice = parseDecStr(allocateForm.subscriptionPrice);
    const listing = parseDecStr(allocateForm.listingPrice);
    if (!Number.isInteger(shares) || shares <= 0) {
      setAllocateError('Zuzuteilende Stückzahl muss > 0 sein.');
      return;
    }
    if (shares > Number(allocateRow.shares_requested || 0)) {
      setAllocateError(
        `Zuzuteilende Stückzahl (${shares}) übersteigt die angefragten ${allocateRow.shares_requested} Stück.`,
      );
      return;
    }
    if (subPrice == null) {
      setAllocateError('Zeichnungspreis je Aktie muss > 0 sein.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        allocated_shares: shares,
        subscription_price_per_share: String(subPrice),
      };
      if (listing != null) payload.listing_price_per_share = String(listing);
      const note = allocateForm.decisionNote.trim();
      if (note) payload.decision_note = note;
      const resp = await fetch(
        `/api/admin/ipo/requests/${encodeURIComponent(allocateRow.id)}/allocate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // Backend liefert `detail: "CODE: message"` bei AllocationError
        const raw = body?.detail || `HTTP ${resp.status}`;
        const match = typeof raw === 'string' && raw.match(/^([A-Z_]+):\s*(.*)$/);
        const code = match ? match[1] : null;
        const message = match ? match[2] : raw;
        setAllocateError(humanAllocationError(code, message));
        return;
      }
      toast.success('IPO-Zuteilung wurde erfolgreich erfasst.');
      setAllocateRow(null);
      load();
    } catch (err) {
      setAllocateError(err?.message || 'Netzwerkfehler bei der Zuteilung.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitApprove = async () => {
    if (!approveRow) return;
    const listing = parseOptionalNum(valuationForm.listingPrice);
    const profit = parseOptionalNum(valuationForm.profitPct);
    if (listing == null && profit == null) {
      toast.error('Listing-Preis oder Gewinn-% ist erforderlich.');
      return;
    }
    setSubmitting(true);
    const fxPayload = fxRatesToRpcPayload(eurRates);
    const subPrice = resolveSubscriptionForSubmit(
      valuationForm,
      approveRow,
      approveRow.shares_requested,
      approveRow.amount_eur,
      approveRow.ipo_id,
    );
    const { error } = await supabase.rpc('approve_ipo_subscription_request', {
      p_request_id: approveRow.id,
      p_decision_note: valuationForm.decisionNote.trim() || null,
      p_listing_price: listing,
      p_profit_pct: profit,
      p_subscription_price: subPrice,
      p_fx_rates: fxPayload,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Freigabe fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('IPO-Anfrage genehmigt');
    setApproveRow(null);
    load();
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const listing = parseOptionalNum(valuationForm.listingPrice);
    const profit = parseOptionalNum(valuationForm.profitPct);
    if (listing == null && profit == null && valuationForm.useAdminValuation === editRow.use_admin_valuation) {
      toast.error('Keine Änderung erkannt.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('update_ipo_request_valuation', {
      p_request_id: editRow.id,
      p_listing_price: listing,
      p_profit_pct: profit,
      p_use_admin_valuation: valuationForm.useAdminValuation,
      p_fx_rates: fxRatesToRpcPayload(eurRates),
    });
    setSubmitting(false);
    if (error) {
      toast.error('Aktualisierung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Bewertung aktualisiert');
    setEditRow(null);
    load();
  };

  const submitManual = async () => {
    const shares = parseOptionalNum(manualForm.shares);
    if (!manualForm.userId || !manualForm.ipoId) {
      toast.error('Kunde und IPO sind erforderlich.');
      return;
    }
    if (!shares || shares < 1) {
      toast.error('Gültige Stückzahl erforderlich.');
      return;
    }
    const listing = parseOptionalNum(manualForm.listingPrice);
    const profit = parseOptionalNum(manualForm.profitPct);
    if (listing == null && profit == null) {
      toast.error('Listing-Preis oder Gewinn-% ist erforderlich.');
      return;
    }
    setSubmitting(true);
    const fxPayload = fxRatesToRpcPayload(eurRates);
    const subPrice = resolveSubscriptionForSubmit(
      manualForm,
      null,
      Math.round(shares),
      parseOptionalNum(manualForm.amountEur),
      manualForm.ipoId,
    );
    const { error } = await supabase.rpc('admin_create_ipo_subscription', {
      p_user_id: manualForm.userId,
      p_ipo_id: manualForm.ipoId,
      p_shares_requested: Math.round(shares),
      p_amount_eur: parseOptionalNum(manualForm.amountEur),
      p_listing_price: listing,
      p_profit_pct: profit,
      p_subscription_price: subPrice ?? parseOptionalNum(manualForm.subscriptionPrice),
      p_decision_note: manualForm.decisionNote.trim() || null,
      p_deduct_cash: !!manualForm.deductCash,
      p_fx_rates: fxPayload,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Zuweisung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('IPO manuell zugewiesen');
    setManualOpen(false);
    load();
  };

  const reject = async (row) => {
    const reason = window.prompt('Ablehnungsgrund (optional):', '') || null;
    setProcessingId(row.id);
    // Session 82.03 — Source-Routing: Mongo-Requests via FastAPI, Legacy via Supabase-RPC.
    let error = null;
    if (row.source === 'mongo') {
      try {
        const resp = await fetch(`/api/admin/ipo/requests/${row.id}/reject`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision_note: reason }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          error = { message: body?.detail || `HTTP ${resp.status}` };
        }
      } catch (err) {
        error = { message: err?.message || 'Netzwerkfehler' };
      }
    } else {
      const res = await supabase.rpc('reject_ipo_subscription_request', {
        p_request_id: row.id,
        p_decision_note: reason,
      });
      error = res.error;
    }
    setProcessingId(null);
    if (error) {
      toast.error('Ablehnung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('IPO-Anfrage abgelehnt');
    load();
  };

  // Session 82.03 — Mongo-Approve (ohne Valuation-Dialog; Position-Creation
  // ist Portfolio-Migration-Blocker und wird nicht ausgelöst).
  const approveMongo = async (row) => {
    if (!window.confirm(`IPO-Zeichnungsanfrage von ${customerLabel(row.profiles) || row.user_id} freigeben?`)) return;
    setProcessingId(row.id);
    let error = null;
    try {
      const resp = await fetch(`/api/admin/ipo/requests/${row.id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        error = { message: body?.detail || `HTTP ${resp.status}` };
      }
    } catch (err) {
      error = { message: err?.message || 'Netzwerkfehler' };
    }
    setProcessingId(null);
    if (error) {
      toast.error('Freigabe fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('IPO-Zeichnungsanfrage freigegeben');
    load();
  };

  const removeRequest = async (row) => {
    if (!window.confirm('Anfrage wirklich löschen?')) return;
    setProcessingId(row.id);
    const { error } = await supabase.from('ipo_subscription_requests').delete().eq('id', row.id);
    setProcessingId(null);
    if (error) toast.error('Fehler: ' + error.message);
    else {
      toast.success('Gelöscht');
      setItems((prev) => prev.filter((i) => i.id !== row.id));
    }
  };

  const approvePreview = approveRow
    ? buildPreview(valuationForm, approveRow.shares_requested, approveRow.amount_eur, approveRow.ipo_id)
    : null;

  const editPreview = editRow
    ? buildPreview(
        valuationForm,
        editRow.shares_requested,
        editRow.amount_eur,
        editRow.ipo_id,
      )
    : null;

  const manualPreview = manualOpen
    ? buildPreview(
        manualForm,
        parseOptionalNum(manualForm.shares),
        parseOptionalNum(manualForm.amountEur),
        manualForm.ipoId,
      )
    : null;

  const manualCurrency = manualForm.ipoId ? ipoById[manualForm.ipoId]?.price_currency || 'EUR' : 'EUR';

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="IPO-Zeichnungsanfragen"
        titleIcon={Send}
        description="Zeichnungsanfragen freigeben, Bewertung pflegen oder IPO manuell zuweisen."
        actions={
          <>
            <Button onClick={load} variant="outline" className="gap-2 rounded-xl" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Aktualisieren
            </Button>
            <Button
              onClick={openManual}
              className="gap-2 rounded-xl bg-bank-ink text-white hover:bg-bank-ink-elev"
            >
              <Plus size={16} />
              Manuelle IPO-Zuweisung
            </Button>
          </>
        }
      />

      {tableMissing ? (
        <AdminSurfaceCard className="p-6 text-[13px] text-bank-text-muted">
          Tabelle fehlt — Migration anwenden.
        </AdminSurfaceCard>
      ) : (
        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Kunde</th>
                  <th className="px-4 py-3 text-left">IPO</th>
                  <th className="px-4 py-3 text-right">Volumen</th>
                  <th className="px-4 py-3 text-right">Lots</th>
                  <th className="px-4 py-3 text-right">Einstand/Lot</th>
                  <th className="px-4 py-3 text-right">Listing</th>
                  <th className="px-4 py-3 text-right">Gewinn</th>
                  <th className="px-4 py-3 text-left">Quelle</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center">
                      <RefreshCw size={16} className="mx-auto animate-spin text-bank-gold" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-bank-text-muted">
                      Keine Anfragen
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const isPending = row.status === 'pending';
                    const isApproved = row.status === 'approved';
                    const isAllocated = row.status === 'allocated';
                    const currency = resolveCurrency(row);
                    const val = rowValuation(row);
                    const statusCls = isApproved
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : isAllocated
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : row.status === 'rejected'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-amber-300 bg-amber-50 text-amber-700';
                    const up = (val?.profitAbsEur ?? val?.profitAbs ?? 0) >= 0;
                    return (
                      <tr key={row._rowKey || row.id} className={`border-b border-bank-border ${adminRowHover}`}>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString('de-DE')
                            : '–'}
                        </td>
                        <td className="px-4 py-3 text-[13px]">
                          <div className="flex items-center gap-2">
                            <span>{customerLabel(row.profiles)}</span>
                            {row.source === 'mongo' && (
                              <span
                                className="inline-flex items-center rounded-full border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700"
                                title="Neue Kundenportal-Anfrage (FastAPI/Mongo)"
                              >
                                Kundenportal
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px]">
                          <div>{row.company_name || '–'}</div>
                          {row.ticker && (
                            <span className="font-mono text-[11px] text-bank-text-muted">
                              ({row.ticker})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[13px]">
                          {row.amount_eur != null ? formatEUR(row.amount_eur) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[13px]">
                          {row.shares_requested}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[12px]">
                          {row.subscription_price_per_share != null
                            ? formatMoney(row.subscription_price_per_share, currency)
                            : '–'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[12px]">
                          {row.listing_price_per_share != null
                            ? formatMoney(row.listing_price_per_share, currency)
                            : '–'}
                          {row.use_admin_valuation === false && (
                            <span className="ml-1 text-[10px] text-bank-text-muted">(Markt)</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums text-[12px] ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {val ? (
                            <>
                              {formatEURSigned(val.profitAbsEur ?? val.profitAbs)}
                              <br />
                              <span className="text-[10px]">{formatPct(val.profitPct)}</span>
                            </>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                              row.source === 'admin'
                                ? 'border-violet-300 bg-violet-50 text-violet-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {row.source === 'admin' ? 'Admin' : 'Kunde'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${statusCls}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processingId === row.id}
                                onClick={() => openEdit(row)}
                                title="Bewertung bearbeiten"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processingId === row.id}
                                onClick={() => (row.source === 'mongo' ? approveMongo(row) : openApprove(row))}
                                title={row.source === 'mongo' ? 'Freigeben (Kundenportal)' : 'Freigeben'}
                              >
                                <Check size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processingId === row.id}
                                onClick={() => reject(row)}
                                title="Ablehnen"
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              {isApproved && row.source === 'mongo' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`ipo-allocate-btn-${row.id}`}
                                  disabled={processingId === row.id}
                                  onClick={() => openAllocate(row)}
                                  title="Zuteilung erfassen"
                                  className="gap-1"
                                >
                                  <Package size={14} />
                                  <span className="hidden text-[11px] sm:inline">Zuteilen</span>
                                </Button>
                              )}
                              {isApproved && row.source !== 'mongo' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={processingId === row.id}
                                  onClick={() => openEdit(row)}
                                  title="Bewertung bearbeiten"
                                >
                                  <Edit size={14} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={processingId === row.id}
                                onClick={() => removeRequest(row)}
                              >
                                <Trash2 size={14} />
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

      {/* Approve modal */}
      <Dialog open={!!approveRow} onOpenChange={(open) => !open && setApproveRow(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>IPO-Anfrage freigeben</DialogTitle>
          </DialogHeader>
          {approveRow && (
            <div className="space-y-4">
              <p className="text-[13px] text-bank-text-muted">
                {approveRow.company_name} · {approveRow.shares_requested} Lots
                {approveRow.amount_eur != null ? ` · ${formatEUR(approveRow.amount_eur)}` : ''}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="approve-listing">Listing-Preis / Lot</Label>
                  <Input
                    id="approve-listing"
                    value={valuationForm.listingPrice}
                    onChange={(e) =>
                      setValuationForm((f) => ({ ...f, listingPrice: e.target.value }))
                    }
                    placeholder="z. B. 350"
                  />
                </div>
                <div>
                  <Label htmlFor="approve-profit">Gewinn %</Label>
                  <Input
                    id="approve-profit"
                    value={valuationForm.profitPct}
                    onChange={(e) =>
                      setValuationForm((f) => ({ ...f, profitPct: e.target.value }))
                    }
                    placeholder="z. B. 10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="approve-sub">Einstand/Lot (optional)</Label>
                <Input
                  id="approve-sub"
                  value={valuationForm.subscriptionPrice}
                  onChange={(e) =>
                    setValuationForm((f) => ({ ...f, subscriptionPrice: e.target.value }))
                  }
                  placeholder="Leer = Volumen/Lots oder IPO-Spanne"
                />
              </div>
              <ValuationPreview preview={approvePreview} currency={resolveCurrency(approveRow)} />
              <div>
                <Label htmlFor="approve-note">Admin-Kommentar</Label>
                <Textarea
                  id="approve-note"
                  value={valuationForm.decisionNote}
                  onChange={(e) =>
                    setValuationForm((f) => ({ ...f, decisionNote: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApproveRow(null)}>
                  Abbrechen
                </Button>
                <Button onClick={submitApprove} disabled={submitting}>
                  Freigeben
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit valuation modal */}
      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Bewertung bearbeiten</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <p className="text-[13px] text-bank-text-muted">
                {editRow.company_name} · {customerLabel(editRow.profiles)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-listing">Listing-Preis / Lot</Label>
                  <Input
                    id="edit-listing"
                    value={valuationForm.listingPrice}
                    onChange={(e) =>
                      setValuationForm((f) => ({ ...f, listingPrice: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-profit">Gewinn %</Label>
                  <Input
                    id="edit-profit"
                    value={valuationForm.profitPct}
                    onChange={(e) =>
                      setValuationForm((f) => ({ ...f, profitPct: e.target.value }))
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={valuationForm.useAdminValuation}
                  onChange={(e) =>
                    setValuationForm((f) => ({ ...f, useAdminValuation: e.target.checked }))
                  }
                />
                Admin-Devisierung aktiv
              </label>
              <ValuationPreview preview={editPreview} currency={resolveCurrency(editRow)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditRow(null)}>
                  Abbrechen
                </Button>
                <Button onClick={submitEdit} disabled={submitting}>
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Allocate modal — Session 82.36 (Mongo-native only) */}
      <Dialog open={!!allocateRow} onOpenChange={(open) => !open && setAllocateRow(null)}>
        <DialogContent
          className="max-h-[90vh] max-w-lg overflow-y-auto bg-white"
          data-testid="ipo-allocate-modal"
        >
          <DialogHeader>
            <DialogTitle>IPO-Zuteilung erfassen</DialogTitle>
          </DialogHeader>
          {allocateRow && (
            <div className="space-y-4">
              <div className="rounded-lg border border-bank-border bg-bank-bg/40 p-3 text-[12.5px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-bank-text-muted">Unternehmen</p>
                    <p className="font-medium">{allocateRow.company_name || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Ticker</p>
                    <p className="font-mono text-[12px]">{allocateRow.ticker || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Angefragte Stück</p>
                    <p className="tabular-nums">{allocateRow.shares_requested}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Anlagebetrag</p>
                    <p className="tabular-nums">
                      {allocateRow.amount_eur != null ? formatEUR(allocateRow.amount_eur) : '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-bank-text-muted">Kunde</p>
                    <p className="text-[13px]">
                      {customerLabel(allocateRow.profiles)}
                      {allocateRow.profiles?.email ? (
                        <span className="ml-1 text-bank-text-muted">
                          ({allocateRow.profiles.email})
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="allocate-shares">Zuzuteilende Stück *</Label>
                  <Input
                    id="allocate-shares"
                    data-testid="ipo-allocate-shares"
                    inputMode="numeric"
                    value={allocateForm.allocatedShares}
                    onChange={(e) =>
                      setAllocateForm((f) => ({ ...f, allocatedShares: e.target.value }))
                    }
                    placeholder={`≤ ${allocateRow.shares_requested}`}
                  />
                </div>
                <div>
                  <Label htmlFor="allocate-sub">Zeichnungspreis / Aktie *</Label>
                  <Input
                    id="allocate-sub"
                    data-testid="ipo-allocate-sub-price"
                    inputMode="decimal"
                    value={allocateForm.subscriptionPrice}
                    onChange={(e) =>
                      setAllocateForm((f) => ({ ...f, subscriptionPrice: e.target.value }))
                    }
                    placeholder="z. B. 24.50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="allocate-listing">Listing-Preis / Aktie (optional)</Label>
                <Input
                  id="allocate-listing"
                  data-testid="ipo-allocate-listing-price"
                  inputMode="decimal"
                  value={allocateForm.listingPrice}
                  onChange={(e) =>
                    setAllocateForm((f) => ({ ...f, listingPrice: e.target.value }))
                  }
                  placeholder="Leer = keine Bewertungserfassung"
                />
              </div>

              <div className="rounded-md border border-bank-border bg-bank-bg/30 p-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-bank-text-muted">Gesamtbetrag (Vorschau)</span>
                  <span className="font-semibold tabular-nums">
                    {(() => {
                      const s = parseInt(String(allocateForm.allocatedShares).trim(), 10);
                      const p = parseDecStr(allocateForm.subscriptionPrice);
                      if (!Number.isInteger(s) || s <= 0 || p == null) return '–';
                      return formatEUR(s * p);
                    })()}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-bank-text-muted">
                  Serverseitig verbindlich = Stück × Zeichnungspreis · Cash-Buchung erfolgt via Backend-Saga.
                </p>
              </div>

              <div>
                <Label htmlFor="allocate-note">Admin-Notiz (optional)</Label>
                <Textarea
                  id="allocate-note"
                  data-testid="ipo-allocate-note"
                  value={allocateForm.decisionNote}
                  onChange={(e) =>
                    setAllocateForm((f) => ({ ...f, decisionNote: e.target.value }))
                  }
                  rows={2}
                  maxLength={500}
                />
              </div>

              {allocateError && (
                <div
                  role="alert"
                  data-testid="ipo-allocate-error"
                  className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800"
                >
                  {allocateError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAllocateRow(null)}
                  disabled={submitting}
                  data-testid="ipo-allocate-cancel"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={submitAllocate}
                  disabled={submitting}
                  data-testid="ipo-allocate-submit"
                >
                  {submitting ? 'Wird erfasst…' : 'Zuteilung erfassen'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual assignment modal */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Manuelle IPO-Zuweisung</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-user">Kunde</Label>
              <select
                id="manual-user"
                value={manualForm.userId}
                onChange={(e) => setManualForm((f) => ({ ...f, userId: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm"
              >
                <option value="">— Kunde wählen —</option>
                {profilesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email} ({p.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="manual-ipo">IPO</Label>
              <select
                id="manual-ipo"
                value={manualForm.ipoId}
                onChange={(e) => setManualForm((f) => ({ ...f, ipoId: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm"
              >
                <option value="">— IPO wählen —</option>
                {ipoCatalog.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.company_name}
                    {i.ticker_proposed ? ` (${i.ticker_proposed})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="manual-shares">Lots / Stück</Label>
                <Input
                  id="manual-shares"
                  value={manualForm.shares}
                  onChange={(e) => setManualForm((f) => ({ ...f, shares: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="manual-amount">Volumen (EUR, opt.)</Label>
                <Input
                  id="manual-amount"
                  value={manualForm.amountEur}
                  onChange={(e) => setManualForm((f) => ({ ...f, amountEur: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="manual-sub">Einstand/Lot (optional)</Label>
              <Input
                id="manual-sub"
                value={manualForm.subscriptionPrice}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, subscriptionPrice: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="manual-listing">Listing-Preis / Lot</Label>
                <Input
                  id="manual-listing"
                  value={manualForm.listingPrice}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, listingPrice: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="manual-profit">Gewinn %</Label>
                <Input
                  id="manual-profit"
                  value={manualForm.profitPct}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, profitPct: e.target.value }))
                  }
                />
              </div>
            </div>
            <ValuationPreview preview={manualPreview} currency={manualCurrency} />
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={manualForm.deductCash}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, deductCash: e.target.checked }))
                }
              />
              Betrag vom Kundenkonto abbuchen
            </label>
            <div>
              <Label htmlFor="manual-note">Notiz</Label>
              <Textarea
                id="manual-note"
                value={manualForm.decisionNote}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, decisionNote: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={submitManual} disabled={submitting}>
                Zuweisen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminSubpageLayout>
  );
};

export default AdminIpoRequests;

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Info,
  TrendingUp,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import ProductIcon from '@/components/ProductIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PageContainer, PageHeader, SurfaceCard } from '@/components/dashboard/PageHeader';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import { CardListSkeleton } from '@/components/Skeleton';
import { formatEUR } from '@/lib/dashboardFormatters';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/context/DashboardDataContext';
import { cn } from '@/lib/utils';
import IpoContactBlock from '@/components/dashboard/IpoContactBlock';
import IpoLogo from '@/components/IpoLogo';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import DashboardContentReveal from '@/components/dashboard/motion/DashboardContentReveal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { normalizeIpoCatalogRow } from '@/lib/decodeHtmlEntities';

// Session 82.69: Legacy-Katalog-Read längst Mongo-native; toter Import entfernt.

const STATUS_LABELS = {
  upcoming: 'Bevorstehend',
  open: 'Zeichnung offen',
  priced: 'Kurs festgelegt',
  filed: 'Bei SEC eingereicht',
  listed: 'Börsennotiert',
  postponed: 'Verschoben',
  cancelled: 'Abgesagt',
};

const STATUS_BADGE = {
  upcoming: 'bg-sky-50 text-sky-700 border-sky-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  priced: 'bg-violet-50 text-violet-700 border-violet-200',
  filed: 'bg-amber-50 text-amber-800 border-amber-200',
  listed: 'bg-slate-100 text-slate-600 border-slate-200',
  postponed: 'bg-orange-50 text-orange-700 border-orange-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';

const formatPriceRange = (low, high, currency = 'EUR') => {
  if (low == null && high == null) return null;
  const sym = currency === 'USD' ? '$' : '€';
  if (low != null && high != null && low !== high) {
    return `${sym}${Number(low).toLocaleString('de-DE')} – ${sym}${Number(high).toLocaleString('de-DE')}`;
  }
  const v = low ?? high;
  return `${sym}${Number(v).toLocaleString('de-DE')}`;
};

const formatPriceLabel = (ipo) => {
  const range = formatPriceRange(
    ipo.price_range_low,
    ipo.price_range_high,
    ipo.price_currency || 'EUR',
  );
  if (range) return range;
  if (ipo.status === 'filed') {
    return 'Offizielle Preisspanne noch nicht veröffentlicht';
  }
  return '–';
};

const formatValuation = (value, currency = 'USD') => {
  if (value == null) return null;
  const sym = currency === 'USD' ? '$' : '€';
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000_000_000) {
    return `${sym}${(n / 1_000_000_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio.`;
  }
  if (n >= 1_000_000_000) {
    return `${sym}${(n / 1_000_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd.`;
  }
  return `${sym}${n.toLocaleString('de-DE')}`;
};

const INVESTABLE_STATUSES = new Set(['upcoming', 'filed', 'priced', 'open']);

const canInvest = (status) => INVESTABLE_STATUSES.has(status);

const IpoPage = () => {
  const { user } = useAuth();
  const { refreshIpoRequests } = useDashboardData();
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [investNotes, setInvestNotes] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subShares, setSubShares] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        // Session 82.03 — Mongo-native Katalog via FastAPI. Server sortiert
        // bereits: display_order DESC, ipo_date ASC. Auth via Cookie.
        const resp = await fetch('/api/ipo/catalog', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (active) {
          setIpos((Array.isArray(data) ? data : []).map(normalizeIpoCatalogRow));
          setLoadError('');
        }
      } catch {
        // Session 81.08 — Error bleibt vom EMPTY-State getrennt.
        if (active) {
          setLoadError('IPO-Daten konnten derzeit nicht geladen werden.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    let list = ipos.slice();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.company_name || '').toLowerCase().includes(q) ||
          (i.ticker_proposed || '').toLowerCase().includes(q) ||
          (i.isin || '').toLowerCase().includes(q) ||
          (i.exchange || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }
    return list;
  }, [ipos, search, statusFilter]);

  const openDetail = (ipo) => {
    setSelected(ipo);
    setInvestNotes('');
    setSubAmount(ipo.min_investment_eur ? String(ipo.min_investment_eur) : '');
    setSubShares(String(ipo.lot_size || 1));
  };

  const submitInvest = async () => {
    if (!user?.id || !selected) return;

    const isOpen = selected.status === 'open';
    const amountRaw = subAmount.trim();
    const amount = amountRaw ? Number(amountRaw) : null;
    const shares = Number(subShares);
    const min = Number(selected.min_investment_eur || 0);

    if (isOpen) {
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Bitte geben Sie ein gültiges Ordervolumen an.');
        return;
      }
      if (min > 0 && amount < min) {
        toast.error(`Mindestinvestition: ${formatEUR(min)}`);
        return;
      }
      if (!Number.isFinite(shares) || shares < 1 || !Number.isInteger(shares)) {
        toast.error('Bitte geben Sie eine gültige Stückzahl (ganze Zahl) an.');
        return;
      }
      const lot = Number(selected.lot_size) || 1;
      if (shares % lot !== 0) {
        toast.error(`Stückzahl muss ein Vielfaches der Losgröße (${lot}) sein.`);
        return;
      }
    } else if (amountRaw && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error('Bitte geben Sie ein gültiges Investitionsvolumen an oder lassen Sie das Feld leer.');
      return;
    }

    setSubmitting(true);
    // Session 82.02 — FastAPI/Mongo-native Customer-Write (statt direktem
    // Supabase-INSERT). Auth via Cookie; user_id/status/source werden
    // serverseitig gesetzt und dürfen im Payload nicht auftauchen.
    let error = null;
    try {
      const resp = await fetch('/api/ipo/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipo_id: selected.id,
          amount_eur: amount,
          shares_requested: isOpen ? shares : shares >= 1 ? shares : 1,
          notes:
            investNotes.trim() ||
            (isOpen ? 'Zeichnungsanfrage' : 'Investitionsanfrage'),
        }),
      });
      if (!resp.ok) {
        let detail = 'Anfrage konnte nicht gespeichert werden.';
        try {
          const body = await resp.json();
          if (body?.detail) detail = String(body.detail);
        } catch { /* ignore */ }
        if (resp.status === 409) {
          error = { code: 'duplicate', message: detail };
        } else if (resp.status === 401) {
          error = { code: 'unauth', message: 'Sitzung abgelaufen. Bitte neu anmelden.' };
        } else {
          error = { code: 'server', message: detail };
        }
      }
    } catch (err) {
      error = { code: 'network', message: 'Netzwerkfehler — bitte erneut versuchen.' };
    }
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof refreshIpoRequests === 'function') {
      await refreshIpoRequests();
    }
    toast.success(
      `Investitionsanfrage für „${selected.company_name}" gesendet. Unser Team meldet sich bei Ihnen.`,
    );
    setSelected(null);
  };

  const investForm = selected && canInvest(selected.status) ? (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
      <p className="flex items-center gap-2 font-medium text-emerald-900">
        <TrendingUp size={16} />
        {selected.status === 'open' ? 'Zeichnungsanfrage' : 'Investitionsanfrage'}
      </p>
      {selected.status === 'filed' && (
        <p className="text-[12px] text-amber-800">
          Offizieller IPO-Preis noch nicht veröffentlicht — Ihre Anfrage ist unverbindlich.
        </p>
      )}
      {selected.status === 'open' && selected.min_investment_eur > 0 && (
        <p className="text-[12px] text-bank-text-muted">
          Mindestinvestition: {formatEUR(selected.min_investment_eur)}
          {selected.lot_size > 1 && ` · Losgröße: ${selected.lot_size}`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase text-bank-text-muted">
            Betrag (EUR){selected.status === 'open' ? '' : ', optional'}
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={selected.status === 'open' ? '' : 'z. B. 10.000'}
            value={subAmount}
            onChange={(e) => setSubAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-bank-text-muted">Stück / Lots</label>
          <Input
            type="number"
            min="1"
            step="1"
            value={subShares}
            onChange={(e) => setSubShares(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase text-bank-text-muted">Nachricht (optional)</label>
        <textarea
          className="mt-1 w-full rounded-md border border-bank-border px-3 py-2 text-[13px]"
          rows={2}
          placeholder="z. B. gewünschtes Volumen oder Rückrufzeit…"
          value={investNotes}
          onChange={(e) => setInvestNotes(e.target.value)}
        />
      </div>
      <Button variant="primary" size="sm" disabled={submitting || !user?.id} onClick={submitInvest}>
        {selected.status === 'open' ? 'Zeichnungsanfrage senden' : 'Investieren'}
      </Button>
      {!user?.id && (
        <p className="text-[12px] text-amber-700">Bitte melden Sie sich an, um zu investieren.</p>
      )}
      <IpoContactBlock compact />
      <p className="text-[11px] text-bank-text-muted leading-relaxed">
        Anfragen sind unverbindlich bis zur Bestätigung durch unser Team.
      </p>
    </div>
  ) : null;

  return (
    <PageContainer>
      <VermoegenBreadcrumb current="IPO" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Aktien"
        title="IPO — Bevorstehende Börsengänge"
        icon={PRODUCT_ICONS.ipo}
        description="Informieren Sie sich über geplante Börsengänge und stellen Sie unverbindliche Investitionsanfragen."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="space-y-4">
          <SurfaceCard accent padded={false} className="p-5">
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                Filter
              </span>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-bank-gold"
              >
                {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showFilters ? 'Verbergen' : 'Anzeigen'}
              </button>
            </div>
            <div className={`${showFilters ? 'block' : 'hidden'} space-y-4 lg:block`}>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-bank-text-muted">
                  Suche
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bank-text-muted" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Unternehmen, Ticker…"
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-bank-text-muted">
                  Status
                </label>
                <select
                  className="w-full rounded-md border border-bank-border px-2 py-2 text-[13px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Alle</option>
                  <option value="filed">Bei SEC eingereicht</option>
                  <option value="upcoming">Bevorstehend</option>
                  <option value="open">Zeichnung offen</option>
                  <option value="priced">Kurs festgelegt</option>
                </select>
              </div>
            </div>
          </SurfaceCard>
          <IpoContactBlock />
          <SurfaceCard padded={false} className="p-4">
            <p className="flex items-start gap-2 text-[12px] text-bank-text-muted">
              <Info size={14} className="mt-0.5 shrink-0 text-bank-primary" />
              Investitionsanfragen sind unverbindlich bis zur Bestätigung durch unser Team.
            </p>
          </SurfaceCard>
        </aside>

        <div className="space-y-3" data-testid="ipo-content">
          <DashboardContentReveal
            loading={loading}
            skeleton={<CardListSkeleton count={4} />}
          >
            {loadError ? (
              // ERROR State — dedizierter Zustand mit Retry.
              <SurfaceCard className="p-10 text-center" data-testid="ipo-error-state">
                <ProductIcon product="ipo" size="empty" showBubble={false} className="mx-auto mb-3 opacity-40" />
                <p className="text-[14px] text-rose-700">{loadError}</p>
                <p className="mt-1 text-[12px] text-bank-text-muted">
                  Der Server hat die IPO-Übersicht nicht beantwortet. Bitte versuchen Sie es erneut.
                </p>
                <Button variant="primary" size="sm" className="mt-4" onClick={retry} data-testid="ipo-retry-btn">
                  Erneut laden
                </Button>
              </SurfaceCard>
            ) : ipos.length === 0 ? (
              // API SUCCESS + EMPTY — echt keine IPOs im Katalog.
              <SurfaceCard className="p-10 text-center text-bank-text-muted" data-testid="ipo-empty-state">
                <ProductIcon product="ipo" size="empty" showBubble={false} className="mx-auto mb-3 opacity-40" />
                <p className="text-[14px]">Derzeit sind keine bevorstehenden Börsengänge verfügbar.</p>
              </SurfaceCard>
            ) : filtered.length === 0 ? (
              // SEARCH-EMPTY — Filter/Suche ohne Treffer (aber Katalog hat Daten).
              <SurfaceCard className="p-10 text-center text-bank-text-muted" data-testid="ipo-search-empty-state">
                <ProductIcon product="ipo" size="empty" showBubble={false} className="mx-auto mb-3 opacity-40" />
                <p className="text-[14px]">Keine Börsengänge entsprechen Ihrer Suche.</p>
                <p className="mt-1 text-[12px]">Passen Sie Suchbegriff oder Status-Filter an.</p>
              </SurfaceCard>
            ) : (
              <DashboardStagger className="space-y-3">
                {filtered.map((ipo) => (
                  <DashboardStaggerItem key={ipo.id}>
                    <SurfaceCard
                      className="cursor-pointer p-5 transition-shadow hover:shadow-md"
                      onClick={() => openDetail(ipo)}
                    >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <IpoLogo ipo={ipo} size="md" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-bank-text">{ipo.company_name}</h3>
                      {ipo.ticker_proposed && (
                        <span className="font-mono text-[12px] text-bank-text-muted">
                          {ipo.ticker_proposed}
                        </span>
                      )}
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          STATUS_BADGE[ipo.status] || STATUS_BADGE.upcoming,
                        )}
                      >
                        {STATUS_LABELS[ipo.status] || ipo.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-bank-text-muted">
                      {[ipo.exchange, ipo.market].filter(Boolean).join(' · ') || '–'}
                      {ipo.isin && ` · ISIN ${ipo.isin}`}
                    </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-bank-text-muted">IPO-Datum</p>
                    <p className="text-[14px] font-semibold tabular-nums">
                      {ipo.ipo_date ? formatDate(ipo.ipo_date) : ipo.expected_ipo_window || '–'}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-[12px]',
                        ipo.price_range_low == null && ipo.price_range_high == null && ipo.status === 'filed'
                          ? 'text-amber-700'
                          : 'text-bank-text-muted',
                      )}
                    >
                      {formatPriceLabel(ipo)}
                    </p>
                    {ipo.valuation_last_private != null && (
                      <p className="mt-0.5 text-[11px] text-bank-text-muted">
                        Letzte Privatbewertung:{' '}
                        {formatValuation(ipo.valuation_last_private, ipo.price_currency || 'USD')}
                      </p>
                    )}
                    {canInvest(ipo.status) && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(ipo);
                        }}
                      >
                        <TrendingUp size={14} className="mr-1" />
                        Investieren
                      </Button>
                    )}
                  </div>
                </div>
                    </SurfaceCard>
                  </DashboardStaggerItem>
                ))}
              </DashboardStagger>
            )}
          </DashboardContentReveal>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <IpoLogo ipo={selected} size="md" eager />
                  <span className="min-w-0">{selected.company_name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-[13px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase text-bank-text-muted">Ticker</p>
                    <p className="font-mono">{selected.ticker_proposed || '–'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-bank-text-muted">IPO-Datum</p>
                    <p>
                      {selected.ipo_date
                        ? formatDate(selected.ipo_date)
                        : selected.expected_ipo_window || '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-bank-text-muted">Börse</p>
                    <p>{selected.exchange || '–'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-bank-text-muted">IPO-Preisspanne</p>
                    <p>{formatPriceLabel(selected)}</p>
                  </div>
                  {selected.valuation_last_private != null && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase text-bank-text-muted">
                        Letzte Privatbewertung (kein IPO-Preis)
                      </p>
                      <p className="font-medium">
                        {formatValuation(
                          selected.valuation_last_private,
                          selected.price_currency || 'USD',
                        )}
                      </p>
                    </div>
                  )}
                  {selected.subscription_start && (
                    <div>
                      <p className="text-[10px] uppercase text-bank-text-muted">Zeichnung von</p>
                      <p>{formatDate(selected.subscription_start)}</p>
                    </div>
                  )}
                  {selected.subscription_end && (
                    <div>
                      <p className="text-[10px] uppercase text-bank-text-muted">Zeichnung bis</p>
                      <p>{formatDate(selected.subscription_end)}</p>
                    </div>
                  )}
                </div>

                {selected.description && (
                  <p className="text-bank-text-muted leading-relaxed">{selected.description}</p>
                )}

                {selected.prospectus_url && (
                  <a
                    href={selected.prospectus_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-bank-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText size={14} />
                    Prospekt ansehen
                    <ExternalLink size={12} />
                  </a>
                )}

                {investForm}

                {!canInvest(selected.status) && (
                  <p className="text-[12px] text-bank-text-muted">
                    Für dieses IPO ist derzeit keine Investition möglich.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default IpoPage;

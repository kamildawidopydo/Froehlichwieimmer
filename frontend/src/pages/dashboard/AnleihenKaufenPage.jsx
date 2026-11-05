import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PageContainer, PageHeader, SurfaceCard } from '@/components/dashboard/PageHeader';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import { CardListSkeleton } from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/context/DashboardDataContext';
import BondOfferCard from '@/components/dashboard/bonds/BondOfferCard';
import BondBuyDialog, { fetchBuyQuote } from '@/components/dashboard/bonds/BondBuyDialog';
import { matchesBondSearch, yearsRemaining } from '@/lib/bondDisplay';

const SORT_OPTIONS = [
  { id: 'rest_asc', label: 'Kürzeste Laufzeit', field: 'faelligkeitsdatum', dir: 'asc' },
  { id: 'rest_desc', label: 'Längste Laufzeit', field: 'faelligkeitsdatum', dir: 'desc' },
  { id: 'kupon_desc', label: 'Höchster Kupon', field: 'kupon_rate', dir: 'desc' },
  { id: 'kupon_asc', label: 'Niedrigster Kupon', field: 'kupon_rate', dir: 'asc' },
];

const AnleihenKaufenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshBondRequests } = useDashboardData();
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [amountByBond, setAmountByBond] = useState({});
  const [filters, setFilters] = useState({
    issuer: 'all',
    minLaufzeitJahre: '',
    maxLaufzeitJahre: '',
  });
  const [sort, setSort] = useState('rest_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [buyState, setBuyState] = useState(null);
  const retry = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        // Session 82.03 — FastAPI/Mongo-native Katalog (kein Supabase mehr).
        const resp = await fetch('/api/bonds/catalog', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (active) {
          setBonds(Array.isArray(data) ? data : []);
          setLoadError('');
        }
      } catch (err) {
        if (active) {
          setLoadError('Anleihen-Daten konnten derzeit nicht geladen werden.');
          // ERROR bleibt vom EMPTY-State getrennt — bonds NICHT auf [] überschreiben.
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const bondKey = (b, idx = 0) => b.id || b.isin || `${b.bond_name || 'bond'}-${idx}`;

  const issuers = useMemo(() => {
    const set = new Set(bonds.map((b) => b.issuer).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [bonds]);

  const filtered = useMemo(() => {
    let list = bonds.slice();
    if (search) {
      list = list.filter((b) => matchesBondSearch(b, search));
    }
    if (filters.issuer !== 'all') {
      list = list.filter((b) => b.issuer === filters.issuer);
    }
    if (filters.minLaufzeitJahre) {
      const min = Number(filters.minLaufzeitJahre);
      list = list.filter((b) => {
        const years = yearsRemaining(b);
        return years != null && years >= min;
      });
    }
    if (filters.maxLaufzeitJahre) {
      const max = Number(filters.maxLaufzeitJahre);
      list = list.filter((b) => {
        const years = yearsRemaining(b);
        return years != null && years <= max;
      });
    }

    const sortDef = SORT_OPTIONS.find((s) => s.id === sort) || SORT_OPTIONS[0];
    list.sort((a, b) => {
      const av = a[sortDef.field];
      const bv = b[sortDef.field];
      if (sortDef.field === 'faelligkeitsdatum') {
        const at = a.is_perpetual ? Number.MAX_SAFE_INTEGER : av ? new Date(av).getTime() : 0;
        const bt = b.is_perpetual ? Number.MAX_SAFE_INTEGER : bv ? new Date(bv).getTime() : 0;
        return sortDef.dir === 'asc' ? at - bt : bt - at;
      }
      return sortDef.dir === 'asc'
        ? Number(av || 0) - Number(bv || 0)
        : Number(bv || 0) - Number(av || 0);
    });
    return list;
  }, [bonds, search, filters, sort]);

  const startBuy = async (bond, idx) => {
    const amount = Number(amountByBond[bondKey(bond, idx)] || bond.min_order_eur || 1000);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Bitte geben Sie einen gültigen Anlagebetrag an.');
      return;
    }
    try {
      const quote = await fetchBuyQuote(bond.id, amount);
      setBuyState({ bond, amount, quote });
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) retry();
    }
  };

  const requestPurchase = async (bond, idx) => {
    if (!user?.id) {
      toast.error('Bitte melden Sie sich erneut an, um eine Anfrage zu senden.');
      return;
    }
    const key = bondKey(bond, idx);
    const amountRaw = amountByBond[key];
    const amount = Number(amountRaw || bond.min_order_eur || 1000);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Bitte geben Sie ein gültiges Ordervolumen an.');
      return;
    }
    // Session 82.04 — FastAPI/Mongo-native Customer-Write (kein Supabase mehr).
    // Auth via Cookie; user_id/status/source werden serverseitig gesetzt und
    // dürfen im Payload nicht auftauchen. bond_id ist die Mongo-Katalog-_id.
    try {
      const resp = await fetch('/api/bonds/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          bond_id: bond.id,
          amount_eur: amount,
          notes: 'Created from Neue Anleihe kaufen',
        }),
      });
      if (!resp.ok) {
        let detail = 'Anfrage konnte nicht gespeichert werden.';
        try {
          const body = await resp.json();
          if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        } catch { /* ignore */ }
        if (resp.status === 409) {
          toast.error('Für diese Anleihe besteht bereits eine offene Kaufanfrage.');
        } else if (resp.status === 401) {
          toast.error('Sitzung abgelaufen. Bitte neu anmelden.');
        } else {
          toast.error(detail);
          if (resp.status === 400) retry();
        }
        return;
      }
    } catch (err) {
      toast.error('Netzwerkfehler — bitte erneut versuchen.');
      return;
    }
    if (typeof refreshBondRequests === 'function') {
      await refreshBondRequests();
    }
    toast.success(
      `Ihre Anfrage wurde erfolgreich übermittelt. Wir erstellen Ihnen ein individuelles Angebot für die ${bond.bond_name || bond.isin} und melden uns innerhalb von 24 Stunden.`,
    );
  };

  return (
    <PageContainer>
      <VermoegenBreadcrumb current="Anleihe kaufen" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Anleihen"
        title="Neue Anleihe kaufen"
        icon={PRODUCT_ICONS.anleihen}
        description="Filtern Sie nach Emittent und Laufzeit. Anschließend stoßen Sie eine Kaufanfrage an unser Team an."
        actions={
          <Button variant="outline-ink" size="default" onClick={() => navigate('/dashboard/anleihen')}>
            Zurück zum Portfolio
          </Button>
        }
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
                className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                aria-expanded={showFilters}
                data-testid="bonds-filter-toggle"
              >
                {showFilters ? <ChevronUp size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
                {showFilters ? 'Verbergen' : 'Anzeigen'}
              </button>
            </div>
            <div className={`${showFilters ? 'block' : 'hidden'} space-y-4 lg:block`}>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Suche
                </label>
                <div className="relative">
                  <Search
                    size={13}
                    strokeWidth={1.5}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bank-text-muted"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, ISIN, WKN, Emittent, Kupon…"
                    className="h-9 pl-8 text-sm"
                    data-testid="bonds-search-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Emittent
                </label>
                <select
                  value={filters.issuer}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, issuer: e.target.value }))
                  }
                  className="h-9 w-full border border-bank-border bg-white px-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                  data-testid="bonds-issuer-select"
                >
                  {issuers.map((iss) => (
                    <option key={iss} value={iss}>
                      {iss === 'all' ? 'Alle Emittenten' : iss}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                  Restlaufzeit (Jahre)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="min"
                    value={filters.minLaufzeitJahre}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, minLaufzeitJahre: e.target.value }))
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="max"
                    value={filters.maxLaufzeitJahre}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, maxLaufzeitJahre: e.target.value }))
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">
                  Bei unbefristeten Anleihen gilt die Laufzeit als unbegrenzt
                </p>
              </div>

              <Button
                variant="outline-ink"
                size="sm"
                className="w-full"
                onClick={() =>
                  setFilters({
                    issuer: 'all',
                    minLaufzeitJahre: '',
                    maxLaufzeitJahre: '',
                  })
                }
              >
                Filter zurücksetzen
              </Button>
            </div>
          </SurfaceCard>

          <div className="relative border border-bank-gold/45 bg-bank-ink p-5 text-bank-on-ink">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-ink-elev text-bank-gold">
                <Info size={15} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
                  Service · 24 Std.
                </p>
                <p
                  className="dashboard-page-title mt-1.5 text-[1rem] font-semibold leading-tight text-white"
                >
                  Beratung anfordern
                </p>
                <p className="mt-2 text-[12.5px] leading-snug text-white/75">
                  Unser Team prüft jede Anfrage individuell und meldet sich innerhalb von
                  24 Stunden.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div data-testid="bonds-content">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <Filter size={13} strokeWidth={1.5} className="text-bank-gold" />
              <span className="tabular-nums text-bank-text" data-testid="bonds-count">{filtered.length}</span> Anleihen gefunden
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 border border-bank-border bg-white px-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
              data-testid="bonds-sort-select"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <CardListSkeleton count={4} />
          ) : loadError ? (
            <SurfaceCard accent className="py-12 text-center" data-testid="bonds-error-state">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                Marktdaten konnten nicht geladen werden
              </p>
              <p className="mt-2 text-[13px] text-bank-error">{loadError}</p>
              <div className="mt-4">
                <Button variant="outline-ink" size="sm" onClick={retry} data-testid="bonds-retry">
                  Erneut laden
                </Button>
              </div>
            </SurfaceCard>
          ) : bonds.length === 0 ? (
            <SurfaceCard accent className="py-12 text-center" data-testid="bonds-empty-state">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                Aktuell keine Anleihen verfügbar
              </p>
            </SurfaceCard>
          ) : filtered.length === 0 ? (
            <SurfaceCard accent className="py-12 text-center" data-testid="bonds-search-empty-state">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                Keine Treffer mit den aktuellen Filtern
              </p>
            </SurfaceCard>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((b, idx) => {
                const key = bondKey(b, idx);
                return (
                  <BondOfferCard
                    key={key}
                    bond={b}
                    testKey={key}
                    eager={idx < 4}
                    amount={amountByBond[key] ?? (b.min_order_eur || 1000)}
                    onAmountChange={(v) => setAmountByBond((prev) => ({ ...prev, [key]: v }))}
                    onRequest={() => requestPurchase(b, idx)}
                    onBuy={() => startBuy(b, idx)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BondBuyDialog
        key={buyState ? `${buyState.bond.id}-${buyState.amount}-${buyState.quote.total}` : 'none'}
        state={buyState}
        onClose={() => setBuyState(null)}
        onOrdered={async () => {
          setBuyState(null);
          if (typeof refreshBondRequests === 'function') await refreshBondRequests();
        }}
      />
    </PageContainer>
  );
};

export default AnleihenKaufenPage;

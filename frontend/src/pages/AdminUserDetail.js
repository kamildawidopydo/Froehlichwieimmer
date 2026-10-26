import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Session 82.100 · Supabase-Import entfernt.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import AddressFields from '@/components/profile/AddressFields';
import {
  addressFormToDbPayload,
  addressFromProfile,
  emptyAddressForm,
  validateAddressForm,
} from '@/lib/profileAddress';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { validatePersonName } from '@/lib/personName';
import {
  RefreshCw,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Shield,
  Wallet,
  Briefcase,
  Activity,
  Clock,
  TrendingUp,
  PieChart,
  ListOrdered,
  Hash,
  ChevronRight,
  Sparkles,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES } from '@/constants/countries';
import AdminCustomerAssetsPanel from '@/components/admin/AdminCustomerAssetsPanel';

const fmtMoney = (value) => Number(value || 0).toLocaleString('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDate = (value, withTime = false) => {
  if (!value) return '–';
  return new Date(value).toLocaleString(
    'de-DE',
    withTime
      ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
};

const PRODUCT_LABEL = {
  festgeld: 'Festgeld',
  tagesgeld: 'Tagesgeld',
  flexgeld: 'Flexgeld',
};

const ORDER_STATUS_STYLE = {
  pending: 'border-amber-300/55 bg-amber-50 text-amber-700',
  executed: 'border-emerald-300/55 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-300/55 bg-rose-50 text-rose-700',
  cancelled: 'border-bank-border bg-bank-bg/45 text-bank-text-muted',
};

const ORDER_STATUS_LABEL = {
  pending: 'Offen',
  executed: 'Ausgeführt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="relative overflow-hidden border border-bank-border bg-white p-5 transition-shadow duration-300 hover:shadow-editorial-sm">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            {label}
          </p>
          <p className="rate-figure mt-3 text-[1.65rem] leading-[1] tabular-nums text-bank-text">
            {value}
          </p>
          {sub && (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {sub}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-bank-gold/45 bg-bank-bg/60 text-bank-gold">
          <Icon size={17} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, description, icon: Icon, children, className }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden border border-bank-border bg-white shadow-editorial-sm',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
      <div className="flex items-start gap-3.5 border-b border-bank-border bg-bank-bg/45 px-5 py-4">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-bank-gold/45 bg-white text-bank-gold">
            <Icon size={17} strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0">
          <h2
            className="font-display text-[1.15rem] font-light leading-tight text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ProfileRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-bank-border py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
        {label}
      </span>
      <span className="text-[13px] text-bank-text sm:text-right">{children}</span>
    </div>
  );
}

const AdminUserDetail = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stockPositions, setStockPositions] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [stockOrders, setStockOrders] = useState([]);
  const [bondPositions, setBondPositions] = useState([]);
  const [depotContracts, setDepotContracts] = useState([]);
  const [portfolioSnapshots, setPortfolioSnapshots] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [stockPriceMap, setStockPriceMap] = useState({});
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    ...emptyAddressForm(),
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [assets, setAssets] = useState({ depot_contracts: [], stock_positions: [], bond_positions: [], documents: [], cash_balance: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadUserData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Session 82.100 · Supabase-Aufrufe entfernt · nur Profil aus FastAPI + Empty-Arrays.
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const profileRes = { data: null, error: null };
      try {
        const { data } = await _axios.get(`${_api}/api/admin/users/${userId}`, { withCredentials: true });
        profileRes.data = data;
      } catch (e) { profileRes.error = e; }
      let assetData = { depot_contracts: [], stock_positions: [], bond_positions: [], documents: [], cash_balance: 0 };
      try {
        const { data } = await _axios.get(`${_api}/api/admin/customers/${userId}/assets`, { withCredentials: true });
        assetData = data;
      } catch (e) { toast.error('Bestand konnte nicht geladen werden'); }
      setAssets(assetData);
      const stockPosRes = { data: assetData.stock_positions, error: null };
      const watchlistRes = { data: [], error: null };
      const orderRes = { data: [], error: null };
      const bondRes = { data: assetData.bond_positions, error: null };
      const depotRes = { data: assetData.depot_contracts, error: null };
      const snapshotsRes = { data: [], error: null };
      const activityRes = { data: [], error: null };

      if (profileRes.error) throw profileRes.error;

      let map = {};

      setProfile(profileRes.data ? { ...profileRes.data, cash_balance: assetData.cash_balance } : null);
      setStockPositions(stockPosRes.data || []);
      setWatchlist(watchlistRes.data || []);
      setStockOrders(orderRes.data || []);
      setBondPositions(bondRes.data || []);
      setDepotContracts(depotRes.data || []);
      setPortfolioSnapshots(snapshotsRes.data || []);
      setActivityEvents(activityRes.data || []);
      setStockPriceMap(map);
    } catch (err) {
      toast.error(`Fehler beim Laden: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    const firstNameCheck = validatePersonName(editForm.first_name, { label: 'Vorname' });
    const lastNameCheck = validatePersonName(editForm.last_name, { label: 'Nachname' });
    if (!firstNameCheck.ok) {
      toast.error(firstNameCheck.message);
      return;
    }
    if (!lastNameCheck.ok) {
      toast.error(lastNameCheck.message);
      return;
    }
    const phone = sanitizeFormField('phone', editForm.phone).trim();
    if (!phone) {
      toast.error('Telefon ist erforderlich.');
      return;
    }
    if (!editForm.country) {
      toast.error('Land ist erforderlich.');
      return;
    }
    const addressCheck = validateAddressForm(editForm);
    if (!addressCheck.ok) {
      toast.error(addressCheck.message);
      return;
    }

    setSavingProfile(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      await _axios.patch(`${_api}/api/admin/customers/${profile.id}/profile`, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone,
        country: editForm.country,
        address_street: editForm.address_street || null,
        address_house_number: editForm.address_house_number || null,
        address_line_2: editForm.address_line_2 || null,
        address_postal_code: editForm.address_postal_code || null,
        address_city: editForm.address_city || null,
      }, { withCredentials: true });
      toast.success('Profil gespeichert');
      await loadUserData();
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile?.id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Nur JPG, PNG oder WEBP sind erlaubt.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 5 MB).');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Session 82.99 · Emergent Object Storage via Backend-Proxy.
      const form = new FormData();
      form.append('file', file);
      const { getApiBase: _base } = await import('@/lib/apiBase');
      const API = _base();
      const axios = (await import('axios')).default;
      await axios.post(`${API}/api/users/${profile.id}/avatar`, form, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profilfoto aktualisiert');
      await loadUserData();
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      toast.error(`Foto-Upload fehlgeschlagen: ${detail}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      country: profile?.country || '',
      ...addressFromProfile(profile),
    });
  }, [profile]);

  const metrics = useMemo(() => {
    const stocksValue = stockPositions.reduce((sum, pos) => {
      const qty = Number(pos.quantity || 0);
      const price = stockPriceMap[pos.symbol] || Number(pos.avg_cost || 0);
      return sum + qty * price;
    }, 0);

    const bondsValue = bondPositions
      .filter((bond) => bond.is_active)
      .reduce(
        (sum, bond) => sum + (Number(bond.nominal_betrag || 0) * Number(bond.aktueller_kurs || 100)) / 100,
        0
      );

    const contractsValue = depotContracts
      .filter((contract) => contract.is_active)
      .reduce((sum, contract) => sum + Number(contract.amount_eur || 0), 0);

    const cashValue = Number(profile?.cash_balance || 0);
    const total = cashValue + stocksValue + bondsValue + contractsValue;

    return {
      cashValue,
      stocksValue,
      bondsValue,
      contractsValue,
      total,
      latestSnapshot: portfolioSnapshots[0]?.total_value ?? null,
    };
  }, [bondPositions, depotContracts, portfolioSnapshots, profile?.cash_balance, stockPositions, stockPriceMap]);

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.name || 'Unbekannt';

  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return '?';
  }, [fullName]);

  const statusLabel =
    { approved: 'Freigeschaltet', pending: 'Ausstehend', rejected: 'Abgelehnt' }[profile?.status] ||
    profile?.status ||
    '–';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bank-bg">
        <div className="relative flex flex-col items-center gap-4 border border-bank-border bg-white px-10 py-12 shadow-editorial-md">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
          <RefreshCw size={26} strokeWidth={1.5} className="animate-spin text-bank-gold" />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
            Profil wird geladen…
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bank-bg">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Button variant="outline-ink" className="mb-6" onClick={() => navigate('/admin/users')}>
            <ArrowLeft size={13} strokeWidth={1.5} />
            Zurück
          </Button>
          <div className="relative border border-bank-border bg-white p-14 text-center">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              Benutzer nicht gefunden oder kein Zugriff
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bank-bg">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Breadcrumb + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-bank-text-muted transition-colors hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
            >
              Admin
            </button>
            <ChevronRight size={11} strokeWidth={1.5} className="text-bank-gold/55" />
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="text-bank-text-muted transition-colors hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
            >
              Benutzer
            </button>
            <ChevronRight size={11} strokeWidth={1.5} className="text-bank-gold/55" />
            <span className="truncate text-bank-text">{fullName}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline-ink" onClick={() => navigate('/admin/users')}>
              <ArrowLeft size={13} strokeWidth={1.5} />
              Zur Liste
            </Button>
            <Button variant="outline-ink" onClick={loadUserData}>
              <RefreshCw size={13} strokeWidth={1.5} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Hero — bank-ink editorial */}
        <div className="relative overflow-hidden border border-bank-gold/45 bg-bank-ink shadow-editorial-md">
          <div aria-hidden className="absolute inset-0 mesh-navy opacity-90" />
          <div aria-hidden className="absolute inset-0 topo-pattern opacity-[0.05]" />
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-gold/35 to-transparent" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20 rounded-none border border-bank-gold/55 bg-bank-ink-elev">
                <AvatarImage src={profile.avatar_url || ''} alt={fullName} className="rounded-none" />
                <AvatarFallback className="rounded-none bg-transparent font-display text-[1.6rem] font-light text-bank-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
                  <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                  Kundenprofil
                </p>
                <h1
                  className="mt-3 font-display text-[1.85rem] font-light leading-[1.05] text-white sm:text-[2.4rem]"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                >
                  {fullName}
                </h1>
                <span aria-hidden className="mt-3 block h-px w-16 bg-bank-gold/65" />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/85">
                    <Mail size={11} strokeWidth={1.5} className="text-bank-gold" />
                    {profile.email || '–'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/85">
                    <Hash size={11} strokeWidth={1.5} className="text-bank-gold" />
                    {String(profile.id).slice(0, 8)}…
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="inline-flex items-center border border-white/25 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/85">
                Rolle · {profile.role || 'user'}
              </span>
              <span className="inline-flex items-center border border-white/25 bg-white/5 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/85">
                Status · {statusLabel}
              </span>
              {profile.must_change_password && (
                <span className="inline-flex items-center gap-1 border border-bank-gold/65 bg-bank-gold/15 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-gold">
                  <Sparkles size={11} strokeWidth={1.5} />
                  Passwortwechsel ausstehend
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={TrendingUp}
            label="Gesamtvermögen"
            value={fmtMoney(metrics.total)}
            sub={
              metrics.latestSnapshot != null
                ? `Letzter Snapshot · ${fmtMoney(metrics.latestSnapshot)}`
                : 'Kein Snapshot vorhanden'
            }
          />
          <StatTile
            icon={Briefcase}
            label="Aktien"
            value={fmtMoney(metrics.stocksValue)}
            sub={`${stockPositions.length} Position${stockPositions.length === 1 ? '' : 'en'}`}
          />
          <StatTile
            icon={PieChart}
            label="Anleihen · Festgeld"
            value={fmtMoney(metrics.bondsValue + metrics.contractsValue)}
            sub={`${bondPositions.filter((b) => b.is_active).length} Anleihen · ${depotContracts.filter((c) => c.is_active).length} Verträge`}
          />
          <StatTile
            icon={Wallet}
            label="Cash"
            value={fmtMoney(metrics.cashValue)}
            sub="Aus Profil-Kontostand"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Profile column */}
          <div className="space-y-6 xl:col-span-4">
            <SectionShell
              title="Profil & Sicherheit"
              description="Stammdaten und Konto-Flags"
              icon={Shield}
            >
              <div className="space-y-4">
                <div className="border border-bank-border bg-bank-bg/45 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 rounded-none border border-bank-gold/45">
                      <AvatarImage src={profile.avatar_url || ''} alt={fullName} className="rounded-none" />
                      <AvatarFallback className="rounded-none bg-bank-ink font-display text-[1.1rem] font-light text-bank-gold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                        Profilfoto
                      </p>
                      <p className="mt-1 text-[12px] text-bank-text-muted">
                        JPG, PNG oder WEBP bis 5 MB
                      </p>
                      <label className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 border border-bank-border bg-white px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-gold/55 hover:text-bank-gold focus-within:ring-2 focus-within:ring-bank-accent/35">
                        <Camera size={12} strokeWidth={1.5} />
                        {uploadingAvatar ? 'Upload läuft…' : 'Foto ändern'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    E-Mail
                  </p>
                  <Input value={profile.email || ''} disabled className="h-10" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      Vorname
                    </p>
                    <Input
                      value={editForm.first_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          first_name: sanitizeFormField('first_name', e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      Nachname
                    </p>
                    <Input
                      value={editForm.last_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          last_name: sanitizeFormField('last_name', e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      Telefon
                    </p>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone: sanitizeFormField('phone', e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      Land
                    </p>
                    <select
                      value={editForm.country}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, country: e.target.value }))}
                      className="h-10 w-full border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                    >
                      <option value="">Land wählen…</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="mb-3 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    Adresse
                  </p>
                  <AddressFields
                    value={editForm}
                    onChange={(next) => setEditForm((prev) => ({ ...prev, ...next }))}
                    startNum={null}
                    inputClassName="h-10 w-full border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                  />
                </div>
                <Button
                  variant="primary"
                  size="default"
                  className="w-full"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Speichert…' : 'Profil speichern'}
                </Button>
              </div>

              <div className="-mx-1 mt-4">
                <ProfileRow label="Verifiziert">{profile.verified ? 'Ja' : 'Nein'}</ProfileRow>
                <ProfileRow label="Onboarding">{profile.onboarding_completed ? 'Abgeschlossen' : 'Offen'}</ProfileRow>
                <ProfileRow label="Registriert">{fmtDate(profile.created_at, true)}</ProfileRow>
                <ProfileRow label="Zuletzt aktiv">{fmtDate(profile.last_seen_at, true)}</ProfileRow>
                <ProfileRow label="Passwort-Reset">{fmtDate(profile.last_password_reset_at, true)}</ProfileRow>
                <ProfileRow label="Provisioniert">{fmtDate(profile.provisioned_at, true)}</ProfileRow>
              </div>
            </SectionShell>

            <SectionShell
              title="Watchlist"
              description={`${watchlist.length} Titel`}
              icon={ListOrdered}
            >
              {watchlist.length === 0 ? (
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Keine Watchlist-Einträge
                </p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-auto pr-1">
                  {watchlist.slice(0, 12).map((w) => (
                    <li
                      key={`${w.symbol}-${w.added_at}`}
                      className="flex items-center justify-between border border-bank-border bg-bank-bg/45 px-3 py-2"
                    >
                      <span className="font-mono text-[12.5px] font-medium text-bank-text">
                        {w.symbol}
                      </span>
                      <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                        {w.stocks?.name || w.stocks?.sector || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>

          {/* Portfolio column */}
          <div className="space-y-6 xl:col-span-8">
            <SectionShell
              title="Portfolio"
              description="Aktienpositionen und Festgeld-/Anleihenbestand"
              icon={Briefcase}
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                    Aktienpositionen
                  </h3>
                  <div className="max-h-72 overflow-auto border border-bank-border bg-bank-bg/30">
                    {stockPositions.length === 0 ? (
                      <p className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                        Keine Aktienpositionen
                      </p>
                    ) : (
                      <ul className="divide-y divide-bank-border">
                        {stockPositions.map((pos) => {
                          const qty = Number(pos.quantity || 0);
                          const unitPrice = stockPriceMap[pos.symbol] || Number(pos.avg_cost || 0);
                          const total = qty * unitPrice;
                          return (
                            <li
                              key={pos.id}
                              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white"
                            >
                              <div>
                                <p className="font-mono text-[13px] font-medium text-bank-text">
                                  {pos.symbol}
                                </p>
                                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                                  {qty.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk
                                </p>
                              </div>
                              <p className="rate-figure text-[13.5px] tabular-nums text-bank-text">
                                {fmtMoney(total)}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                    Festgeld · Anleihen
                  </h3>
                  <div className="max-h-72 overflow-auto border border-bank-border bg-bank-bg/30">
                    {depotContracts.length === 0 && bondPositions.length === 0 ? (
                      <p className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                        Keine Einträge
                      </p>
                    ) : (
                      <ul className="divide-y divide-bank-border">
                        {depotContracts.map((contract) => (
                          <li
                            key={`contract-${contract.id}`}
                            className="px-4 py-3 transition-colors hover:bg-white"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[13px] font-medium text-bank-text">
                                  {contract.banks?.name || 'Vertrag'}
                                </p>
                                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                                  {PRODUCT_LABEL[contract.product_type] || contract.product_type || 'Produkt'}{' '}
                                  · {contract.is_active ? 'Aktiv' : 'Inaktiv'}
                                  {contract.zinssatz != null && ` · ${contract.zinssatz}% p.a.`}
                                </p>
                                {(contract.active_from || contract.active_until) && (
                                  <p className="mt-1 font-mono text-[10px] tabular-nums tracking-[0.14em] text-bank-text-muted/80">
                                    {fmtDate(contract.active_from)} – {fmtDate(contract.active_until)}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 rate-figure text-[13.5px] tabular-nums text-bank-text">
                                {fmtMoney(contract.amount_eur)}
                              </span>
                            </div>
                          </li>
                        ))}
                        {bondPositions.map((bond) => (
                          <li
                            key={`bond-${bond.id}`}
                            className="px-4 py-3 transition-colors hover:bg-white"
                          >
                            <p className="text-[13px] font-medium text-bank-text">
                              {bond.issuer || bond.bond_name || 'Anleihe'}
                            </p>
                            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                              Nominal · {fmtMoney(bond.nominal_betrag)} · Kurs{' '}
                              {Number(bond.aktueller_kurs || 0).toLocaleString('de-DE')}%
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              title="Bestand eintragen"
              description="Festgeld, Tagesgeld, Aktien, Anleihen, Guthaben und Dokumente für diesen Kunden"
              icon={Wallet}
            >
              <AdminCustomerAssetsPanel userId={userId} assets={assets} onChanged={loadUserData} />
            </SectionShell>

            <SectionShell
              title="Aktivität & Orders"
              description="Letzte Ereignisse und Aufträge"
              icon={Activity}
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                    Aktivität
                  </h3>
                  <div className="max-h-80 overflow-auto border border-bank-border bg-bank-bg/30">
                    {activityEvents.length === 0 ? (
                      <p className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                        Keine Aktivität
                      </p>
                    ) : (
                      <ul className="relative p-3">
                        {activityEvents.map((event, i) => (
                          <li key={event.id} className="relative flex gap-3 pb-5 pl-6 last:pb-1">
                            {i < activityEvents.length - 1 && (
                              <span aria-hidden className="absolute bottom-0 left-[7px] top-3 w-px bg-bank-border" />
                            )}
                            <span aria-hidden className="absolute left-[3px] top-1.5 z-10 h-2 w-2 border border-bank-gold/65 bg-bank-ink" />
                            <div className="relative min-w-0 flex-1 border border-bank-border bg-white px-3 py-2.5">
                              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/35 via-bank-gold/15 to-transparent" />
                              <p className="font-mono text-[12px] font-medium text-bank-text">
                                {event.event_type}
                              </p>
                              <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-bank-text-muted">
                                <Clock size={10} strokeWidth={1.5} />
                                {fmtDate(event.created_at, true)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                    <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
                    Aktien-Orders
                  </h3>
                  <div className="max-h-80 overflow-auto border border-bank-border bg-bank-bg/30">
                    {stockOrders.length === 0 ? (
                      <p className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                        Keine Orders
                      </p>
                    ) : (
                      <ul className="divide-y divide-bank-border">
                        {stockOrders.map((order) => (
                          <li
                            key={order.id}
                            className="px-4 py-3 transition-colors hover:bg-white"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[13px] font-medium text-bank-text">
                                  <span
                                    className={cn(
                                      'font-mono text-[10.5px] uppercase tracking-[0.18em]',
                                      order.side === 'buy' ? 'text-emerald-700' : 'text-rose-700',
                                    )}
                                  >
                                    {order.side === 'buy' ? 'Kauf' : 'Verkauf'}
                                  </span>{' '}
                                  ·{' '}
                                  <span className="font-mono">{order.symbol}</span>
                                </p>
                                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] tabular-nums text-bank-text-muted">
                                  {Number(order.quantity || 0).toLocaleString('de-DE', {
                                    maximumFractionDigits: 4,
                                  })}{' '}
                                  Stk · {fmtDate(order.created_at, true)}
                                </p>
                                {order.rejection_reason && (
                                  <p className="mt-1 text-[11.5px] text-rose-600">
                                    {order.rejection_reason}
                                  </p>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'inline-flex shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                                  ORDER_STATUS_STYLE[order.status] || 'border-bank-border bg-bank-bg/45 text-bank-text-muted',
                                )}
                              >
                                {ORDER_STATUS_LABEL[order.status] || order.status}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </SectionShell>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetail;

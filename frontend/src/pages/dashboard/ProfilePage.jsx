import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Shield,
  LogOut,
  Bell,
  Languages,
  Lock,
  Clock,
  Download,
  Receipt,
  MessageCircle,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import * as Sentry from '@sentry/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n, { APP_LANG_STORAGE_KEY } from '@/i18n';
import {
  PageContainer,
  SectionTitle,
  SurfaceCard,
} from '@/components/dashboard/PageHeader';
import { COUNTRIES } from '@/constants/countries';
import { formatEUR } from '@/lib/dashboardFormatters';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import PasswordInput from '@/components/auth/PasswordInput';
import { validatePassword } from '@/lib/passwordPolicy';
import { getDialCodeForCountry } from '@/constants/phoneDialCodes';
import AddressFields from '@/components/profile/AddressFields';
import PhoneNumberInput from '@/components/profile/PhoneNumberInput';
import {
  addressFormToDbPayload,
  addressFromProfile,
  formatLegacyAddress,
  hasStructuredAddress,
  validateAddressForm,
} from '@/lib/profileAddress';
import { combinePhoneNumber, phoneFormFromProfile, validatePhoneLocal } from '@/lib/phoneNumber';
import { cn } from '@/lib/utils';
import { ONBOARDING_STORAGE_KEY } from '@/components/dashboard/DashboardOnboarding';
import DashboardTabPanel from '@/components/dashboard/motion/DashboardTabPanel';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('account');
  const [profileForm, setProfileForm] = useState({
    country: user?.country || '',
    ...phoneFormFromProfile(user),
    ...addressFromProfile(user),
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    weekly_digest: user?.email_digest_enabled !== false,
    order_updates: true,
    marketing: false,
    price_alerts: true,
    email_otp_enabled: false,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [taxForm, setTaxForm] = useState({
    tax_allowance_eur: '',
    tax_allowance_used_eur: '',
    church_tax_enabled: false,
    church_tax_rate: '9',
    tax_residency_country: '',
  });
  const [taxSaving, setTaxSaving] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [language, setLanguage] = useState(user?.language || i18n.language || 'de');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  useEffect(() => {
    setProfileForm({
      country: user?.country || '',
      ...phoneFormFromProfile(user),
      ...addressFromProfile(user),
    });
  }, [
    user?.phone,
    user?.country,
    user?.address_street,
    user?.address_house_number,
    user?.address_line_2,
    user?.address_postal_code,
    user?.address_city,
  ]);

  useEffect(() => {
    const raw = user?.notification_prefs || {};
    setNotificationPrefs({
      weekly_digest: raw?.weekly_digest ?? user?.email_digest_enabled !== false,
      order_updates: raw?.order_updates ?? true,
      marketing: raw?.marketing ?? false,
      price_alerts: raw?.price_alerts ?? true,
      email_otp_enabled: raw?.email_otp_enabled ?? false,
    });
  }, [user?.notification_prefs, user?.email_digest_enabled]);

  useEffect(() => {
    setLanguage(user?.language || user?.notification_prefs?.language || i18n.language || 'de');
  }, [user?.language, user?.notification_prefs?.language]);

  useEffect(() => {
    setTaxForm({
      tax_allowance_eur:
        user?.tax_allowance_eur != null ? String(user.tax_allowance_eur) : '',
      tax_allowance_used_eur:
        user?.tax_allowance_used_eur != null
          ? String(user.tax_allowance_used_eur)
          : '',
      church_tax_enabled: !!user?.church_tax_enabled,
      church_tax_rate:
        user?.church_tax_rate != null ? String(user.church_tax_rate) : '9',
      tax_residency_country: user?.tax_residency_country || '',
    });
  }, [
    user?.tax_allowance_eur,
    user?.tax_allowance_used_eur,
    user?.church_tax_enabled,
    user?.church_tax_rate,
    user?.tax_residency_country,
  ]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        const sess = data?.session || null;
        setSessionMeta(
          sess
            ? {
                createdAt: sess.user?.created_at || null,
                expiresAt: sess.expires_at ? new Date(sess.expires_at * 1000).toISOString() : null,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
              }
            : null,
        );
      } finally {
        if (active) setSessionLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sectionTabs = useMemo(
    () => [
      { id: 'account', label: t('settings.sections.account', { defaultValue: 'Konto' }), icon: UserIcon },
      {
        id: 'notifications',
        label: t('settings.sections.notifications', { defaultValue: 'Benachrichtigungen' }),
        icon: Bell,
      },
      {
        id: 'tax',
        label: t('settings.sections.tax', { defaultValue: 'Steuern' }),
        icon: Receipt,
      },
      { id: 'security', label: t('settings.sections.security', { defaultValue: 'Sicherheit' }), icon: Lock },
      { id: 'privacy', label: t('settings.sections.privacy', { defaultValue: 'Datenschutz' }), icon: Shield },
      { id: 'language', label: t('settings.sections.language', { defaultValue: 'Sprache' }), icon: Languages },
    ],
    [t],
  );

  if (!user) return null;

  const initials = (
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
    user.email ||
    'U'
  )
    .slice(0, 2)
    .toUpperCase();

  const saveProfile = async () => {
    if (!user?.id) return;
    const phoneCheck = validatePhoneLocal(profileForm.phone_local, { required: true });
    if (!phoneCheck.ok) return toast.error(phoneCheck.message);
    const nextPhone = combinePhoneNumber(profileForm.phone_dial_code, profileForm.phone_local);
    if (!profileForm.country) return toast.error('Bitte wählen Sie ein Land');
    const addressCheck = validateAddressForm(profileForm);
    if (!addressCheck.ok) return toast.error(addressCheck.message);

    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: nextPhone,
          country: profileForm.country,
          ...addressFormToDbPayload(profileForm),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      toast.success('Profil gespeichert');
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Profil konnte nicht gespeichert werden');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Nur JPG, PNG oder WEBP sind erlaubt');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 5 MB)');
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      await refreshUser();
      toast.success('Profilfoto aktualisiert');
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Profilfoto konnte nicht gespeichert werden');
    } finally {
      setAvatarUploading(false);
    }
  };

  const toggleNotification = async (key) => {
    if (!user?.id) return;
    const next = !notificationPrefs[key];
    const nextPrefs = { ...notificationPrefs, [key]: next };
    setPrefsSaving(true);
    setNotificationPrefs(nextPrefs);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_prefs: nextPrefs,
          email_digest_enabled: nextPrefs.weekly_digest,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Einstellungen gespeichert');
    } catch (err) {
      Sentry.captureException(err);
      setNotificationPrefs(notificationPrefs);
      toast.error('Einstellung konnte nicht gespeichert werden');
    } finally {
      setPrefsSaving(false);
    }
  };

  const saveLanguage = async () => {
    if (!user?.id || !language) return;
    const nextPrefs = { ...(user.notification_prefs || {}), language };
    setLanguageSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_prefs: nextPrefs,
        })
        .eq('id', user.id);
      if (error) throw error;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(APP_LANG_STORAGE_KEY, language);
      }
      await i18n.changeLanguage(language);
      await refreshUser();
      toast.success(t('settings.language.saved', { defaultValue: 'Sprache aktualisiert.' }));
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Sprache konnte nicht gespeichert werden');
    } finally {
      setLanguageSaving(false);
    }
  };

  const changePassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const nextPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();
    if (!currentPassword) {
      toast.error(t('settings.security.currentPassword', { defaultValue: 'Aktuelles Passwort' }) + ' fehlt');
      return;
    }
    const passwordCheck = validatePassword(nextPassword);
    if (!passwordCheck.ok) {
      toast.error(passwordCheck.message);
      return;
    }
    if (nextPassword !== confirmPassword) {
      toast.error('Passwort-Bestätigung stimmt nicht überein.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Passwort wurde aktualisiert.');
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Passwort konnte nicht aktualisiert werden.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const logoutOtherSessions = async () => {
    setSessionActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      toast.success(
        t('settings.security.logoutOthersDone', { defaultValue: 'Andere Sitzungen wurden abgemeldet.' }),
      );
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Andere Sitzungen konnten nicht beendet werden.');
    } finally {
      setSessionActionLoading(false);
    }
  };

  const logoutAllSessions = async () => {
    setSessionActionLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success(
        t('settings.security.logoutAllDone', { defaultValue: 'Auf allen Geräten abgemeldet.' }),
      );
      navigate('/');
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Abmeldung auf allen Geräten fehlgeschlagen.');
    } finally {
      setSessionActionLoading(false);
    }
  };

  const saveTaxPreferences = async () => {
    if (!user?.id) return;
    const allowance = Number(taxForm.tax_allowance_eur || 0);
    const allowanceUsed = Number(taxForm.tax_allowance_used_eur || 0);
    const rate = Number(taxForm.church_tax_rate || 9);
    if (Number.isNaN(allowance) || allowance < 0) {
      toast.error('Freistellungsauftrag muss ≥ 0 sein.');
      return;
    }
    if (Number.isNaN(allowanceUsed) || allowanceUsed < 0) {
      toast.error('Verbrauchter Freibetrag muss ≥ 0 sein.');
      return;
    }
    if (allowanceUsed > allowance) {
      toast.error('Verbrauch kann den Freibetrag nicht überschreiten.');
      return;
    }
    if (![0, 8, 9].includes(rate)) {
      toast.error('Kirchensteuer muss 0, 8 oder 9 % sein.');
      return;
    }
    setTaxSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tax_allowance_eur: allowance,
          tax_allowance_used_eur: allowanceUsed,
          church_tax_enabled: !!taxForm.church_tax_enabled,
          church_tax_rate: rate,
          tax_residency_country: taxForm.tax_residency_country || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      toast.success('Steuer-Einstellungen gespeichert');
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Steuer-Einstellungen konnten nicht gespeichert werden');
    } finally {
      setTaxSaving(false);
    }
  };

  const restartDashboardTour = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    navigate('/dashboard/uebersicht');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email;

  return (
    <PageContainer className="max-w-6xl min-w-0">
      {/* Identity band — editorial, aligned with dashboard shell */}
      <div className="relative mb-8 overflow-hidden border border-bank-border bg-gradient-to-br from-white via-bank-bg/45 to-bank-gold-soft/25 px-5 py-7 sm:px-8 sm:py-9 dark:from-bank-surface dark:via-bank-bg/30 dark:to-bank-surface-elev">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/70 via-bank-accent/30 to-transparent"
        />
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-bank-accent/10 blur-3xl dark:bg-bank-accent/15" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shrink-0 border-2 border-bank-gold/45 shadow-editorial-sm sm:h-24 sm:w-24">
              <AvatarImage src={user.avatar_url || ''} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-bank-surface-elev to-bank-gold-soft/50 font-mono text-lg tracking-[0.08em] text-bank-secondary dark:from-bank-surface dark:to-bank-bg dark:text-bank-gold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 pt-0.5">
              <p className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                <span aria-hidden className="h-1 w-1 rounded-full bg-bank-gold" />
                {t('settings.eyebrow', { defaultValue: 'Konto' })}
              </p>
              <h1
                className="dashboard-page-title mt-2 text-[1.65rem] font-semibold leading-tight text-bank-text sm:text-[2rem]"
              >
                {displayName}
              </h1>
              <p className="mt-1.5 truncate text-[13px] text-bank-text-muted">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center border border-bank-border bg-white/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text dark:bg-bank-bg/50">
                  {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </span>
                <span className="inline-flex items-center border border-bank-border bg-white/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted dark:bg-bank-bg/40">
                  Mitglied seit{' '}
                  {new Date(user.created_at).toLocaleDateString('de-DE', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline-accent" size="default" asChild>
              <Link to="/dashboard/kontoauszug" className="inline-flex items-center gap-2">
                <Receipt size={14} strokeWidth={1.5} />
                Kontoauszug
              </Link>
            </Button>
            <Button variant="outline-ink" size="default" asChild>
              <Link to="/dashboard/support" className="inline-flex items-center gap-2">
                <MessageCircle size={14} strokeWidth={1.5} />
                Support
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="w-full min-w-0 lg:w-[228px] lg:shrink-0" aria-label="Profilbereiche">
          <DashboardStagger className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <DashboardStaggerItem key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 border px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors sm:gap-2 sm:px-3 sm:text-[10px] sm:tracking-[0.16em]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                    active
                      ? 'border-bank-primary/40 bg-gradient-to-br from-bank-surface-elev to-bank-gold-soft/40 text-bank-text shadow-sm dark:from-bank-surface dark:to-bank-bg'
                      : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 dark:bg-bank-surface',
                  )}
                >
                  <Icon size={12} strokeWidth={1.5} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
                </DashboardStaggerItem>
              );
            })}
          </DashboardStagger>

          <nav className="hidden flex-col overflow-hidden border border-bank-border bg-white dark:bg-bank-surface lg:flex">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 border-l-2 px-4 py-3 text-left text-[13px] font-medium transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30 focus-visible:ring-offset-1',
                    active
                      ? 'border-bank-accent-strong bg-bank-bg/60 text-bank-text'
                      : 'border-transparent text-bank-text-muted hover:border-bank-accent-strong/35 hover:bg-bank-bg/40 hover:text-bank-text',
                  )}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.32}
                    className={cn(
                      'shrink-0 opacity-[0.78] transition-opacity group-hover:opacity-100',
                      active && 'opacity-100',
                    )}
                  />
                  <span className="truncate">{tab.label}</span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.32}
                    className={cn(
                      'ml-auto shrink-0 text-bank-text-muted/0 transition-all group-hover:text-bank-gold/50',
                      active && 'text-bank-gold/70',
                    )}
                  />
                </button>
              );
            })}
          </nav>

          <SurfaceCard accent className="mt-4 hidden border-bank-border p-0 lg:block">
            <div className="border-b border-bank-border px-4 py-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                Sitzung
              </p>
            </div>
            <div className="p-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-bank-error/35 text-bank-error hover:bg-bank-error/10 hover:text-bank-error"
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={1.5} /> Abmelden
              </Button>
            </div>
          </SurfaceCard>
        </aside>

        <div className="min-w-0 flex-1">
          <DashboardTabPanel tabKey={activeSection} className="space-y-6">
          {activeSection === 'account' && (
            <SurfaceCard accent>
            <SectionTitle kicker="Konto">Kontoinformationen</SectionTitle>
            <div className="mb-6 flex items-center gap-4 border border-bank-border bg-bank-bg/50 p-4">
              <Avatar className="h-16 w-16 border border-bank-border">
                <AvatarImage src={user.avatar_url || ''} alt="Profilbild" />
                <AvatarFallback className="bg-gradient-to-br from-bank-surface-elev to-bank-gold-soft/50 font-mono text-[12px] tracking-[0.16em] text-bank-secondary dark:from-bank-surface dark:to-bank-bg dark:text-bank-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Profilfoto
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-bank-text-muted">
                  JPG, PNG oder WEBP bis 5 MB.
                </p>
                <label className="mt-3 inline-flex cursor-pointer items-center border border-bank-border bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-gold/55 focus-within:ring-2 focus-within:ring-bank-accent/35">
                  {avatarUploading ? 'Upload läuft…' : 'Foto ändern'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={uploadAvatar}
                    disabled={avatarUploading}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {(user.first_name || user.last_name) && (
                <div className="flex justify-between py-3 border-b border-bank-border/80">
                  <span className="text-bank-text-muted">Name</span>
                  <span className="font-medium">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-bank-border/80">
                <span className="text-bank-text-muted">E-Mail</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="py-3 border-b border-bank-border/80">
                <label className="mb-2 block text-bank-text-muted">Telefon</label>
                <PhoneNumberInput
                  dialCode={profileForm.phone_dial_code}
                  localNumber={profileForm.phone_local}
                  onDialCodeChange={(value) =>
                    setProfileForm((prev) => ({ ...prev, phone_dial_code: value }))
                  }
                  onLocalNumberChange={(value) =>
                    setProfileForm((prev) => ({ ...prev, phone_local: value }))
                  }
                  localPlaceholder="170 1234567"
                  selectClassName="h-10 w-[5.65rem] shrink-0 appearance-none rounded-md border border-bank-border bg-white pl-1.5 pr-5 font-mono text-[12px] tabular-nums text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                  inputClassName="h-10 min-w-0 flex-1 rounded-md border border-bank-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                />
              </div>
              <div className="py-3 border-b border-bank-border/80">
                <label className="mb-2 block text-bank-text-muted">Land</label>
                <select
                  value={profileForm.country}
                  onChange={(e) => {
                    const country = e.target.value;
                    setProfileForm((prev) => ({
                      ...prev,
                      country,
                      phone_dial_code: country ? getDialCodeForCountry(country) : prev.phone_dial_code,
                    }));
                  }}
                  className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                >
                  <option value="">Land wählen…</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div className="py-3 border-b border-bank-border/80">
                <p className="mb-3 text-bank-text-muted">Adresse</p>
                {user?.address && !hasStructuredAddress(user) && (
                  <p className="mb-3 text-sm text-bank-text-muted">
                    Bisherige Adresse: {formatLegacyAddress(user.address)} — bitte im Detail erfassen.
                  </p>
                )}
                <AddressFields
                  value={profileForm}
                  onChange={(next) => setProfileForm((prev) => ({ ...prev, ...next }))}
                  startNum={null}
                  inputClassName="h-10 w-full rounded-md border border-bank-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                />
              </div>
              <div className="flex justify-between py-3 border-b border-bank-border/80">
                <span className="text-bank-text-muted">Kontotyp</span>
                <span className="font-medium">
                  {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-bank-border/80">
                <span className="text-bank-text-muted">Mitglied seit</span>
                <span className="font-medium">
                  {new Date(user.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="mt-5 w-full"
              onClick={saveProfile}
              disabled={profileSaving}
            >
              {profileSaving ? 'Speichert…' : 'Profil speichern'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3 w-full"
              onClick={restartDashboardTour}
            >
              <LayoutDashboard size={14} className="mr-1.5" />
              {t('dashboardShell.onboarding.replay', { defaultValue: 'Dashboard-Tour erneut starten' })}
            </Button>
          </SurfaceCard>
          )}
          {activeSection === 'notifications' && (
            <SurfaceCard accent>
              <SectionTitle kicker="Mitteilungen">
                <span className="inline-flex items-center gap-2">
                  <Bell size={14} strokeWidth={1.5} className="text-bank-gold" /> Benachrichtigungen
                </span>
              </SectionTitle>
              <div className="space-y-3">
                {[
                  {
                    key: 'weekly_digest',
                    label: 'Wochenbericht per E-Mail',
                    hint: 'Sonntags Portfolio-Update der letzten 7 Tage',
                  },
                  {
                    key: 'order_updates',
                    label: 'Auftrags-Updates',
                    hint: 'Benachrichtigungen bei Ausführung oder Ablehnung',
                  },
                  {
                    key: 'price_alerts',
                    label: 'Preis-Alerts',
                    hint: 'Updates zu wichtigen Marktbewegungen',
                  },
                  {
                    key: 'marketing',
                    label: 'Produkt-News',
                    hint: 'Neue Features und Angebote per E-Mail',
                  },
                  {
                    key: 'email_otp_enabled',
                    label: '2FA per E-Mail (neues Geraet)',
                    hint: 'Optionaler Sicherheitscode nur bei neuer Sitzung / neuem Geraet',
                  },
                ].map((item) => {
                  const enabled = !!notificationPrefs[item.key];
                  return (
                    <div key={item.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-bank-text">{item.label}</p>
                        <p className="text-xs text-bank-text-muted mt-0.5">{item.hint}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => toggleNotification(item.key)}
                        disabled={prefsSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-bank-accent/45 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-bank-primary' : 'bg-bank-border'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          )}
          {activeSection === 'tax' && (
            <SurfaceCard accent>
              <SectionTitle kicker="Berechnung">
                <span className="inline-flex items-center gap-2">
                  <Receipt size={14} strokeWidth={1.5} className="text-bank-gold" /> Steuer-Einstellungen
                </span>
              </SectionTitle>
              <p className="text-xs text-bank-text-muted mb-4">
                Diese Werte werden ausschließlich lokal für die Berechnung der Netto-Renditen
                im Dashboard verwendet (Abgeltungssteuer, Solidaritätszuschlag, Kirchensteuer,
                Freistellungsauftrag). Es findet keine Übermittlung an Behörden statt.
              </p>
              {Number(taxForm.tax_allowance_eur || 0) > 0 && (
                <div className="mb-5 rounded-lg border border-bank-border bg-bank-bg/40 p-4">
                  <div className="mb-2 flex items-end justify-between text-[13px]">
                    <span className="text-bank-text-muted">
                      {t('dashboardShell.tax.allowanceRemaining', { defaultValue: 'Freibetrag verbleibend' })}
                    </span>
                    <span className="font-semibold tabular-nums text-bank-text">
                      {formatEUR(
                        Math.max(
                          0,
                          Number(taxForm.tax_allowance_eur || 0) -
                            Number(taxForm.tax_allowance_used_eur || 0),
                        ),
                      )}{' '}
                      <span className="font-normal text-bank-text-muted">
                        / {formatEUR(Number(taxForm.tax_allowance_eur || 0))}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bank-border/60">
                    <div
                      className="h-full rounded-full bg-bank-primary transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(taxForm.tax_allowance_used_eur || 0) /
                            Math.max(Number(taxForm.tax_allowance_eur || 0), 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <Link
                    to="/dashboard/dokumente#freistellungsauftrag"
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-bank-primary hover:underline"
                  >
                    {t('dashboardShell.tax.downloadForm', { defaultValue: 'Freistellungsauftrag (PDF)' })}
                    <ChevronRight size={13} />
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="mb-1 block text-bank-text-muted">
                    Freistellungsauftrag (EUR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxForm.tax_allowance_eur}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        tax_allowance_eur: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-bank-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                    placeholder="z. B. 1000"
                  />
                  <p className="text-[11px] text-bank-text-muted mt-1">
                    DE Sparer-Pauschbetrag, ledig: max. 1.000 €, gemeinsam: 2.000 €
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-bank-text-muted">
                    Bereits verbraucht (EUR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxForm.tax_allowance_used_eur}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        tax_allowance_used_eur: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-bank-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                    placeholder="z. B. 250"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-bank-text-muted">Kirchensteuer</label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taxForm.church_tax_enabled}
                        onChange={(e) =>
                          setTaxForm((prev) => ({
                            ...prev,
                            church_tax_enabled: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">Aktiv</span>
                    </label>
                    <select
                      disabled={!taxForm.church_tax_enabled}
                      value={taxForm.church_tax_rate}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          church_tax_rate: e.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-bank-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25 disabled:opacity-60"
                    >
                      <option value="9">9 % (Standard)</option>
                      <option value="8">8 % (BY/BW)</option>
                      <option value="0">0 %</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-bank-text-muted">
                    Steuerlicher Wohnsitz
                  </label>
                  <input
                    type="text"
                    value={taxForm.tax_residency_country}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        tax_residency_country: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-bank-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                    placeholder="z. B. Deutschland"
                  />
                  <p className="text-[11px] text-bank-text-muted mt-1">
                    Optional. Falls leer, wird das Land aus dem Konto verwendet.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="mt-5 w-full"
                onClick={saveTaxPreferences}
                disabled={taxSaving}
              >
                {taxSaving ? 'Speichert…' : 'Steuer-Einstellungen speichern'}
              </Button>
            </SurfaceCard>
          )}
          {activeSection === 'security' && (
            <>
              <SurfaceCard accent className="bg-bank-accent/[0.04]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-bank-accent/35 bg-bank-accent/10 text-bank-accent">
                    <Shield size={16} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      256-bit · Verschlüsselt
                    </p>
                    <p
                      className="dashboard-page-title mt-1.5 text-[1.05rem] font-semibold leading-tight text-bank-text"
                    >
                      {t('settings.security.passwordTitle', { defaultValue: 'Passwort ändern' })}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-snug text-bank-text-muted">
                      Ihr Konto ist mit bankentauglicher Verschlüsselung geschützt.
                    </p>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard accent>
                <SectionTitle kicker="Sicherheit">
                  {t('settings.security.passwordTitle', { defaultValue: 'Passwort ändern' })}
                </SectionTitle>
                <div className="space-y-3">
                  <PasswordInput
                    placeholder={t('settings.security.currentPassword', {
                      defaultValue: 'Aktuelles Passwort',
                    })}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    autoComplete="current-password"
                    className="h-10 rounded-md border-bank-border text-sm focus-visible:ring-2 focus-visible:ring-bank-primary/25"
                  />
                  <PasswordInput
                    placeholder={t('settings.security.newPassword', { defaultValue: 'Neues Passwort' })}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className="h-10 rounded-md border-bank-border text-sm focus-visible:ring-2 focus-visible:ring-bank-primary/25"
                  />
                  <PasswordRequirements password={passwordForm.newPassword} />
                  <PasswordInput
                    placeholder={t('settings.security.confirmPassword', {
                      defaultValue: 'Neues Passwort bestätigen',
                    })}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className="h-10 rounded-md border-bank-border text-sm focus-visible:ring-2 focus-visible:ring-bank-primary/25"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={changePassword}
                    disabled={passwordSaving}
                  >
                    {passwordSaving
                      ? t('settings.security.savingPassword', { defaultValue: 'Speichert…' })
                      : t('settings.security.savePassword', { defaultValue: 'Passwort aktualisieren' })}
                  </Button>
                </div>
              </SurfaceCard>
              <SurfaceCard accent>
                <SectionTitle kicker="Session">
                  <span className="inline-flex items-center gap-2">
                    <Clock size={14} strokeWidth={1.5} className="text-bank-gold" />{' '}
                    {t('settings.security.sessionTitle', { defaultValue: 'Aktive Sitzung' })}
                  </span>
                </SectionTitle>
                {sessionLoading ? (
                  <p className="text-sm text-bank-text-muted">Lädt…</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="text-bank-text-muted">
                      {t('settings.security.sessionHint', {
                        defaultValue: 'Aktuelle Browser-Sitzung und Kontenaktivität',
                      })}
                    </p>
                    <p>
                      <span className="text-bank-text-muted">E-Mail:</span> {user.email}
                    </p>
                    <p>
                      <span className="text-bank-text-muted">
                        {t('settings.security.lastSeen', { defaultValue: 'Letzte Kontoaktivität' })}:
                      </span>{' '}
                      {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString('de-DE') : '–'}
                    </p>
                    <p>
                      <span className="text-bank-text-muted">
                        {t('settings.security.sessionCreated', { defaultValue: 'Sitzung gestartet' })}:
                      </span>{' '}
                      {sessionMeta?.createdAt
                        ? new Date(sessionMeta.createdAt).toLocaleString('de-DE')
                        : '–'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline-ink"
                        onClick={logoutOtherSessions}
                        disabled={sessionActionLoading}
                      >
                        {t('settings.security.logoutOthers', {
                          defaultValue: 'Andere Sitzungen abmelden',
                        })}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-bank-error/35 text-bank-error hover:bg-bank-error/10 hover:text-bank-error"
                        onClick={logoutAllSessions}
                        disabled={sessionActionLoading}
                      >
                        {t('settings.security.logoutAll', {
                          defaultValue: 'Von allen Geräten abmelden',
                        })}
                      </Button>
                    </div>
                  </div>
                )}
              </SurfaceCard>
            </>
          )}
          {activeSection === 'privacy' && (
            <SurfaceCard accent>
              <SectionTitle kicker="Datenschutz">
                <span className="inline-flex items-center gap-2">
                  <Shield size={14} strokeWidth={1.5} className="text-bank-gold" />{' '}
                  {t('settings.privacy.title', { defaultValue: 'Datenschutz-Steuerung' })}
                </span>
              </SectionTitle>
              <p className="mb-5 text-[13px] leading-snug text-bank-text-muted">
                {t('settings.privacy.desc', {
                  defaultValue:
                    'Datenexport und Kontolöschungsanfrage können Sie über den Support anfordern.',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline-ink"
                  onClick={() => navigate('/dashboard/support')}
                >
                  <Download size={14} strokeWidth={1.5} />
                  {t('settings.privacy.export', { defaultValue: 'Datenexport anfordern' })}
                </Button>
                <Button
                  variant="outline"
                  className="border-bank-error/35 text-bank-error hover:bg-bank-error/10 hover:text-bank-error"
                  onClick={() => navigate('/dashboard/support')}
                >
                  {t('settings.privacy.delete', { defaultValue: 'Kontolöschung anfragen' })}
                </Button>
              </div>
            </SurfaceCard>
          )}
          {activeSection === 'language' && (
            <SurfaceCard accent>
              <SectionTitle kicker="Sprache">
                <span className="inline-flex items-center gap-2">
                  <Languages size={14} strokeWidth={1.5} className="text-bank-gold" />{' '}
                  {t('settings.language.label', { defaultValue: 'Sprache der Oberfläche' })}
                </span>
              </SectionTitle>
              <p className="text-sm text-bank-text-muted mb-3">
                {t('settings.language.helper', {
                  defaultValue:
                    'Aktualisiert Navigation und zentrale Dashboard/Admin-Bereiche sofort.',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('de')}
                  aria-pressed={language === 'de'}
                  className={`border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 ${
                    language === 'de'
                      ? 'border-bank-primary/35 bg-gradient-to-br from-bank-surface-elev to-bank-gold-soft/40 text-bank-text shadow-sm dark:from-bank-surface dark:to-bank-bg'
                      : 'border-bank-border bg-white text-bank-text hover:border-bank-gold/55'
                  }`}
                >
                  {t('settings.language.german', { defaultValue: 'Deutsch' })}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                  className={`border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 ${
                    language === 'en'
                      ? 'border-bank-primary/35 bg-gradient-to-br from-bank-surface-elev to-bank-gold-soft/40 text-bank-text shadow-sm dark:from-bank-surface dark:to-bank-bg'
                      : 'border-bank-border bg-white text-bank-text hover:border-bank-gold/55'
                  }`}
                >
                  {t('settings.language.english', { defaultValue: 'Englisch' })}
                </button>
              </div>
              <Button
                variant="primary"
                size="default"
                className="mt-4"
                onClick={saveLanguage}
                disabled={languageSaving}
              >
                {languageSaving ? 'Speichert…' : 'Sprache speichern'}
              </Button>
            </SurfaceCard>
          )}
          </DashboardTabPanel>
          <div className="lg:hidden">
            <SurfaceCard accent>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-bank-error/35 text-bank-error hover:bg-bank-error/10 hover:text-bank-error"
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={1.5} /> Abmelden
              </Button>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProfilePage;

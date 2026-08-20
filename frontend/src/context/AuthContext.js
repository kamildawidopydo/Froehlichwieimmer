import React, { createContext, useState, useEffect, useContext, useLayoutEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
import { normalizeAppRole } from '@/lib/role';
import i18n, { APP_LANG_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/i18n';

const PRESENCE_INTERVAL_MS = 60_000;

export const AuthContext = createContext();

/**
 * Passwort-Reset: redirect_to muss mit https:// beginnen; sonst wertet Supabase die Domain
 * fälschlich als Pfad auf *.supabase.co aus (z. B. *.supabase.co/kapital-direkt24.de).
 * In Vercel REACT_APP_SITE_URL=# setzen.
 */
function getPublicSiteOrigin() {
  const raw = (process.env.REACT_APP_SITE_URL || '').trim().replace(/\/$/, '');
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function isPasswordRecoveryFromUrl() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery')
  );
}

function shouldDeferProfileFetch() {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/reset-password')) return true;
  return isPasswordRecoveryFromUrl();
}

function getPostLoginPath(profile = {}) {
  if (profile?.role === 'admin') return '/admin';
  if (profile?.must_change_password) return '/reset-password?mode=force';
  if (!profile?.onboarding_completed) return '/onboarding';
  return '/dashboard';
}

async function sha256Hex(input) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return '';
  const encoded = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildDeviceHash() {
  if (typeof window === 'undefined') return '';
  const raw = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.platform || '',
    window.screen?.width || '',
    window.screen?.height || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ].join('|');
  return sha256Hex(raw);
}

function humanizeFunctionsErrorDetail(detail, fallbackMessage) {
  const raw = detail || fallbackMessage;
  if (
    /domain is not verified/i.test(raw) ||
    /kapitalmitte-eu\.com/i.test(raw) ||
    /Resend 403/i.test(raw)
  ) {
    return 'Der Sicherheitscode konnte nicht per E-Mail gesendet werden. Bitte versuchen Sie es in einigen Minuten erneut oder kontaktieren Sie kundenservice@kapital-direkt24.de.';
  }
  if (/Resend \d{3}/i.test(raw)) {
    return 'E-Mail-Versand ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
  }
  return raw;
}

/** Edge functions return JSON { error } on 4xx/5xx; supabase-js surfaces a generic message only. */
async function throwIfFunctionsInvokeError(invokeResult, fallbackMessage) {
  const { data, error } = invokeResult;
  if (!error) return data;
  let detail = error.message || fallbackMessage;
  if (error.name === 'FunctionsHttpError' && error.context?.clone) {
    try {
      const body = await error.context.clone().json();
      if (body?.error != null) {
        detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      }
    } catch {
      try {
        const text = await error.context.clone().text();
        if (text) detail = text.slice(0, 400);
      } catch {
        /* ignore */
      }
    }
  }
  const err = new Error(humanizeFunctionsErrorDetail(detail, fallbackMessage));
  err.cause = error;
  throw err;
}

function resolveLanguageFromPrefs(profile) {
  const candidate = profile?.notification_prefs?.language;
  if (candidate && SUPPORTED_LANGUAGES.includes(candidate)) return candidate;
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(APP_LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  }
  return 'de';
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const presenceTimerRef = useRef(null);

  // Reset-Link von Site URL (/) ohne Hash-Verlust nach /reset-password umleiten
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPasswordRecoveryFromUrl()) return;
    if (window.location.pathname === '/reset-password') return;
    const { search, hash } = window.location;
    window.location.replace(`${window.location.origin}/reset-password${search}${hash}`);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (shouldDeferProfileFetch()) {
          setLoading(false);
          return;
        }
        fetchProfile(session.user);
      } else {
        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(APP_LANG_STORAGE_KEY);
          if (saved && SUPPORTED_LANGUAGES.includes(saved) && i18n.language !== saved) {
            i18n.changeLanguage(saved);
          }
        }
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false);
        return;
      }
      if (session?.user) {
        if (shouldDeferProfileFetch()) {
          setLoading(false);
          return;
        }
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Presence-Heartbeat — profiles.last_seen_at alle 60 Sekunden aktualisieren
  useEffect(() => {
    if (!user?.id) {
      if (presenceTimerRef.current) {
        clearInterval(presenceTimerRef.current);
        presenceTimerRef.current = null;
      }
      return;
    }

    const ping = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        // still überspringen
      }
    };

    ping();
    presenceTimerRef.current = setInterval(ping, PRESENCE_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      presenceTimerRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  const fetchProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Session beenden, wenn Freigabe aussteht oder abgelehnt wurde
      if (profile?.status === 'pending' || profile?.status === 'rejected') {
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      const language = resolveLanguageFromPrefs(profile);
      if (i18n.language !== language) {
        i18n.changeLanguage(language);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(APP_LANG_STORAGE_KEY, language);
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        role: normalizeAppRole(profile?.role),
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        country: profile?.country || null,
        address: profile?.address || null,
        address_street: profile?.address_street || null,
        address_house_number: profile?.address_house_number || null,
        address_line_2: profile?.address_line_2 || null,
        address_postal_code: profile?.address_postal_code || null,
        address_city: profile?.address_city || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        verified: profile?.verified || false,
        status: profile?.status || 'pending',
        favorites: profile?.favorites || [],
        email_digest_enabled: profile?.email_digest_enabled ?? true,
        notification_prefs: profile?.notification_prefs || null,
        language,
        onboarding_completed: profile?.onboarding_completed || false,
        onboarding_completed_steps: profile?.onboarding_completed_steps || [],
        must_change_password: profile?.must_change_password || false,
        last_password_reset_at: profile?.last_password_reset_at || null,
        last_seen_at: profile?.last_seen_at || null,
        tax_allowance_eur: profile?.tax_allowance_eur ?? 0,
        tax_allowance_used_eur: profile?.tax_allowance_used_eur ?? 0,
        church_tax_enabled: profile?.church_tax_enabled ?? false,
        church_tax_rate: profile?.church_tax_rate ?? 9,
        tax_residency_country: profile?.tax_residency_country || null,
        created_at: authUser.created_at,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setUser({
        id: authUser.id,
        email: authUser.email,
        role: 'user',
        favorites: [],
        notification_prefs: null,
        language: 'de',
        avatar_url: null,
        onboarding_completed: false,
        onboarding_completed_steps: [],
        must_change_password: false,
        last_password_reset_at: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    let data;
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) throw res.error;
      data = res.data;
    } catch (err) {
      logEvent(EVENTS.LOGIN_FAILED, { email, reason: err?.message || 'unknown' });
      throw err;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role, must_change_password, onboarding_completed, notification_prefs')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'pending') {
      logEvent(EVENTS.LOGIN_FAILED, { email, reason: 'pending' }, { userId: data.user.id });
      await supabase.auth.signOut();
      const err = new Error(
        'Ihr Konto wartet noch auf Freischaltung durch einen Administrator. Sie erhalten eine E-Mail, sobald Ihr Konto aktiviert wurde.'
      );
      err.status = 'pending';
      throw err;
    }

    if (profile?.status === 'rejected') {
      logEvent(EVENTS.LOGIN_FAILED, { email, reason: 'rejected' }, { userId: data.user.id });
      await supabase.auth.signOut();
      const err = new Error(
        'Ihre Registrierung wurde leider nicht genehmigt. Bitte kontaktieren Sie uns unter kundenservice@kapital-direkt24.de.'
      );
      err.status = 'rejected';
      throw err;
    }

    const emailOtpEnabled = Boolean(profile?.notification_prefs?.email_otp_enabled);
    if (emailOtpEnabled) {
      const deviceHash = await buildDeviceHash();
      const otpData = await throwIfFunctionsInvokeError(
        await supabase.functions.invoke('auth-email-otp', {
          body: {
            action: 'send',
            device_hash: deviceHash,
          },
        }),
        'E-Mail-Code konnte nicht gesendet werden.',
      );
      if (otpData?.required) {
        return {
          user: data.user,
          requiresOtp: true,
          challengeId: otpData.challenge_id,
          deviceHash,
          nextPath: getPostLoginPath(profile || {}),
        };
      }
    }

    logEvent(EVENTS.LOGIN, { email }, { userId: data.user.id });
    return {
      user: data.user,
      nextPath: getPostLoginPath(profile || {}),
    };
  };

  const sendEmailOtpForCurrentSession = async ({ deviceHash }) => {
    const resolvedHash = deviceHash || (await buildDeviceHash());
    if (!resolvedHash) throw new Error('Device fingerprint konnte nicht erstellt werden.');
    const data = await throwIfFunctionsInvokeError(
      await supabase.functions.invoke('auth-email-otp', {
        body: {
          action: 'send',
          device_hash: resolvedHash,
        },
      }),
      'E-Mail-Code konnte nicht gesendet werden.',
    );
    return {
      challengeId: data?.challenge_id || null,
      required: Boolean(data?.required),
      deviceHash: resolvedHash,
    };
  };

  const verifyEmailOtp = async ({ challengeId, code, deviceHash, trustDevice = true }) => {
    const resolvedHash = deviceHash || (await buildDeviceHash());
    return throwIfFunctionsInvokeError(
      await supabase.functions.invoke('auth-email-otp', {
        body: {
          action: 'verify',
          challenge_id: challengeId,
          code: String(code ?? '').trim(),
          device_hash: resolvedHash,
          trust_device: trustDevice,
        },
      }),
      'Sicherheitscode konnte nicht bestätigt werden.',
    );
  };

  const register = async ({ email, password, first_name, last_name, country, phone, address }) => {
    // 1. Nutzer in Supabase Auth anlegen
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      // 2. profiles aktualisieren — status: 'pending'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email,
          first_name,
          last_name,
          country,
          phone: phone || null,
          address: address || null,
          role: 'user',
          verified: false,
          status: 'pending',
        })
        .eq('id', data.user.id);

      if (profileError) throw profileError;

      logEvent(
        EVENTS.REGISTER,
        { email, first_name, last_name, country },
        { userId: data.user.id }
      );
      logVisitorConversion('register', { email });

      // Nach Registrierung abmelden — Login erst nach Admin-Freigabe
      await supabase.auth.signOut();
    }

    return { pendingApproval: true };
  };

  const logout = async () => {
    const currentId = user?.id;
    if (currentId) logEvent(EVENTS.LOGOUT, null, { userId: currentId });
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await fetchProfile(authUser);
  };

  const requestPasswordReset = async (email) => {
    const origin = getPublicSiteOrigin();
    if (!origin) {
      throw new Error(
        'Öffentliche Site-URL fehlt. Bitte REACT_APP_SITE_URL setzen (z. B. #).'
      );
    }
    const redirectTo = `${origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    logEvent(EVENTS.PASSWORD_RESET_REQUEST, { email });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        refreshUser,
        requestPasswordReset,
        sendEmailOtpForCurrentSession,
        verifyEmailOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import React, { createContext, useState, useEffect, useContext, useLayoutEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi, extractErrorMessage } from '@/services/apiClient';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
import { normalizeAppRole } from '@/lib/role';
import i18n, { APP_LANG_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/i18n';

const PRESENCE_INTERVAL_MS = 60_000;

export const AuthContext = createContext();

/**
 * AuthContext migrated to FastAPI (Feb 2026).
 *
 * Primary auth source of truth: `/api/auth/*` via httpOnly cookies.
 * Supabase is used ONLY for legacy profile data enrichment (address, favorites, etc.)
 * and OTP challenges — it is no longer part of the authentication decision path.
 *
 * `useAuth()` return shape is preserved to keep the ~28 pages consuming it working.
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
      } catch { /* ignore */ }
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

/**
 * Build a `user` object from a FastAPI /auth/me response, optionally enriched
 * with a Supabase `profiles` row for legacy dashboard fields.
 * Kept backward-compatible with the ~28 consumers of `useAuth().user`.
 */
function buildUserObject(fastMe, supabaseProfile = null) {
  const profile = supabaseProfile || {};
  const role = normalizeAppRole(fastMe?.role || profile?.role);
  const language = resolveLanguageFromPrefs(profile);
  return {
    id: fastMe?.id || profile?.id || null,
    email: fastMe?.email || profile?.email || null,
    role,
    // Backend "name" splits into first/last for legacy compatibility (best-effort)
    first_name: profile?.first_name || (fastMe?.name ? String(fastMe.name).split(' ')[0] : null),
    last_name: profile?.last_name || (fastMe?.name ? String(fastMe.name).split(' ').slice(1).join(' ') || null : null),
    country: profile?.country || null,
    address: profile?.address || null,
    address_street: profile?.address_street || null,
    address_house_number: profile?.address_house_number || null,
    address_line_2: profile?.address_line_2 || null,
    address_postal_code: profile?.address_postal_code || null,
    address_city: profile?.address_city || null,
    phone: profile?.phone || null,
    avatar_url: fastMe?.avatar_url || profile?.avatar_url || null,
    verified: profile?.verified || false,
    status: profile?.status || 'active',
    favorites: profile?.favorites || [],
    email_digest_enabled: profile?.email_digest_enabled ?? true,
    notification_prefs: profile?.notification_prefs || null,
    language,
    onboarding_completed: role === 'admin' ? true : (profile?.onboarding_completed ?? false),
    onboarding_completed_steps: profile?.onboarding_completed_steps || [],
    must_change_password: profile?.must_change_password || false,
    last_password_reset_at: profile?.last_password_reset_at || null,
    last_seen_at: profile?.last_seen_at || null,
    tax_allowance_eur: profile?.tax_allowance_eur ?? 0,
    tax_allowance_used_eur: profile?.tax_allowance_used_eur ?? 0,
    church_tax_enabled: profile?.church_tax_enabled ?? false,
    church_tax_rate: profile?.church_tax_rate ?? 9,
    tax_residency_country: profile?.tax_residency_country || null,
    created_at: fastMe?.created_at || profile?.created_at || null,
  };
}

async function fetchSupabaseProfileByEmail(email) {
  if (!email) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', String(email).toLowerCase())
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
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

  /**
   * FastAPI-first session hydration. Falls back to Supabase session only for
   * legacy accounts that were never migrated (still allows read of Supabase
   * profile for dashboard pages).
   */
  const hydrateFromFastAPI = useCallback(async () => {
    try {
      const me = await authApi.me();
      const profile = await fetchSupabaseProfileByEmail(me.email);
      applyLanguage(profile);
      setUser(buildUserObject(me, profile));
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyLanguage = (profile) => {
    const language = resolveLanguageFromPrefs(profile);
    if (i18n.language !== language) i18n.changeLanguage(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APP_LANG_STORAGE_KEY, language);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (shouldDeferProfileFetch()) {
        if (!cancelled) setLoading(false);
        return;
      }
      const fastOk = await hydrateFromFastAPI();
      if (cancelled) return;
      if (!fastOk) {
        // Legacy fallback — only if FastAPI has no session, check Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await fetchSupabaseProfileByEmail(session.user.email);
            if (profile?.status === 'pending' || profile?.status === 'rejected') {
              await supabase.auth.signOut();
              if (!cancelled) setUser(null);
            } else {
              applyLanguage(profile);
              if (!cancelled) setUser(buildUserObject({
                id: session.user.id,
                email: session.user.email,
                role: profile?.role,
                created_at: session.user.created_at,
              }, profile));
            }
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setLoading(false);
    })();

    // Supabase auth state listener — for OTP verification/legacy sessions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          .eq('email', String(user.email).toLowerCase());
      } catch { /* silently skip */ }
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
  }, [user?.id, user?.email]);

  /**
   * Login flow: FastAPI is primary. Legacy accounts that only exist in
   * Supabase fall back to Supabase auth.
   */
  const login = async (email, password) => {
    // Try FastAPI first
    let fastMe = null;
    try {
      fastMe = await authApi.login({ email, password });
    } catch (err) {
      const status = err?.response?.status;
      // 401 / 429 (rate limit) → try Supabase legacy fallback ONLY if 401
      if (status === 429) {
        const detail = extractErrorMessage(err);
        logEvent(EVENTS.LOGIN_FAILED, { email, reason: 'rate_limited' });
        const e = new Error(detail || 'Zu viele Anmeldeversuche. Bitte kurz warten.');
        throw e;
      }
      if (status !== 401 && status !== 404) {
        logEvent(EVENTS.LOGIN_FAILED, { email, reason: extractErrorMessage(err) });
        throw new Error(extractErrorMessage(err) || 'Anmeldung fehlgeschlagen.');
      }
      // 401 → fall through to Supabase legacy path below
    }

    if (fastMe) {
      // Best-effort: also sign into Supabase so legacy pages can read profile via RLS
      let supabaseUser = null;
      try {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        supabaseUser = data?.user || null;
      } catch { /* legacy Supabase login failed — proceed without it */ }

      const profile = await fetchSupabaseProfileByEmail(fastMe.email);
      // OTP challenge (opt-in via Supabase user prefs) — only meaningful if Supabase session exists
      if (supabaseUser && profile?.notification_prefs?.email_otp_enabled) {
        try {
          const deviceHash = await buildDeviceHash();
          const otpData = await throwIfFunctionsInvokeError(
            await supabase.functions.invoke('auth-email-otp', {
              body: { action: 'send', device_hash: deviceHash },
            }),
            'E-Mail-Code konnte nicht gesendet werden.',
          );
          if (otpData?.required) {
            return {
              user: { id: fastMe.id, email: fastMe.email },
              requiresOtp: true,
              challengeId: otpData.challenge_id,
              deviceHash,
              nextPath: getPostLoginPath({ role: fastMe.role, ...(profile || {}) }),
            };
          }
        } catch { /* fall through — OTP not enforced if Edge Function fails */ }
      }
      applyLanguage(profile);
      const merged = buildUserObject(fastMe, profile);
      setUser(merged);
      logEvent(EVENTS.LOGIN, { email }, { userId: fastMe.id });
      return { user: merged, nextPath: getPostLoginPath(merged) };
    }

    // Legacy Supabase-only fallback
    let data;
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) throw res.error;
      data = res.data;
    } catch (err) {
      logEvent(EVENTS.LOGIN_FAILED, { email, reason: err?.message || 'unknown' });
      throw err;
    }

    const profile = await fetchSupabaseProfileByEmail(data.user.email);
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

    if (profile?.notification_prefs?.email_otp_enabled) {
      const deviceHash = await buildDeviceHash();
      const otpData = await throwIfFunctionsInvokeError(
        await supabase.functions.invoke('auth-email-otp', {
          body: { action: 'send', device_hash: deviceHash },
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

    applyLanguage(profile);
    const merged = buildUserObject({
      id: data.user.id,
      email: data.user.email,
      role: profile?.role,
      created_at: data.user.created_at,
    }, profile);
    setUser(merged);
    logEvent(EVENTS.LOGIN, { email }, { userId: data.user.id });
    return { user: merged, nextPath: getPostLoginPath(merged) };
  };

  const sendEmailOtpForCurrentSession = async ({ deviceHash }) => {
    const resolvedHash = deviceHash || (await buildDeviceHash());
    if (!resolvedHash) throw new Error('Device fingerprint konnte nicht erstellt werden.');
    const data = await throwIfFunctionsInvokeError(
      await supabase.functions.invoke('auth-email-otp', {
        body: { action: 'send', device_hash: resolvedHash },
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
    const result = await throwIfFunctionsInvokeError(
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
    // After OTP success, re-hydrate from FastAPI
    await hydrateFromFastAPI();
    return result;
  };

  const register = async ({ email, password, first_name, last_name, country, phone, address }) => {
    // Register with FastAPI (primary account)
    const name = [first_name, last_name].filter(Boolean).join(' ').trim() || email.split('@')[0];
    try {
      await authApi.register({ email, password, name });
    } catch (err) {
      // If already exists in FastAPI, that's still an error to the user
      const msg = extractErrorMessage(err) || 'Registrierung fehlgeschlagen.';
      throw new Error(msg);
    }
    // Best-effort: create Supabase profile too so dashboard/onboarding legacy pages work
    try {
      const { data } = await supabase.auth.signUp({ email, password });
      if (data?.user) {
        try {
          await supabase.from('profiles').update({
            email,
            first_name,
            last_name,
            country,
            phone: phone || null,
            address: address || null,
            role: 'user',
            verified: false,
            status: 'pending',
          }).eq('id', data.user.id);
        } catch { /* ignore */ }
        // Sign out Supabase — user must be approved before login
        await supabase.auth.signOut();
      }
    } catch { /* Supabase sign-up optional */ }
    // Sign out FastAPI so registration flow ends on Login page
    try { await authApi.logout(); } catch { /* ignore */ }
    logEvent(EVENTS.REGISTER, { email, first_name, last_name, country });
    logVisitorConversion('register', { email });
    return { pendingApproval: true };
  };

  const logout = async () => {
    const currentId = user?.id;
    if (currentId) logEvent(EVENTS.LOGOUT, null, { userId: currentId });
    // Fire both logouts in parallel — swallow individual failures
    await Promise.allSettled([
      authApi.logout(),
      supabase.auth.signOut(),
    ]);
    setUser(null);
  };

  const refreshUser = async () => {
    await hydrateFromFastAPI();
  };

  const requestPasswordReset = async (email) => {
    try {
      await authApi.forgotPassword(email);
      logEvent(EVENTS.PASSWORD_RESET_REQUEST, { email });
      return;
    } catch {
      // Legacy fallback via Supabase
      const origin = getPublicSiteOrigin();
      if (!origin) {
        throw new Error('Öffentliche Site-URL fehlt. Bitte REACT_APP_SITE_URL setzen (z. B. #).');
      }
      const redirectTo = `${origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      logEvent(EVENTS.PASSWORD_RESET_REQUEST, { email });
    }
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

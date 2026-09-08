import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authApi, extractErrorMessage } from '@/services/apiClient';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
import { normalizeAppRole } from '@/lib/role';
import i18n, { APP_LANG_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/i18n';

export const AuthContext = createContext();

/**
 * AuthContext — Session 82.67 · FastAPI/JWT-Cookie-Auth (canonical).
 *
 * Kein Supabase-Auth mehr. Session-Source-of-Truth ist `/api/auth/me` via
 * HttpOnly/Secure/SameSite=None Cookies (access_token + refresh_token).
 *
 * `useAuth()` Return-Shape ist unverändert, damit die ~28 Consumer-Pages
 * ohne Änderung weiterlaufen. Profil-Metadaten-Felder, die früher aus dem
 * Supabase-`profiles`-Table kamen, werden jetzt aus `/api/auth/me` gelesen
 * oder auf safe Defaults gesetzt — Session 82.68 rundet Profile-Update ab.
 *
 * OTP-Flow: nicht mehr unterstützt (Supabase-Edge-Function war einzige
 * Backend-Quelle). Stub-Funktionen werfen einen klaren Fehler.
 */

function getPostLoginPath(profile = {}) {
  if (profile?.role === 'admin') return '/admin';
  if (profile?.must_change_password) return '/reset-password?mode=force';
  if (!profile?.onboarding_completed) return '/onboarding';
  return '/dashboard';
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

function applyLanguage(profile) {
  const language = resolveLanguageFromPrefs(profile);
  if (i18n.language !== language) i18n.changeLanguage(language);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(APP_LANG_STORAGE_KEY, language);
  }
}

/**
 * Build user object from `/api/auth/me` response only.
 * Preserves backward-compatible shape for the ~28 consumers of `useAuth().user`.
 * Fields not present on `/me` default to null/false/[]/0 (Session 82.68 baut sie aus).
 */
function buildUserObject(fastMe) {
  if (!fastMe) return null;
  const role = normalizeAppRole(fastMe.role);
  return {
    id: fastMe.id || null,
    email: fastMe.email || null,
    role,
    first_name: fastMe.first_name || (fastMe.name ? String(fastMe.name).split(' ')[0] : null),
    last_name: fastMe.last_name || (fastMe.name ? String(fastMe.name).split(' ').slice(1).join(' ') || null : null),
    country: fastMe.country || null,
    address: null,
    address_street: fastMe.street || null,
    address_house_number: fastMe.house_number || null,
    address_line_2: fastMe.address_addition || null,
    address_postal_code: fastMe.postal_code || null,
    address_city: fastMe.city || null,
    phone: fastMe.phone || null,
    avatar_url: fastMe.avatar_url || null,
    verified: fastMe.verified ?? false,
    status: fastMe.status || 'active',
    favorites: [],
    email_digest_enabled: fastMe.email_digest_enabled ?? true,
    notification_prefs: fastMe.notification_prefs || null,
    language: resolveLanguageFromPrefs(fastMe),
    onboarding_completed: role === 'admin' ? true : (fastMe.onboarding_completed ?? false),
    onboarding_completed_steps: fastMe.onboarding_completed_steps || [],
    must_change_password: fastMe.must_change_password || false,
    last_password_reset_at: fastMe.last_password_reset_at || null,
    last_seen_at: fastMe.last_seen_at || null,
    tax_allowance_eur: fastMe.tax_allowance_eur ?? 0,
    tax_allowance_used_eur: fastMe.tax_allowance_used_eur ?? 0,
    church_tax_enabled: fastMe.church_tax_enabled ?? false,
    church_tax_rate: fastMe.church_tax_rate ?? 9,
    tax_residency_country: fastMe.tax_residency_country || null,
    created_at: fastMe.created_at || null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromFastAPI = useCallback(async () => {
    try {
      const me = await authApi.me();
      applyLanguage(me);
      setUser(buildUserObject(me));
      return true;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Regulär unauth → kein Fehlerlog, kein State-Reset-Flicker.
        setUser(null);
        return false;
      }
      // Netzwerk/5xx — nicht künstlich ausloggen; State unverändert, damit
      // Consumer keinen Auth-Loop starten.
      // eslint-disable-next-line no-console
      console.debug('[auth] hydrate failed:', status || err?.message);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateFromFastAPI();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hydrateFromFastAPI]);

  const login = async (email, password) => {
    try {
      await authApi.login({ email, password });
    } catch (err) {
      const status = err?.response?.status;
      const detail = extractErrorMessage(err);
      logEvent(EVENTS.LOGIN_FAILED, { email, reason: status === 429 ? 'rate_limited' : detail });
      const e = new Error(
        status === 429
          ? (detail || 'Zu viele Anmeldeversuche. Bitte kurz warten.')
          : (detail || 'Anmeldung fehlgeschlagen.')
      );
      throw e;
    }
    // Cookie ist gesetzt — Session hydrieren aus /me.
    let me;
    try {
      me = await authApi.me();
    } catch (err) {
      throw new Error(extractErrorMessage(err) || 'Sitzung konnte nicht geladen werden.');
    }
    applyLanguage(me);
    const merged = buildUserObject(me);
    setUser(merged);
    logEvent(EVENTS.LOGIN, { email }, { userId: me.id });
    return { user: merged, nextPath: getPostLoginPath(merged) };
  };

  const register = async ({ email, password, first_name, last_name }) => {
    const name = [first_name, last_name].filter(Boolean).join(' ').trim() || email.split('@')[0];
    try {
      await authApi.register({ email, password, name });
    } catch (err) {
      const msg = extractErrorMessage(err) || 'Registrierung fehlgeschlagen.';
      throw new Error(msg);
    }
    // Nach Register: Session beenden — User geht zurück auf Login.
    try { await authApi.logout(); } catch { /* noop */ }
    logEvent(EVENTS.REGISTER, { email, first_name, last_name });
    logVisitorConversion('register', { email });
    return { pendingApproval: true };
  };

  const logout = async () => {
    const currentId = user?.id;
    if (currentId) logEvent(EVENTS.LOGOUT, null, { userId: currentId });
    try {
      await authApi.logout();
    } catch { /* Cookie wird serverseitig gelöscht; Fehler schlucken. */ }
    setUser(null);
  };

  const refreshUser = async () => {
    await hydrateFromFastAPI();
  };

  const requestPasswordReset = async (email) => {
    try {
      await authApi.forgotPassword(email);
      logEvent(EVENTS.PASSWORD_RESET_REQUEST, { email });
    } catch (err) {
      throw new Error(extractErrorMessage(err) || 'Passwort-Reset konnte nicht angefordert werden.');
    }
  };

  // OTP-Stubs — Supabase-Edge-Function `auth-email-otp` war einzige Quelle;
  // ohne Mongo-Backend-Equivalent kein OTP-Flow. Consumer, die OTP tatsächlich
  // aufrufen, erhalten einen klaren Fehler statt stiller Fehlfunktion.
  const sendEmailOtpForCurrentSession = async () => {
    throw new Error('OTP-Verifikation ist derzeit nicht verfügbar.');
  };
  const verifyEmailOtp = async () => {
    throw new Error('OTP-Verifikation ist derzeit nicht verfügbar.');
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

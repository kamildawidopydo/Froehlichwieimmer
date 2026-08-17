import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'br_visitor_sid';
const CONSENT_KEY = 'kapitalmitte_cookie_consent';
const FLUSH_MS = 1000;
const HEARTBEAT_MS = 12000;
const RAGE_WINDOW_MS = 800;
const RAGE_MIN_CLICKS = 3;
const SCROLL_MILESTONES = [25, 50, 75, 100];
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|phantom|selenium|lighthouse|pagespeed|bingpreview|facebookexternalhit/i;

let sessionId = null;
let queue = [];
let pageViewsDelta = 0;
let sessionStartedAt = null;
let scrollReached = new Set();
let clickBuffer = [];
let flushTimer = null;
let heartbeatTimer = null;
let currentPath = '';
let isInitialized = false;
let isEnabled = false;
let isBotSession = false;
let activeForm = null;
let formFieldsTouched = new Set();
let formFocusStartedAt = null;
let geoCountry = '';
let geoCity = '';
let geoRegion = '';
let geoFetchStarted = false;

const GEO_KEY = 'br_visitor_geo';

async function ensureGeo() {
  if (geoFetchStarted) return;
  geoFetchStarted = true;
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) {
      const g = JSON.parse(cached);
      geoCountry = g.country || '';
      geoCity = g.city || '';
      geoRegion = g.region || '';
      return;
    }
    const res = await fetch('https://ipwho.is/?fields=country,city,region,success');
    const data = await res.json();
    if (data.success !== false) {
      geoCountry = data.country || '';
      geoCity = data.city || '';
      geoRegion = data.region || '';
      sessionStorage.setItem(GEO_KEY, JSON.stringify({
        country: geoCountry,
        city: geoCity,
        region: geoRegion,
      }));
      scheduleFlush();
    }
  } catch {
    /* geo optional */
  }
}

function hasStatisticsConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.preferences?.statistics);
  } catch {
    return false;
  }
}

function isLikelyBot() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (BOT_PATTERN.test(ua)) return true;
  if (navigator.webdriver) return true;
  return false;
}

function getOrCreateSessionId() {
  if (sessionId) return sessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      sessionId = existing;
      return sessionId;
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionId = id;
    return id;
  } catch {
    sessionId = crypto.randomUUID();
    return sessionId;
  }
}

function parseDevice(ua) {
  const s = ua || '';
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(s);
  let browser = 'unknown';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/Chrome\//i.test(s) && !/Edg/i.test(s)) browser = 'Chrome';
  else if (/Safari/i.test(s) && !/Chrome/i.test(s)) browser = 'Safari';
  else if (/Firefox/i.test(s)) browser = 'Firefox';

  let os = 'unknown';
  if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad/i.test(s)) os = 'iOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  return {
    isMobile,
    deviceType: isMobile ? 'mobile' : 'desktop',
    browser,
    os,
  };
}

function getUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '' };
  }
}

function getElementDescriptor(el) {
  if (!el || el === document.body || el === document.documentElement) {
    return { tag: 'body', label: 'Seite', selector: 'body' };
  }
  const tag = (el.tagName || '').toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : '';
  const selector = `${tag}${id}${classes}`.slice(0, 120);
  const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const href = el.getAttribute?.('href') || el.closest?.('a')?.getAttribute?.('href') || '';
  const label = text || href || tag;
  return { tag, label, selector, href: href.slice(0, 200) };
}

function getFormFieldName(el) {
  if (!el) return 'unknown';
  return (
    el.getAttribute('name')
    || el.getAttribute('id')
    || el.getAttribute('aria-label')
    || el.getAttribute('placeholder')
    || el.tagName?.toLowerCase()
    || 'field'
  ).slice(0, 80);
}

function isInteractive(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (['a', 'button', 'input', 'select', 'textarea', 'label', 'summary'].includes(tag)) return true;
  if (el.getAttribute('role') === 'button') return true;
  if (el.getAttribute('tabindex') != null && el.getAttribute('tabindex') !== '-1') return true;
  if (el.onclick || el.getAttribute('onclick')) return true;
  return Boolean(el.closest('a, button, [role="button"], input, select, textarea'));
}

function enqueue(eventType, payload = {}) {
  if (!isEnabled || isBotSession) return;
  queue.push({
    event_type: eventType,
    page_path: currentPath,
    payload: {
      ...payload,
      viewport_w: typeof window !== 'undefined' ? window.innerWidth : null,
      viewport_h: typeof window !== 'undefined' ? window.innerHeight : null,
    },
  });
}

function getSessionPatch() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const device = parseDevice(ua);
  const utm = getUtmParams();
  const duration = sessionStartedAt
    ? Math.floor((Date.now() - sessionStartedAt) / 1000)
    : 0;

  return {
    current_path: currentPath,
    entry_path: currentPath,
    referrer: typeof document !== 'undefined' ? (document.referrer || '') : '',
    user_agent: ua,
    device_type: device.deviceType,
    browser: device.browser,
    os: device.os,
    viewport_w: typeof window !== 'undefined' ? window.innerWidth : null,
    viewport_h: typeof window !== 'undefined' ? window.innerHeight : null,
    is_mobile: device.isMobile,
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    duration_seconds: duration,
    page_views_delta: pageViewsDelta,
    is_bot: isBotSession,
    country: geoCountry,
    city: geoCity,
    region: geoRegion,
    ...utm,
  };
}

async function flush(force = false) {
  if ((!isEnabled && !force) || isBotSession) return;
  if (queue.length === 0 && pageViewsDelta === 0 && !force) return;

  const events = queue.splice(0, 50);
  const delta = pageViewsDelta;
  pageViewsDelta = 0;

  if (events.length === 0 && delta === 0) return;

  try {
    await supabase.rpc('track_visitor_batch', {
      p_session_id: getOrCreateSessionId(),
      p_session_patch: getSessionPatch(),
      p_events: events,
    });
  } catch {
    queue.unshift(...events);
    pageViewsDelta += delta;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_MS);
}

function detectRageClick(desc, x, y) {
  const now = Date.now();
  clickBuffer = clickBuffer.filter((c) => now - c.ts < RAGE_WINDOW_MS);
  clickBuffer.push({ ts: now, selector: desc.selector, x, y });

  const sameTarget = clickBuffer.filter((c) => c.selector === desc.selector);
  if (sameTarget.length >= RAGE_MIN_CLICKS) {
    enqueue('rage_click', {
      ...desc,
      x,
      y,
      clickCount: sameTarget.length,
      windowMs: RAGE_WINDOW_MS,
    });
    clickBuffer = [];
    return true;
  }
  return false;
}

function handleClick(e) {
  if (!isEnabled || isBotSession) return;
  const target = e.target?.closest?.('a, button, [role="button"], input, select, textarea, label, div, span, p, h1, h2, h3, h4, img, svg') || e.target;
  const desc = getElementDescriptor(target);
  const x = Math.round(e.clientX);
  const y = Math.round(e.clientY);

  if (detectRageClick(desc, x, y)) {
    scheduleFlush();
    return;
  }

  const interactive = isInteractive(target);
  enqueue(interactive ? 'click' : 'dead_click', { ...desc, x, y, interactive });

  const link = target.closest?.('a');
  if (link?.href && /^https?:\/\//i.test(link.href) && !link.href.startsWith(window.location.origin)) {
    enqueue('outbound_click', { href: link.href, label: desc.label });
  }

  scheduleFlush();
}

function handleScroll() {
  if (!isEnabled || isBotSession) return;
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const height = doc.scrollHeight - window.innerHeight;
  if (height <= 0) return;
  const pct = Math.min(100, Math.round((scrollTop / height) * 100));

  for (const milestone of SCROLL_MILESTONES) {
    if (pct >= milestone && !scrollReached.has(milestone)) {
      scrollReached.add(milestone);
      enqueue('scroll_depth', { depth: milestone });
    }
  }
}

function handleFormFocus(e) {
  if (!isEnabled || isBotSession) return;
  const field = e.target;
  if (!field?.closest?.('form')) return;
  activeForm = field.closest('form');
  formFocusStartedAt = Date.now();
  const name = getFormFieldName(field);
  formFieldsTouched.add(name);
  enqueue('form_field_focus', { field: name, formId: activeForm.id || activeForm.getAttribute('name') || 'form' });
  scheduleFlush();
}

function handleFormBlur(e) {
  if (!isEnabled || isBotSession) return;
  const field = e.target;
  if (!field?.closest?.('form')) return;
  const name = getFormFieldName(field);
  const durationMs = formFocusStartedAt ? Date.now() - formFocusStartedAt : 0;
  enqueue('form_field_blur', { field: name, durationMs });
  scheduleFlush();
}

function handleFormSubmit() {
  activeForm = null;
  formFieldsTouched = new Set();
  formFocusStartedAt = null;
}

function reportFormAbandonment() {
  if (!activeForm || formFieldsTouched.size === 0) return;
  enqueue('form_abandon', {
    formId: activeForm.id || activeForm.getAttribute('name') || 'form',
    fieldsTouched: Array.from(formFieldsTouched),
    path: currentPath,
  });
  activeForm = null;
  formFieldsTouched = new Set();
}

function handleJsError(event) {
  if (!isEnabled || isBotSession) return;
  enqueue('js_error', {
    message: (event.message || 'unknown').slice(0, 300),
    source: (event.filename || '').slice(0, 200),
    line: event.lineno,
    col: event.colno,
  });
  scheduleFlush();
}

function handleUnhandledRejection(event) {
  if (!isEnabled || isBotSession) return;
  const reason = event.reason?.message || String(event.reason || 'unknown');
  enqueue('js_error', {
    message: reason.slice(0, 300),
    source: 'unhandledrejection',
  });
  scheduleFlush();
}

function trackPageView(path) {
  if (!isEnabled || isBotSession) return;
  currentPath = path;
  scrollReached = new Set();
  pageViewsDelta += 1;
  enqueue('page_view', { path, title: typeof document !== 'undefined' ? document.title : '' });
  scheduleFlush();
}

function onVisibilityChange() {
  if (!isEnabled || isBotSession) return;
  if (document.visibilityState === 'hidden') {
    reportFormAbandonment();
    enqueue('tab_hidden', {});
    flush(true);
  } else {
    enqueue('tab_visible', {});
  }
}

function onBeforeUnload() {
  if (!isEnabled || isBotSession) return;
  reportFormAbandonment();
  enqueue('session_end', {});
  flush(true);
}

function shouldSkipPath(path) {
  return path.startsWith('/admin') || path.startsWith('/formular');
}

function handleConversionEvent(e) {
  const { goal, meta } = e.detail || {};
  if (!goal || !isEnabled || isBotSession) return;
  enqueue('conversion', { goal, ...(meta || {}) });
  scheduleFlush();
}

export function initVisitorTracker(path) {
  if (typeof window === 'undefined') return () => {};
  if (shouldSkipPath(path)) return () => {};

  isBotSession = isLikelyBot();
  isEnabled = hasStatisticsConsent();
  if (!isEnabled) return () => {};

  getOrCreateSessionId();
  if (!sessionStartedAt) sessionStartedAt = Date.now();
  currentPath = path;

  if (!isInitialized) {
    isInitialized = true;
    document.addEventListener('click', handleClick, true);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);
    window.addEventListener('error', handleJsError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('focusin', handleFormFocus, true);
    document.addEventListener('focusout', handleFormBlur, true);
    document.addEventListener('submit', handleFormSubmit, true);
    window.addEventListener('br-visitor-conversion', handleConversionEvent);

    heartbeatTimer = setInterval(() => {
      enqueue('heartbeat', {});
      scheduleFlush();
    }, HEARTBEAT_MS);
  }

  if (!isBotSession) {
    trackPageView(path);
    ensureGeo();
  }

  return () => {};
}

export function refreshVisitorConsent(path) {
  const wasEnabled = isEnabled;
  isBotSession = isLikelyBot();
  isEnabled = hasStatisticsConsent() && !shouldSkipPath(path);
  if (isEnabled && !wasEnabled) {
    initVisitorTracker(path);
  }
}

export function destroyVisitorTracker() {
  isEnabled = false;
  isInitialized = false;
  document.removeEventListener('click', handleClick, true);
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  window.removeEventListener('pagehide', onBeforeUnload);
  window.removeEventListener('error', handleJsError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  document.removeEventListener('focusin', handleFormFocus, true);
  document.removeEventListener('focusout', handleFormBlur, true);
  document.removeEventListener('submit', handleFormSubmit, true);
  window.removeEventListener('br-visitor-conversion', handleConversionEvent);
  if (flushTimer) clearTimeout(flushTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  flushTimer = null;
  heartbeatTimer = null;
}

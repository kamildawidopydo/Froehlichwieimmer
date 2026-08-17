import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

/** False when the production bundle was built without Supabase env vars (API calls will fail). */
export const isSupabaseConfigured = Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[Kapitalmitte] Supabase environment variables missing. ' +
    'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your hosting provider (e.g. Vercel) and redeploy.'
  );
}

// Use safe placeholders if env vars missing so the JS bundle does not crash at load time.
// API calls will fail gracefully (handled by per-call try/catch in pages), but the app still renders.
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

/**
 * In-process async mutex used as the Supabase auth lock implementation.
 *
 * The default lock in supabase-js uses the Web Locks API (`navigator.locks`)
 * with `steal: true`. When another tab/instance (or a stale hot-reload client)
 * steals the lock, the in-flight acquirer rejects with
 * `AbortError: Lock broken by another request with the 'steal' option`.
 * That AbortError aborts the underlying fetch, so `signInWithPassword`
 * surfaces to the user as "Failed to fetch".
 *
 * This app uses a single client instance and Supabase sessions are scoped
 * per tab via localStorage, so an in-memory mutex is sufficient to serialize
 * auth operations without triggering cross-tab steal races.
 */
let supabaseAuthLockChain = Promise.resolve();
async function inMemorySupabaseAuthLock(_name, _acquireTimeout, fn) {
  const previous = supabaseAuthLockChain;
  let release;
  supabaseAuthLockChain = new Promise((resolve) => {
    release = resolve;
  });
  try {
    await previous;
    return await fn();
  } finally {
    release();
  }
}

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: inMemorySupabaseAuthLock,
  },
});

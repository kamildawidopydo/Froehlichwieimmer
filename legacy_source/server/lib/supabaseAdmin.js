let client;

function getSupabaseAdmin() {
  if (client) return client;

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.REACT_APP_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    '';

  if (!url || !key) {
    console.warn('[supabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    return null;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
  } catch (err) {
    console.error('[supabaseAdmin] init failed:', err.message);
    return null;
  }
}

module.exports = { getSupabaseAdmin };

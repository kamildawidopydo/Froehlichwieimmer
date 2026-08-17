import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

function randomTemporaryPassword(length = 14) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured' }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return json({ error: 'Authentication required' }, 401);

    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData?.user?.id) return json({ error: 'Invalid auth token' }, 401);
    const adminUserId = authData.user.id;

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();
    if (callerErr || callerProfile?.role !== 'admin') return json({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = String(body?.email || '').trim().toLowerCase();
    const firstName = String(body?.first_name || '').trim();
    const lastName = String(body?.last_name || '').trim();
    if (!firstName) return json({ error: 'Vorname ist erforderlich' }, 400);
    if (!lastName) return json({ error: 'Nachname ist erforderlich' }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Valid email is required' }, 400);
    }

    const temporaryPassword = randomTemporaryPassword();
    const nowIso = new Date().toISOString();

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        provisioned_by_admin: true,
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (createErr || !created?.user?.id) {
      const message = createErr?.message || 'Failed to create auth user';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
        return json({ error: 'This email is already registered' }, 409);
      }
      return json({ error: message }, 400);
    }

    const targetUserId = created.user.id;
    const { error: profileErr } = await adminClient
      .from('profiles')
      .upsert({
        id: targetUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        status: 'approved',
        verified: true,
        must_change_password: true,
        invited_by: adminUserId,
        provisioned_at: nowIso,
      });
    if (profileErr) return json({ error: profileErr.message || 'Failed to update profile' }, 400);

    let emailSent = false;
    try {
      const mailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          type: 'provisioned',
          record: {
            first_name: firstName,
            last_name: lastName,
            email,
            temporary_password: temporaryPassword,
          },
        }),
      });
      const mailBody = await mailRes.json().catch(() => ({}));
      emailSent = mailRes.ok && mailBody?.success === true && !mailBody?.skipped;
      if (!emailSent) {
        console.error('[create-admin-user] welcome email failed', mailRes.status, mailBody);
      }
    } catch (mailErr) {
      console.error('[create-admin-user] welcome email error', mailErr);
    }

    await adminClient.from('user_activity_log').insert({
      user_id: adminUserId,
      event_type: 'admin_user_provisioned',
      event_payload: {
        target_user_id: targetUserId,
        target_email: email,
        target_first_name: firstName,
        target_last_name: lastName,
        welcome_email_sent: emailSent,
      },
    });

    return json({
      success: true,
      user_id: targetUserId,
      email,
      first_name: firstName,
      last_name: lastName,
      temporary_password: temporaryPassword,
      must_change_password: true,
      auto_approved: true,
      email_sent: emailSent,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});

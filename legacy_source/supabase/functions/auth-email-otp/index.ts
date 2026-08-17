import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveResendFrom } from '../_shared/resendSender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OTP_TTL_MINUTES = 10;

const style = `
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f5f7fa; color:#1a2332; }
  .wrap { max-width:560px; margin:0 auto; background:#fff; }
  .head { background:linear-gradient(135deg,#0a3a5c 0%,#0d4a76 100%); color:#fff; padding:26px 22px; text-align:center; }
  .brand { font-size:20px; font-weight:700; letter-spacing:.4px; }
  .sub { font-size:12px; opacity:.9; margin-top:4px; }
  .bar { height:3px; background:#d4a847; }
  .body { padding:26px 22px; }
  .otp { display:inline-block; font-size:30px; letter-spacing:8px; font-weight:700; background:#f5f7fa; border:1px solid #e1e6ed; padding:10px 16px; border-radius:8px; margin:10px 0 14px; }
  p { color:#5a6b7d; line-height:1.55; font-size:14px; margin:0 0 10px; }
  .foot { padding:16px 22px; text-align:center; font-size:11px; color:#5a6b7d; border-top:1px solid #e1e6ed; background:#f5f7fa; }
`;

const otpMailHtml = (code: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>
  <div class="wrap">
    <div class="head">
      <div class="brand">Kapitalmitte</div>
      <div class="sub">Sicherheitscode fuer Ihre Anmeldung</div>
    </div>
    <div class="bar"></div>
    <div class="body">
      <p>Wir haben eine Anmeldung von einem neuen Geraet erkannt.</p>
      <p>Bitte bestaetigen Sie Ihre Anmeldung mit diesem Code:</p>
      <div class="otp">${code}</div>
      <p>Der Code ist ${OTP_TTL_MINUTES} Minuten gueltig und kann nur einmal verwendet werden.</p>
      <p>Falls Sie diese Anmeldung nicht gestartet haben, aendern Sie bitte umgehend Ihr Passwort.</p>
    </div>
    <div class="foot">
      Diese E-Mail wurde automatisch erzeugt. Bitte nicht direkt antworten.
    </div>
  </div>
</body></html>`;

const hashHex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const randomOtp = () => {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const SENDER_EMAIL = resolveResendFrom(Deno.env.get('SENDER_EMAIL'));
    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(payload.action || '');
    const userId = authData.user.id;
    const userEmail = authData.user.email || '';
    const deviceHash = String(payload.device_hash || '').trim();
    if (!deviceHash) {
      return new Response(JSON.stringify({ error: 'device_hash is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle();
    const prefs = (profile?.notification_prefs || {}) as Record<string, unknown>;
    const enabled = Boolean(prefs.email_otp_enabled);
    if (!enabled) {
      return new Response(JSON.stringify({ required: false, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send') {
      const { data: trusted } = await adminClient
        .from('user_trusted_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_hash', deviceHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (trusted) {
        await adminClient
          .from('user_trusted_devices')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', trusted.id);
        return new Response(JSON.stringify({ required: false, reason: 'trusted_device' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = randomOtp();
      const codeHash = await hashHex(`${code}:${userId}`);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

      await adminClient
        .from('auth_email_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('device_hash', deviceHash)
        .is('consumed_at', null);

      const { data: challenge, error: cErr } = await adminClient
        .from('auth_email_otp_challenges')
        .insert({
          user_id: userId,
          email: userEmail,
          code_hash: codeHash,
          device_hash: deviceHash,
          expires_at: expiresAt,
        })
        .select('id, expires_at')
        .single();
      if (cErr) throw cErr;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [userEmail],
          subject: 'Ihr Kapitalmitte Sicherheitscode',
          html: otpMailHtml(code),
        }),
      });
      const resendBody = await resendRes.text();
      if (!resendRes.ok) {
        return new Response(JSON.stringify({ error: `Resend ${resendRes.status}: ${resendBody}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          required: true,
          challenge_id: challenge.id,
          expires_at: challenge.expires_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'verify') {
      const challengeId = String(payload.challenge_id || '').trim();
      const code = String(payload.code || '').trim();
      const trustDevice = Boolean(payload.trust_device ?? true);
      if (!challengeId || !code) {
        return new Response(JSON.stringify({ error: 'challenge_id and code are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: challenge, error: chErr } = await adminClient
        .from('auth_email_otp_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('user_id', userId)
        .maybeSingle();
      if (chErr) throw chErr;
      if (!challenge) {
        return new Response(JSON.stringify({ error: 'Challenge not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (challenge.consumed_at) {
        return new Response(JSON.stringify({ error: 'Code already used' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (new Date(challenge.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: 'Code expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (Number(challenge.attempts || 0) >= Number(challenge.max_attempts || 5)) {
        return new Response(JSON.stringify({ error: 'Too many attempts' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const submittedHash = await hashHex(`${code}:${userId}`);
      if (submittedHash !== challenge.code_hash) {
        await adminClient
          .from('auth_email_otp_challenges')
          .update({ attempts: Number(challenge.attempts || 0) + 1 })
          .eq('id', challenge.id);
        return new Response(JSON.stringify({ error: 'Invalid code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await adminClient
        .from('auth_email_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', challenge.id);

      if (trustDevice) {
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        const { error: trustErr } = await adminClient
          .from('user_trusted_devices')
          .upsert(
            {
              user_id: userId,
              device_hash: deviceHash,
              last_seen_at: new Date().toISOString(),
              expires_at: expiresAt,
            },
            { onConflict: 'user_id,device_hash' },
          );
        if (trustErr) {
          console.error('user_trusted_devices upsert failed (non-fatal):', trustErr.message);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

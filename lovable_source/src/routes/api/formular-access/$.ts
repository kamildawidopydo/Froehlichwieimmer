import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Öffentlicher Zugang zum Vertragsformular: Code prüfen, 24-h-Sitzung, Konditionen.
// Codes liegen nur als SHA-256-Hash in der Datenbank; Tabellen haben keine
// Client-Richtlinien und werden ausschließlich über die Service-Rolle gelesen.

const VerifyBody = z.object({
  code: z.string().trim().min(4).max(64),
  used_by_name: z.string().trim().min(2).max(200),
  user_agent: z.string().max(500).nullish(),
});
const SessionBody = z.object({ session_id: z.string().uuid() });
const ConditionsBody = SessionBody.extend({
  bank: z.string().trim().max(50).optional(),
  product: z.string().trim().max(50).optional(),
});

const SESSION_HOURS = 24;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (d: unknown, status = 200) => Response.json(d, { status });

async function loadSession(db: any, sessionId: string) {
  const { data } = await db
    .from("formular_sessions")
    .select("id, code_id, expires_at, code:formular_access_codes(id, status, contract_conditions)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  if (data.code?.status !== "active") return null;
  return data;
}

async function handle(request: Request, path: string) {
  if (request.method !== "POST") return json({ detail: "Methode nicht erlaubt" }, 405);
  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ detail: "Ungültige Anfrage" }, 400); }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (path === "verify") {
    const p = VerifyBody.safeParse(raw);
    if (!p.success) return json({ detail: "Bitte Name und Zugangscode vollständig angeben." }, 422);
    const hash = await sha256(p.data.code.trim().toUpperCase());
    const { data: code } = await supabaseAdmin
      .from("formular_access_codes")
      .select("id, status, contract_conditions")
      .eq("code_hash", hash)
      .maybeSingle();
    if (!code || code.status !== "active") return json({ detail: "Zugangscode ungültig oder widerrufen." }, 403);

    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();
    const { data: session, error } = await supabaseAdmin
      .from("formular_sessions")
      .insert({ code_id: code.id, name: p.data.used_by_name, expires_at: expiresAt })
      .select("id")
      .single();
    if (error || !session) return json({ detail: "Sitzung konnte nicht erstellt werden." }, 500);

    await supabaseAdmin.from("formular_access_logs").insert({
      code_id: code.id,
      used_by_name: p.data.used_by_name,
      user_agent: p.data.user_agent || null,
    });
    await supabaseAdmin
      .from("formular_access_codes")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", code.id);
    // use_count atomar hochzählen
    const { data: cnt } = await supabaseAdmin.from("formular_access_codes").select("use_count").eq("id", code.id).single();
    await supabaseAdmin.from("formular_access_codes").update({ use_count: (cnt?.use_count ?? 0) + 1 }).eq("id", code.id);

    return json({ session_id: session.id, expires_at: expiresAt, conditions: code.contract_conditions ?? null });
  }

  if (path === "session/validate") {
    const p = SessionBody.safeParse(raw);
    if (!p.success) return json({ valid: false });
    const s = await loadSession(supabaseAdmin, p.data.session_id);
    return json({ valid: Boolean(s) });
  }

  if (path === "session/conditions") {
    const p = ConditionsBody.safeParse(raw);
    if (!p.success) return json({ conditions: null });
    const s = await loadSession(supabaseAdmin, p.data.session_id);
    const cond = s?.code?.contract_conditions;
    if (!cond || typeof cond !== "object") return json({ conditions: null });
    // Konditionen nur ausgeben, wenn sie zur angefragten Bank/Produkt-Kombination passen.
    if (p.data.bank && cond.bank && cond.bank !== p.data.bank) return json({ conditions: null });
    if (p.data.product && cond.product && cond.product !== p.data.product) return json({ conditions: null });
    return json({ conditions: cond });
  }

  return json({ detail: "not_found" }, 404);
}

export const Route = createFileRoute("/api/formular-access/$")({
  server: {
    handlers: {
      POST: ({ request, params }) => handle(request, params._splat ?? ""),
    },
  },
});

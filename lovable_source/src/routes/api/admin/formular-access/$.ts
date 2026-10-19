import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Admin-Verwaltung der Formular-Zugangscodes. Jede Anfrage prüft Rolle/Berechtigung
// serverseitig aus dem Sitzungs-Cookie. Der Klartext-Code wird nur einmalig beim
// Erstellen zurückgegeben; gespeichert wird ausschließlich der SHA-256-Hash.

const CreateBody = z.object({ admin_label: z.string().trim().max(200).nullish() });
const ConditionsBody = z.object({ contract_conditions: z.record(z.string(), z.unknown()).nullable() });

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const part = (o: number) => [...bytes.slice(o, o + 4)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `FV-${part(0)}-${part(4)}`;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handle(req: Request, path: string) {
  const P = await import("@/lib/panel.server");
  const { admin } = await import("@/lib/authSession.server");
  const { json, HttpError, need, audit } = P;
  const s = await P.requireStaff(req);
  need(s, "kunden");
  const db = await admin();
  const seg = path.split("/").filter(Boolean);
  const url = new URL(req.url);

  // GET /codes
  if (req.method === "GET" && seg.length === 1 && seg[0] === "codes") {
    const { data, error } = await db
      .from("formular_access_codes")
      .select("id, code_hint, code_plain, admin_label, contract_conditions, status, use_count, last_used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new HttpError(400, error.message);
    return json({ items: data || [] }, 200, s.headers);
  }

  // POST /codes — neuen Code erzeugen, Klartext nur hier einmalig zurückgeben
  if (req.method === "POST" && seg.length === 1 && seg[0] === "codes") {
    const p = CreateBody.safeParse(await req.json().catch(() => ({})));
    if (!p.success) throw new HttpError(422, "Ungültige Eingabe.");
    const code = generateCode();
    const hash = await sha256(code);
    const { data, error } = await db
      .from("formular_access_codes")
      .insert({ code_hash: hash, code_hint: code.slice(-4), code_plain: code, admin_label: p.data.admin_label || null, created_by: s.id } as any)
      .select("id")
      .single();
    if (error || !data) throw new HttpError(400, error?.message || "Code konnte nicht erstellt werden.");
    await audit(s, "formular_code.create", "formular_access_code", data.id, { new: { admin_label: p.data.admin_label || null } });
    return json({ id: data.id, code }, 201, s.headers);
  }

  if (seg[0] === "codes" && seg[1]) {
    const id = seg[1];

    // POST /codes/:id/revoke
    if (req.method === "POST" && seg[2] === "revoke") {
      const { error } = await db.from("formular_access_codes").update({ status: "revoked" }).eq("id", id);
      if (error) throw new HttpError(400, error.message);
      await audit(s, "formular_code.revoke", "formular_access_code", id, {});
      return json({ ok: true }, 200, s.headers);
    }

    // PATCH /codes/:id/conditions
    if (req.method === "PATCH" && seg[2] === "conditions") {
      const p = ConditionsBody.safeParse(await req.json().catch(() => null));
      if (!p.success) throw new HttpError(422, "Ungültige Eingabe.");
      const { error } = await db.from("formular_access_codes").update({ contract_conditions: p.data.contract_conditions }).eq("id", id);
      if (error) throw new HttpError(400, error.message);
      await audit(s, "formular_code.conditions", "formular_access_code", id, { new: p.data.contract_conditions });
      return json({ ok: true }, 200, s.headers);
    }

    // DELETE /codes/:id — inkl. Protokoll und Sitzungen (Kaskade)
    if (req.method === "DELETE" && seg.length === 2) {
      const { error } = await db.from("formular_access_codes").delete().eq("id", id);
      if (error) throw new HttpError(400, error.message);
      await audit(s, "formular_code.delete", "formular_access_code", id, {});
      return json({ ok: true }, 200, s.headers);
    }
  }

  // GET /logs?limit=500
  if (req.method === "GET" && seg.length === 1 && seg[0] === "logs") {
    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 1000);
    const { data, error } = await db
      .from("formular_access_logs")
      .select("id, code_id, used_by_name, user_agent, used_at")
      .order("used_at", { ascending: false })
      .limit(limit);
    if (error) throw new HttpError(400, error.message);
    return json({ items: data || [] }, 200, s.headers);
  }

  throw new HttpError(404, "not_found");
}

async function run(request: Request, params: { _splat?: string | undefined }) {
  const { json, HttpError } = await import("@/lib/panel.server");
  try {
    return await handle(request, params._splat || "");
  } catch (e: any) {
    if (e instanceof HttpError) return json({ detail: e.message }, e.status);
    console.error("[formular-access]", e?.message);
    return json({ detail: "Interner Fehler. Bitte erneut versuchen." }, 500);
  }
}

export const Route = createFileRoute("/api/admin/formular-access/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => run(request, params),
      POST: ({ request, params }) => run(request, params),
      PATCH: ({ request, params }) => run(request, params),
      DELETE: ({ request, params }) => run(request, params),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { admin, clearSession, currentUser } from "@/lib/authSession.server";

// Port von backend/routes/users.py — Onboarding-Felder des eingeloggten Nutzers.
const STEPS = ["profile", "security", "portfolio", "notifications"] as const;
const str = z.string().trim().max(200).nullable().optional();
const Patch = z.object({
  first_name: str, last_name: str, phone: str, country: str, street: str, house_number: str,
  address_addition: str, postal_code: str, city: str,
  notification_prefs: z.record(z.string(), z.unknown()).nullable().optional(),
  email_digest_enabled: z.boolean().optional(),
  onboarding_completed_steps: z.array(z.enum(STEPS)).max(4).optional(),
  onboarding_completed: z.boolean().optional(),
}).strict();
const FIELDS = ["first_name", "last_name", "phone", "country", "street", "house_number", "address_addition", "postal_code", "city", "notification_prefs", "email_digest_enabled", "onboarding_completed_steps", "onboarding_completed"];

const slice = (d: Record<string, unknown>) => Object.fromEntries(["id", "email", ...FIELDS].map((k) => [k, d[k] ?? null]));
const out = (d: unknown, status: number, h: Headers) => { h.set("content-type", "application/json"); return new Response(JSON.stringify(d), { status, headers: h }); };

async function run({ request }: { request: Request }) {
  const h = new Headers();
  const cu = await currentUser(request, h);
  if (!cu) { clearSession(h); return out({ detail: "Nicht angemeldet." }, 401, h); }
  const db = await admin();
  if (request.method === "PATCH") {
    let b: unknown = {};
    try { b = await request.json(); } catch { /* leer */ }
    const p = Patch.safeParse(b);
    if (!p.success) return out({ detail: p.error.issues[0]?.message ?? "Ungültige Eingabe" }, 422, h);
    const update: Record<string, unknown> = { ...p.data, updated_at: new Date().toISOString() };
    if (p.data.first_name !== undefined || p.data.last_name !== undefined) {
      const { data: cur } = await db.from("profiles").select("first_name,last_name").eq("id", cu.user.id).maybeSingle();
      update["name"] = [p.data.first_name ?? cur?.first_name, p.data.last_name ?? cur?.last_name].filter(Boolean).join(" ");
    }
    const { error } = await db.from("profiles").update(update).eq("id", cu.user.id);
    if (error) return out({ detail: "Speichern fehlgeschlagen." }, 400, h);
  }
  const { data } = await db.from("profiles").select("*").eq("id", cu.user.id).maybeSingle();
  if (!data) return out({ detail: "User nicht gefunden." }, 404, h);
  return out(slice(data), 200, h);
}

export const Route = createFileRoute("/api/users/onboarding")({
  server: { handlers: { GET: run, PATCH: run } },
});

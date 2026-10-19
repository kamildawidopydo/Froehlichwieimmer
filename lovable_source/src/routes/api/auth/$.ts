import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { publicDb } from "@/lib/publicDb.server";
import { setSession, clearSession, admin, ensureProfile, buildMe, currentUser } from "@/lib/authSession.server";

// Port von backend/routes/auth.py — Konten laufen über Lovable Cloud Auth,
// Sitzung wie im Original als HttpOnly-Cookies (access_token + refresh_token).
const json = (d: unknown, status = 200, headers?: Headers) => {
  const h = headers ?? new Headers();
  h.set("content-type", "application/json");
  return new Response(JSON.stringify(d), { status, headers: h });
};
const fail = (detail: string, status = 400) => json({ detail }, status);

const Email = z.string().trim().toLowerCase().email().max(255);
const Password = z.string().min(8, "Passwort muss mindestens 8 Zeichen haben.").max(128);
const PROFILE_FIELDS = [
  "name", "first_name", "last_name", "phone", "country", "street", "house_number", "address_addition",
  "postal_code", "city", "avatar_url", "notification_prefs", "email_digest_enabled",
  "onboarding_completed", "onboarding_completed_steps",
] as const;

async function body(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

async function handle(req: Request, path: string) {
  const h = new Headers();
  const origin = new URL(req.url).origin;
  const sb = publicDb();
  const m = req.method;

  if (m === "POST" && path === "register") {
    const p = z.object({ email: Email, password: Password, name: z.string().trim().max(200).optional() }).safeParse(await body(req));
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const { data, error } = await sb.auth.signUp({
      email: p.data.email, password: p.data.password,
      options: { emailRedirectTo: `${origin}/login`, data: { name: p.data.name ?? "" } },
    });
    if (error) return fail(error.message.includes("registered") ? "E-Mail bereits registriert." : error.message);
    if (!data.user) return fail("Registrierung fehlgeschlagen.");
    if (!data.user.identities?.length) return fail("E-Mail bereits registriert.");
    await ensureProfile(data.user);
    return json({ user: { id: data.user.id, email: data.user.email, name: p.data.name ?? "", role: "user" }, email_confirmation_required: !data.session });
  }

  if (m === "POST" && path === "login") {
    const p = z.object({ email: Email, password: z.string().min(1).max(128) }).safeParse(await body(req));
    if (!p.success) return fail("E-Mail und Passwort erforderlich.", 422);
    const { data, error } = await sb.auth.signInWithPassword(p.data);
    if (error || !data.session) {
      const notConfirmed = error?.message?.toLowerCase().includes("confirm");
      return fail(notConfirmed ? "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse." : "Ungültige E-Mail oder Passwort.", error?.status === 429 ? 429 : 401);
    }
    setSession(h, data.session);
    return json({ user: await buildMe(data.user) }, 200, h);
  }

  if (m === "POST" && path === "logout") {
    clearSession(h);
    return json({ ok: true }, 200, h);
  }

  if (m === "POST" && path === "refresh") {
    const cu = await currentUser(req, h);
    if (!cu) return fail("Nicht angemeldet.", 401);
    return json({ ok: true }, 200, h);
  }

  if (path === "me" && (m === "GET" || m === "PATCH")) {
    const cu = await currentUser(req, h);
    if (!cu) { clearSession(h); return json({ detail: "Nicht angemeldet." }, 401, h); }
    if (m === "PATCH") {
      const b = (await body(req)) as Record<string, unknown>;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of PROFILE_FIELDS) if (k in b) patch[k] = b[k];
      if ("address_street" in b) patch["street"] = b["address_street"];
      if ("address_house_number" in b) patch["house_number"] = b["address_house_number"];
      if ("address_line_2" in b) patch["address_addition"] = b["address_line_2"];
      if ("address_postal_code" in b) patch["postal_code"] = b["address_postal_code"];
      if ("address_city" in b) patch["city"] = b["address_city"];
      const db = await admin();
      const { error } = await db.from("profiles").update(patch).eq("id", cu.user.id);
      if (error) return fail("Profil konnte nicht gespeichert werden.");
    }
    return json(await buildMe(cu.user), 200, h);
  }

  if (m === "POST" && path === "forgot-password") {
    const p = z.object({ email: Email }).safeParse(await body(req));
    if (p.success) await sb.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${origin}/reset-password` });
    // Wie im Original: keine Auskunft, ob die Adresse existiert.
    return json({ ok: true, message: "Falls ein Konto existiert, wurde eine E-Mail versendet." });
  }

  if (m === "POST" && path === "reset-password") {
    const p = z.object({ token: z.string().min(10).max(4096), password: Password }).safeParse(await body(req));
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const { data } = await sb.auth.getUser(p.data.token);
    if (!data.user) return fail("Link ungültig oder abgelaufen.");
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.user.id, { password: p.data.password });
    if (error) return fail(error.message);
    await db.from("profiles").update({ must_change_password: false, last_password_reset_at: new Date().toISOString() }).eq("id", data.user.id);
    return json({ ok: true });
  }

  if (m === "POST" && (path === "force-reset-password" || path === "change-password")) {
    const cu = await currentUser(req, h);
    if (!cu) return fail("Nicht angemeldet.", 401);
    const b = await body(req);
    const p = z.object({
      password: Password.optional(), new_password: Password.optional(),
      current_password: z.string().max(128).optional(), old_password: z.string().max(128).optional(),
    }).safeParse(b);
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const next = p.data.new_password ?? p.data.password;
    if (!next) return fail("Neues Passwort erforderlich.", 422);
    if (path === "change-password") {
      const current = p.data.current_password ?? p.data.old_password ?? "";
      const check = await sb.auth.signInWithPassword({ email: cu.user.email!, password: current });
      if (check.error) return fail("Aktuelles Passwort ist falsch.");
    }
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(cu.user.id, { password: next });
    if (error) return fail(error.message);
    await db.from("profiles").update({ must_change_password: false, last_password_reset_at: new Date().toISOString() }).eq("id", cu.user.id);
    return json({ ok: true }, 200, h);
  }

  return fail("DATA_SOURCE_UNAVAILABLE", 503);
}

const run = async ({ request, params }: { request: Request; params: unknown }) => {
  try {
    return await handle(request, (params as { _splat?: string })._splat ?? "");
  } catch (e) {
    console.error(e);
    return fail("Dienst vorübergehend nicht verfügbar.", 503);
  }
};

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: run, POST: run, PATCH: run } },
});

import { publicDb } from "@/lib/publicDb.server";

export function cookies(req: Request) {
  const out: Record<string, string> = {};
  for (const p of (req.headers.get("cookie") || "").split(";")) {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
export function setSession(h: Headers, s: { access_token: string; refresh_token: string }) {
  h.append("set-cookie", `access_token=${s.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);
  h.append("set-cookie", `refresh_token=${s.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
}
export function clearSession(h: Headers) {
  for (const n of ["access_token", "refresh_token"]) h.append("set-cookie", `${n}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
export const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;

export async function ensureProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const db = await admin();
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  const name = String(user.user_metadata?.["name"] ?? "");
  const [first, ...rest] = name.split(" ");
  const row = { id: user.id, email: user.email ?? "", name, first_name: first || null, last_name: rest.join(" ") || null };
  await db.from("profiles").upsert(row);
  await db.from("user_roles").upsert({ user_id: user.id, role: "user" }, { onConflict: "user_id,role" });
  const again = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return again.data;
}

export async function buildMe(user: any) {
  const profile = await ensureProfile(user);
  const db = await admin();
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
  const role = (roles || []).some((r: { role: string }) => r.role === "admin") ? "admin" : "user";
  await db.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  const is_staff = role === "admin" || (roles || []).some((r: { role: string }) => r.role === "moderator");
  const { data: cust } = await db.from("customers").select("kyc_status,account_status,customer_no").eq("user_id", user.id).maybeSingle();
  return { ...profile, id: user.id, email: user.email, role, is_staff, kyc_status: cust?.kyc_status ?? null, customer_no: cust?.customer_no ?? null, verified: Boolean(user.email_confirmed_at) };
}

/** Aktuellen Nutzer aus Cookie ermitteln; läuft der Zugang ab, wird mit refresh_token erneuert. */
export async function currentUser(req: Request, h: Headers) {
  const c = cookies(req);
  const sb = publicDb();
  if (c["access_token"]) {
    const { data } = await sb.auth.getUser(c["access_token"]);
    if (data.user) return { user: data.user, token: c["access_token"] };
  }
  if (c["refresh_token"]) {
    const { data } = await sb.auth.refreshSession({ refresh_token: c["refresh_token"] });
    if (data.session && data.user) {
      setSession(h, data.session);
      return { user: data.user, token: data.session.access_token };
    }
  }
  return null;
}


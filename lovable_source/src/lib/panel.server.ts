import { currentUser, admin } from "@/lib/authSession.server";

export const PERMISSIONS = ["kunden", "kyc", "depots", "produkte", "preise", "auftraege", "audit", "export"] as const;
export type Perm = (typeof PERMISSIONS)[number];

export const DEFAULT_ADDRESS_DOC_KINDS = [
  "Strom-, Gas- oder Wasserrechnung",
  "Telefon- oder Internetrechnung",
  "Kontoauszug einer Bank",
  "Meldebescheinigung",
  "Steuerbescheid",
  "Rundfunkbeitrag-Bescheid",
];

export const json = (d: unknown, status = 200, headers?: Headers) => {
  const h = headers ?? new Headers();
  h.set("content-type", "application/json");
  h.set("cache-control", "no-store");
  return new Response(JSON.stringify(d), { status, headers: h });
};

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Staff = { id: string; email: string; isAdmin: boolean; perms: Set<string>; headers: Headers };

/** Angemeldete Person mit Admin- oder Mitarbeiterrolle ermitteln (serverseitig aus dem Sitzungs-Cookie). */
export async function requireStaff(req: Request): Promise<Staff> {
  const h = new Headers();
  const cu = await currentUser(req, h);
  if (!cu) throw new HttpError(401, "Nicht angemeldet.");
  const db = await admin();
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", cu.user.id);
  const r = (roles || []).map((x: { role: string }) => x.role);
  const isAdmin = r.includes("admin");
  if (!isAdmin && !r.includes("moderator")) throw new HttpError(403, "Kein Zugriff auf den Admin-Bereich.");
  let perms = new Set<string>();
  if (!isAdmin) {
    const { data } = await db.from("staff_permissions").select("permissions").eq("user_id", cu.user.id).maybeSingle();
    perms = new Set(data?.permissions || []);
  }
  return { id: cu.user.id, email: cu.user.email ?? "", isAdmin, perms, headers: h };
}

export function need(s: Staff, p: Perm | "admin") {
  if (s.isAdmin) return;
  if (p === "admin" || !s.perms.has(p)) throw new HttpError(403, "Für diese Aktion fehlt Ihnen die Berechtigung.");
}

export async function audit(
  s: { id: string; email: string } | null,
  action: string, entity: string, entityId: string | null | undefined,
  extra: { customer_id?: string | null | undefined; old?: unknown; new?: unknown; reason?: string | null } = {},
) {
  const db = await admin();
  await db.from("audit_logs").insert({
    actor_id: s?.id ?? null, actor_email: s?.email ?? null, action, entity, entity_id: entityId,
    customer_id: extra.customer_id ?? null, old_value: extra.old ?? null, new_value: extra.new ?? null, reason: extra.reason ?? null,
  });
}

const n = (v: unknown) => (v == null || v === "" ? 0 : Number(v));

/** Bewertung einer Position: Marktwert nur, wenn ein Marktpreis hinterlegt ist – sonst Buchungswert. */
export function valuePosition(pos: any, product: any) {
  const cat = product?.category;
  if (cat === "aktie" || cat === "anleihe") {
    const qty = n(pos.quantity);
    const booked = Math.round(qty * n(pos.unit_price) * 100) / 100;
    const mp = product?.market_price;
    const factor = cat === "anleihe" && product?.nominal_value ? 1 : 1;
    const market = mp == null ? null : Math.round(qty * n(mp) * factor * 100) / 100;
    return { booked_value: booked, market_value: market, value: market ?? booked, value_basis: market == null ? "buchungswert" : "marktpreis" };
  }
  if (cat === "ipo") {
    const amount = n(pos.amount);
    const qty = n(pos.quantity);
    const mp = pos.current_price ?? product?.market_price;
    const market = mp == null || qty <= 0 ? null : Math.round(qty * n(mp) * 100) / 100;
    return { booked_value: amount, market_value: market, accrued_interest: 0, value: market ?? amount, value_basis: market == null ? "zeichnungssumme" : "aktueller kurs" };
  }
  const amount = n(pos.amount);
  const rate = n(pos.interest_rate ?? product?.interest_rate);
  const start = new Date(pos.purchase_date || pos.created_at);
  const end = pos.maturity_date ? new Date(Math.min(Date.now(), new Date(pos.maturity_date).getTime())) : new Date();
  const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  const accrued = Math.round(amount * (rate / 100) * (days / 365) * 100) / 100;
  return { booked_value: amount, market_value: null, accrued_interest: accrued, value: amount, value_basis: "anlagebetrag" };
}

export async function loadDepot(customerId: string) {
  const db = await admin();
  const { data: customer } = await db.from("customers").select("*").eq("id", customerId).maybeSingle();
  if (!customer) throw new HttpError(404, "Kunde nicht gefunden.");
  const { data: portfolio } = await db.from("portfolios").select("*").eq("customer_id", customerId).maybeSingle();
  const { data: positions } = portfolio
    ? await db.from("portfolio_positions").select("*, product:products(*)").eq("portfolio_id", portfolio.id).order("created_at")
    : { data: [] };
  const { data: transactions } = await db.from("transactions").select("*, product:products(name,category,isin,ticker,interest_rate)").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(500);
  const rows = (positions || []).map((p: any) => ({ ...p, ...valuePosition(p, p.product) }));
  const open = rows.filter((p: any) => p.status === "open");
  const sum = (cat: string[]) => open.filter((p: any) => cat.includes(p.product?.category)).reduce((a: number, p: any) => a + p.value, 0);
  const cash = n(portfolio?.cash_balance);
  const totals = {
    aktien: sum(["aktie"]), ipo: sum(["ipo"]), anleihen: sum(["anleihe"]), festgeld: sum(["festgeld"]), flexgeld: sum(["flexgeld"]),
    liquiditaet: cash,
  };
  const total = Math.round((totals.aktien + totals.ipo + totals.anleihen + totals.festgeld + totals.flexgeld + cash) * 100) / 100;
  return { customer, portfolio, positions: rows, transactions: transactions || [], totals: { ...totals, gesamt: total } };
}

export async function canTrade(customerId: string) {
  const db = await admin();
  const { data: c } = await db.from("customers").select("kyc_status,account_status").eq("id", customerId).maybeSingle();
  return Boolean(c && c.kyc_status === "verified" && c.account_status === "active");
}

/** Status anhand der hochgeladenen Dokumente neu bestimmen (nur solange keine Admin-Entscheidung greift). */
export async function recomputeKycStatus(customerId: string) {
  const db = await admin();
  const { data: c } = await db.from("customers").select("kyc_status").eq("id", customerId).maybeSingle();
  if (!c || c.kyc_status === "verified" || c.kyc_status === "rejected") return c?.kyc_status;
  const { data: docs } = await db.from("kyc_documents").select("doc_type,status").eq("customer_id", customerId).in("status", ["pending", "accepted"]);
  const types = new Set((docs || []).map((d: any) => d.doc_type));
  const complete = types.has("id_front") && types.has("address_proof");
  let next = c.kyc_status;
  if (!complete && c.kyc_status !== "more_documents_required") next = "documents_missing";
  if (complete) next = "review_pending";
  if (next !== c.kyc_status) await db.from("customers").update({ kyc_status: next, updated_at: new Date().toISOString() }).eq("id", customerId);
  return next;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await admin();
  const { data } = await db.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function body(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

/** Rabattcode prüfen und Rabatt in Euro für einen Kaufbetrag berechnen (nur serverseitig). */
export async function evaluateDiscount(rawCode: string, category: string, orderTotal: number) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) throw new HttpError(422, "Bitte einen Rabattcode eingeben.");
  const db = await admin();
  const { data: dc } = await db.from("discount_codes").select("*").eq("code", code).maybeSingle();
  if (!dc || dc.status !== "active") throw new HttpError(404, "Dieser Rabattcode ist ungültig.");
  if (dc.valid_until && new Date(dc.valid_until + "T23:59:59") < new Date()) throw new HttpError(410, "Dieser Rabattcode ist abgelaufen.");
  if (dc.max_uses != null && dc.use_count >= dc.max_uses) throw new HttpError(410, "Dieser Rabattcode wurde bereits vollständig eingelöst.");
  if (dc.categories?.length && !dc.categories.includes(category)) throw new HttpError(422, "Dieser Rabattcode gilt nicht für dieses Produkt.");
  const total = Math.max(0, Number(orderTotal) || 0);
  const raw = dc.kind === "percent" ? total * (Number(dc.value) / 100) : Number(dc.value);
  const discount = Math.round(Math.min(raw, total) * 100) / 100;
  return { code, discount, kind: dc.kind as string, value: Number(dc.value), label: dc.label as string | null, id: dc.id as string };
}

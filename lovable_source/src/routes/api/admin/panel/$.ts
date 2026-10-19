import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Admin-Panel-API: jede Anfrage prüft Rolle/Berechtigung serverseitig aus dem Sitzungs-Cookie.
const num = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().finite().nonnegative().optional());
const str = (max = 500) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(max).optional());
const date = z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const Reason = z.string().trim().min(3, "Bitte eine Begründung angeben.").max(1000);
// Bei manuellen Depotbuchungen ist die Begründung freiwillig; sie wird nur protokolliert, wenn angegeben.
const OptReason = z.string().trim().max(1000).optional();

const CustomerFields = z.object({
  first_name: str(100), last_name: str(100), phone: str(50), street: str(200), house_number: str(20),
  postal_code: str(20), city: str(100), country: str(100), birth_date: date, internal_note: str(2000),
});
const ProductFields = z.object({
  category: z.enum(["aktie", "anleihe", "festgeld", "flexgeld", "ipo"]),
  name: z.string().trim().min(1).max(200),
  issuer: str(200), isin: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().toUpperCase().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, "ISIN ungültig").optional()),
  ticker: str(20), currency: z.string().trim().length(3).default("EUR"),
  market_price: num, buy_price: num, sell_price: num, nominal_value: num, coupon_rate: num, interest_rate: num,
  term_months: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  maturity_date: date, min_amount: num, conditions: str(4000), ipo_date_label: str(120),
  status: z.enum(["active", "inactive"]).default("active"), visibility: z.enum(["global", "assigned"]).default("global"),
});

async function handle(req: Request, path: string) {
  const P = await import("@/lib/panel.server");
  const { admin } = await import("@/lib/authSession.server");
  const { json, HttpError, need, audit, body } = P;
  const s = await P.requireStaff(req);
  const db = await admin();
  const m = req.method;
  const seg: string[] = path.split("/").filter(Boolean);
  const url = new URL(req.url);
  const q = (k: string) => url.searchParams.get(k) || "";
  const ok = (d: unknown, st = 200) => json(d, st, s.headers);
  const parse = (schema: z.ZodTypeAny, raw: unknown): any => {
    const r = schema.safeParse(raw);
    if (!r.success) throw new HttpError(422, r.error.issues[0]?.message ?? "Ungültige Eingabe.");
    return r.data;
  };
  const dbErr = (e: any) => { if (e) throw new HttpError(400, e.message || "Datenbankfehler"); };

  // ---------- Profil der angemeldeten Person
  if (m === "GET" && path === "me") return ok({ email: s.email, is_admin: s.isAdmin, permissions: s.isAdmin ? P.PERMISSIONS : [...s.perms] });

  // ---------- Dashboard
  if (m === "GET" && path === "dashboard") {
    need(s, "kunden");
    const { data: cs } = await db.from("customers").select("id,customer_no,first_name,last_name,email,kyc_status,account_status,created_at").order("created_at", { ascending: false }).limit(5000);
    const customers = cs || [];
    const by = (st: string) => customers.filter((c: any) => c.kyc_status === st).length;
    const since = Date.now() - 30 * 86400000;
    const { data: txs } = await db.from("transactions").select("side,status,total").limit(10000);
    const exec = (txs || []).filter((t: any) => t.status === "executed");
    const vol = (side: string) => exec.filter((t: any) => t.side === side).reduce((a: number, t: any) => a + Number(t.total || 0), 0);
    const { count: docsPending } = await db.from("kyc_documents").select("id", { count: "exact", head: true }).eq("status", "pending");
    const { data: positions } = await db.from("portfolio_positions").select("*, product:products(*)").eq("status", "open").limit(20000);
    const { data: pfs } = await db.from("portfolios").select("cash_balance");
    const depotValue = (positions || []).reduce((a: number, p: any) => a + P.valuePosition(p, p.product).value, 0)
      + (pfs || []).reduce((a: number, p: any) => a + Number(p.cash_balance || 0), 0);
    const { data: activity } = await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(12);
    return ok({
      kpis: {
        customers_total: customers.length, verified: by("verified"),
        pending: by("review_pending") + by("documents_submitted") + by("more_documents_required") + by("documents_missing"),
        review_pending: by("review_pending"), rejected: by("rejected"),
        depot_value_total: Math.round(depotValue * 100) / 100,
        volume_buy: vol("buy"), volume_sell: vol("sell"),
        tx_open: (txs || []).filter((t: any) => ["draft", "submitted", "in_review", "accepted"].includes(t.status)).length,
        tx_done: exec.length,
        new_customers_30d: customers.filter((c: any) => new Date(c.created_at).getTime() >= since).length,
        documents_pending: docsPending || 0,
      },
      awaiting: customers.filter((c: any) => c.kyc_status === "review_pending").slice(0, 10),
      activity: activity || [],
    });
  }

  // ---------- Kunden
  if (seg[0] === "customers") {
    if (m === "GET" && seg.length === 1) {
      need(s, "kunden");
      let query = db.from("customers").select("*, portfolio:portfolios(portfolio_no,cash_balance)").order("created_at", { ascending: false }).limit(1000);
      if (q("status")) query = query.eq("kyc_status", q("status"));
      if (q("account")) query = query.eq("account_status", q("account"));
      const term = q("q").replace(/[%,()]/g, " ").trim();
      if (term) query = query.or(`email.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,customer_no.ilike.%${term}%`);
      const { data, error } = await query; dbErr(error);
      return ok({ items: data || [] });
    }
    if (m === "POST" && seg.length === 1) {
      need(s, "kunden");
      const p = parse(CustomerFields.extend({ email: z.string().trim().toLowerCase().email().max(255) }), await body(req));
      const { data: created, error } = await db.auth.admin.createUser({ email: p.email, email_confirm: true, user_metadata: { name: [p.first_name, p.last_name].filter(Boolean).join(" ") } });
      if (error) throw new HttpError(400, /registered|exists/i.test(error.message) ? "Diese E-Mail-Adresse ist bereits registriert." : error.message);
      const { ensureProfile } = await import("@/lib/authSession.server");
      await ensureProfile(created.user);
      const { email: _e, ...fields } = p;
      const { data: c } = await db.from("customers").update({ ...fields, updated_at: new Date().toISOString() }).eq("user_id", created.user.id).select("*").single();
      await audit(s, "customer.create", "customer", c?.id ?? null, { customer_id: c?.id, new: p });
      return ok({ customer: c }, 201);
    }
    const id = seg[1]!;
    if (m === "GET" && seg.length === 2) {
      need(s, "kunden");
      const depot = await P.loadDepot(id);
      const { data: docs } = await db.from("kyc_documents").select("*").eq("customer_id", id).order("uploaded_at", { ascending: false });
      const { data: reviews } = await db.from("kyc_reviews").select("*").eq("customer_id", id).order("created_at", { ascending: false });
      const { data: logs } = await db.from("audit_logs").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(300);
      return ok({ ...depot, documents: docs || [], reviews: reviews || [], audit: logs || [] });
    }
    if (m === "PATCH" && seg.length === 2) {
      need(s, "kunden");
      const raw = await body(req);
      const p = parse(CustomerFields.extend({ reason: Reason }), raw);
      const { reason, ...fields } = p;
      const { data: old } = await db.from("customers").select("*").eq("id", id).single();
      const { data, error } = await db.from("customers").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); dbErr(error);
      const diffOld: any = {}, diffNew: any = {};
      for (const k of Object.keys(fields)) if ((old as any)?.[k] !== (fields as any)[k]) { diffOld[k] = (old as any)?.[k] ?? null; diffNew[k] = (fields as any)[k] ?? null; }
      await audit(s, "customer.update", "customer", id, { customer_id: id, old: diffOld, new: diffNew, reason });
      return ok({ customer: data });
    }
    if (m === "POST" && seg[2] === "status") {
      need(s, "kunden");
      const p = parse(z.object({ account_status: z.enum(["active", "locked", "deactivated"]), reason: Reason }), await body(req));
      const { data: old } = await db.from("customers").select("account_status,user_id").eq("id", id).single();
      await db.from("customers").update({ account_status: p.account_status, updated_at: new Date().toISOString() }).eq("id", id);
      if (old?.user_id) await db.from("profiles").update({ status: p.account_status }).eq("id", old.user_id);
      await audit(s, "customer.status", "customer", id, { customer_id: id, old: { account_status: old?.account_status }, new: { account_status: p.account_status }, reason: p.reason });
      return ok({ ok: true });
    }
    if (m === "DELETE" && seg.length === 2) {
      need(s, "admin");
      const p = parse(z.object({ reason: Reason }), await body(req));
      const { count: tx } = await db.from("transactions").select("id", { count: "exact", head: true }).eq("customer_id", id);
      const { data: pf } = await db.from("portfolios").select("id,cash_balance").eq("customer_id", id).maybeSingle();
      const { count: pos } = pf ? await db.from("portfolio_positions").select("id", { count: "exact", head: true }).eq("portfolio_id", pf.id) : { count: 0 };
      if ((tx || 0) > 0 || (pos || 0) > 0 || Number(pf?.cash_balance || 0) > 0)
        throw new HttpError(409, "Kunde hat Buchungen oder Bestände – aus Aufbewahrungsgründen nur Deaktivieren möglich.");
      const { data: c } = await db.from("customers").select("*").eq("id", id).single();
      const { data: docs } = await db.from("kyc_documents").select("storage_path").eq("customer_id", id);
      if (docs?.length) await db.storage.from("kyc-documents").remove(docs.map((d: any) => d.storage_path));
      await db.from("customers").delete().eq("id", id);
      if (c?.user_id) await db.auth.admin.deleteUser(c.user_id);
      await audit(s, "customer.delete", "customer", id, { old: { customer_no: c?.customer_no, email: c?.email }, reason: p.reason });
      return ok({ ok: true });
    }
    if (m === "POST" && seg[2] === "cash") {
      need(s, "depots");
      const p = parse(z.object({ delta: z.coerce.number().finite().refine((v) => v !== 0, "Betrag fehlt"), reason: OptReason }), await body(req));
      const { data: pf } = await db.from("portfolios").select("*").eq("customer_id", id).single();
      const next = Math.round((Number(pf.cash_balance) + p.delta) * 100) / 100;
      if (next < 0) throw new HttpError(409, "Liquidität darf nicht negativ werden.");
      const { error } = await db.from("portfolios").update({ cash_balance: next, updated_at: new Date().toISOString() }).eq("id", pf.id).eq("cash_balance", pf.cash_balance); dbErr(error);
      await audit(s, "cash.manual_booking", "portfolio", pf.id, { customer_id: id, old: { cash_balance: pf.cash_balance }, new: { cash_balance: next }, reason: p.reason || null });
      return ok({ cash_balance: next });
    }
    if (m === "POST" && seg[2] === "positions") {
      need(s, "depots");
      const p = parse(z.object({
        product_id: z.string().uuid(), quantity: num, amount: num, unit_price: num, interest_rate: num,
        purchase_date: date, available_from: date, maturity_date: date, currency: z.string().trim().length(3).default("EUR"), fees: num, current_price: num,
        note: str(1000), reason: OptReason,
      }), await body(req));
      const { data: pr } = await db.from("products").select("*").eq("id", p.product_id).single();
      if (!pr) throw new HttpError(404, "Produkt nicht gefunden.");
      const { data: pf } = await db.from("portfolios").select("id").eq("customer_id", id).single();
      const securities = pr.category === "aktie" || pr.category === "anleihe";
      const ipo = pr.category === "ipo";
      if (securities && (!p.quantity || p.unit_price == null)) throw new HttpError(422, "Stückzahl und Kaufpreis pro Stück sind erforderlich.");
      if (ipo && (!p.amount || p.unit_price == null)) throw new HttpError(422, "Zeichnungssumme und Zeichnungskurs je Stück sind erforderlich.");
      if (!securities && !ipo && !p.amount) throw new HttpError(422, "Anlagebetrag ist erforderlich.");
      const amount = securities ? Math.round((p.quantity || 0) * (p.unit_price || 0) * 100) / 100 : p.amount!;
      const quantity = securities ? (p.quantity || 0) : ipo && p.unit_price ? Math.round((Number(p.amount) / Number(p.unit_price)) * 10000) / 10000 : 0;
      const row = {
        portfolio_id: pf.id, product_id: pr.id, quantity, amount,
        unit_price: securities || ipo ? p.unit_price : null, current_price: ipo ? (p.current_price ?? null) : null, interest_rate: securities ? pr.coupon_rate : ipo ? null : (p.interest_rate ?? pr.interest_rate),
        purchase_date: p.purchase_date || new Date().toISOString().slice(0, 10), available_from: p.available_from || null, maturity_date: p.maturity_date || pr.maturity_date,
        currency: p.currency, fees: p.fees || 0, note: p.note, origin: "manuelle_buchung", created_by: s.id,
      };
      const { data: pos, error } = await db.from("portfolio_positions").insert(row).select("*").single(); dbErr(error);
      await db.from("transactions").insert({
        customer_id: id, portfolio_id: pf.id, product_id: pr.id, side: "buy", quantity: row.quantity, amount,
        displayed_price: pr.market_price, executed_price: securities || ipo ? p.unit_price : row.interest_rate, fees: row.fees,
        total: amount + (row.fees || 0), status: "executed", origin: "manuelle_buchung", executed_at: new Date().toISOString(),
        executed_by: s.id, created_by: s.id, execution_note: p.reason ? `Manuelle Buchung: ${p.reason}` : "Manuelle Buchung",
      });
      await audit(s, "position.add", "position", pos.id, { customer_id: id, new: { product: pr.name, ...row }, reason: p.reason || null });
      return ok({ position: pos }, 201);
    }
  }

  if (seg[0] === "positions" && seg[1]) {
    need(s, "depots");
    const id = seg[1]!;
    const { data: old } = await db.from("portfolio_positions").select("*, product:products(category,name), portfolio:portfolios(customer_id)").eq("id", id).single();
    if (!old) throw new HttpError(404, "Position nicht gefunden.");
    const cid = old.portfolio?.customer_id;
    if (m === "PATCH") {
      const p = parse(z.object({ quantity: num, amount: num, unit_price: num, current_price: num, interest_rate: num, purchase_date: date, available_from: date, maturity_date: date, note: str(1000), reason: OptReason }), await body(req));
      const sec = ["aktie", "anleihe"].includes(old.product?.category);
      const upd: any = { updated_at: new Date().toISOString() };
      if (p.quantity != null) upd.quantity = p.quantity;
      if (p.unit_price != null) upd.unit_price = p.unit_price;
      if (p.current_price != null) upd.current_price = p.current_price;
      if (p.interest_rate != null) upd.interest_rate = p.interest_rate;
      if (p.purchase_date) upd.purchase_date = p.purchase_date;
      if (p.maturity_date) upd.maturity_date = p.maturity_date;
      if (p.available_from !== undefined) upd.available_from = p.available_from || null;
      if (p.note != null) upd.note = p.note;
      if (sec) upd.amount = Math.round(Number(upd.quantity ?? old.quantity) * Number(upd.unit_price ?? old.unit_price ?? 0) * 100) / 100;
      else if (old.product?.category === "ipo") {
        if (p.amount != null) upd.amount = p.amount;
        const sum = Number(upd.amount ?? old.amount);
        const kurs = Number(upd.unit_price ?? old.unit_price ?? 0);
        if (kurs > 0) upd.quantity = Math.round((sum / kurs) * 10000) / 10000;
      }
      else if (p.amount != null) upd.amount = p.amount;
      const qtyOrAmt = sec ? Number(upd.quantity ?? old.quantity) : Number(upd.amount ?? old.amount);
      upd.status = qtyOrAmt > 0 ? "open" : "closed";
      const { error } = await db.from("portfolio_positions").update(upd).eq("id", id).eq("updated_at", old.updated_at); dbErr(error);
      const o: any = {}; for (const k of Object.keys(upd)) if (k !== "updated_at") o[k] = old[k];
      await audit(s, "position.adjust", "position", id, { customer_id: cid, old: { product: old.product?.name, ...o }, new: upd, reason: p.reason || null });
      return ok({ ok: true });
    }
    if (m === "DELETE") {
      const p = parse(z.object({ reason: Reason }), await body(req));
      await db.from("portfolio_positions").update({ status: "closed", quantity: 0, amount: 0, updated_at: new Date().toISOString() }).eq("id", id);
      await audit(s, "position.remove", "position", id, { customer_id: cid, old: { product: old.product?.name, quantity: old.quantity, amount: old.amount, unit_price: old.unit_price }, new: { status: "closed" }, reason: p.reason });
      return ok({ ok: true });
    }
  }

  // ---------- Depots-Übersicht
  if (m === "GET" && path === "portfolios") {
    need(s, "depots");
    const { data: pfs } = await db.from("portfolios").select("*, customer:customers(id,customer_no,first_name,last_name,email,kyc_status,account_status)").limit(5000);
    const { data: positions } = await db.from("portfolio_positions").select("*, product:products(*)").eq("status", "open").limit(20000);
    const items = (pfs || []).map((pf: any) => {
      const mine = (positions || []).filter((p: any) => p.portfolio_id === pf.id);
      const invested = mine.reduce((a: number, p: any) => a + P.valuePosition(p, p.product).value, 0);
      return { ...pf, positions_count: mine.length, invested: Math.round(invested * 100) / 100, total: Math.round((invested + Number(pf.cash_balance)) * 100) / 100 };
    });
    return ok({ items });
  }

  // ---------- Produkte
  if (seg[0] === "products") {
    if (m === "GET" && seg.length === 1) {
      need(s, "produkte");
      const { data } = await db.from("products").select("*, assignments:product_assignments(customer_id)").order("category").order("name");
      return ok({ items: data || [] });
    }
    if (m === "POST" && seg.length === 1) {
      need(s, "produkte");
      const p = parse(ProductFields, await body(req));
      const { data, error } = await db.from("products").insert({ ...p, created_by: s.id, market_price_at: p.market_price != null ? new Date().toISOString() : null }).select("*").single(); dbErr(error);
      if (p.market_price != null) await db.from("price_history").insert({ product_id: data.id, old_price: null, new_price: p.market_price, reason: "Erstanlage", admin_id: s.id, admin_email: s.email });
      await audit(s, "product.create", "product", data.id, { new: p });
      return ok({ product: data }, 201);
    }
    const id = seg[1]!;
    if (m === "PATCH" && seg.length === 2) {
      need(s, "produkte");
      const p = parse(ProductFields.partial().omit({ market_price: true }), await body(req));
      const { data: old } = await db.from("products").select("*").eq("id", id).single();
      const { data, error } = await db.from("products").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); dbErr(error);
      await audit(s, "product.update", "product", id, { old, new: p });
      return ok({ product: data });
    }
    if (m === "DELETE" && seg.length === 2) {
      need(s, "produkte");
      const { count: a } = await db.from("portfolio_positions").select("id", { count: "exact", head: true }).eq("product_id", id);
      const { count: b } = await db.from("transactions").select("id", { count: "exact", head: true }).eq("product_id", id);
      if ((a || 0) + (b || 0) > 0) throw new HttpError(409, "Produkt hat Buchungen – bitte deaktivieren statt löschen.");
      const { data: old } = await db.from("products").select("*").eq("id", id).single();
      await db.from("products").delete().eq("id", id);
      await audit(s, "product.delete", "product", id, { old });
      return ok({ ok: true });
    }
    if (m === "POST" && seg[2] === "assign") {
      need(s, "produkte");
      const p = parse(z.object({ customer_ids: z.array(z.string().uuid()).max(5000) }), await body(req));
      await db.from("product_assignments").delete().eq("product_id", id);
      if (p.customer_ids.length) await db.from("product_assignments").insert(p.customer_ids.map((c: string) => ({ product_id: id, customer_id: c })));
      await audit(s, "product.assign", "product", id, { new: { customers: p.customer_ids.length } });
      return ok({ ok: true });
    }
    if (m === "POST" && seg[2] === "price") {
      need(s, "preise");
      const p = parse(z.object({ field: z.enum(["market_price", "buy_price", "sell_price", "interest_rate", "coupon_rate"]).default("market_price"), price: z.coerce.number().finite().nonnegative(), reason: Reason }), await body(req));
      const { data: old } = await db.from("products").select("*").eq("id", id).single();
      const upd: any = { [p.field]: p.price, updated_at: new Date().toISOString() };
      if (p.field === "market_price") { upd.market_price_source = "manuell"; upd.market_price_at = new Date().toISOString(); }
      await db.from("products").update(upd).eq("id", id);
      await db.from("price_history").insert({ product_id: id, field: p.field, old_price: old?.[p.field] ?? null, new_price: p.price, reason: p.reason, admin_id: s.id, admin_email: s.email });
      await audit(s, "price.change", "product", id, { old: { [p.field]: old?.[p.field] ?? null }, new: { [p.field]: p.price }, reason: p.reason });
      return ok({ ok: true });
    }
  }
  // ---------- Rabattcodes
  if (seg[0] === "discount-codes") {
    need(s, "produkte");
    if (m === "GET" && seg.length === 1) {
      const { data } = await db.from("discount_codes").select("*").order("created_at", { ascending: false });
      return ok({ items: data || [] });
    }
    const Fields = z.object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, "Code: 3–40 Zeichen, nur Buchstaben, Ziffern und Bindestrich."),
      label: str(200), kind: z.enum(["percent", "fixed"]), value: z.coerce.number().finite().positive("Bitte einen Rabattwert angeben."),
      categories: z.array(z.enum(["aktie", "anleihe", "ipo", "festgeld", "flexgeld"])).default([]),
      max_uses: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
      valid_until: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
      status: z.enum(["active", "inactive"]).default("active"),
    });
    if (m === "POST" && seg.length === 1) {
      const p = parse(Fields, await body(req));
      if (p.kind === "percent" && p.value > 100) throw new HttpError(422, "Prozent-Rabatt darf höchstens 100 % betragen.");
      const { data, error } = await db.from("discount_codes").insert({ ...p, created_by: s.id }).select("*").single();
      if (error) throw new HttpError(409, error.code === "23505" ? "Diesen Code gibt es bereits." : error.message);
      await audit(s, "discount.create", "discount_code", data.id, { new: p });
      return ok({ item: data }, 201);
    }
    const id = seg[1]!;
    if (m === "PATCH" && seg.length === 2) {
      const p = parse(Fields.partial(), await body(req));
      const { data, error } = await db.from("discount_codes").update(p).eq("id", id).select("*").single(); dbErr(error);
      await audit(s, "discount.update", "discount_code", id, { new: p });
      return ok({ item: data });
    }
    if (m === "DELETE" && seg.length === 2) {
      await db.from("discount_codes").delete().eq("id", id);
      await audit(s, "discount.delete", "discount_code", id);
      return ok({ ok: true });
    }
  }

  if (m === "GET" && path === "price-history") {
    need(s, "preise");
    let query = db.from("price_history").select("*, product:products(name,category,isin)").order("created_at", { ascending: false }).limit(500);
    if (q("product_id")) query = query.eq("product_id", q("product_id"));
    const { data } = await query;
    return ok({ items: data || [] });
  }

  // ---------- Aufträge
  if (seg[0] === "transactions") {
    need(s, "auftraege");
    if (m === "GET" && seg.length === 1) {
      let query = db.from("transactions").select("*, customer:customers(customer_no,first_name,last_name,email), product:products(name,category,isin,ticker)").order("created_at", { ascending: false }).limit(1000);
      if (q("status")) query = query.eq("status", q("status"));
      if (q("customer_id")) query = query.eq("customer_id", q("customer_id"));
      if (q("product_id")) query = query.eq("product_id", q("product_id"));
      if (q("from")) query = query.gte("created_at", q("from"));
      if (q("to")) query = query.lte("created_at", q("to") + "T23:59:59");
      const { data } = await query;
      return ok({ items: data || [] });
    }
    const id = seg[1]!;
    if (m === "POST" && seg[2] === "status") {
      const p = parse(z.object({ status: z.enum(["in_review", "accepted", "rejected", "cancelled"]), reason: z.string().trim().max(1000).optional() }), await body(req));
      if ((p.status === "rejected" || p.status === "cancelled") && !(p.reason && p.reason.length >= 3)) throw new HttpError(422, "Bitte eine Begründung angeben.");
      const { data: old } = await db.from("transactions").select("status,customer_id").eq("id", id).single();
      if (!old || !["draft", "submitted", "in_review", "accepted"].includes(old.status)) throw new HttpError(409, "Status kann nicht mehr geändert werden.");
      const { data: upd, error } = await db.from("transactions").update({ status: p.status, status_reason: p.reason ?? null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", old.status).select("id"); dbErr(error);
      if (!upd?.length) throw new HttpError(409, "Auftrag wurde zwischenzeitlich geändert – bitte neu laden.");
      await audit(s, "transaction.status", "transaction", id, { customer_id: old.customer_id, old: { status: old.status }, new: { status: p.status }, reason: p.reason });
      return ok({ ok: true });
    }
    if (m === "POST" && seg[2] === "execute") {
      const p = parse(z.object({ price: z.coerce.number().finite().nonnegative(), fees: z.coerce.number().finite().nonnegative().default(0), note: z.string().trim().min(3, "Bitte Ausführungsdetails angeben.").max(1000) }), await body(req));
      const { data, error } = await db.rpc("execute_transaction", { _tx: id, _price: p.price, _fees: p.fees, _admin: s.id, _admin_email: s.email, _note: p.note });
      if (error) throw new HttpError(409, error.message);
      return ok(data);
    }
  }

  // ---------- KYC
  if (seg[0] === "kyc") {
    need(s, "kyc");
    if (m === "GET" && path === "kyc/upload-config") {
      return ok({ address_doc_kinds: await P.getSetting("address_doc_kinds", P.DEFAULT_ADDRESS_DOC_KINDS), address_doc_max_age_months: await P.getSetting("address_doc_max_age_months", 4) });
    }
    if (m === "POST" && seg.length === 3 && seg[2] === "upload") {
      const id = seg[1];
      if (!id || !z.string().uuid().safeParse(id).success) throw new HttpError(422, "Ungültige Kunden-ID.");
      const { data: customer, error: customerError } = await db.from("customers").select("id,kyc_status").eq("id", id).maybeSingle();
      dbErr(customerError);
      if (!customer) throw new HttpError(404, "Kunde nicht gefunden.");
      const { kycUploadSchema, validateKycFile } = await import("@/lib/kycUploadValidation");
      const parsed = kycUploadSchema.safeParse(await body(req));
      if (!parsed.success) throw new HttpError(422, "Bitte ein PDF oder Foto (JPG, PNG, WEBP) bis 10 MB und gültige Dokumentangaben auswählen.");
      const p = parsed.data;
      const kinds = await P.getSetting<string[]>("address_doc_kinds", P.DEFAULT_ADDRESS_DOC_KINDS);
      const maxAge = await P.getSetting<number>("address_doc_max_age_months", 4);
      let validated: ReturnType<typeof validateKycFile>;
      try { validated = validateKycFile(p, kinds, maxAge); } catch (e) { throw new HttpError(422, e instanceof Error ? e.message : "Ungültige Datei."); }
      const storagePath = `${id}/${p.doc_type}-${crypto.randomUUID()}.${validated.ext}`;
      const { error: uploadError } = await db.storage.from("kyc-documents").upload(storagePath, validated.bytes, { contentType: p.media_type, upsert: false });
      if (uploadError) throw new HttpError(500, "Upload fehlgeschlagen. Bitte erneut versuchen.");
      const { data: doc, error: insertError } = await db.from("kyc_documents").insert({
        customer_id: id, doc_type: p.doc_type, address_doc_kind: p.doc_type === "address_proof" ? p.address_doc_kind : null,
        document_date: p.doc_type === "address_proof" ? p.document_date : null,
        storage_path: storagePath, file_name: p.file_name, mime_type: p.media_type, size_bytes: validated.bytes.length,
      }).select("id,doc_type,file_name,status,uploaded_at").single();
      if (insertError || !doc) {
        await db.storage.from("kyc-documents").remove([storagePath]);
        throw new HttpError(500, "Das Dokument konnte nicht gespeichert werden. Bitte erneut versuchen.");
      }
      // Never supersede accepted evidence or automatically grant/revoke an existing verification.
      if (p.doc_type !== "other") {
        const { error } = await db.from("kyc_documents").update({ status: "superseded" }).eq("customer_id", id).eq("doc_type", p.doc_type).eq("status", "pending").neq("id", doc.id);
        dbErr(error);
      }
      const status = await P.recomputeKycStatus(id);
      await audit(s, "kyc.admin_upload", "kyc_document", doc.id, { customer_id: id, new: { doc_type: p.doc_type, file_name: p.file_name, document_date: p.document_date ?? null } });
      return ok({ document: doc, kyc_status: status }, 201);
    }
    if (m === "GET" && seg.length === 1) {
      const statuses = q("all") ? ["documents_missing", "documents_submitted", "review_pending", "more_documents_required", "verified", "rejected"] : ["review_pending", "documents_submitted", "more_documents_required"];
      const { data: cs } = await db.from("customers").select("id,customer_no,first_name,last_name,email,kyc_status,account_status,created_at").in("kyc_status", statuses).order("updated_at", { ascending: true }).limit(1000);
      const ids = (cs || []).map((c: any) => c.id);
      const { data: docs } = ids.length ? await db.from("kyc_documents").select("*").in("customer_id", ids).neq("status", "superseded").order("uploaded_at", { ascending: false }) : { data: [] };
      const { data: reviews } = ids.length ? await db.from("kyc_reviews").select("*").in("customer_id", ids).order("created_at", { ascending: false }) : { data: [] };
      return ok({ items: (cs || []).map((c: any) => ({ ...c, documents: (docs || []).filter((d: any) => d.customer_id === c.id), reviews: (reviews || []).filter((r: any) => r.customer_id === c.id) })) });
    }
    if ((m === "POST" || m === "DELETE") && seg[1] === "doc" && seg[2] && z.string().uuid().safeParse(seg[2]).success) {
      const { data: d } = await db.from("kyc_documents").select("*").eq("id", seg[2]).maybeSingle();
      if (!d) throw new HttpError(404, "Dokument nicht gefunden.");
      if (m === "DELETE") {
        const p = parse(z.object({ reason: z.string().trim().max(2000).optional() }), await body(req));
        await db.storage.from("kyc-documents").remove([d.storage_path]);
        const { error } = await db.from("kyc_documents").delete().eq("id", d.id); dbErr(error);
        const status = await P.recomputeKycStatus(d.customer_id);
        await audit(s, "kyc.document_delete", "kyc_document", d.id, { customer_id: d.customer_id, old: { doc_type: d.doc_type, file_name: d.file_name, status: d.status }, reason: p.reason });
        return ok({ ok: true, kyc_status: status });
      }
      if (seg[3] !== "status") throw new HttpError(404, "Unbekannte Aktion.");
      const p = parse(z.object({ status: z.enum(["accepted", "rejected", "pending"]), reason: z.string().trim().max(2000).optional() }), await body(req));
      const { error } = await db.from("kyc_documents").update({ status: p.status }).eq("id", d.id); dbErr(error);
      if (p.status === "accepted" && d.doc_type !== "other") await db.from("kyc_documents").update({ status: "superseded" }).eq("customer_id", d.customer_id).eq("doc_type", d.doc_type).in("status", ["pending", "accepted"]).neq("id", d.id);
      const status = await P.recomputeKycStatus(d.customer_id);
      await audit(s, "kyc.document_status", "kyc_document", d.id, { customer_id: d.customer_id, old: { status: d.status }, new: { status: p.status }, reason: p.reason });
      return ok({ ok: true, kyc_status: status });
    }
    if (m === "GET" && seg[1] === "doc" && seg[2]) {
      const { data: d } = await db.from("kyc_documents").select("*").eq("id", seg[2]).single();
      if (!d) throw new HttpError(404, "Dokument nicht gefunden.");
      const { data, error } = await db.storage.from("kyc-documents").createSignedUrl(d.storage_path, 300); dbErr(error);
      await audit(s, "kyc.document_view", "kyc_document", d.id, { customer_id: d.customer_id });
      return ok({ url: data.signedUrl, mime_type: d.mime_type, expires_in: 300 });
    }
    if (m === "POST" && seg[2] === "decision") {
      const id = seg[1]!;
      const p = parse(z.object({ decision: z.enum(["approved", "more_documents", "rejected"]), reason: z.string().trim().max(2000).optional() }), await body(req));
      if (p.decision !== "approved" && !(p.reason && p.reason.length >= 3)) throw new HttpError(422, "Bitte eine Begründung angeben.");
      const { data: c } = await db.from("customers").select("kyc_status").eq("id", id).single();
      if (p.decision === "approved") {
        const { data: docs } = await db.from("kyc_documents").select("doc_type").eq("customer_id", id).in("status", ["pending", "accepted"]);
        const t = new Set((docs || []).map((d: any) => d.doc_type));
        if (!t.has("id_front") || !t.has("address_proof")) throw new HttpError(409, "Es fehlen erforderliche Dokumente (Ausweis-Vorderseite und Adressnachweis).");
      }
      const next = ({ approved: "verified", more_documents: "more_documents_required", rejected: "rejected" } as Record<string, string>)[p.decision];
      const now = new Date().toISOString();
      await db.from("customers").update({ kyc_status: next, kyc_verified_at: p.decision === "approved" ? now : null, kyc_verified_by: p.decision === "approved" ? s.id : null, updated_at: now }).eq("id", id);
      await db.from("kyc_documents").update({ status: p.decision === "approved" ? "accepted" : p.decision === "rejected" ? "rejected" : "pending" }).eq("customer_id", id).in("status", ["pending", "accepted"]);
      await db.from("kyc_reviews").insert({ customer_id: id, decision: p.decision, reason: p.reason ?? null, admin_id: s.id, admin_email: s.email });
      const { data: cu } = await db.from("customers").select("user_id").eq("id", id).single();
      if (cu?.user_id) await db.from("profiles").update({ verified: p.decision === "approved" }).eq("id", cu.user_id);
      await audit(s, "kyc.decision", "customer", id, { customer_id: id, old: { kyc_status: c?.kyc_status }, new: { kyc_status: next }, reason: p.reason });
      return ok({ ok: true, kyc_status: next });
    }
  }

  // ---------- Audit-Log
  if (m === "GET" && path === "audit") {
    need(s, "audit");
    let query = db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1000);
    if (q("entity")) query = query.eq("entity", q("entity"));
    if (q("customer_id")) query = query.eq("customer_id", q("customer_id"));
    const term = q("q").replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`action.ilike.%${term}%,actor_email.ilike.%${term}%,reason.ilike.%${term}%`);
    const { data } = await query;
    return ok({ items: data || [] });
  }

  // ---------- Export
  if (m === "GET" && path === "export/customers.csv") {
    need(s, "export");
    const { data } = await db.from("customers").select("customer_no,first_name,last_name,email,phone,street,house_number,postal_code,city,country,kyc_status,account_status,created_at").order("created_at");
    const cols = ["customer_no", "first_name", "last_name", "email", "phone", "street", "house_number", "postal_code", "city", "country", "kyc_status", "account_status", "created_at"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(";"), ...(data || []).map((r: any) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
    await audit(s, "export.customers", "customer", null, { new: { rows: data?.length ?? 0 } });
    const h = s.headers; h.set("content-type", "text/csv; charset=utf-8"); h.set("content-disposition", 'attachment; filename="kunden.csv"');
    return new Response("\uFEFF" + csv, { status: 200, headers: h });
  }

  // ---------- Einstellungen (nur Admin)
  if (seg[0] === "settings") {
    if (m === "GET" && seg.length === 1) {
      const kinds = await P.getSetting("address_doc_kinds", P.DEFAULT_ADDRESS_DOC_KINDS);
      const maxAge = await P.getSetting("address_doc_max_age_months", 4);
      return ok({ address_doc_kinds: kinds, address_doc_max_age_months: maxAge, permissions: P.PERMISSIONS });
    }
    need(s, "admin");
    if (m === "PUT" && seg.length === 1) {
      const p = parse(z.object({ address_doc_kinds: z.array(z.string().trim().min(2).max(120)).min(1).max(30), address_doc_max_age_months: z.coerce.number().int().min(1).max(24) }), await body(req));
      await db.from("app_settings").upsert([
        { key: "address_doc_kinds", value: p.address_doc_kinds, updated_at: new Date().toISOString() },
        { key: "address_doc_max_age_months", value: p.address_doc_max_age_months, updated_at: new Date().toISOString() },
      ]);
      await audit(s, "settings.update", "settings", null, { new: p });
      return ok({ ok: true });
    }
  }
  if (seg[0] === "staff") {
    need(s, "admin");
    if (m === "GET") {
      const { data: roles } = await db.from("user_roles").select("user_id,role").in("role", ["admin", "moderator"]);
      const ids = [...new Set((roles || []).map((r: any) => r.user_id))];
      const { data: profiles } = ids.length ? await db.from("profiles").select("id,email,name").in("id", ids) : { data: [] };
      const { data: perms } = ids.length ? await db.from("staff_permissions").select("*").in("user_id", ids) : { data: [] };
      return ok({ items: ids.map((id) => ({
        user_id: id, email: (profiles || []).find((p: any) => p.id === id)?.email,
        role: (roles || []).some((r: any) => r.user_id === id && r.role === "admin") ? "admin" : "moderator",
        permissions: (perms || []).find((p: any) => p.user_id === id)?.permissions || [],
      })) });
    }
    if (m === "POST") {
      const p = parse(z.object({ email: z.string().trim().toLowerCase().email(), permissions: z.array(z.enum(P.PERMISSIONS)) }), await body(req));
      const { data: prof } = await db.from("profiles").select("id").ilike("email", p.email).maybeSingle();
      if (!prof) throw new HttpError(404, "Zu dieser E-Mail gibt es kein Konto. Die Person muss sich zuerst registrieren.");
      if (prof.id === s.id) throw new HttpError(409, "Eigene Rechte können nicht geändert werden.");
      await db.from("user_roles").upsert({ user_id: prof.id, role: "moderator" }, { onConflict: "user_id,role" });
      await db.from("staff_permissions").upsert({ user_id: prof.id, permissions: p.permissions, updated_at: new Date().toISOString() });
      await audit(s, "staff.permissions", "staff", prof.id, { new: p });
      return ok({ ok: true });
    }
    if (m === "DELETE" && seg[1]) {
      if (seg[1] === s.id) throw new HttpError(409, "Eigene Rechte können nicht entfernt werden.");
      await db.from("user_roles").delete().eq("user_id", seg[1]).eq("role", "moderator");
      await db.from("staff_permissions").delete().eq("user_id", seg[1]);
      await audit(s, "staff.remove", "staff", seg[1]);
      return ok({ ok: true });
    }
  }

  throw new HttpError(404, "Unbekannter Endpunkt.");
}

async function run(request: Request, params: { _splat?: string | undefined }) {
  const { json, HttpError } = await import("@/lib/panel.server");
  try {
    return await handle(request, params._splat || "");
  } catch (e: any) {
    if (e instanceof HttpError) return json({ detail: e.message }, e.status);
    console.error("[admin-panel]", e?.message);
    return json({ detail: "Interner Fehler. Bitte erneut versuchen." }, 500);
  }
}

export const Route = createFileRoute("/api/admin/panel/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => run(request, params),
      POST: ({ request, params }) => run(request, params),
      PATCH: ({ request, params }) => run(request, params),
      PUT: ({ request, params }) => run(request, params),
      DELETE: ({ request, params }) => run(request, params),
    },
  },
});

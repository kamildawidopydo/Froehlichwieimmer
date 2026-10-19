import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Kundenseitige API: nur eigene Daten. Handelsfreigabe wird hier serverseitig erzwungen.
// Aktien mit Ticker bekommen den Live-Kurs (Yahoo, in EUR umgerechnet); Rückfall = gespeicherter Preis.
async function withLive(items: any[], db?: any) {
  const { liveUsdToEur } = await import("@/lib/liveQuotes.server");
  const { sparkQuotes } = await import("@/lib/liveSpark.server");
  const isLive = (p: any) => (p.category === "aktie" || p.category === "ipo") && p.ticker;
  const stocks = items.filter(isLive);
  if (!stocks.length) return items;
  const { yahooChart } = await import("@/lib/liveQuotes.server");
  const [fx, chf, dkk, gbp, sek, nok, q] = await Promise.all([liveUsdToEur(), yahooChart("CHFEUR=X"), yahooChart("DKKEUR=X"), yahooChart("GBPEUR=X"), yahooChart("SEKEUR=X"), yahooChart("NOKEUR=X"), sparkQuotes(stocks.map((p) => p.ticker))]);
  const rate = (t: string) => t.endsWith(".SW") ? chf?.meta.price ?? 0 : t.endsWith(".CO") ? dkk?.meta.price ?? 0 : t.endsWith(".L") ? (gbp?.meta.price ?? 0) / 100 : t.endsWith(".ST") ? sek?.meta.price ?? 0 : t.endsWith(".OL") ? nok?.meta.price ?? 0 : t.includes(".") ? 1 : fx ?? 0;
  const out = items.map((p) => {
    if (!isLive(p)) return p;
    const c = q.get(p.ticker);
    if (!c) return p;
    const k = p.currency === "EUR" ? rate(String(p.ticker)) : 1;
    if (!k) return p;
    const price = Math.round(c.price * k * 100) / 100;
    const prev = c.prev * k;
    return { ...p, market_price: price, buy_price: price, sell_price: price, market_price_source: "live", market_price_at: new Date(c.time * 1000).toISOString(), ...(p.shares_outstanding ? { market_cap: Math.round(c.price * Number(p.shares_outstanding)) } : {}), change_percent: prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0 };
  });
  // Live-Stand speichern, damit Admin-Ansicht und Rückfall aktuell bleiben.
  if (db) {
    const changed = out.filter((p, i) => p.market_price_source === "live" && Number(p.market_price) !== Number(items[i].market_price));
    await Promise.all(changed.map((p) => db.from("products").update({ market_price: p.market_price, market_price_source: "live", market_price_at: p.market_price_at }).eq("id", p.id))).catch(() => {});
  }
  return out;
}

async function handle(req: Request, path: string) {
  const P = await import("@/lib/panel.server");
  const { currentUser, admin, ensureProfile } = await import("@/lib/authSession.server");
  const { json, HttpError, body } = P;
  const h = new Headers();
  const cu = await currentUser(req, h);
  if (!cu) throw new HttpError(401, "Nicht angemeldet.");
  const db = await admin();
  let { data: c } = await db.from("customers").select("*").eq("user_id", cu.user.id).maybeSingle();
  if (!c) { await ensureProfile(cu.user); ({ data: c } = await db.from("customers").select("*").eq("user_id", cu.user.id).maybeSingle()); }
  if (!c) throw new HttpError(404, "Für dieses Konto gibt es keine Kundenakte.");
  const ok = (d: unknown, st = 200) => json(d, st, h);
  const m = req.method;
  const seg = path.split("/").filter(Boolean);
  const actor = { id: cu.user.id, email: cu.user.email ?? "" };
  const strip = ({ internal_note: _n, kyc_verified_by: _v, ...rest }: any) => rest;

  if (m === "GET" && path === "status") {
    const { data: docs } = await db.from("kyc_documents").select("id,doc_type,address_doc_kind,document_date,file_name,status,uploaded_at").eq("customer_id", c.id).neq("status", "superseded").order("uploaded_at", { ascending: false });
    const { data: reviews } = await db.from("kyc_reviews").select("decision,reason,created_at").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(5);
    return ok({
      customer: strip(c), documents: docs || [], reviews: reviews || [],
      can_trade: c.kyc_status === "verified" && c.account_status === "active",
      address_doc_kinds: await P.getSetting("address_doc_kinds", P.DEFAULT_ADDRESS_DOC_KINDS),
      address_doc_max_age_months: await P.getSetting("address_doc_max_age_months", 4),
    });
  }

  if (m === "POST" && path === "kyc/upload") {
    if (c.account_status !== "active") throw new HttpError(403, "Ihr Konto ist gesperrt.");
    if (c.kyc_status === "verified" || c.kyc_status === "rejected") throw new HttpError(409, "Ihre Prüfung ist abgeschlossen – bitte wenden Sie sich an den Kundenservice.");
    const kinds = await P.getSetting<string[]>("address_doc_kinds", P.DEFAULT_ADDRESS_DOC_KINDS);
    const maxAge = await P.getSetting<number>("address_doc_max_age_months", 4);
    const { kycUploadSchema, validateKycFile } = await import("@/lib/kycUploadValidation");
    const r = kycUploadSchema.safeParse(await body(req));
    if (!r.success) throw new HttpError(422, "Bitte ein PDF oder Foto (JPG, PNG, WEBP) bis 10 MB auswählen.");
    const p = r.data;
    let validated: ReturnType<typeof validateKycFile>;
    try { validated = validateKycFile(p, kinds, maxAge); } catch (e) { throw new HttpError(422, e instanceof Error ? e.message : "Ungültige Datei."); }
    const storagePath = `${c.id}/${p.doc_type}-${crypto.randomUUID()}.${validated.ext}`;
    const { error } = await db.storage.from("kyc-documents").upload(storagePath, validated.bytes, { contentType: p.media_type, upsert: false });
    if (error) throw new HttpError(500, "Upload fehlgeschlagen. Bitte erneut versuchen.");
    const { data: doc, error: insErr } = await db.from("kyc_documents").insert({
      customer_id: c.id, doc_type: p.doc_type, address_doc_kind: p.address_doc_kind ?? null, document_date: p.document_date ?? null,
      storage_path: storagePath, file_name: p.file_name.replace(/[^\p{L}\p{N} ._()-]/gu, "_"), mime_type: p.media_type, size_bytes: validated.bytes.byteLength,
    }).select("id,doc_type,file_name,status,uploaded_at").single();
    if (insErr || !doc) { await db.storage.from("kyc-documents").remove([storagePath]); throw new HttpError(500, "Upload fehlgeschlagen. Bitte erneut versuchen."); }
    if (p.doc_type !== "other") await db.from("kyc_documents").update({ status: "superseded" }).eq("customer_id", c.id).eq("doc_type", p.doc_type).eq("status", "pending").neq("id", doc.id);
    const status = await P.recomputeKycStatus(c.id);
    await P.audit(actor, "kyc.upload", "kyc_document", doc?.id ?? null, { customer_id: c.id, new: { doc_type: p.doc_type, file_name: p.file_name } });
    return ok({ document: doc, kyc_status: status }, 201);
  }

  if (m === "GET" && seg[0] === "kyc" && seg[1] === "doc" && seg[2]) {
    const { data: d } = await db.from("kyc_documents").select("*").eq("id", z.string().uuid().safeParse(seg[2]).success ? seg[2] : "00000000-0000-0000-0000-000000000000").eq("customer_id", c.id).maybeSingle();
    if (!d) throw new HttpError(404, "Dokument nicht gefunden.");
    const { data } = await db.storage.from("kyc-documents").createSignedUrl(d.storage_path, 120);
    return ok({ url: data?.signedUrl, mime_type: d.mime_type });
  }

  if (m === "GET" && path === "depot") {
    const d = await P.loadDepot(c.id);
    return ok({
      customer: strip(d.customer), portfolio: d.portfolio, totals: d.totals,
      positions: d.positions.map(({ created_by: _c, ...p }: any) => p),
      transactions: d.transactions.map(({ created_by: _c, executed_by: _e, ...t }: any) => t),
      can_trade: c.kyc_status === "verified" && c.account_status === "active",
    });
  }

  if (m === "GET" && path === "products") {
    const { data: assigned } = await db.from("product_assignments").select("product_id").eq("customer_id", c.id);
    const ids = (assigned || []).map((a: any) => a.product_id);
    let query = db.from("products").select("id,category,name,issuer,isin,ticker,currency,market_price,market_price_source,market_price_at,buy_price,sell_price,nominal_value,coupon_rate,interest_rate,term_months,maturity_date,min_amount,conditions,ipo_date_label,ipo_status,market_cap,market_cap_note,shares_outstanding").eq("status", "active");
    query = ids.length ? query.or(`visibility.eq.global,id.in.(${ids.join(",")})`) : query.eq("visibility", "global");
    const { data } = await query.order("category").order("name");
    return ok({ items: await withLive(data || [], db) });
  }

  if (m === "POST" && path === "discount/check") {
    const r = z.object({ code: z.string().trim().min(1).max(40), product_id: z.string().uuid(), total: z.coerce.number().finite().nonnegative() }).safeParse(await body(req));
    if (!r.success) throw new HttpError(422, "Bitte einen Rabattcode eingeben.");
    const { data: pr } = await db.from("products").select("category").eq("id", r.data.product_id).maybeSingle();
    if (!pr) throw new HttpError(404, "Produkt ist nicht verfügbar.");
    const d = await P.evaluateDiscount(r.data.code, pr.category, r.data.total);
    return ok({ code: d.code, discount: d.discount, kind: d.kind, value: d.value, label: d.label });
  }

  if (m === "POST" && path === "orders") {
    // Zentrale Freigaberegel – unabhängig vom Browserzustand.
    if (!(await P.canTrade(c.id))) throw new HttpError(403, "Kauf und Verkauf sind erst nach erfolgreicher Verifizierung möglich.");
    const r = z.object({
      product_id: z.string().uuid(), side: z.enum(["buy", "sell"]),
      quantity: z.coerce.number().finite().nonnegative().default(0), amount: z.coerce.number().finite().nonnegative().default(0),
      idempotency_key: z.string().trim().min(8).max(100),
      discount_code: z.string().trim().max(40).optional(),
    }).safeParse(await body(req));
    if (!r.success) throw new HttpError(422, "Ungültige Auftragsdaten.");
    const p = r.data;
    const { data: pr0 } = await db.from("products").select("*").eq("id", p.product_id).eq("status", "active").maybeSingle();
    const pr = pr0 ? (await withLive([pr0]))[0] : null;
    if (!pr) throw new HttpError(404, "Produkt ist nicht verfügbar.");
    if (pr.visibility === "assigned") {
      const { data: a } = await db.from("product_assignments").select("product_id").eq("product_id", pr.id).eq("customer_id", c.id).maybeSingle();
      if (!a) throw new HttpError(403, "Dieses Produkt ist für Sie nicht freigegeben.");
    }
    const sec = pr.category === "aktie" || pr.category === "anleihe";
    if (sec && !(p.quantity > 0)) throw new HttpError(422, "Bitte eine Stückzahl angeben.");
    if (!sec && !(p.amount > 0)) throw new HttpError(422, "Bitte einen Betrag angeben.");
    if (!sec && p.side === "buy" && pr.min_amount && p.amount < Number(pr.min_amount)) throw new HttpError(422, `Mindestanlage: ${pr.min_amount} ${pr.currency}.`);
    const { data: pf } = await db.from("portfolios").select("id").eq("customer_id", c.id).single();
    if (p.side === "sell") {
      const { data: held } = await db.from("portfolio_positions").select("quantity,amount").eq("portfolio_id", pf.id).eq("product_id", pr.id).eq("status", "open");
      const have = (held || []).reduce((a: number, x: any) => a + Number(sec ? x.quantity : x.amount), 0);
      if ((sec ? p.quantity : p.amount) > have) throw new HttpError(409, "Der Verkauf übersteigt Ihren Bestand.");
    }
    const price = p.side === "buy" ? (pr.buy_price ?? pr.market_price) : (pr.sell_price ?? pr.market_price);
    const shown = sec ? price : pr.interest_rate;
    const { data: existing } = await db.from("transactions").select("*").eq("idempotency_key", `${c.id}:${p.idempotency_key}`).maybeSingle();
    if (existing) return ok({ transaction: existing, duplicate: true });
    const estTotal = sec ? (price != null ? Math.round(p.quantity * Number(price) * 100) / 100 : 0) : p.amount;
    const disc = p.side === "buy" && p.discount_code ? await P.evaluateDiscount(p.discount_code, pr.category, estTotal) : null;
    const { data: tx, error } = await db.from("transactions").insert({
      customer_id: c.id, portfolio_id: pf.id, product_id: pr.id, side: p.side,
      quantity: sec ? p.quantity : 0, amount: sec ? (price != null ? Math.round(p.quantity * Number(price) * 100) / 100 : 0) : p.amount,
      displayed_price: shown, total: sec ? (price != null ? Math.round(p.quantity * Number(price) * 100) / 100 : null) : p.amount,
      discount_code: disc?.code ?? null, discount_amount: disc?.discount ?? 0,
      status: "submitted", origin: "kundenauftrag", idempotency_key: `${c.id}:${p.idempotency_key}`, created_by: cu.user.id,
    }).select("*").single();
    if (error) throw new HttpError(409, "Auftrag konnte nicht gespeichert werden.");
    if (disc) {
      const { data: dc } = await db.from("discount_codes").select("use_count").eq("id", disc.id).single();
      await db.from("discount_codes").update({ use_count: (dc?.use_count ?? 0) + 1 }).eq("id", disc.id);
    }
    await P.audit(actor, "transaction.submit", "transaction", tx.id, { customer_id: c.id, new: { side: p.side, product: pr.name, quantity: p.quantity, amount: p.amount, discount_code: disc?.code, discount: disc?.discount } });
    return ok({ transaction: tx }, 201);
  }

  if (m === "POST" && seg[0] === "orders" && seg[2] === "cancel") {
    const { data: upd } = await db.from("transactions").update({ status: "cancelled", status_reason: "Vom Kunden storniert", updated_at: new Date().toISOString() })
      .eq("id", seg[1]).eq("customer_id", c.id).in("status", ["draft", "submitted"]).select("id");
    if (!upd?.length) throw new HttpError(409, "Dieser Auftrag kann nicht mehr storniert werden.");
    await P.audit(actor, "transaction.cancel", "transaction", seg[1], { customer_id: c.id });
    return ok({ ok: true });
  }

  throw new HttpError(404, "Unbekannter Endpunkt.");
}

async function run(request: Request, params: { _splat?: string | undefined }) {
  const { json, HttpError } = await import("@/lib/panel.server");
  try { return await handle(request, params._splat || ""); }
  catch (e: any) {
    if (e instanceof HttpError) return json({ detail: e.message }, e.status);
    console.error("[kunde]", e?.message);
    return json({ detail: "Interner Fehler. Bitte erneut versuchen." }, 500);
  }
}

export const Route = createFileRoute("/api/kunde/$")({
  server: { handlers: { GET: ({ request, params }) => run(request, params), POST: ({ request, params }) => run(request, params) } },
});

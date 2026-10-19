// Nutzerbezogene Bereiche: Merkliste, Kursalarme, Aktienkatalog, Börsengang-Katalog und
// Zeichnungsanfragen. Personenbezogene Abfragen sind strikt auf die eigene user_id gefiltert;
// die Anmeldung wird serverseitig aus dem Sitzungs-Cookie geprüft, nie aus dem Browser.
import marketStocks from "@/data/public-snapshots/market-stocks.json";
import marketOverview from "@/data/public-snapshots/market-overview.json";

const PROVIDER: Record<string, string> = Object.fromEntries(
  [
    ...(marketOverview as any).indices,
    ...(marketOverview as any).commodities,
    ...(marketOverview as any).fx,
    ...(marketStocks as any).items,
  ]
    .filter((i: any) => i?.symbol && i?.provider_symbol)
    .map((i: any) => [String(i.symbol).toUpperCase(), i.provider_symbol]),
);

const SYM_RE = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const cleanSymbol = (s: unknown) => String(s ?? "").trim().toUpperCase();

type Ctx = {
  cu: any;
  h: Headers;
  db: any;
  json: (d: unknown, st?: number, h?: Headers) => Response;
  body: (r: Request) => Promise<any>;
};

async function ctx(req: Request): Promise<Ctx> {
  const { currentUser, admin } = await import("@/lib/authSession.server");
  const P = await import("@/lib/panel.server");
  const h = new Headers();
  const cu = await currentUser(req, h);
  const db = await admin();
  return { cu, h, db, json: P.json, body: P.body };
}

/** Kundenakte der angemeldeten Person (wird bei Bedarf nachgezogen). */
async function customerOf(c: Ctx) {
  if (!c.cu?.user?.id) return null;
  const { ensureProfile } = await import("@/lib/authSession.server");
  let { data: cust } = await c.db.from("customers").select("*").eq("user_id", c.cu.user.id).maybeSingle();
  if (!cust) {
    await ensureProfile(c.cu.user);
    ({ data: cust } = await c.db.from("customers").select("*").eq("user_id", c.cu.user.id).maybeSingle());
  }
  return cust ?? null;
}

/** Live-Kurs eines Symbols in EUR (USD wird umgerechnet); null, wenn nicht ermittelbar. */
async function quoteFor(symbol: string, fx: number | null) {
  const { yahooChart } = await import("@/lib/liveQuotes.server");
  const c = await yahooChart(PROVIDER[symbol] || symbol, "1d", "5m");
  if (!c) return null;
  const k = c.meta.currency === "USD" ? fx ?? 0 : 1;
  if (!k) return null;
  const price = Math.round(c.meta.price * k * 100) / 100;
  const prev = Math.round(c.meta.prev * k * 100) / 100;
  const pct = prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0;
  const last = c.points?.length ? (c.points[c.points.length - 1] as any) : null;
  return {
    price,
    currency: "EUR",
    previous_close: prev,
    change_abs: Math.round((price - prev) * 100) / 100,
    change_pct: pct,
    change_percent: pct,
    day_high: c.meta.high != null ? Math.round(c.meta.high * k * 100) / 100 : null,
    day_low: c.meta.low != null ? Math.round(c.meta.low * k * 100) / 100 : null,
    volume: last?.volume ?? null,
    as_of: c.meta.time ? new Date(c.meta.time * 1000).toISOString() : null,
    data_source: "live",
  };
}

const alertRow = (r: any) => ({
  id: r.id,
  symbol: r.symbol,
  direction: r.direction,
  target_price: Number(r.target_price),
  currency: r.currency ?? null,
  note: r.note ?? null,
  is_active: !!r.is_active,
  triggered_at: r.triggered_at ?? null,
  triggered_price: r.triggered_price != null ? Number(r.triggered_price) : null,
  triggered_count: Number(r.triggered_count || 0),
  cooldown_until: r.cooldown_until ?? null,
  created_at: r.created_at ?? null,
});

// ---------------------------------------------------------------------------
// Merkliste
// ---------------------------------------------------------------------------
async function watchlist(req: Request, path: string, c: Ctx): Promise<Response> {
  const { json, h, cu, db } = c;
  const m = req.method;
  const sub = path.replace("/api/watchlist", "") || "/";
  const fail = (st: number, msg: string) => json({ detail: msg }, st, h);

  if (m === "GET" && (sub === "/" || sub === "")) {
    if (!cu) return json({ items: [], count: 0 }, 200, h);
    const { data, error } = await db
      .from("user_watchlist")
      .select("*")
      .eq("user_id", cu.user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return fail(500, "Merkliste konnte nicht geladen werden.");
    const { liveUsdToEur } = await import("@/lib/liveQuotes.server");
    const fx = await liveUsdToEur();
    const items = await Promise.all(
      (data || []).map(async (r: any) => {
        const q = await quoteFor(r.symbol, fx);
        return {
          id: r.id,
          symbol: r.symbol,
          display_name: r.display_name || r.symbol,
          name: r.display_name || r.symbol,
          asset_type: r.asset_type || "stock",
          created_at: r.created_at,
          quote: q,
          ...(q || {}),
        };
      }),
    );
    return json({ items, count: items.length }, 200, h);
  }

  if (m === "GET" && sub === "/search") {
    const q = cleanSymbol(new URL(req.url).searchParams.get("q") || "");
    const limit = Math.min(20, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 12)));
    if (!q) return json({ items: [] }, 200, h);
    const { data } = await db
      .from("products")
      .select("id,name,issuer,ticker,isin,category,currency,market_price")
      .eq("status", "active")
      .eq("visibility", "global")
      .in("category", ["aktie", "anleihe", "ipo"])
      .limit(200);
    const needle = q.replace(/[^A-Z0-9]/g, "");
    const items = (data || [])
      .filter((p: any) => {
        const sym = cleanSymbol(p.ticker || p.isin || p.name);
        return sym.includes(needle) || cleanSymbol(p.name).includes(needle) || cleanSymbol(p.issuer).includes(needle);
      })
      .slice(0, limit)
      .map((p: any) => ({
        symbol: p.ticker || p.isin || p.name,
        display_name: p.issuer || p.name,
        name: p.issuer || p.name,
        asset_type: p.category === "aktie" ? "stock" : p.category === "anleihe" ? "bond" : "ipo",
        currency: p.currency || "EUR",
        price: p.market_price != null ? Number(p.market_price) : null,
      }));
    return json({ items, count: items.length }, 200, h);
  }

  if (m === "POST" && (sub === "/" || sub === "")) {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const b = await c.body(req);
    const symbol = cleanSymbol(b.symbol);
    if (!SYM_RE.test(symbol)) return fail(422, "Ungültiges Wertpapier-Kürzel.");
    const { data: dup } = await db
      .from("user_watchlist")
      .select("*")
      .eq("user_id", cu.user.id)
      .eq("symbol", symbol)
      .maybeSingle();
    if (dup) return json({ ...dup, already_in_list: true }, 200, h);
    const { data, error } = await db
      .from("user_watchlist")
      .insert({
        user_id: cu.user.id,
        symbol,
        display_name: String(b.display_name || b.name || symbol).slice(0, 120),
        asset_type: String(b.asset_type || "stock").slice(0, 20),
      })
      .select("*")
      .single();
    if (error) return fail(409, "Wert konnte nicht zur Merkliste hinzugefügt werden.");
    return json(data, 201, h);
  }

  if (m === "PUT" && sub === "/order") {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const b = await c.body(req);
    const symbols = Array.isArray(b?.symbols) ? b.symbols.map(cleanSymbol).filter((s: string) => SYM_RE.test(s)) : [];
    if (!symbols.length) return fail(422, "Keine neue Reihenfolge übertragen.");
    for (let i = 0; i < symbols.length; i++) {
      await db.from("user_watchlist").update({ position: i }).eq("user_id", cu.user.id).eq("symbol", symbols[i]);
    }
    return json({ ok: true, count: symbols.length }, 200, h);
  }

  if (m === "DELETE" && sub.length > 1) {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const symbol = cleanSymbol(decodeURIComponent(sub.slice(1)));
    if (!SYM_RE.test(symbol)) return fail(422, "Ungültiges Wertpapier-Kürzel.");
    const { data, error } = await db
      .from("user_watchlist")
      .delete()
      .eq("user_id", cu.user.id)
      .eq("symbol", symbol)
      .select("id");
    if (error) return fail(409, "Wert konnte nicht aus der Merkliste entfernt werden.");
    if (!data?.length) return fail(404, "Dieser Wert steht nicht auf Ihrer Merkliste.");
    return json({ ok: true, symbol }, 200, h);
  }

  return fail(404, "Unbekannter Merkliste-Endpunkt.");
}

// ---------------------------------------------------------------------------
// Kursalarme
// ---------------------------------------------------------------------------
async function alerts(req: Request, path: string, c: Ctx): Promise<Response> {
  const { json, h, cu, db } = c;
  const m = req.method;
  const sub = path.replace("/api/alerts", "") || "/";
  const fail = (st: number, msg: string) => json({ detail: msg }, st, h);

  if (m === "GET" && (sub === "/" || sub === "")) {
    if (!cu) return json({ items: [], count: 0 }, 200, h);
    const { data, error } = await db
      .from("price_alerts")
      .select("*")
      .eq("user_id", cu.user.id)
      .order("created_at", { ascending: false });
    if (error) return fail(500, "Alarme konnten nicht geladen werden.");
    const items = (data || []).map(alertRow);
    return json({ items, count: items.length, active: items.filter((i: any) => i.is_active).length }, 200, h);
  }

  if (m === "POST" && sub === "/check") {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const { data, error } = await db
      .from("price_alerts")
      .select("*")
      .eq("user_id", cu.user.id)
      .eq("is_active", true);
    if (error) return fail(500, "Alarme konnten nicht geprüft werden.");
    const { liveUsdToEur } = await import("@/lib/liveQuotes.server");
    const fx = await liveUsdToEur();
    const triggered: any[] = [];
    for (const a of data || []) {
      const q = await quoteFor(a.symbol, fx);
      if (!q) continue;
      const hit = a.direction === "above" ? q.price >= Number(a.target_price) : q.price <= Number(a.target_price);
      if (!hit) continue;
      await db
        .from("price_alerts")
        .update({
          is_active: false,
          triggered_at: new Date().toISOString(),
          triggered_price: q.price,
          triggered_count: Number(a.triggered_count || 0) + 1,
        })
        .eq("id", a.id)
        .eq("user_id", cu.user.id);
      triggered.push({ ...alertRow(a), triggered_price: q.price, current_price: q.price });
    }
    return json(
      { triggered, checked: (data || []).length, triggered_count: triggered.length, mails_sent: 0 },
      200,
      h,
    );
  }

  if (m === "POST" && (sub === "/" || sub === "")) {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const b = await c.body(req);
    const symbol = cleanSymbol(b?.symbol);
    const direction = String(b?.direction || "above").toLowerCase();
    const target = Number(b?.target_price ?? b?.targetPrice);
    if (!SYM_RE.test(symbol)) return fail(422, "Ungültiges Wertpapier-Kürzel.");
    if (!["above", "below"].includes(direction)) return fail(422, "Richtung muss „oberhalb“ oder „unterhalb“ sein.");
    if (!Number.isFinite(target) || target <= 0) return fail(422, "Bitte einen Zielkurs über 0 angeben.");
    const { count } = await db
      .from("price_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", cu.user.id)
      .eq("is_active", true);
    if (Number(count || 0) >= 25) return fail(409, "Sie haben bereits 25 aktive Alarme. Bitte zuerst alte löschen.");
    const { data, error } = await db
      .from("price_alerts")
      .insert({
        user_id: cu.user.id,
        symbol,
        direction,
        target_price: Math.round(target * 10000) / 10000,
        currency: String(b?.currency || "EUR").slice(0, 5),
        note: b?.note ? String(b.note).slice(0, 300) : null,
      })
      .select("*")
      .single();
    if (error) return fail(409, "Alarm konnte nicht angelegt werden.");
    return json(alertRow(data), 201, h);
  }

  const id = sub.slice(1);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (m === "PATCH" && isUuid) {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const b = await c.body(req);
    const patch: Record<string, unknown> = {};
    if (b?.is_active !== undefined) patch["is_active"] = !!b.is_active;
    if (b?.target_price !== undefined) {
      const t = Number(b.target_price);
      if (!Number.isFinite(t) || t <= 0) return fail(422, "Bitte einen Zielkurs über 0 angeben.");
      patch["target_price"] = Math.round(t * 10000) / 10000;
    }
    if (b?.direction !== undefined) {
      const d = String(b.direction).toLowerCase();
      if (!["above", "below"].includes(d)) return fail(422, "Richtung muss „oberhalb“ oder „unterhalb“ sein.");
      patch["direction"] = d;
    }
    if (b?.note !== undefined) patch["note"] = String(b.note).slice(0, 300);
    if (!Object.keys(patch).length) return fail(422, "Keine Änderung übertragen.");
    if (patch["is_active"] === true) {
      patch["triggered_at"] = null;
      patch["triggered_price"] = null;
    }
    const { data, error } = await db
      .from("price_alerts")
      .update(patch)
      .eq("id", id)
      .eq("user_id", cu.user.id)
      .select("*")
      .maybeSingle();
    if (error) return fail(409, "Alarm konnte nicht geändert werden.");
    if (!data) return fail(404, "Diesen Alarm gibt es nicht.");
    return json(alertRow(data), 200, h);
  }

  if (m === "DELETE" && isUuid) {
    if (!cu) return fail(401, "Bitte zuerst anmelden.");
    const { data, error } = await db
      .from("price_alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", cu.user.id)
      .select("id");
    if (error) return fail(409, "Alarm konnte nicht gelöscht werden.");
    if (!data?.length) return fail(404, "Diesen Alarm gibt es nicht.");
    return json({ ok: true }, 200, h);
  }

  return fail(404, "Unbekannter Alarm-Endpunkt.");
}

// ---------------------------------------------------------------------------
// Öffentliche Kataloge
// ---------------------------------------------------------------------------
async function stockCatalog(req: Request, c: Ctx): Promise<Response> {
  const { json, h, db } = c;
  const withQuotes = new URL(req.url).searchParams.get("with_quotes") !== "false";
  const { data } = await db
    .from("products")
    .select("id,name,issuer,ticker,isin,currency,market_price,market_price_at,buy_price,sell_price,min_amount,conditions")
    .eq("category", "aktie")
    .eq("status", "active")
    .eq("visibility", "global")
    .order("name");
  let rows: any[] = (data || []).map((p: any) => ({
    id: p.id,
    symbol: p.ticker || p.isin || p.name,
    name: p.issuer || p.name,
    isin: p.isin || null,
    currency: p.currency || "EUR",
    price: p.market_price != null ? Number(p.market_price) : null,
    previous_close: p.market_price != null ? Number(p.market_price) : null,
    change_abs: 0,
    change_pct: 0,
    day_high: null,
    day_low: null,
    volume: null,
    exchange: null,
    sector: null,
    min_amount: p.min_amount != null ? Number(p.min_amount) : null,
    conditions: p.conditions || null,
    data_source: p.market_price_source || "manuell",
    as_of: p.market_price_at || null,
  }));
  if (!rows.length) {
    rows = (marketStocks as any).items.map((i: any) => ({
      symbol: i.symbol,
      name: i.name,
      isin: null,
      currency: i.currency || "EUR",
      price: i.price,
      previous_close: i.previous_close ?? i.price,
      change_abs: i.change ?? 0,
      change_pct: i.change_percent ?? 0,
      day_high: null,
      day_low: null,
      volume: null,
      exchange: null,
      sector: null,
      data_source: i.data_source || "cache",
      as_of: i.as_of || null,
    }));
  }
  if (withQuotes) {
    const { liveUsdToEur } = await import("@/lib/liveQuotes.server");
    const fx = await liveUsdToEur();
    rows = await Promise.all(
      rows.map(async (r) => {
        const q = await quoteFor(String(r.symbol).toUpperCase(), fx);
        return q ? { ...r, ...q } : r;
      }),
    );
  }
  return json({ items: rows, count: rows.length, last_updated: new Date().toISOString(), is_delayed: true }, 200, h);
}

async function ipoCatalog(c: Ctx): Promise<Response> {
  const { json, h, db } = c;
  const { data } = await db
    .from("products")
    .select("*")
    .eq("category", "ipo")
    .eq("status", "active")
    .eq("visibility", "global")
    .order("name");
  const items = (data || []).map((p: any) => {
    const price = p.market_price != null ? Number(p.market_price) : null;
    return {
      id: p.id,
      company_name: p.issuer || String(p.name).split(" – ")[0],
      ticker_proposed: p.ticker || null,
      price_currency: p.currency || "EUR",
      price_range_low: price,
      price_range_high: price,
      min_investment_eur: p.min_amount != null ? Number(p.min_amount) : null,
      lot_size: 1,
      status: "open",
      isin: p.isin || null,
      exchange: null,
      market: "Vorbörsliche Zeichnung",
      ipo_date: null,
      expected_ipo_window: p.ipo_date_label || "Noch kein Termin angekündigt",
      valuation_last_private: p.market_cap != null ? Number(p.market_cap) : null,
      conditions: p.conditions || null,
      subscription_end: p.maturity_date || null,
      display_order: 0,
    };
  });
  return json(items, 200, h);
}

/** Zeichnungsanfrage aus dem Börsengang-Bereich: wird wie ein Kundenauftrag behandelt. */
async function ipoRequest(req: Request, c: Ctx): Promise<Response> {
  const { json, h, cu, db } = c;
  const fail = (st: number, msg: string) => json({ detail: msg }, st, h);
  if (req.method !== "POST") return fail(405, "Dieser Endpunkt nimmt Anfragen entgegen.");
  if (!cu) return fail(401, "Bitte zuerst anmelden.");
  const cust = await customerOf(c);
  if (!cust) return fail(404, "Für dieses Konto gibt es keine Kundenakte.");
  const P = await import("@/lib/panel.server");
  if (!(await P.canTrade(cust.id))) return fail(403, "Zeichnungen sind erst nach erfolgreicher Verifizierung möglich.");
  const b = await c.body(req);
  const ipoId = String(b?.ipo_id || "");
  const amount = Number(b?.amount_eur ?? b?.amount ?? 0);
  if (!/^[0-9a-f-]{36}$/i.test(ipoId)) return fail(422, "Ungültiger Börsengang.");
  if (!Number.isFinite(amount) || amount <= 0) return fail(422, "Bitte einen Zeichnungsbetrag über 0 angeben.");
  const { data: pr } = await db.from("products").select("*").eq("id", ipoId).eq("status", "active").maybeSingle();
  if (!pr || pr.category !== "ipo") return fail(404, "Dieser Börsengang ist nicht verfügbar.");
  if (pr.visibility === "assigned") {
    const { data: a } = await db
      .from("product_assignments")
      .select("product_id")
      .eq("product_id", pr.id)
      .eq("customer_id", cust.id)
      .maybeSingle();
    if (!a) return fail(403, "Dieser Börsengang ist für Sie nicht freigegeben.");
  }
  if (pr.min_amount && amount < Number(pr.min_amount)) return fail(422, `Mindestzeichnung: ${pr.min_amount} ${pr.currency}.`);
  const { data: pf } = await db.from("portfolios").select("id").eq("customer_id", cust.id).single();
  if (!pf) return fail(404, "Für dieses Konto gibt es kein Depot.");
  const price = pr.buy_price ?? pr.market_price;
  const key = `ipo:${cu.user.id}:${ipoId}:${Date.now()}`;
  const { data: tx, error } = await db
    .from("transactions")
    .insert({
      customer_id: cust.id,
      portfolio_id: pf.id,
      product_id: pr.id,
      side: "buy",
      quantity: price ? Math.round((amount / Number(price)) * 1000000) / 1000000 : 0,
      amount: Math.round(amount * 100) / 100,
      displayed_price: price != null ? Number(price) : null,
      total: Math.round(amount * 100) / 100,
      status: "submitted",
      origin: "kundenauftrag",
      idempotency_key: key,
      created_by: cu.user.id,
      customer_note: String(b?.notes || "Zeichnungsanfrage").slice(0, 500),
    })
    .select("*")
    .single();
  if (error) return fail(409, "Zeichnungsanfrage konnte nicht gespeichert werden.");
  await P.audit(
    { id: cu.user.id, email: cu.user.email ?? "" },
    "ipo.request.submit",
    "transaction",
    tx.id,
    { customer_id: cust.id, new: { product: pr.name, amount } },
  );
  return json({ request: tx, transaction: tx, id: tx.id }, 201, h);
}

/** Gemeinsamer Einstiegspunkt für alle hier betreuten Endpunkte. */
export async function handleUserLists(req: Request, path: string): Promise<Response | null> {
  if (!/^\/api\/(watchlist|alerts|stocks\/catalog|ipo\/catalog|ipo\/requests)(\/|$|\?)/.test(path)) return null;
  const c = await ctx(req);
  if (path === "/api/watchlist" || path.startsWith("/api/watchlist/")) return watchlist(req, path, c);
  if (path === "/api/alerts" || path.startsWith("/api/alerts/")) return alerts(req, path, c);
  if (path === "/api/stocks/catalog") return stockCatalog(req, c);
  if (path === "/api/ipo/catalog") return ipoCatalog(c);
  if (path === "/api/ipo/requests") return ipoRequest(req, c);
  return null;
}

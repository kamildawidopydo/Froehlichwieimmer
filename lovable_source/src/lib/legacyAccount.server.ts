// Kundendepot-/Admin-Endpunkte der alten Oberfläche, beantwortet aus den echten Panel-Tabellen
// (customers, portfolios, portfolio_positions, transactions). Ohne Datenquelle: leere Liste statt 503.
import { admin, currentUser } from "@/lib/authSession.server";
import { valuePosition } from "@/lib/panel.server";

const EMPTY_LIST_PATHS = [
  /^\/api\/stock-notifications$/, /^\/api\/stock-alerts$/, /^\/api\/alerts\/check$/, /^\/api\/support\/tickets$/,
  /^\/api\/portfolio\/watchlist$/, /^\/api\/admin\/support\/tickets$/,
  /^\/api\/portfolio\/snapshots$/, /^\/api\/bonds\/requests\/me$/, /^\/api\/ipo\/requests\/me$/,
];
const HANDLED = /^\/api\/(portfolio\/(cash|orders|stock-positions|watchlist|bond-positions|snapshots|summary)|bonds\/requests\/me|ipo\/requests\/me|stock-notifications|stock-alerts|alerts\/check|support\/tickets|admin\/notifications\/counts|admin\/support\/tickets)$/;

export function isLegacyAccountPath(path: string) {
  return HANDLED.test(path);
}

const PENDING = ["submitted", "in_review", "accepted"];

export async function handleLegacyAccount(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const h = new Headers();
  const json = (body: unknown, status = 200) => {
    h.set("content-type", "application/json");
    return new Response(JSON.stringify(body), { status, headers: h });
  };
  const auth = await currentUser(request, h);
  if (!auth) return json({ detail: "Nicht angemeldet" }, 401);
  const db = await admin();

  if (path.startsWith("/api/admin/")) {
    const { data: roles } = await db.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (!(roles || []).some((r: { role: string }) => r.role === "admin" || r.role === "moderator")) return json({ detail: "Keine Berechtigung" }, 403);
    if (path === "/api/admin/notifications/counts") {
      const [orders, kyc] = await Promise.all([
        db.from("transactions").select("id", { count: "exact", head: true }).in("status", PENDING),
        db.from("customers").select("id", { count: "exact", head: true }).in("kyc_status", ["documents_submitted", "review_pending"]),
      ]);
      return json({ counts: { pending_orders: orders.count ?? 0, pending_kyc: kyc.count ?? 0, pending_support: 0 } });
    }
    return json([]);
  }

  if (EMPTY_LIST_PATHS.some((r) => r.test(path))) return json([]);

  const { data: cust } = await db.from("customers").select("id").eq("user_id", auth.user.id).maybeSingle();
  const { data: pf } = cust ? await db.from("portfolios").select("id,cash_balance,currency").eq("customer_id", cust.id).maybeSingle() : { data: null };

  if (path === "/api/portfolio/cash") {
    const cash = Number(pf?.cash_balance ?? 0);
    const limit = Math.max(0, Math.min(200, Number(url.searchParams.get("history_limit")) || 0));
    let history: unknown[] = [];
    if (pf && limit) {
      const { data } = await db.from("transactions").select("id,tx_no,side,total,status,executed_at,created_at").eq("portfolio_id", pf.id).eq("status", "executed").order("executed_at", { ascending: false }).limit(limit);
      history = (data || []).map((t: any) => ({ id: t.id, reference: t.tx_no, type: t.side === "buy" ? "buy" : "sell", amount: t.side === "buy" ? -Number(t.total) : Number(t.total), created_at: t.executed_at || t.created_at }));
    }
    return json({ cash_balance: cash, cash_available: cash, cash_unsettled: 0, buying_power: cash, currency: pf?.currency ?? "EUR", settlements: [], history });
  }

  if (path === "/api/portfolio/summary") {
    const cash = Number(pf?.cash_balance ?? 0);
    let invested = 0;
    if (pf) {
      const { data } = await db.from("portfolio_positions").select("amount").eq("portfolio_id", pf.id).eq("status", "open");
      invested = (data || []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    }
    return json({ cash_balance: cash, invested_value: invested, total_value: cash + invested, currency: pf?.currency ?? "EUR", positions_count: 0 });
  }

  if (!pf) return json([]);

  if (path === "/api/portfolio/orders") {
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 50));
    const { data } = await db.from("transactions").select("*, products(name,ticker,isin)").eq("portfolio_id", pf.id).order("created_at", { ascending: false }).limit(limit);
    return json((data || []).map((t: any) => ({
      id: t.id, order_no: t.tx_no, side: t.side, status: t.status, quantity: Number(t.quantity),
      symbol: t.products?.ticker ?? null, name: t.products?.name ?? null, isin: t.products?.isin ?? null,
      price: Number(t.executed_price ?? t.displayed_price ?? 0), total: Number(t.total ?? 0), fees: Number(t.fees ?? 0),
      created_at: t.created_at, executed_at: t.executed_at,
    })));
  }

  // Anleihe-Positionen des Depots in das Legacy-Format der Kundenseiten überführen
  if (path === "/api/portfolio/bond-positions") {
    const { data: bonds } = await db
      .from("portfolio_positions")
      .select("*, products(name,ticker,isin,category,market_price,nominal_value,coupon_rate,maturity_date)")
      .eq("portfolio_id", pf.id)
      .eq("status", "open");
    const anleiheRows = (bonds || []).filter((p: any) => p.products?.category === "anleihe");
    return json(anleiheRows.map((p: any) => {
      const nominal = Number(p.quantity ?? 0) * Number(p.products?.nominal_value ?? 100);
      const kaufkurs = Number(p.unit_price ?? 0);
      return {
        id: p.id,
        isin: p.products?.isin ?? null,
        bond_name: p.products?.name ?? null,
        nominal_betrag: nominal,
        aktueller_kurs: Number(p.products?.market_price ?? kaufkurs ?? 0),
        kaufkurs,
        kupon_rate: p.products?.coupon_rate ?? null,
        maturity_date: p.products?.maturity_date ?? null,
        kaufdatum: p.purchase_date ?? null,
        currency: p.currency ?? "EUR",
        is_active: true,
        created_at: p.created_at,
      };
    }));
  }

  // Aktien- und IPO-Positionen: Legacy-Felder (avg_cost, stocks) + Live-Kurs via Yahoo
  const { data } = await db.from("portfolio_positions").select("*, products(name,ticker,isin,category,market_price)").eq("portfolio_id", pf.id).eq("status", "open");
  let rows: any[] = (data || [])
    .filter((p: any) => ["aktie", "ipo"].includes(p.products?.category))
    .map((p: any) => {
      const symbol = p.products?.ticker ?? null;
      const avg = Number(p.unit_price ?? 0);
      const ipo = p.products?.category === "ipo";
      const fallback = ipo ? (p.current_price ?? p.products?.market_price ?? null) : Number(p.products?.market_price ?? avg ?? 0);
      return {
        id: p.id, symbol, name: p.products?.name ?? null, isin: p.products?.isin ?? null,
        category: p.products?.category ?? null, quantity: Number(p.quantity ?? 0),
        avg_price: avg, avg_cost: avg, current_price: fallback, price: fallback,
        ...(ipo ? valuePosition(p, p.products) : {}),
        currency: p.currency ?? "EUR", display_currency: "EUR",
        purchase_date: p.purchase_date ?? null,
        stocks: { name: p.products?.name ?? null, ticker: symbol, isin: p.products?.isin ?? null, logo_url: null, exchange: null, market: null, is_active: true },
      };
    });
  let fx: number | null = null;
  try {
    const { liveInstrument, liveUsdToEur } = await import("@/lib/liveQuotes.server");
    fx = await liveUsdToEur();
    rows = await Promise.all(rows.map((r: any) => (r.symbol && r.category !== "ipo" ? liveInstrument(r, fx) : r)));
  } catch {
    // Snapshot-/Produktpreise bleiben als Fallback erhalten
  }
  return json(rows.map((r: any) => ({
    ...r,
    current_price: r.price ?? r.current_price,
    change_abs: r.change ?? null,
  })));
}

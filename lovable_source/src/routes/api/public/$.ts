import { createFileRoute } from "@tanstack/react-router";
import { loadSavingsQueries } from "@/lib/publicDb.server";
import creditOffers from "@/data/public-snapshots/credit-offers.json";

// Port von backend/routes/public_reads.py — echte Daten aus Lovable Cloud.
const json = (d: unknown, status = 200) => Response.json(d, { status });

async function handle(path: string, search: string) {
  const p = new URLSearchParams(search);
  const parts = path.split("/").filter(Boolean);

  if (path === "savings-offers") {
    const { q } = await loadSavingsQueries();
    return json(q.querySavingsOffersFromSearch(search));
  }
  if (path === "savings-offers/facets") {
    const { q } = await loadSavingsQueries();
    return json(q.savingsOfferFacets({ productType: p.get("product_type") || null }));
  }
  if (parts[0] === "savings-offers" && parts[2] === "rate-history") {
    return json({ items: [], count: 0, detail: "DATA_SOURCE_MISSING" });
  }
  if (path === "partner-banks") {
    const { q } = await loadSavingsQueries();
    const items = q.listPartnerBanks();
    return json({ items, count: items.length });
  }
  if (path === "countries") {
    const { q } = await loadSavingsQueries();
    return json({ items: q.COUNTRIES, count: q.COUNTRIES.length });
  }
  if (path === "banks") {
    const { q, offers } = await loadSavingsQueries();
    const counts = new Map<string, number>();
    for (const o of offers as Array<{ bank_slug?: string; is_active?: boolean }>) {
      if (o.is_active === false || !o.bank_slug) continue;
      counts.set(o.bank_slug, (counts.get(o.bank_slug) || 0) + 1);
    }
    const items = q.listPartnerBanks().map((b: { slug: string }) => ({ ...b, offer_count: counts.get(b.slug) || 0 }));
    return json({ items, count: items.length });
  }
  if (parts[0] === "banks" && parts[1]) {
    const slug = decodeURIComponent(parts[1]);
    const { q, banks } = await loadSavingsQueries((o) => o["bank_slug"] === slug);
    const bank = (banks as Array<{ slug: string; is_active?: boolean }>).find((b) => b.slug === slug);
    if (!bank || bank.is_active === false) return json({ bank: null, offers: [], count: 0 });
    const res = q.querySavingsOffers({ sort: "rate", limit: 1000 });
    const list = res.items ?? res.offers ?? res;
    return json({ bank: q.serializeBank(bank), offers: list, count: Array.isArray(list) ? list.length : 0 });
  }
  if (path === "credit-offers") {
    type CO = any;
    const amount = p.get("amount") ? Number(p.get("amount")) : null;
    const term = p.get("term_months") ? Number(p.get("term_months")) : null;
    const purpose = p.get("purpose");
    const sort = p.get("sort") || "effective_rate_asc";
    const includeDemo = p.get("include_demo") === "true";
    const inRange = (v: number | null, min: unknown, max: unknown) =>
      v == null || ((min == null || Number(min) <= v) && (max == null || Number(max) >= v));
    const items = (creditOffers.items as CO[])
      .filter((o) => o.is_active !== false && (includeDemo || !o.is_demo))
      .filter((o) => inRange(amount, o.min_amount_eur, o.max_amount_eur))
      .filter((o) => inRange(term, o.min_term_months, o.max_term_months))
      .filter((o) => {
        if (!purpose) return true;
        const ps: string[] = o.purposes?.length ? o.purposes : o.purpose ? [o.purpose] : [];
        return ps.includes(purpose) || ps.includes("Freie Verwendung");
      })
      .map((o): any => ({
        ...o,
        id: o._id,
        data_status: o.is_demo ? "demo" : o.source_id && o.source_url && o.verified_at && o.verification_method ? "verified" : "unverified",
        credit_offer_product_information: [],
        credit_offer_acceptance_guidelines: [],
      }));
    const [field, dir] =
      sort === "effective_rate_desc" ? ["effective_rate_from", -1]
      : sort === "monthly_rate_asc" ? ["monthly_rate_from", 1]
      : ["effective_rate_from", 1];
    items.sort((a, b) => ((Number(a[field as string] ?? 1e9) - Number(b[field as string] ?? 1e9)) * (dir as number)));
    return json({ items, count: items.length, sort, filters: { amount, term_months: term, purpose, include_demo: includeDemo } });
  }
  if (path === "home-stats") {
    const { banks, offers } = await loadSavingsQueries();
    const active = (a: Array<{ is_active?: boolean }>) => a.filter((x) => x.is_active !== false).length;
    return json({
      stats: { users_count: null, applications_count: null, partner_banks_count: active(banks), savings_offers_count: active(offers) },
      generated_at: new Date().toISOString(),
    });
  }
  return json({ detail: "DATA_SOURCE_UNAVAILABLE", message: "Dieser Dienst wird gerade eingerichtet." }, 503);
}

export const Route = createFileRoute("/api/public/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          return await handle((params as { _splat?: string })._splat ?? "", new URL(request.url).search);
        } catch (e) {
          console.error(e);
          return json({ detail: "DATA_SOURCE_UNAVAILABLE" }, 503);
        }
      },
    },
  },
});

import { createClient } from "@supabase/supabase-js";
// @ts-expect-error JS module
import { createSavingsQueries } from "@/lib/savingsQueries";

/** Anonymer Server-Client für öffentliche Lesezugriffe (RLS: nur Lesen). */
export function publicDb() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key!);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function all(table: "banks" | "savings_offers" | "countries") {
  const cols = table === "countries" ? "doc" : "doc,is_active";
  const { data, error } = await (publicDb() as any).from(table).select(cols).range(0, 4999);
  if (error) throw error;
  return (data ?? []).map((r: { doc: Record<string, unknown>; is_active?: boolean }) => ({
    ...r.doc,
    ...(r.is_active === false ? { is_active: false } : {}),
  }));
}

export async function loadSavingsQueries(filter?: (o: Record<string, unknown>) => boolean) {
  const [banks, offers, countries] = await Promise.all([all("banks"), all("savings_offers"), all("countries")]);
  return {
    banks,
    offers,
    countries,
    q: createSavingsQueries(banks, filter ? offers.filter(filter) : offers, countries),
  };
}

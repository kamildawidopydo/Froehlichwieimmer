import { createFileRoute } from "@tanstack/react-router";

// Zeitgesteuerter Abruf aktueller Nachrichten (pg_cron). Der Aufrufer muss den
// serverseitig gespeicherten Zufallsschlüssel aus news_sync_state mitsenden,
// der für Besucher nicht lesbar ist.
export const Route = createFileRoute("/api/public/hooks/news-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await (supabaseAdmin as any).from("news_sync_state").select("cron_token").eq("id", 1).maybeSingle();
        const expected = data?.cron_token as string | undefined;
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const d = (v: string) => createHash("sha256").update(v, "utf8").digest();
        if (!expected || !timingSafeEqual(d(token), d(expected))) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const { runNewsSync } = await import("@/lib/news/liveNews.server");
          return Response.json(await runNewsSync());
        } catch (e) {
          console.error("news-sync", e);
          return Response.json({ ok: false, error: String((e as Error)?.message || e) }, { status: 500 });
        }
      },
    },
  },
});

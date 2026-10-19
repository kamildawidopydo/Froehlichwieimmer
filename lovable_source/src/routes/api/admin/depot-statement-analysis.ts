import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Finanzberater (Admins) laden einen Depotauszug hoch; Lovable AI fasst Positionen
// und Vermögensaufteilung zusammen. Nichts wird gespeichert.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const Body = z.union([
  z.object({ text: z.string().trim().min(20, "Bitte mehr Text einfügen.").max(200_000) }),
  z.object({
    file_base64: z.string().min(10).max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 16),
    media_type: z.enum(ALLOWED as [string, ...string[]]),
    filename: z.string().trim().min(1).max(200),
  }),
]);

const json = (d: unknown, status = 200, headers?: Headers) => {
  const h = headers ?? new Headers();
  h.set("content-type", "application/json");
  return new Response(JSON.stringify(d), { status, headers: h });
};

export const Route = createFileRoute("/api/admin/depot-statement-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { currentUser, admin } = await import("@/lib/authSession.server");
        const h = new Headers();
        const cu = await currentUser(request, h);
        if (!cu) return json({ detail: "Nicht angemeldet." }, 401, h);
        const db = await admin();
        const { data: roles } = await db.from("user_roles").select("role").eq("user_id", cu.user.id);
        if (!(roles || []).some((r: { role: string }) => r.role === "admin")) {
          return json({ detail: "Nur für Finanzberater freigegeben." }, 403, h);
        }

        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ detail: "Ungültige Anfrage." }, 400, h); }
        const p = Body.safeParse(raw);
        if (!p.success) return json({ detail: p.error.issues[0]?.message ?? "Ungültige Eingabe." }, 422, h);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ detail: "KI ist nicht eingerichtet." }, 500, h);

        const { analyzeDepotStatement } = await import("@/lib/ai/depotStatementAnalysis.server");
        const input = "text" in p.data
          ? { kind: "text" as const, text: p.data.text }
          : { kind: "file" as const, base64: p.data.file_base64, mediaType: p.data.media_type, filename: p.data.filename };
        const res = await analyzeDepotStatement(request, input, apiKey);
        if (!res.ok) return json({ detail: res.detail }, res.status, h);
        if (res.runId) h.set("X-Lovable-AIG-Run-ID", res.runId);
        return json({ analysis: res.analysis }, 200, h);
      },
    },
  },
});

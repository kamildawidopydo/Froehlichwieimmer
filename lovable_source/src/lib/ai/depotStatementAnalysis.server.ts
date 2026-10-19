import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError, type ModelMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export const AnalysisSchema = z.object({
  depot_holder: z.string().nullable(),
  statement_date: z.string().nullable(),
  currency: z.string(),
  total_value: z.number().nullable(),
  summary: z.string(),
  positions: z.array(
    z.object({
      name: z.string(),
      isin: z.string().nullable(),
      asset_class: z.string(),
      quantity: z.number().nullable(),
      market_value: z.number().nullable(),
      weight_percent: z.number().nullable(),
    }),
  ),
  allocation: z.array(
    z.object({
      category: z.string(),
      value: z.number().nullable(),
      percent: z.number(),
    }),
  ),
  observations: z.array(z.string()),
  data_quality_notes: z.array(z.string()),
});
export type DepotAnalysis = z.infer<typeof AnalysisSchema>;

const INSTRUCTIONS = `Du bist ein sorgfältiger Assistent für Finanzberater in Deutschland.
Du erhältst einen Depotauszug (Text, PDF oder Bild). Extrahiere ausschließlich Daten, die im Dokument stehen – erfinde nichts.
- positions: jede Wertpapier-/Kontoposition. asset_class auf Deutsch, eine von: Aktien, Anleihen, Fonds, ETF, Geldmarkt/Liquidität, Rohstoffe, Immobilien, Derivate, Sonstiges.
- Fehlende Werte als null. Zahlen als reine Zahlen (Punkt als Dezimaltrenner, keine Tausendertrennzeichen).
- allocation: Vermögensaufteilung nach Anlageklasse; percent summiert sich auf ca. 100.
- summary: 3–5 Sätze auf Deutsch, sachlich, für den Berater.
- observations: höchstens 5 kurze Hinweise (z. B. Klumpenrisiken, hohe Liquidität, Währungsrisiken). Keine Anlageempfehlung.
- data_quality_notes: Unklarheiten oder unlesbare Stellen; leer, wenn alles eindeutig ist.
Wenn das Dokument kein Depotauszug ist, gib leere Listen zurück und erkläre das in summary.`;

export type StatementInput =
  | { kind: "text"; text: string }
  | { kind: "file"; base64: string; mediaType: string; filename: string };

export async function analyzeDepotStatement(request: Request, input: StatementInput, apiKey: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const content: Extract<ModelMessage, { role: "user" }>["content"] =
    input.kind === "text"
      ? [{ type: "text", text: `Depotauszug:\n\n${input.text}` }]
      : [
          { type: "text", text: `Depotauszug als Datei (${input.filename}). Bitte auswerten.` },
          input.mediaType.startsWith("image/")
            ? { type: "image", image: input.base64, mediaType: input.mediaType }
            : { type: "file", data: input.base64, mediaType: input.mediaType, filename: input.filename },
        ];

  const result = streamText({
    model: provider.responses(MODEL),
    system: INSTRUCTIONS,
    messages: [{ role: "user", content }],
    output: Output.object({ schema: AnalysisSchema }),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const output = await result.output;
    return { ok: true as const, analysis: AnalysisSchema.parse(output), runId: runIdFetch.getRunId() };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false as const, status: 502, detail: "Die KI-Antwort konnte nicht gelesen werden. Bitte erneut versuchen." };
    }
    const status = Number((error as { statusCode?: number })?.statusCode) || 500;
    const msg = String((error as { message?: string })?.message || "");
    if (status === 402) return { ok: false as const, status, detail: "Das KI-Guthaben ist aufgebraucht. Bitte Guthaben unter Einstellungen → Plans & credits aufladen." };
    if (status === 429) return { ok: false as const, status, detail: "Zu viele Anfragen. Bitte in einer Minute erneut versuchen." };
    if (status === 403) return { ok: false as const, status, detail: msg || "Zugriff auf die KI wurde verweigert." };
    if (status === 400) return { ok: false as const, status, detail: "Die Datei konnte nicht verarbeitet werden. Bitte PDF, Bild oder Text verwenden." };
    return { ok: false as const, status: status >= 400 && status < 600 ? status : 500, detail: "Die Auswertung ist fehlgeschlagen. Bitte später erneut versuchen." };
  }
}

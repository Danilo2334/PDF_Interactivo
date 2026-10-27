import "server-only";
import { z } from "zod";

export class GeminiFailure extends Error {
  constructor(public kind: "unavailable" | "refused" | "invalid" | "timeout", public quotaExhausted = false) { super(kind); }
}
export function getGeminiConfiguration() {
  const key = process.env.GEMINI_API_KEY?.trim(), model = process.env.GEMINI_ANALYSIS_MODEL?.trim();
  return key && model && /^gemini-[a-zA-Z0-9._-]{1,90}$/.test(model) ? { key, model } : null;
}
const envelopeSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z.array(z.object({ finishReason: z.string(), content: z.object({
    parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
  }).optional() })).optional(),
});

// One native Gemini call, with no tools, paid-provider fallback or automatic retry.
export async function generateGeminiJson(config: NonNullable<ReturnType<typeof getGeminiConfiguration>>,
  input: { instructions: string; data: object; schema: object; maxOutputTokens: number; maxTextLength: number }, transport: typeof fetch = fetch) {
  try {
    const response = await transport(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": config.key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000), cache: "no-store", redirect: "error",
      body: JSON.stringify({ systemInstruction: { parts: [{ text: input.instructions }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(input.data) }] }],
        generationConfig: { candidateCount: 1, maxOutputTokens: input.maxOutputTokens, thinkingConfig: { thinkingLevel: "low" },
          responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: input.schema } } } }),
    });
    if (!response.ok) throw new GeminiFailure("unavailable", response.status === 429);
    // Never expose/log upstream bodies: they can contain document text or key diagnostics.
    const raw = await response.text();
    if (raw.length > 100000) throw new GeminiFailure("invalid");
    let body: unknown; try { body = JSON.parse(raw); } catch { throw new GeminiFailure("invalid"); }
    const envelope = envelopeSchema.safeParse(body);
    if (!envelope.success) throw new GeminiFailure("invalid");
    const { candidates, promptFeedback } = envelope.data;
    if (promptFeedback?.blockReason || candidates?.some(c => ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(c.finishReason)))
      throw new GeminiFailure("refused");
    if (candidates?.length !== 1 || candidates[0].finishReason !== "STOP") throw new GeminiFailure("invalid");
    const text = candidates[0].content?.parts.filter(p => !p.thought).map(p => p.text ?? "").join("") ?? "";
    if (!text || text.length > input.maxTextLength) throw new GeminiFailure("invalid");
    try { return JSON.parse(text) as unknown; } catch { throw new GeminiFailure("invalid"); }
  } catch (error) {
    if (error instanceof GeminiFailure) throw error;
    throw new GeminiFailure(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "unavailable");
  }
}
